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

## Solar calculator

`src/solar-model.js` holds the estimate model and every assumption (price per watt, yield, utility rates and rebates).
`build.mjs` imports it for the worked examples on the guide pages, and `src/calculator.js` imports it in the browser
on `/solar-calculator-austin/`, so the published numbers and the tool always agree. Update a rate there and rebuild.

## Pages

- Directory: `/` (filters, map, comparison table), one profile per company under `/companies/<slug>/`
- Areas: `/solar-companies/<area>/` (defined in `AREA_PAGES` in `build.mjs`)
- Services: `/commercial-solar-austin/`, `/solar-repair-austin/` (lists built from the `services` field)
- Guides: `/solar-calculator-austin/`, `/solar-cost-austin/`, `/solar-incentives-austin/`, `/austin-energy-solar-rebate/`,
  `/value-of-solar-austin-energy/`, `/is-solar-worth-it-austin/`, `/solar-battery-austin/`, `/biggest-solar-companies-austin/`

Profiles of companies that have not been reviewed yet (`"noindex": true` in the data) stay out of the sitemap and carry
`noindex`. Add sourced details and remove the flag to let Google index them.

## How the build helps search engines

- Every page gets one JSON-LD graph: the site, the page (guides as `Article`), breadcrumbs, FAQ and, on profiles, the business.
- "Updated" dates are per page. `tools/lastmod.json` stores a hash of each page; a page keeps its date until its HTML changes,
  and the same date goes into the sitemap. Commit that file with every build.
- Stylesheet, scripts and fonts are linked with a content hash (`?v=...`); `src/worker.js` lets browsers cache those for a year.
- Guides pass `article: { published, toc }` to `page()` for the contents list and the "Updated" line, and `related: [...]`
  for the links at the end (keys of `GUIDE`).

## Fonts

`src/fonts/*.woff2` are served first, the `.woff` files are the fallback. Both are the same variable fonts.
