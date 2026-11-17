# austintexassolar.com

Static directory of solar companies in Austin, Texas.

- `data/companies.json` – all listings (edit here)
- `src/` – stylesheet and filter script
- `build.mjs` – generates the site into `public/` (no dependencies)
- `wrangler.jsonc` – Cloudflare Worker `solar`, serves `public/` on austintexassolar.com

## Update a listing

1. Edit `data/companies.json`
2. Run `npm run build`
3. Commit and push (`public/` is committed, so Cloudflare needs no build step)

## Deploy

With the repository connected to the Cloudflare Worker `solar` (Workers Builds), every push to `main` deploys.
Manual deploy: `npm run deploy`.

## Logos

Drop a logo as `logos-src/<slug>.png|jpg|webp` (slug = company slug), run `python3 tools/optimize-logos.py`
(shrinks to max 240 px WebP, usually 2-8 KB) and then `node build.mjs`. Companies without a file get an initials badge.
