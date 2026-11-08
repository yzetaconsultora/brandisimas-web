/**
 * www.brandisimas.cl → brandisimas.cl (301, conserva ruta y query).
 * /mailer/* (código del Worker) → 404.
 * Todo lo demás pasa directo, sin tocar la respuesta.
 */
export async function onRequest(ctx) {
  var url = new URL(ctx.request.url);
  if (url.hostname === 'www.brandisimas.cl') {
    url.hostname = 'brandisimas.cl';
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  // El código del Worker (mailer/) vive en el repo pero no es parte del sitio.
  if (url.pathname === '/mailer' || url.pathname.indexOf('/mailer/') === 0) {
    return new Response('Not found', { status: 404 });
  }
  return ctx.next();
}
