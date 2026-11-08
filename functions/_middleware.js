/**
 * www.brandisimas.cl → brandisimas.cl (301, conserva ruta y query).
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
  return ctx.next();
}
