// Redirects www.austintexassolar.com to the bare domain, then serves the static site.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.austintexassolar.com') {
      url.hostname = 'austintexassolar.com';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
