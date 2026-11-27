// Runs before every request: forces HTTPS and the bare domain, then serves the static site with security headers.
const HOST = 'austintexassolar.com';

const SECURITY_HEADERS = {
  // One year, all subdomains. Add "; preload" only after submitting the domain to hstspreload.org.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://tile.openstreetmap.org",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === 'http:' || url.hostname === `www.${HOST}`) {
      url.protocol = 'https:';
      url.hostname = HOST;
      return new Response(null, { status: 301, headers: { Location: url.toString(), ...SECURITY_HEADERS } });
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    // Stylesheet, scripts and fonts are requested with a content hash (?v=...), so browsers may keep them for a year.
    // Other assets (map library, images) get a day; pages keep the default and are revalidated on every visit.
    if (res.ok && url.pathname.startsWith('/assets/')) {
      out.headers.set('Cache-Control', url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400');
    }
    return out;
  },
};
