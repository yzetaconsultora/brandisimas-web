/**
 * Formulario de cotización → correo a Brandísimas.
 *
 * GET  /api/cotizar  entrega la sitekey pública de Turnstile (así el HTML no
 *                    cambia cuando se rota el widget).
 * POST /api/cotizar  verifica Turnstile, valida y envía el correo.
 *
 * Envío del correo, en este orden (igual que dalecreativa.cl):
 *   1. MAILER: Worker `brandisimas-mailer` (Cloudflare Email Routing, carpeta mailer/),
 *      envía desde web@brandisimas.cl a info.brandisimas@gmail.com.
 *   2. RESEND_API_KEY: Resend, solo como respaldo si el Worker falla.
 *
 * Variables (Cloudflare Pages → Settings → Variables and Secrets):
 *   TURNSTILE_SITEKEY  pública
 *   TURNSTILE_SECRET   secreta
 *   MAILER             service binding al Worker brandisimas-mailer
 *   RESEND_API_KEY     secreta, opcional (respaldo)
 *   MAIL_FROM          opcional; remitente de Resend
 *   MAIL_TO            opcional; por defecto info.brandisimas@gmail.com
 */

var MAIL_TO   = 'info.brandisimas@gmail.com';
// Dirección pública que ve el visitante (Cloudflare Email Routing la reenvía a MAIL_TO).
var CONTACTO  = 'hola@brandisimas.cl';
var MAIL_FROM = 'Brandísimas Web <onboarding@resend.dev>';
var MAX_BYTES = 32 * 1024;

// Formulario v5 (2026-11): tipo, nombre, teléfono y correo. Los demás campos se quitaron.
var TIPOS     = ['Celebración', 'Empresa'];
var EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var FONO_RE   = /^[0-9+()\s.\-]+$/;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

async function turnstileOk(token, secret, ip) {
  var body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  var res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: body });
  if (!res.ok) return false;
  var data = await res.json();
  return data.success === true;
}

async function enviarConMailer(env, correo) {
  if (!env.MAILER) return false;
  try {
    var res = await env.MAILER.fetch('https://mailer.internal/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(correo)
    });
    if (!res.ok) console.error('Mailer', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('Mailer', e && e.message);
    return false;
  }
}

async function enviarConResend(env, correo) {
  if (!env.RESEND_API_KEY) return false;
  try {
    var res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'authorization': 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM || MAIL_FROM,
        to: [correo.to],
        reply_to: correo.replyTo,
        subject: correo.subject,
        text: correo.text
      })
    });
    if (!res.ok) console.error('Resend', res.status, await res.text());
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function onRequestGet(ctx) {
  var sitekey = ctx.env.TURNSTILE_SITEKEY;
  if (!sitekey) return json({ ok: false }, 503);
  return json({ ok: true, sitekey: sitekey }, 200);
}

export async function onRequestPost(ctx) {
  var request = ctx.request;
  var env = ctx.env;
  var ip = request.headers.get('CF-Connecting-IP');
  var falla = 'No pudimos enviar tu cotización. Escríbenos a ' + CONTACTO + ' o por WhatsApp.';

  // El formulario es propio: un POST desde otro origen no tiene nada que hacer acá.
  var desde = request.headers.get('origin');
  if (desde && desde !== new URL(request.url).origin) {
    return json({ ok: false, mensaje: 'Origen no permitido.' }, 403);
  }

  var largo = Number(request.headers.get('content-length') || '0');
  if (largo > MAX_BYTES) return json({ ok: false, mensaje: 'El mensaje es demasiado largo.' }, 413);

  // Sin secretos se falla cerrado a propósito.
  if (!env.TURNSTILE_SECRET || (!env.MAILER && !env.RESEND_API_KEY)) return json({ ok: false, mensaje: falla }, 503);

  var form;
  try { form = await request.formData(); }
  catch (e) { return json({ ok: false, mensaje: 'No pudimos leer el formulario.' }, 400); }

  var val = function (k, max) {
    var v = form.get(k);
    return typeof v === 'string' ? v.trim().slice(0, max || 200) : '';
  };

  var token = val('cf-turnstile-response', 4096);
  if (!token || !(await turnstileOk(token, env.TURNSTILE_SECRET, ip))) {
    return json({ ok: false, captcha: true, mensaje: 'No pudimos verificar que eres una persona. Intenta de nuevo.' }, 400);
  }

  // Honeypot: un bot que lo llena recibe "ok" y no se envía nada.
  if (val('sitio_web')) return json({ ok: true }, 200);

  var d = {
    tipo:     val('tipo'),
    nombre:   val('nombre', 120),
    telefono: val('telefono', 40),
    email:    val('email', 180)
  };

  var digitos = d.telefono.replace(/\D/g, '').length;
  var errores = {};
  if (TIPOS.indexOf(d.tipo) === -1)                                   errores.tipo = 'Elige el tipo de evento.';
  if (d.nombre.length < 2)                                            errores.nombre = 'Escribe tu nombre.';
  if (!FONO_RE.test(d.telefono) || digitos < 8 || digitos > 15)      errores.telefono = 'Escribe un teléfono válido.';
  if (!EMAIL_RE.test(d.email))                                        errores.email = 'Escribe un correo válido.';
  if (Object.keys(errores).length) {
    return json({ ok: false, errores: errores, mensaje: 'Revisa los campos marcados.' }, 400);
  }

  var texto = [
    'Tipo de evento: ' + d.tipo,
    'Nombre: ' + d.nombre,
    'Teléfono: ' + d.telefono,
    'Email: ' + d.email
  ].join('\n');

  var correo = {
    to: env.MAIL_TO || MAIL_TO,
    replyTo: d.email,
    replyName: d.nombre,
    subject: 'Nueva cotización: ' + d.nombre + ' (' + d.tipo + ')',
    text: texto
  };

  var enviado = (await enviarConMailer(env, correo)) || (await enviarConResend(env, correo));
  if (!enviado) return json({ ok: false, mensaje: falla }, 502);

  return json({ ok: true }, 200);
}
