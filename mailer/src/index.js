/**
 * brandisimas-mailer — envía el correo del formulario de cotización con Cloudflare Email Routing.
 *
 * No tiene ruta pública (workers_dev: false, sin routes): solo lo llama la
 * function de Pages a través del service binding MAILER. El binding send_email
 * solo puede escribir a la dirección verificada en Email Routing, así que
 * aunque alguien lo alcanzara no podría usarlo para mandar spam a terceros.
 */
import { EmailMessage } from 'cloudflare:email';

const FROM = 'web@brandisimas.cl';
const FROM_NAME = 'Brandísimas Web';

const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
/** Encabezado con tildes según RFC 2047. */
const enc = (s) => `=?UTF-8?B?${b64(s)}?=`;
/** Cuerpo en base64 con líneas de 76 caracteres. */
const body64 = (s) => b64(s).replace(/.{1,76}/g, '$&\r\n');
const limpio = (s, max = 200) => String(s ?? '').replace(/[\r\n]+/g, ' ').slice(0, max);

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Método no permitido', { status: 405 });
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response('JSON inválido', { status: 400 });
    }

    const to = limpio(data.to, 180);
    const replyTo = limpio(data.replyTo, 180);
    const replyName = limpio(data.replyName, 120);
    const subject = limpio(data.subject, 200);
    const text = String(data.text ?? '').slice(0, 8000);
    if (!to || !subject || !text) return new Response('Faltan datos', { status: 400 });

    const id = `<${crypto.randomUUID()}@brandisimas.cl>`;
    const raw = [
      `From: ${enc(FROM_NAME)} <${FROM}>`,
      `To: <${to}>`,
      replyTo ? `Reply-To: ${replyName ? `${enc(replyName)} ` : ''}<${replyTo}>` : null,
      `Subject: ${enc(subject)}`,
      `Message-ID: ${id}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      body64(text),
    ]
      .filter((l) => l !== null)
      .join('\r\n');

    try {
      await env.MAIL.send(new EmailMessage(FROM, to, raw));
      return new Response('ok');
    } catch (e) {
      return new Response(`No se pudo enviar: ${e instanceof Error ? e.message : 'error'}`, { status: 502 });
    }
  },
};
