// Builds the static site into ./public from data/companies.json.
// Run: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'public');
const SITE = 'https://austintexassolar.com';
const UPDATED = '2026-11-16';
const UPDATED_TEXT = 'November 2026';
const companies = JSON.parse(readFileSync(join(root, 'data/companies.json'), 'utf8'));

const TYPES = {
  local: { label: 'Austin area', long: 'Based in the Austin area' },
  region: { label: 'Central Texas', long: 'Based elsewhere in Central or South Texas' },
  state: { label: 'Texas-wide', long: 'Texas company serving Austin' },
  national: { label: 'National', long: 'National provider serving Austin' },
};
const AREAS = {
  central: 'Central & East Austin',
  south: 'South Austin',
  north: 'North Austin to Round Rock',
  west: 'West Austin & Hill Country',
  hays: 'Buda & San Marcos',
  outside: 'Elsewhere in Texas',
};

// Hero illustration: a sun rising behind a row of solar panels.
function heroArt() {
  const rays = Array.from({ length: 18 }, (_, i) => `<line x1="400" y1="76" x2="400" y2="${i % 2 ? 48 : 30}" transform="rotate(${i * 20} 400 300)"/>`).join('');
  const panel = (x, y) => {
    const w = 168, h = 84, cols = 4, rows = 2;
    let g = `<g transform="translate(${x} ${y}) skewY(-14)"><rect width="${w}" height="${h}" rx="4" fill="#0d1535" stroke="#9fb0ee" stroke-width="3"/>`;
    for (let c = 1; c < cols; c++) g += `<line x1="${(w / cols) * c}" y1="0" x2="${(w / cols) * c}" y2="${h}" stroke="#4458b0" stroke-width="2"/>`;
    for (let r = 1; r < rows; r++) g += `<line x1="0" y1="${(h / rows) * r}" x2="${w}" y2="${(h / rows) * r}" stroke="#4458b0" stroke-width="2"/>`;
    g += `<rect class="glint" width="${w}" height="${h}" rx="4" fill="url(#glint)"/></g>`;
    g += `<line x1="${x + 40}" y1="${y + 74}" x2="${x + 40}" y2="${y + 128}" stroke="#9fb0ee" stroke-width="4"/><line x1="${x + 128}" y1="${y + 52}" x2="${x + 128}" y2="${y + 110}" stroke="#9fb0ee" stroke-width="4"/>`;
    return g;
  };
  return `<svg class="hero-art" viewBox="0 0 640 460" aria-hidden="true" focusable="false">
  <defs><linearGradient id="glint" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <g class="sun-rise">
    <g class="rays" stroke="#ffc531" stroke-width="6" stroke-linecap="round">${rays}</g>
    <circle cx="400" cy="300" r="200" fill="#ffc531"/>
  </g>
  <path d="M0 460V412Q300 356 640 398V460Z" fill="#0f183d"/>
  ${panel(60, 300)}${panel(250, 268)}${panel(440, 240)}
</svg>`;
}

const ICONS = {
  panel: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="48" cy="14" r="8" fill="#ffc531"/><path d="M8 30h36l8 22H4z" fill="#17224d"/><path d="M26 30v22M6.500 41h43" stroke="#fff" stroke-width="2"/></svg>',
  inverter: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="8" width="36" height="48" rx="6" fill="#17224d"/><path d="M22 26q5-10 10 0t10 0" fill="none" stroke="#ffc531" stroke-width="3" stroke-linecap="round"/><path d="M22 42h20" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 30 32 8l26 22" fill="none" stroke="#17224d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 30v26h36V30" fill="#17224d"/><rect x="27" y="38" width="10" height="18" fill="#ffc531"/></svg>',
  grid: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 20 58M32 6l12 52M16 22h32M12 34h40M24 22l18 24M40 22 22 46" fill="none" stroke="#17224d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="6" r="4" fill="#ffc531"/></svg>',
};

const calculator = `<div class="calc" data-calc>
  <label class="calc-size"><span>System size: <strong data-calc-size>7 kW</strong></span>
    <input type="range" min="3" max="15" step="0.5" value="7" data-calc-input aria-describedby="calc-note">
  </label>
  <div class="calc-bar" aria-hidden="true"><span class="calc-range"></span><span class="calc-avg"></span></div>
  <dl class="figures">
    <div><dt>At the Austin average</dt><dd data-calc-avg>$19,880</dd></div>
    <div><dt>Typical range</dt><dd data-calc-range>$15,540–$23,240</dd></div>
    <div><dt>After the $2,500 rebate</dt><dd data-calc-net>$17,380</dd></div>
  </dl>
  <p class="note" id="calc-note">Uses SolarReviews' 2026 Austin figures: $2.84 per watt on average, $2.22 to $3.32 as the typical range. An estimate, not a quote.</p>
</div>`;

const SERVICE_FILTERS = ['Residential', 'Commercial', 'Battery', 'Repair', 'EV charging'];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const phone = (p) => (p ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : '');
const host = (u) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
const tier = (t) => (t ? `<span class="tier" title="Price level ${t} of 3">${'$'.repeat(t)}<i>${'$'.repeat(3 - t)}</i></span>` : '');
const tierText = (t) => ['', 'Lower-priced', 'Mid-range', 'Premium'][t] || 'By quote';
const mapUrl = (c) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' ' + c.address)}`;

// Logo: optimised WebP from logos-opt/<slug>.webp if present, otherwise a lightweight inline monogram.
const MONO = { local: '#1f7a4d', region: '#234a94', state: '#5a2f9b', national: '#454d63' };
function logo(c, cls = '') {
  const file = join(root, 'logos-opt', c.slug + '.webp');
  if (existsSync(file)) return `<span class="logo ${cls}"><img src="/assets/logos/${c.slug}.webp" alt="${esc(c.name)} logo" width="64" height="64" loading="lazy" decoding="async"></span>`;
  const ini = c.name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return `<span class="logo logo-mono ${cls}" style="--mono:${MONO[c.type] || '#17224d'}" aria-hidden="true">${esc(ini)}</span>`;
}

function write(path, html) {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

function page({ path, title, description, body, current = '', jsonld = [], head = '' }) {
  const canonical = SITE + path;
  const nav = [
    ['/#directory', 'Directory', 'directory'],
    ['/#compare', 'Compare', 'compare'],
    ['/solar-cost-austin/', 'Cost & rebates', 'cost'],
    ['/about/', 'About', 'about'],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta name="theme-color" content="#17224d">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
${head}
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap">
    <a class="brand" href="/">Austin Texas Solar</a>
    <nav class="nav" aria-label="Main">
      ${nav.map(([href, label, key]) => `<a href="${href}"${key === current ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-foot">
  <div class="wrap">
    <div>
      <p><strong>Austin Texas Solar</strong> is an independent directory of solar companies in Austin, TX. Listings are free and no company pays for placement.</p>
      <p>Details come from public sources and can change. Confirm prices, licences and warranties with the company before you sign. Last updated ${UPDATED_TEXT}.</p>
    </div>
    <nav aria-label="Footer">
      <a href="/#directory">Solar companies in Austin</a>
      <a href="/solar-cost-austin/">Solar cost and rebates in Austin</a>
      <a href="/about/">How this directory works</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- Home ----------
const localCount = companies.filter((c) => c.type === 'local').length;
const oldest = companies.filter((c) => c.founded).sort((a, b) => a.founded - b.founded)[0];

function row(c, i) {
  const text = [c.name, c.city, c.usp, c.services.join(' '), TYPES[c.type].label].join(' ').toLowerCase();
  return `<li class="row" data-type="${c.type}" data-area="${c.area ?? ''}" data-services="|${c.services.join('|')}|" data-name="${esc(c.name)}" data-founded="${c.founded ?? ''}" data-rank="${i}" data-text="${esc(text)}">
  <div class="row-head">
    ${logo(c)}
    <div>
    <h3><a href="/companies/${c.slug}/">${esc(c.name)}</a></h3>
    <div class="row-meta">
      <span class="badge badge-${c.type}">${TYPES[c.type].label}</span>
      ${c.aeListed ? '<span class="badge badge-ae">Austin Energy rebate partner</span>' : ''}
      <span>${esc(c.city)}</span>
      ${c.founded ? `<span>Since ${c.founded}</span>` : ''}
      ${c.tier ? `<span>${tier(c.tier)} ${tierText(c.tier)}</span>` : ''}
    </div>
    </div>
  </div>
  <div>
    <p class="row-usp">${esc(c.usp)}</p>
    <ul class="row-tags">${c.services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
  </div>
  <div class="row-actions">
    ${c.phone ? `<a class="btn btn-ink" href="tel:+1${c.phone}">Call ${phone(c.phone)}</a>` : ''}
    <a class="btn btn-line" href="/companies/${c.slug}/">View profile</a>
  </div>
</li>`;
}

const faqs = [
  ['How many solar companies are there in Austin?', `This directory lists ${companies.length} solar companies that serve Austin, of which ${localCount} are based in the Austin area. Austin Energy's own list of participating solar contractors had about 53 firms when we checked on 17 November 2026. The page itself is dated April 2025, so confirm it before you rely on it.`],
  ['Which Austin Texas solar companies qualify for the Austin Energy rebate?', 'Only installers on Austin Energy\'s participating solar contractor list can apply for the rebate on your behalf. The list changes, so check it on austinenergy.com or ask the installer to confirm in writing before you sign.'],
  ['What do solar power companies in Austin, TX charge?', 'Published averages for Austin range from about $2.22 to $3.32 per watt, with SolarReviews putting the 2026 average at $2.84 per watt. Local installers are often reported to be cheaper than national brands for comparable equipment. Always compare quotes on price per watt.'],
  ['Is a local or a national solar company better?', 'Local companies usually have their own crews, know Austin Energy\'s permitting and interconnection process, and are easier to reach for service. National companies offer more lease and PPA options. Whichever you choose, check who actually installs the system and who honours the workmanship warranty.'],
  ['Do I need a battery with solar in Austin?', 'No. A grid-tied system works without one. A battery keeps selected circuits running during an outage, which matters to many Central Texas homeowners after the 2021 and 2023 winter storms, but it adds substantially to the price.'],
  ['How long does a solar installation take in Austin?', 'The work on the roof usually takes one to three days. Design, permitting, Austin Energy\'s letter of intent and the final inspection add several weeks before the system is switched on.'],
];

const home = `
<section class="hero">
  ${heroArt()}
  <div class="wrap">
    <h1>Solar companies in Austin, Texas</h1>
    <p class="lede">${companies.length} installers that serve Austin, compared by age, price level, strengths and how to reach them. No lead forms and no paid rankings.</p>
    <div class="hero-actions">
      <a class="btn btn-sun" href="#directory">Browse the directory</a>
      <a class="btn btn-ghost" href="/solar-cost-austin/">See Austin solar costs</a>
    </div>
    <ul class="hero-facts">
      <li><strong>${localCount}</strong> based in the Austin area</li>
      <li><strong>${oldest.founded}</strong> oldest installer founded</li>
      <li><strong>$2,500</strong> Austin Energy rebate</li>
    </ul>
  </div>
</section>

<section class="section" id="directory">
  <div class="wrap">
    <h2>Find solar companies in Austin</h2>
    <p class="section-intro">Filter by where a company is based and what it does. Austin-area installers come first; open a profile for the address, phone number and website.</p>
    <div class="map-block">
      <div class="chip-group">
        <span class="chips-label" id="lbl-area">Near you</span>
        <div class="chips" role="group" aria-labelledby="lbl-area">
          <button class="chip" type="button" data-filter="area" data-value="all" aria-pressed="true">Everywhere</button>
          ${Object.entries(AREAS).map(([k, v]) => `<button class="chip" type="button" data-filter="area" data-value="${k}" aria-pressed="false">${v}</button>`).join('\n          ')}
        </div>
      </div>
      <div class="map" id="map" role="region" aria-label="Map of solar companies around Austin"><p class="map-fallback">The map could not load. The area buttons above still filter the list.</p></div>
      <p class="note">Pins mark the approximate area of each office, not the exact building. National providers have no pin.</p>
    </div>
    <script type="application/json" id="map-data">${JSON.stringify(companies.filter((c) => c.lat).map((c) => ({ n: c.name, s: c.slug, a: c.area, c: c.city, p: c.phone || '', lat: c.lat, lng: c.lng }))).replace(/</g, '\\u003c')}</script>
    <div class="filters">
      <label class="search"><span>Search by name, city or service</span>
        <input type="search" data-search placeholder="e.g. battery, Buda, repair" autocomplete="off">
      </label>
      <label class="sort"><span>Sort by</span>
        <select data-sort>
          <option value="rank">Austin-based first</option>
          <option value="name">Name, A to Z</option>
          <option value="oldest">Longest in business</option>
        </select>
      </label>
      <div class="chip-group">
        <span class="chips-label" id="lbl-type">Based in</span>
        <div class="chips" role="group" aria-labelledby="lbl-type">
          <button class="chip" type="button" data-filter="type" data-value="all" aria-pressed="true">All</button>
          ${Object.entries(TYPES).map(([k, v]) => `<button class="chip" type="button" data-filter="type" data-value="${k}" aria-pressed="false">${v.label}</button>`).join('\n          ')}
        </div>
      </div>
      <div class="chip-group">
        <span class="chips-label" id="lbl-service">Service</span>
        <div class="chips" role="group" aria-labelledby="lbl-service">
          <button class="chip" type="button" data-filter="service" data-value="all" aria-pressed="true">Any</button>
          ${SERVICE_FILTERS.map((s) => `<button class="chip" type="button" data-filter="service" data-value="${s}" aria-pressed="false">${s}</button>`).join('\n          ')}
        </div>
      </div>
    </div>
    <p class="count" data-count aria-live="polite">${companies.length} companies shown</p>
    <ul class="list" data-list>
${companies.map(row).join('\n')}
    </ul>
    <div class="empty" data-empty hidden>
      <p>No company matches these filters.</p>
      <button class="btn btn-line" type="button" data-reset>Clear filters</button>
    </div>
  </div>
</section>

<section class="section section-sky" id="compare">
  <div class="wrap">
    <h2>Austin Texas solar companies compared</h2>
    <p class="section-intro">The Austin-area installers side by side. Price level is shown only where a company publishes prices or states its positioning; everyone else quotes per project.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Company</th><th>Based in</th><th class="num">Founded</th><th>Price level</th><th>Phone</th></tr></thead>
        <tbody>
${companies.filter((c) => c.type === 'local').map((c) => `          <tr><td><a href="/companies/${c.slug}/">${esc(c.name)}</a></td><td>${esc(c.city)}</td><td class="num">${c.founded ?? 'Not stated'}</td><td>${c.tier ? `${tier(c.tier)} ${tierText(c.tier)}` : 'By quote'}</td><td>${c.phone ? `<a href="tel:+1${c.phone}">${phone(c.phone)}</a>` : 'See profile'}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="section" id="choose">
  <div class="wrap">
    <h2>How to choose between solar companies in Austin</h2>
    <p class="section-intro">Six checks that separate a dependable installer from a risky one. Ask each company you shortlist.</p>
    <ul class="checks">
      <li><h3>Austin Energy participating contractor</h3><p>Only participating contractors can file for the $2,500 rebate. Ask for confirmation in writing.</p></li>
      <li><h3>Texas electrical contractor licence</h3><p>Solar installers in Texas need a state electrical contractor licence from TDLR. Look the number up before signing.</p></li>
      <li><h3>NABCEP-certified staff</h3><p>NABCEP is the main professional credential for solar design and installation in North America.</p></li>
      <li><h3>Their own installation crew</h3><p>Ask who will be on your roof. Subcontracted crews are common with national brands and make accountability harder.</p></li>
      <li><h3>Workmanship warranty of ten years or more</h3><p>Panel makers cover the equipment. The installer's warranty covers leaks, wiring and labour, and it is only worth what the company behind it is.</p></li>
      <li><h3>Price per watt in the quote</h3><p>Divide the total price by system size. It is the one figure that lets you compare quotes of different sizes fairly.</p></li>
    </ul>
  </div>
</section>

<section class="section" id="how">
  <div class="wrap">
    <h2>How a solar home works in Austin</h2>
    <p class="section-intro">The same four steps apply whichever installer you choose.</p>
    <ol class="flow">
      <li>${ICONS.panel}<h3>Panels</h3><p>Sunlight on the roof becomes direct current. Austin gets well over 200 sunny days a year.</p></li>
      <li>${ICONS.inverter}<h3>Inverter</h3><p>The inverter turns it into the alternating current your home uses.</p></li>
      <li>${ICONS.home}<h3>Your home</h3><p>Appliances run on solar first. A battery, if you add one, stores the surplus for outages.</p></li>
      <li>${ICONS.grid}<h3>Austin Energy</h3><p>Austin Energy credits the energy your system produces at its Value of Solar rate instead of net metering.</p></li>
    </ol>
  </div>
</section>

<section class="section section-sky" id="cost">
  <div class="wrap">
    <h2>What solar power companies in Austin, TX charge</h2>
    <p class="section-intro">Figures published in 2026 by national comparison sites. Your quote depends on roof, equipment and system size.</p>
    <dl class="figures">
      <div><dt>Average price per watt</dt><dd>$2.84<small>SolarReviews, Austin, 2026</small></dd></div>
      <div><dt>Typical range per watt</dt><dd>$2.22–$3.32<small>SolarReviews, Austin</small></dd></div>
      <div><dt>Austin Energy rebate</dt><dd>$2,500<small>Residential, via a participating contractor</small></dd></div>
    </dl>
    <h3 style="margin:2.5rem 0 1rem">Estimate your system price</h3>
    ${calculator}
    <p><a href="/solar-cost-austin/">Read the full guide to solar cost and rebates in Austin</a></p>
  </div>
</section>

<section class="section" id="faq">
  <div class="wrap">
    <h2>Questions about Austin solar companies</h2>
    <div class="faq" style="margin-top:2rem">
${faqs.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
    </div>
  </div>
</section>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin="" defer></script>
<script src="/assets/app.js" defer></script>
`;

write('index.html', page({
  path: '/',
  title: `Solar Companies in Austin, Texas: ${companies.length} Installers Compared (2026)`,
  description: `Independent directory of solar companies in Austin, TX. Compare ${companies.length} Austin Texas solar companies by founding year, price level, services and contact details.`,
  body: home,
  head: '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">',
  jsonld: [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Austin Texas Solar', url: SITE + '/' },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Solar companies in Austin, Texas', numberOfItems: companies.length,
      itemListElement: companies.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: `${SITE}/companies/${c.slug}/` })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}));

// ---------- Company profiles ----------
for (const c of companies) {
  const others = companies.filter((o) => o.slug !== c.slug && o.type === c.type).slice(0, 5);
  const hasStreet = /\d/.test(c.address || '');
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / ${esc(c.name)}</p>
    <div class="head-brand">${logo(c, 'logo-lg')}<h1>${esc(c.name)}</h1></div>
    <p>${esc(c.usp)}</p>
  </div>
</section>
<section class="section">
  <div class="wrap profile">
    <div>
      <h2 style="margin-bottom:1rem">About ${esc(c.name)}</h2>
      <p>${esc(c.about)}</p>
      <dl class="facts" style="margin-top:2rem">
        <div><dt>Based in</dt><dd>${esc(c.city)} <span class="badge badge-${c.type}">${TYPES[c.type].label}</span></dd></div>
        <div><dt>Founded</dt><dd>${c.founded ?? 'Not publicly stated'}</dd></div>
        <div><dt>Price level</dt><dd>${c.tier ? `${tier(c.tier)} ${tierText(c.tier)}. ${esc(c.tierNote)}.` : 'Quotes per project; no public pricing found.'}</dd></div>
        <div><dt>Austin Energy rebate</dt><dd>${c.aeListed ? "Listed as a participating contractor on Austin Energy's site (page dated April 2025), so it can file for the $2,500 rebate. Check again before you sign." : "Not on Austin Energy's participating contractor list when we checked on 17 November 2026, so it cannot file for the $2,500 rebate."}</dd></div>
        <div><dt>Services</dt><dd>${c.services.map(esc).join(', ')}</dd></div>
        ${c.ratings.length ? `<div><dt>Ratings elsewhere</dt><dd>${c.ratings.map(esc).join('<br>')}</dd></div>` : ''}
      </dl>
      <h2 style="margin-bottom:1rem;font-size:1.6rem">Before you sign with ${esc(c.name)}</h2>
      <div class="prose">
        <ul>
          <li>Ask whether the company is currently an Austin Energy participating solar contractor. Without that, you cannot claim the $2,500 rebate.</li>
          <li>Get the total price and the price per watt in writing, and compare with at least two other Austin solar companies.</li>
          <li>Ask who installs the system and how long the workmanship warranty runs.</li>
        </ul>
        <p class="note">Ratings are quoted from the named third-party sites as of ${UPDATED_TEXT} and may have changed.</p>
      </div>
    </div>
    <aside>
      <div class="contact">
        <h2>Contact</h2>
        <dl>
          ${c.phone ? `<div><dt>Phone</dt><dd><a href="tel:+1${c.phone}">${phone(c.phone)}</a></dd></div>` : ''}
          ${c.email ? `<div><dt>Email</dt><dd><a href="mailto:${c.email}">${c.email}</a></dd></div>` : ''}
          ${c.url ? `<div><dt>Website</dt><dd><a href="${c.url}" rel="noopener nofollow">${host(c.url)}</a></dd></div>` : ''}
          ${c.address ? `<div><dt>Address</dt><dd>${esc(c.address)}</dd></div>` : ''}
          ${!c.phone && !c.url ? `<div><dt>Phone and website</dt><dd>No verified contact details found yet.</dd></div>` : ''}
        </dl>
        ${c.phone ? `<a class="btn btn-ink" href="tel:+1${c.phone}">Call ${phone(c.phone)}</a>` : ''}
        ${c.url ? `<a class="btn btn-line" href="${c.url}" rel="noopener nofollow">Visit website</a>` : ''}
        ${hasStreet ? `<a class="btn btn-line" href="${mapUrl(c)}" rel="noopener nofollow">Open in Google Maps</a>` : ''}
      </div>
      ${others.length ? `<h2 style="font-size:1.3rem;margin:2rem 0 0.8rem">More ${TYPES[c.type].label.toLowerCase()} companies</h2>
      <ul class="more-list">${others.map((o) => `<li><a href="/companies/${o.slug}/">${esc(o.name)}</a></li>`).join('')}</ul>` : ''}
      <p style="margin-top:1.5rem"><a href="/#directory">All solar companies in Austin</a></p>
    </aside>
  </div>
</section>`;
  const biz = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: c.name, description: c.usp, areaServed: 'Austin, TX' };
  if (c.url) biz.url = c.url;
  if (c.phone) biz.telephone = '+1' + c.phone;
  if (c.email) biz.email = c.email;
  if (c.founded) biz.foundingDate = String(c.founded);
  if (hasStreet) biz.address = c.address;
  write(`companies/${c.slug}/index.html`, page({
    path: `/companies/${c.slug}/`,
    title: `${c.name}: Solar Company Serving Austin, TX | Contact & Profile`,
    description: `${c.name}${c.founded ? `, founded ${c.founded}` : ''}, ${TYPES[c.type].long.toLowerCase()}. ${c.usp} Phone, address and website.`.slice(0, 300),
    body,
    current: 'directory',
    jsonld: [biz, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Solar companies in Austin', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: c.name, item: `${SITE}/companies/${c.slug}/` } ] }],
  }));
}

// ---------- Cost guide ----------
write('solar-cost-austin/index.html', page({
  path: '/solar-cost-austin/',
  title: 'Solar Cost and Rebates in Austin, TX (2026 Guide)',
  description: 'What solar power companies in Austin, TX charge per watt in 2026, how the $2,500 Austin Energy rebate works, and what changed with the federal tax credit.',
  current: 'cost',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / Cost and rebates</p>
    <h1>Solar cost and rebates in Austin, TX</h1>
    <p>What Austin solar companies charge in 2026, and the incentives that lower the bill.</p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>What solar costs in Austin</h2>
    <p>Installers price systems per watt of capacity. Comparison sites publish different averages for Austin because they draw on different sets of quotes:</p>
    <div class="table-scroll" style="margin:1.5rem 0">
      <table>
        <thead><tr><th>Source (2026)</th><th>Price per watt</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td>SolarReviews</td><td class="num">$2.84 average</td><td>Fair range given as $2.22 to $3.32</td></tr>
          <tr><td>EnergySage</td><td class="num">$2.23</td><td>Marketplace quotes; market average $28,165 for a 12.61 kW system</td></tr>
          <tr><td>Installer guides</td><td class="num">$2.50 to $3.20</td><td>Range quoted for a quality installation</td></tr>
        </tbody>
      </table>
    </div>
    <p>At $2.84 per watt, common system sizes work out as follows before any rebate:</p>
    <div class="table-scroll" style="margin:1.5rem 0">
      <table>
        <thead><tr><th>System size</th><th class="num">Price at $2.84 per watt</th><th class="num">After $2,500 rebate</th></tr></thead>
        <tbody>
          ${[5, 7, 9, 12].map((kw) => `<tr><td>${kw} kW</td><td class="num">$${(kw * 2840).toLocaleString('en-US')}</td><td class="num">$${(kw * 2840 - 2500).toLocaleString('en-US')}</td></tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
    <p class="note">These are arithmetic examples, not quotes. Batteries, roof work and premium panels add to the price.</p>
    <h3>Estimate your own system</h3>
    ${calculator}

    <h2>The Austin Energy solar rebate</h2>
    <p>Austin Energy pays residential customers a flat $2,500 rebate for a qualifying solar installation. To receive it you must:</p>
    <ol>
      <li>Be an Austin Energy residential customer.</li>
      <li>Complete Austin Energy's online solar education course.</li>
      <li>Hire an Austin Energy participating solar contractor, who applies on your behalf.</li>
      <li>Receive a letter of intent from Austin Energy before installation starts.</li>
      <li>Pass Austin Energy's final inspection.</li>
    </ol>
    <p>Austin Energy recommends getting at least three estimates from different participating contractors. The current list is on <a href="https://austinenergy.com/green-power/solar-solutions/participating-solar-contractors" rel="noopener">austinenergy.com</a>. When we checked on 17 November 2026 it named about 53 firms. 15 of the 29 companies in this directory are on it, and each profile says whether it is.</p>

    <h2>Value of Solar instead of net metering</h2>
    <p>Austin Energy does not use traditional net metering. It credits the electricity your system produces at a set Value of Solar rate, which installers reported at about 9.9 cents per kWh in 2026. The rate is reviewed periodically, so check Austin Energy's current rate schedule before estimating your savings.</p>

    <h2>Federal tax credit</h2>
    <p>The 30% federal tax credit for homeowner-owned residential systems ended on December 31, 2025, according to several installer and industry sources. Leased systems and power purchase agreements can still benefit from a separate credit claimed by the provider. Treat any 2026 quote that subtracts 30% for a purchased home system with caution, and confirm your situation with a tax professional.</p>

    <h2>Why quotes from Austin solar companies differ</h2>
    <ul>
      <li>Equipment: premium panels and microinverters cost more than standard ones.</li>
      <li>Company type: national brands are reported to charge roughly 15 to 25% more than local installers.</li>
      <li>Roof: steep, tiled or shaded roofs take more labour.</li>
      <li>Hail: Central Texas sees several significant hail events a year, so ask about panel hail ratings.</li>
      <li>Batteries: storage adds substantially to the price but provides backup during outages.</li>
    </ul>
    <p style="margin-top:2rem"><a class="btn btn-ink" href="/#directory">Compare solar companies in Austin</a></p>
  </div>
</section>
<script src="/assets/app.js" defer></script>`,
}));

// ---------- About ----------
write('about/index.html', page({
  path: '/about/',
  title: 'About Austin Texas Solar: How the Directory Works',
  description: 'How Austin Texas Solar selects and describes solar companies in Austin, where the data comes from, and how to request a correction.',
  current: 'about',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / About</p>
    <h1>How this directory works</h1>
    <p>An independent list of Austin Texas solar companies, built from public information.</p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>Who is listed</h2>
    <p>Companies are included when public sources show that they install solar in Austin and give enough detail to describe them fairly. Companies based in the Austin area are shown first, followed by Central Texas, statewide and national providers.</p>
    <h2>Where the information comes from</h2>
    <p>Founding years, addresses, phone numbers, services and ratings come from company websites and from public profiles on EnergySage, SolarReviews, EcoWatch, ConsumerAffairs, Solar Power World and Google. Ratings are quoted with their source and are not our own.</p>
    <h2>How price levels are set</h2>
    <p>Most installers do not publish prices. A price level appears only where a company publishes per-watt pricing or states its own positioning, and each profile says what the level is based on. Everything else is marked as priced by quote.</p>
    <h2>Independence</h2>
    <p>Listings are free. No company pays to be included or to appear higher, and the order is not a ranking of quality.</p>
    <h2>Corrections</h2>
    <p>Details change. If you represent a listed company and something is wrong or out of date, the listing will be corrected on request. Always confirm prices, licences and warranty terms with the company itself.</p>
    <p class="note">Last updated ${UPDATED_TEXT}.</p>
  </div>
</section>`,
}));

// ---------- 404, assets, sitemap ----------
write('404.html', page({
  path: '/404.html',
  title: 'Page not found | Austin Texas Solar',
  description: 'This page does not exist.',
  body: `<section class="page-head"><div class="wrap"><h1>This page does not exist</h1><p>The address may have changed.</p><p style="margin-top:1.5rem"><a class="btn btn-sun" href="/">Go to the directory</a></p></div></section>`,
}));

mkdirSync(join(out, 'assets'), { recursive: true });
copyFileSync(join(root, 'src/styles.css'), join(out, 'assets/styles.css'));
copyFileSync(join(root, 'src/app.js'), join(out, 'assets/app.js'));
if (existsSync(join(root, 'logos-opt'))) {
  mkdirSync(join(out, 'assets/logos'), { recursive: true });
  for (const f of readdirSync(join(root, 'logos-opt'))) if (f.endsWith('.webp')) copyFileSync(join(root, 'logos-opt', f), join(out, 'assets/logos', f));
}
write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#17224d"/><circle cx="16" cy="16" r="8" fill="#ffc531"/></svg>`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
const urls = ['/', '/solar-cost-austin/', '/about/', ...companies.map((c) => `/companies/${c.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`);

console.log(`Built ${urls.length} pages into public/`);
