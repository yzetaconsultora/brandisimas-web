/**
 * Formulario de cotización → correo a Brandísimas.
 *
 * GET  /api/cotizar  entrega la sitekey pública de Turnstile (así el HTML no
 *                    cambia cuando se rota el widget).
 * POST /api/cotizar  verifica Turnstile, valida y envía el correo vía Resend.
 *
 * Variables de entorno (Cloudflare Pages → Settings → Variables and Secrets):
 *   TURNSTILE_SITEKEY  pública
 *   TURNSTILE_SECRET   secreta
 *   RESEND_API_KEY     secreta
 *   MAIL_FROM          opcional; por defecto el remitente de prueba de Resend
 *   MAIL_TO            opcional; por defecto info.brandisimas@gmail.com
 */

var MAIL_TO   = 'info.brandisimas@gmail.com';
var MAIL_FROM = 'Brandísimas Web <onboarding@resend.dev>';
var MAX_BYTES = 32 * 1024;

var TIPOS     = ['Celebración', 'Empresa'];
var INVITADOS = ['Menos de 50', '50 a 100', '100 a 200', 'Más de 200'];
var PRODUCTOS = ['Tote bags', 'Bucket hat', 'Vasos', 'Poleras', 'Otros'];
var EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var FECHA_RE  = /^\d{4}-\d{2}-\d{2}$/;

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

export async function onRequestGet(ctx) {
  var sitekey = ctx.env.TURNSTILE_SITEKEY;
  if (!sitekey) return json({ ok: false }, 503);
  return json({ ok: true, sitekey: sitekey }, 200);
}

export async function onRequestPost(ctx) {
  var request = ctx.request;
  var env = ctx.env;
  var ip = request.headers.get('CF-Connecting-IP');
  var falla = 'No pudimos enviar tu cotización. Escríbenos a ' + (env.MAIL_TO || MAIL_TO) + ' o por WhatsApp.';

  // El formulario es propio: un POST desde otro origen no tiene nada que hacer acá.
  var desde = request.headers.get('origin');
  if (desde && desde !== new URL(request.url).origin) {
    return json({ ok: false, mensaje: 'Origen no permitido.' }, 403);
  }

  var largo = Number(request.headers.get('content-length') || '0');
  if (largo > MAX_BYTES) return json({ ok: false, mensaje: 'El mensaje es demasiado largo.' }, 413);

  // Sin secretos se falla cerrado a propósito.
  if (!env.TURNSTILE_SECRET || !env.RESEND_API_KEY) return json({ ok: false, mensaje: falla }, 503);

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
    tipo:      val('tipo'),
    nombre:    val('nombre', 120),
    org:       val('org', 160),
    email:     val('email', 180),
    telefono:  val('telefono', 40),
    fecha:     val('fecha', 10),
    invitados: val('invitados'),
    productos: form.getAll('productos').filter(function (p) { return PRODUCTOS.indexOf(p) !== -1; }),
    mensaje:   val('mensaje', 4000)
  };

  var errores = {};
  if (TIPOS.indexOf(d.tipo) === -1)          errores.tipo = 'Elige el tipo de evento.';
  if (d.nombre.length < 2)                   errores.nombre = 'Escribe tu nombre.';
  if (!EMAIL_RE.test(d.email))               errores.email = 'Escribe un email válido.';
  if (INVITADOS.indexOf(d.invitados) === -1) errores.invitados = 'Elige el número de invitados.';
  if (d.fecha && !FECHA_RE.test(d.fecha))    errores.fecha = 'Revisa la fecha.';
  if (Object.keys(errores).length) {
    return json({ ok: false, errores: errores, mensaje: 'Revisa los campos marcados.' }, 400);
  }

  var emp = d.tipo === 'Empresa';
  var o = function (v) { return v || '—'; };
  var texto = [
    'Tipo de evento: ' + d.tipo,
    'Nombre: ' + d.nombre,
    (emp ? 'Empresa: ' : 'Tipo de celebración: ') + o(d.org),
    'Email: ' + d.email,
    'Teléfono: ' + o(d.telefono),
    'Fecha: ' + o(d.fecha && d.fecha.split('-').reverse().join('-')),
    'Invitados: ' + d.invitados,
    'Qué productos interesan: ' + o(d.productos.join(', ')),
    'Más información: ' + o(d.mensaje)
  ].join('\n');

  var res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'authorization': 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM || MAIL_FROM,
        to: [env.MAIL_TO || MAIL_TO],
        reply_to: d.email,
        subject: 'Nueva cotización: ' + d.nombre + ' (' + d.tipo + ')',
        text: texto
      })
    });
  } catch (e) {
    return json({ ok: false, mensaje: falla }, 502);
  }
  if (!res.ok) {
    console.error('Resend', res.status, await res.text());
    return json({ ok: false, mensaje: falla }, 502);
  }

  return json({ ok: true }, 200);
}
