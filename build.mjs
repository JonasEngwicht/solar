// Builds the static site into ./public from data/companies.json.
// Run: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimate, UTILITIES, ASSUME, aeMonthlyBill } from './src/solar-model.js';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'public');
const SITE = 'https://austintexassolar.com';
const UPDATED = new Date().toISOString().slice(0, 10);
const INDEXNOW_KEY = 'c52a1aa9c7b4e088207fd33f204d555b';
const PAGE_HASH = new Map(); // url -> content hash, for per-page lastmod
const NOINDEX = new Set();
const UPDATED_TEXT = 'November 2026';
const companies = JSON.parse(readFileSync(join(root, 'data/companies.json'), 'utf8'));
// Site operator for the legal notice and privacy policy: {"name","street","city","country","email","phone","vatId"?}
const OP_FILE = join(root, 'data/operator.json');
const OP = existsSync(OP_FILE) ? JSON.parse(readFileSync(OP_FILE, 'utf8')) : null;

// ---------- Shared helpers for the guides ----------
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const kwhFmt = (n) => Math.round(n).toLocaleString('en-US');
const faqLd = (list) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })) });
const faqHtml = (list) => `<div class="faq">\n${list.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}\n    </div>`;
const srcList = (list) => `<ul class="sources">\n${list.map(([t, u]) => `      <li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join('\n')}\n    </ul>`;
const CHECKED = 'Checked on 26 November 2026.';

// Worked examples from the shared model, so guide pages and the calculator agree.
const EX_KWH = 1000;
const ex = (utility, extra = {}) => estimate({ utility, monthlyKwh: EX_KWH, roof: 's', shade: 'none', aeContractor: true, ...extra });
const EX = { ae: ex('ae'), oncor: ex('oncor'), pec: ex('pec'), smtx: ex('smtx') };
const payText = (r) => (r.payback === null ? 'over 25 years' : `${r.payback.toFixed(1)} years`);
const exampleRows = (keys) => keys.map((k) => {
  const r = EX[k];
  return `          <tr><td>${esc(UTILITIES[k].label)}</td><td class="num">${usd(r.net)}</td><td class="num">${usd(r.year1)}</td><td class="num">${payText(r)}</td><td class="num">${usd(r.lifetimeNet)}</td></tr>`;
}).join('\n');
const exampleTable = (keys = ['ae', 'oncor', 'pec', 'smtx']) => `<div class="table-scroll" style="margin:1.25rem 0 1rem">
      <table>
        <thead><tr><th>Utility</th><th class="num">Net cost</th><th class="num">Savings, year one</th><th class="num">Payback</th><th class="num">Net savings, 25 years</th></tr></thead>
        <tbody>
${exampleRows(keys)}
        </tbody>
      </table>
    </div>`;


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
    <div><dt>After the $4,000 rebate</dt><dd data-calc-net>$15,880</dd></div>
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
  if (path.endsWith('index.html')) PAGE_HASH.set('/' + path.replace(/index\.html$/, ''), createHash('sha1').update(html).digest('hex'));
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

function page({ path, title, description, body, current = '', jsonld = [], head = '', noindex = false }) {
  const canonical = SITE + path;
  if (noindex) NOINDEX.add(path);
  const nav = [
    ['/#directory', 'Directory', 'directory'],
    ['/biggest-solar-companies-austin/', 'Compare', 'big'],
    ['/solar-calculator-austin/', 'Calculator', 'calc'],
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
<meta property="og:site_name" content="Austin Texas Solar">
<meta property="og:image" content="${SITE}/assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${noindex ? '<meta name="robots" content="noindex, follow">' : ''}
<meta name="theme-color" content="#17224d">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/figtree.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/assets/fonts/bricolage.woff" as="font" type="font/woff" crossorigin>
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
      <p>Details come from public sources and can change. Confirm prices, licenses and warranties with the company before you sign. Last updated ${UPDATED_TEXT}.</p>
    </div>
    <nav aria-label="Footer">
      <a href="/#directory">Solar companies in Austin</a>
      <a href="/biggest-solar-companies-austin/">Biggest solar companies compared</a>
      <a href="/solar-calculator-austin/">Solar calculator for Austin</a>
      <a href="/solar-cost-austin/">Solar cost and rebates in Austin</a>
      <a href="/solar-incentives-austin/">Solar incentives by utility</a>
      <a href="/austin-energy-solar-rebate/">Austin Energy solar rebate</a>
      <a href="/value-of-solar-austin-energy/">Value of Solar rate</a>
      <a href="/is-solar-worth-it-austin/">Is solar worth it in Austin?</a>
      <a href="/solar-battery-austin/">Solar batteries in Austin</a>
      <a href="/about/">How this directory works</a>
      ${OP ? '<a href="/legal-notice/">Legal notice / Impressum</a>\n      <a href="/privacy/">Privacy</a>' : ''}
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- Home ----------
const BIG_SLUGS = ['freedom-solar-power', 'longhorn-solar', 'tesla-energy', 'sunrun', 'palmetto', 'good-faith-energy', 'trismart-solar', 'freedom-forever-texas'];
const AE_TOTAL = 55; // austinenergy.com participating solar contractors, checked 17 Nov 2026
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
  ['How many solar companies are there in Austin?', `This directory lists ${companies.length} solar companies that serve Austin, of which ${localCount} are based in the Austin area. Austin Energy's own list of participating solar contractors had ${AE_TOTAL} firms when we checked on 17 November 2026. The page itself is dated April 2025, so confirm it before you rely on it.`],
  ['Which Austin Texas solar companies qualify for the Austin Energy rebate?', 'Only installers on Austin Energy\'s participating solar contractor list can apply for the $4,000 rebate on your behalf. The list changes, so check it on austinenergy.com or ask the installer to confirm in writing before you sign.'],
  ['What do solar power companies in Austin, TX charge?', 'Published averages for Austin range from about $2.22 to $3.32 per watt, with SolarReviews putting the 2026 average at $2.84 per watt. Local installers are often reported to be cheaper than national brands for comparable equipment. Always compare quotes on price per watt.'],
  ['Is a local or a national solar company better?', 'Local companies usually have their own crews, know Austin Energy\'s permitting and interconnection process, and are easier to reach for service. National companies offer more lease and PPA options. Whichever you choose, check who actually installs the system and who honors the workmanship warranty.'],
  ['Do I need a battery with solar in Austin?', 'No. A grid-tied system works without one. A battery keeps selected circuits running during an outage, which matters to many Central Texas homeowners after the 2021 and 2023 winter storms, but it adds substantially to the price.'],
  ['How much can solar save in Austin?', `An Austin Energy home using ${EX_KWH.toLocaleString('en-US')} kWh a month would need about ${EX.ae.kw} kW of panels. At the 2026 average price that costs about $${Math.round(EX.ae.net).toLocaleString('en-US')} after the $4,000 rebate and earns about $${Math.round(EX.ae.year1).toLocaleString('en-US')} in Value of Solar credits in the first year, so it pays back in roughly ${Math.round(EX.ae.payback)} years. The solar calculator on this site works it out for your own home.`],
  ['Is there still a federal solar tax credit in 2026?', 'Not for a system you buy. The 30% residential clean energy credit does not apply to expenditures made after 31 December 2025. Austin Energy\'s $4,000 rebate and the Texas property tax exemption still apply.'],
  ['How long does a solar installation take in Austin?', 'The work on the roof usually takes one to three days. Design, permitting, Austin Energy\'s rebate confirmation letter and the final inspection add several weeks before the system is switched on.'],
];

const home = `
<section class="hero">
  ${heroArt()}
  <div class="wrap">
    <h1>Solar companies in Austin, Texas</h1>
    <p class="lede">The independent list of solar companies Austin homeowners can compare: ${companies.length} installers that serve Austin, compared by age, price level, strengths and how to reach them. No lead forms and no paid rankings.</p>
    <div class="hero-actions">
      <a class="btn btn-sun" href="#directory">Browse the directory</a>
      <a class="btn btn-ghost" href="/solar-calculator-austin/">Calculate your savings</a>
    </div>
    <ul class="hero-facts">
      <li><strong>${localCount}</strong> based in the Austin area</li>
      <li><strong>${oldest.founded}</strong> oldest installer founded</li>
      <li><strong>$4,000</strong> Austin Energy rebate</li>
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
      <div class="map" id="map" role="region" aria-label="Map of solar companies around Austin"><div class="map-consent"><p><strong>Map of solar companies around Austin</strong></p><p>The map loads its tiles from OpenStreetMap, which then receives your IP address. The area buttons above filter the list without it.</p><button class="btn btn-ink" type="button" data-load-map>Show map</button></div></div>
      <p class="note">Pins mark the approximate area of each office, not the exact building. National providers have no pin.</p>
      <p class="area-guides">Area guides: <a href="/solar-companies/south-austin/">South Austin</a> · <a href="/solar-companies/north-austin-round-rock/">North Austin &amp; Round Rock</a> · <a href="/solar-companies/west-austin-hill-country/">West Austin &amp; Hill Country</a> · <a href="/solar-companies/buda-san-marcos/">Buda, Kyle &amp; San Marcos</a></p>
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
    <p class="section-intro">The Austin-area installers we have reviewed in detail, side by side. Newly added Austin Energy contractors appear in the directory above and get a row here once reviewed. Price level is shown only where a company publishes prices or states its positioning; everyone else quotes per project. For warranties and financing of the big names, see <a href="/biggest-solar-companies-austin/">the biggest solar companies in Austin compared</a>.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Company</th><th>Based in</th><th class="num">Founded</th><th>Price level</th><th>Phone</th></tr></thead>
        <tbody>
${companies.filter((c) => c.type === 'local' && c.source !== 'ae').map((c) => `          <tr><td><a href="/companies/${c.slug}/">${esc(c.name)}</a></td><td>${esc(c.city)}</td><td class="num">${c.founded ?? 'Not stated'}</td><td>${c.tier ? `${tier(c.tier)} ${tierText(c.tier)}` : 'By quote'}</td><td>${c.phone ? `<a href="tel:+1${c.phone}">${phone(c.phone)}</a>` : 'See profile'}</td></tr>`).join('\n')}
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
      <li><h3>Austin Energy participating contractor</h3><p>Only participating contractors can file for the $4,000 rebate. Ask for confirmation in writing.</p></li>
      <li><h3>Texas electrical contractor license</h3><p>Solar installers in Texas need a state electrical contractor license from TDLR. Look the number up before signing.</p></li>
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
      <div><dt>Austin Energy rebate</dt><dd>$4,000<small>Residential, via a participating contractor</small></dd></div>
    </dl>
    <h3 style="margin:2.5rem 0 1rem">Estimate your system price</h3>
    ${calculator}
    <p class="hero-actions" style="margin-top:0"><a class="btn btn-ink" href="/solar-calculator-austin/">Full calculator: savings and payback</a> <a class="btn btn-line" href="/solar-cost-austin/">Solar cost guide</a></p>
  </div>
</section>

<section class="section" id="guides">
  <div class="wrap">
    <h2>Guides for going solar in Austin</h2>
    <p class="section-intro">Independent, sourced and checked against Austin Energy and the other local utilities.</p>
    <ul class="guides">
      <li class="is-tool"><a href="/solar-calculator-austin/"><strong>Solar calculator</strong><span>System size, price after rebates, savings and payback for your home.</span></a></li>
      <li><a href="/is-solar-worth-it-austin/"><strong>Is solar worth it in Austin?</strong><span>Payback by utility and home size, and when solar does not pay.</span></a></li>
      <li><a href="/solar-incentives-austin/"><strong>Incentives by utility</strong><span>Austin Energy, Oncor, PEC, San Marcos, property tax and the tax credit.</span></a></li>
      <li><a href="/austin-energy-solar-rebate/"><strong>The $4,000 Austin Energy rebate</strong><span>Who qualifies and the steps in the right order.</span></a></li>
      <li><a href="/value-of-solar-austin-energy/"><strong>Value of Solar rate</strong><span>How Austin Energy credits your panels at 12.89 cents per kWh.</span></a></li>
      <li><a href="/solar-battery-austin/"><strong>Solar batteries</strong><span>Costs, the Power Partner rebate and whether a battery pays.</span></a></li>
    </ul>
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
<script src="/assets/app.js" defer></script>
`;

write('index.html', page({
  path: '/',
  title: `Solar Companies in Austin, Texas: ${companies.length} Installers Compared (2026)`,
  description: `Independent directory of solar companies in Austin, TX. Compare ${companies.length} Austin Texas solar companies by founding year, price level, services and contact details.`,
  body: home,
  jsonld: [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Austin Texas Solar', url: SITE + '/' },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Austin Texas Solar', url: SITE + '/', logo: SITE + '/favicon.svg',
      description: 'Independent directory of solar companies in Austin, Texas. Listings are free and no company pays for placement.' },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Solar companies in Austin, Texas', numberOfItems: companies.length,
      itemListElement: companies.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: `${SITE}/companies/${c.slug}/` })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ],
}));

// ---------- Company profiles ----------
for (const c of companies) {
  const others = companies.filter((o) => o.slug !== c.slug && o.type === c.type).slice(0, 5);
  const hasStreet = /\d/.test(c.address || '') && !/PO Box/i.test(c.address || '');
  const inBig = BIG_SLUGS.includes(c.slug);
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
        <div><dt>Founded</dt><dd>${c.founded ?? (c.source === 'ae' && !c.reviewed ? 'Not reviewed yet' : 'Not publicly stated')}</dd></div>
        <div><dt>Price level</dt><dd>${c.tier ? `${tier(c.tier)} ${tierText(c.tier)}. ${esc(c.tierNote)}.` : (c.source === 'ae' && !c.reviewed ? 'Not reviewed yet. Ask for the price per watt in writing.' : 'Quotes per project; no public pricing found.')}</dd></div>
        <div><dt>Austin Energy rebate</dt><dd>${c.aeListed ? "Listed as a participating contractor on Austin Energy's site (page dated April 2025), so it can file for the $4,000 rebate. Check again before you sign." : "Not on Austin Energy's participating contractor list when we checked on 17 November 2026, so it cannot file for the $4,000 rebate."}</dd></div>
        <div><dt>Services</dt><dd>${c.services.map(esc).join(', ')}</dd></div>
        ${c.ratings.length ? `<div><dt>Ratings elsewhere</dt><dd>${c.ratings.map(esc).join('<br>')}</dd></div>` : ''}
      </dl>
      ${inBig ? `<p style="margin-top:1.5rem">See how ${esc(c.name)} compares on warranties and financing in <a href="/biggest-solar-companies-austin/">the biggest solar companies in Austin compared</a>.</p>` : ''}
      <h2 style="margin-bottom:1rem;font-size:1.6rem">Before you sign with ${esc(c.name)}</h2>
      <div class="prose">
        <ul>
          <li>Ask whether the company is currently an Austin Energy participating solar contractor. Without that, you cannot claim the $4,000 rebate.</li>
          <li>Get the total price and the price per watt in writing, and compare with at least two other Austin solar companies.</li>
          <li>Ask who installs the system and how long the workmanship warranty runs.</li>
        </ul>
        ${c.ratings.length ? `<p class="note">Ratings are quoted from the named third-party sites as of ${UPDATED_TEXT} and may have changed.</p>` : ''}
      </div>
      ${c.refs?.length ? `<h2 style="margin:2rem 0 0.8rem;font-size:1.3rem">Sources</h2>\n      <ul class="sources">${c.refs.map(([t, u]) => `<li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join('')}<li><a href="https://austinenergy.com/green-power/solar-solutions/participating-solar-contractors" rel="noopener">Austin Energy: participating solar contractors</a></li></ul>` : ''}
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
      ${others.length ? `<h2 style="font-size:1.3rem;margin:2rem 0 0.8rem">More companies: ${TYPES[c.type].label}</h2>
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
    noindex: !!c.noindex,
    title: `${c.name}: Solar Company Serving Austin, TX | Contact & Profile`,
    description: `${c.name}${c.founded ? `, founded ${c.founded}` : ''}, ${TYPES[c.type].long.toLowerCase()}. ${c.usp} Phone, address and website.`.slice(0, 300),
    body,
    current: 'directory',
    jsonld: [biz, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Solar companies in Austin', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: c.name, item: `${SITE}/companies/${c.slug}/` } ] }],
  }));
}

// ---------- Legal notice (Impressum, § 5 DDG) and privacy policy ----------
// Built only when data/operator.json exists (see OP near the top of this file).
if (OP) {
  const addr = `${esc(OP.name)}<br>${esc(OP.street)}<br>${esc(OP.city)}<br>${esc(OP.country)}`;
  const contact = `Phone / Telefon: ${esc(OP.phone)}<br>Email / E-Mail: <a href="mailto:${esc(OP.email)}">${esc(OP.email)}</a>`;
  write('legal-notice/index.html', page({
    path: '/legal-notice/',
    noindex: true,
    title: 'Legal Notice (Impressum) | Austin Texas Solar',
    description: 'Legal notice and provider identification for austintexassolar.com.',
    body: `
<section class="page-head"><div class="wrap"><h1>Legal notice / Impressum</h1></div></section>
<section class="section"><div class="wrap prose">
  <h2>Provider / Angaben gemäß § 5 DDG</h2>
  <p>${addr}</p>
  <h2>Contact / Kontakt</h2>
  <p>${contact}</p>
  ${OP.vatId ? `<h2>VAT ID / Umsatzsteuer-ID</h2><p>${esc(OP.vatId)}</p>` : ''}
  <h2>Responsible for content / Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
  <p>${addr}</p>
  <h2>About this website</h2>
  <p>Austin Texas Solar is an independent directory. It is not affiliated with Austin Energy or with any company listed, and no company pays to be listed. Details come from public sources and may be out of date; confirm them with the company before you sign anything.</p>
  <p lang="de">Austin Texas Solar ist ein unabhängiges Verzeichnis. Es besteht keine Verbindung zu Austin Energy oder den gelisteten Unternehmen. Die Angaben stammen aus öffentlichen Quellen und können veraltet sein.</p>
  <h2>Consumer dispute resolution / Verbraucherstreitbeilegung</h2>
  <p lang="de">Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
</div></section>`,
  }));
  write('privacy/index.html', page({
    path: '/privacy/',
    noindex: true,
    title: 'Privacy Policy | Austin Texas Solar',
    description: 'How austintexassolar.com handles personal data: hosting, the optional map, contact by email and your rights under the GDPR.',
    body: `
<section class="page-head"><div class="wrap"><h1>Privacy policy</h1><p>This website collects as little as possible: no cookies, no analytics, no tracking and no forms.</p></div></section>
<section class="section"><div class="wrap prose">
  <h2>1. Who is responsible</h2>
  <p>${addr}<br>Email: <a href="mailto:${esc(OP.email)}">${esc(OP.email)}</a></p>
  <p>Because the operator is based in the European Union, the EU General Data Protection Regulation (GDPR) applies.</p>

  <h2>2. Hosting and server logs</h2>
  <p>The site is delivered by Cloudflare, Inc. (USA) as our processor under a data processing agreement. To deliver and protect the site, Cloudflare processes your IP address, the date and time of the request, the page requested and technical browser details. Legal basis: our legitimate interest in a secure, working website (Art. 6(1)(f) GDPR). For transfers to the United States, Cloudflare is certified under the EU-U.S. Data Privacy Framework and also relies on the EU Standard Contractual Clauses.</p>

  <h2>3. No cookies, analytics or tracking</h2>
  <p>We do not set cookies and do not use analytics or advertising tools. Fonts and the map library are served from our own domain, so loading a page does not contact Google or other third parties.</p>

  <h2>4. The map (only if you click "Show map")</h2>
  <p>The interactive map is off until you click "Show map". Only then does your browser load map tiles from the OpenStreetMap Foundation (United Kingdom), which receives your IP address and browser details. Legal basis: your consent (Art. 6(1)(a) GDPR). Your browser remembers this choice in local storage so the map opens on your next visit; you can withdraw it at any time by clearing this site's data in your browser. See the <a href="https://osmfoundation.org/wiki/Privacy_Policy" rel="noopener">OpenStreetMap Foundation privacy policy</a>.</p>

  <h2>5. Contacting us</h2>
  <p>If you email us, we use your address and message only to reply, and delete them when they are no longer needed (Art. 6(1)(b) or (f) GDPR).</p>

  <h2>6. Links to other websites</h2>
  <p>Company profiles link to company websites and to sources. Once you follow such a link, that website's own privacy policy applies.</p>

  <h2>7. Your rights</h2>
  <p>You have the right to access, rectification, erasure, restriction of processing, data portability and objection, and to withdraw consent at any time with effect for the future (Art. 15 to 21 GDPR). You can also complain to a data protection supervisory authority, for example in your country of residence or at our place of business.</p>

  <p class="note">Last updated ${UPDATED_TEXT}.</p>
</div></section>`,
  }));
}

// ---------- Guides: Austin Energy rebate and Value of Solar (official figures, checked 17 Nov 2026) ----------
const AE_HOME = 'https://austinenergy.com/green-power/solar-solutions/for-your-home';
const AE_VOS = 'https://austinenergy.com/green-power/solar-solutions/value-of-solar-rate';
const AE_LIST = 'https://austinenergy.com/green-power/solar-solutions/participating-solar-contractors';
const aePartners = companies.filter((c) => c.aeListed && c.type === 'local' && !c.noindex);
const rebateFaq = [
  ['How much is the Austin Energy solar rebate?', 'Since 1 October 2026 Austin Energy pays $4,000 for a qualifying new home solar system installed by a participating contractor.'],
  ['Who can get the Austin Energy solar rebate?', 'Austin Energy residential customers who install a new system of at least 3 kW (DC) that is mostly free of shading, at the home tied to their Austin Energy account, through a participating solar contractor.'],
  ['Can I install first and apply for the rebate later?', 'No. You must receive Austin Energy\'s Solar Rebate Confirmation Letter before the system is installed, otherwise the system is not eligible.'],
  ['Is a solar PPA allowed with Austin Energy?', 'No. Austin Energy states that third-party solar power purchase agreements are not allowed in its service territory.'],
];
write('austin-energy-solar-rebate/index.html', page({
  path: '/austin-energy-solar-rebate/',
  title: 'Austin Energy Solar Rebate 2026: $4,000 and How to Get It',
  description: 'Austin Energy pays a $4,000 rebate for home solar since October 2026. Who qualifies, the steps in order, what costs you the rebate and which Austin solar companies can file for it.',
  current: 'cost',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / <a href="/solar-cost-austin/">Cost and rebates</a> / Austin Energy rebate</p>
    <h1>The Austin Energy solar rebate: $4,000 and how to get it</h1>
    <p>Austin Energy raised its home solar rebate to $4,000. Here is who qualifies and the order in which things have to happen.</p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>At a glance</h2>
    <div class="table-scroll" style="margin:1rem 0 2rem">
      <table>
        <tbody>
          <tr><th>Amount</th><td>$4,000 per qualifying home system</td></tr>
          <tr><th>Who</th><td>Austin Energy residential customers, at the home tied to their account</td></tr>
          <tr><th>System</th><td>New, at least 3 kW (DC), mostly free of shading</td></tr>
          <tr><th>Installer</th><td>Must be an Austin Energy participating solar contractor, who applies for you</td></tr>
          <tr><th>Timing</th><td>The rebate confirmation letter must arrive before installation</td></tr>
          <tr><th>Not allowed</th><td>Third-party power purchase agreements (PPAs)</td></tr>
        </tbody>
      </table>
    </div>

    <h2>The steps in order</h2>
    <ol>
      <li><strong>Take Austin Energy's Solar Rebate Quiz.</strong> Have your contact details, Austin Energy account number and address ready. You get a rebate reference number at the end.</li>
      <li><strong>Get quotes and hire a participating contractor.</strong> Austin Energy recommends at least three quotes. Give the reference number to the contractor you choose; they apply on your behalf.</li>
      <li><strong>Sign two forms.</strong> The Residential Interconnection Agreement, needed for every home system, and the Customer Agreement Form, needed for rebated systems.</li>
      <li><strong>Wait for the Solar Rebate Confirmation Letter.</strong> Installation must not start before it arrives.</li>
      <li><strong>Installation.</strong></li>
      <li><strong>Final inspection.</strong> After it passes, Austin Energy installs the solar meter and you get permission to operate.</li>
      <li><strong>Quality assurance review.</strong> The rebate is processed after this last check.</li>
    </ol>

    <h2>What costs you the rebate</h2>
    <ul>
      <li>Hiring a company that is not on Austin Energy's participating contractor list.</li>
      <li>Installing before the confirmation letter arrives.</li>
      <li>A system under 3 kW (DC) or a heavily shaded roof.</li>
      <li>Living outside Austin Energy's service area. Parts of Round Rock, Leander and Hays County are served by other utilities; see the <a href="/solar-companies/north-austin-round-rock/">North Austin and Round Rock</a> and <a href="/solar-companies/buda-san-marcos/">Buda and San Marcos</a> pages.</li>
    </ul>

    <h2>Other Austin Energy incentives</h2>
    <ul>
      <li><strong>Value of Solar credits</strong> of 12.89 cents for every kWh your system produces. See <a href="/value-of-solar-austin-energy/">how the Value of Solar rate works</a>.</li>
      <li><strong>Property tax exemption</strong> for the added value of a solar system, administered by the Texas Comptroller.</li>
      <li><strong>Power Partner Battery</strong>, a demand response pilot that pays $500 per new battery plus $75 per kW a year for letting Austin Energy use stored energy at peak times. See <a href="/solar-battery-austin/">solar batteries in Austin</a>.</li>
    </ul>
    <p>To see what the rebate and credits mean for your home, use the <a href="/solar-calculator-austin/">Austin solar calculator</a>. Programs from other utilities are in <a href="/solar-incentives-austin/">solar incentives by utility</a>.</p>

    <h2 id="partners">Austin solar companies that can file for the rebate</h2>
    <p>These Austin-area companies in our directory were on Austin Energy's participating contractor list when we checked on 17 November 2026. Confirm with the company before you sign.</p>
    <ul class="area-links">
${aePartners.map((c) => `      <li><a href="/companies/${c.slug}/">${esc(c.name)}</a> (${esc(c.city)})</li>`).join('\n')}
    </ul>

    <h2>Questions</h2>
${rebateFaq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}

    <h2>Sources</h2>
    <ul class="sources">
      <li><a href="${AE_HOME}" rel="noopener">Austin Energy: Rebates for home solar systems</a></li>
      <li><a href="${AE_LIST}" rel="noopener">Austin Energy: Participating solar contractors</a></li>
      <li><a href="${AE_VOS}" rel="noopener">Austin Energy: Value of Solar rate</a></li>
    </ul>
    <p class="note">Austin Energy's page was last modified on 1 October 2026. Checked on 17 November 2026. Program rules can change at any time.</p>
  </div>
</section>`,
  jsonld: [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: rebateFaq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Solar companies in Austin', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Cost and rebates', item: `${SITE}/solar-cost-austin/` },
      { '@type': 'ListItem', position: 3, name: 'Austin Energy solar rebate', item: `${SITE}/austin-energy-solar-rebate/` } ] },
  ],
}));

const vosFaq = [
  ['What is the Austin Energy Value of Solar rate in 2026?', 'For homes and other systems under 1 MW-AC it is 12.89 cents per kWh, effective 1 October 2026. Systems of 1 MW-AC and more receive 10.22 cents.'],
  ['Does Austin Energy have net metering?', 'No. Austin Energy credits all the energy your system produces at the Value of Solar rate and bills all the energy your home uses at its normal rates.'],
  ['What happens to extra solar credits?', 'Credits larger than your electric charges carry over to the next month. They cannot be cashed out or transferred and do not apply to water, trash or other city services.'],
];
write('value-of-solar-austin-energy/index.html', page({
  path: '/value-of-solar-austin-energy/',
  title: 'Austin Energy Value of Solar Rate 2026: 12.89¢ per kWh Explained',
  description: 'How Austin Energy credits home solar instead of net metering: the 12.89 cents per kWh Value of Solar rate since October 2026, how credits roll over and how to estimate payback.',
  current: 'cost',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / <a href="/solar-cost-austin/">Cost and rebates</a> / Value of Solar</p>
    <h1>Austin Energy's Value of Solar rate, explained</h1>
    <p>Austin Energy pays a fixed credit for every kilowatt-hour your panels produce instead of using net metering. Since 1 October 2026 that credit is 12.89 cents for homes.</p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>The current rates</h2>
    <div class="table-scroll" style="margin:1rem 0 2rem">
      <table>
        <thead><tr><th>System size</th><th class="num">Value of Solar rate</th></tr></thead>
        <tbody>
          <tr><td>Under 1 MW-AC (all home systems)</td><td class="num">12.89 cents per kWh</td></tr>
          <tr><td>1 MW-AC and over</td><td class="num">10.22 cents per kWh</td></tr>
        </tbody>
      </table>
    </div>
    <p class="note">Effective 1 October 2026 and subject to change. Austin Energy updates the rate every three years.</p>

    <h2>How the credit works</h2>
    <ol>
      <li><strong>Production:</strong> a separate solar meter measures everything your panels produce, and Austin Energy credits all of it at the Value of Solar rate.</li>
      <li><strong>Consumption:</strong> you pay normal residential rates for all the electricity your home uses, whether it came from your roof or the grid.</li>
      <li><strong>Credit:</strong> the credit is subtracted from the electric part of your bill. What is left over carries to the next month.</li>
    </ol>
    <p>Credits cannot be cashed out or transferred, and they do not reduce water, trash or other city charges. Austin Energy therefore recommends sizing a system to your yearly consumption rather than larger.</p>

    <h2>A quick example</h2>
    <p>A system that produces 10,000 kWh in a year earns 10,000 × $0.1289 = <strong>$1,289</strong> in credits that year. Real production depends on size, roof direction and shade; Austin Energy points to NREL's free PVWatts calculator for an estimate.</p>

    <h2>Estimating payback</h2>
    <p>Austin Energy suggests dividing the net cost of the system by your yearly savings from Value of Solar credits. A 7 kW system at the 2026 Austin average of $2.84 per watt costs $19,880; after the $4,000 rebate that is $15,880. If you finance or lease, include payment increases over the full term. The <a href="/solar-calculator-austin/">Austin solar calculator</a> does this arithmetic for your own use and roof; see also <a href="/is-solar-worth-it-austin/">is solar worth it in Austin?</a></p>

    <h2>Questions</h2>
${vosFaq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}

    <h2>Sources</h2>
    <ul class="sources">
      <li><a href="${AE_VOS}" rel="noopener">Austin Energy: Value of Solar rate</a></li>
      <li><a href="${AE_HOME}" rel="noopener">Austin Energy: Rebates for home solar systems</a></li>
      <li><a href="https://pvwatts.nrel.gov/" rel="noopener">NREL: PVWatts calculator</a></li>
    </ul>
    <p class="note">Checked on 17 November 2026.</p>
  </div>
</section>`,
  jsonld: [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: vosFaq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Solar companies in Austin', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Cost and rebates', item: `${SITE}/solar-cost-austin/` },
      { '@type': 'ListItem', position: 3, name: 'Value of Solar', item: `${SITE}/value-of-solar-austin-energy/` } ] },
  ],
}));

// ---------- Area pages ----------
const AE_AREA_SRC = ['Austin Energy: service area', 'https://austinenergy.com/residential/residential-services'];
const AREA_PAGES = [
  { slug: 'south-austin', area: 'south', name: 'South Austin', h1: 'Solar companies in South Austin',
    places: 'South Austin, Sunset Valley, Manchaca and the 78704, 78745 and 78744 ZIP codes',
    utility: 'Most homes here are Austin Energy customers, so the $4,000 rebate applies when you hire a participating contractor. Austin Energy lists Sunset Valley and Manchaca in its service area besides the City of Austin.',
    refs: [AE_AREA_SRC] },
  { slug: 'north-austin-round-rock', area: 'north', name: 'North Austin, Round Rock and Pflugerville', h1: 'Solar companies in North Austin, Round Rock and Pflugerville',
    places: 'North Austin, Pflugerville, Round Rock, Cedar Park and Leander',
    utility: 'This area is split between utilities. Austin Energy serves North Austin and lists Pflugerville and Cedar Park in its service area. Other homes, including much of Round Rock, are on the Oncor network, where Oncor runs its own Residential Solar Program instead of the Austin Energy rebate. Check the utility named on your bill before you compare quotes.',
    refs: [AE_AREA_SRC, ['SolarReviews: Texas solar incentives', 'https://www.solarreviews.com/solar-incentives/texas'], ['NuWatt: Pflugerville solar costs', 'https://nuwattenergy.com/en/texas/pflugerville-solar-cost-2026']] },
  { slug: 'west-austin-hill-country', area: 'west', name: 'West Austin and the Hill Country', h1: 'Solar companies in West Austin and the Hill Country',
    places: 'West Austin, West Lake Hills, Rollingwood, Bee Cave, Lakeway, Oak Hill and Dripping Springs',
    utility: 'Austin Energy lists Bee Cave, Lakeway, Rollingwood, West Lake Hills and the Village of the Hills in its service area, so the $4,000 rebate is available there. Farther west many homes are served by Pedernales Electric Cooperative, which has no comparable solar rebate.',
    refs: [AE_AREA_SRC, ['Neuhaus Realty: solar panels guide Austin 2026', 'https://neuhausre.com/guides/solar-panels-guide-austin/']] },
  { slug: 'buda-san-marcos', area: 'hays', name: 'Buda, Kyle and San Marcos', h1: 'Solar companies in Buda, Kyle and San Marcos',
    places: 'Buda, Kyle, San Marcos and the rest of Hays County',
    utility: 'Austin Energy lists Buda in its service area, but many Hays County homes are on Pedernales Electric Cooperative. In San Marcos, the city utility SMTX Utilities offers its own solar rebate of up to $2,500.',
    refs: [AE_AREA_SRC, ['SolarReviews: Texas solar incentives', 'https://www.solarreviews.com/solar-incentives/texas'], ['EcoWatch: Buda solar incentives', 'https://www.ecowatch.com/solar/incentives/tx/buda']] },
];
for (const a of AREA_PAGES) {
  const list = companies.filter((c) => c.area === a.area);
  const others = AREA_PAGES.filter((o) => o !== a);
  write(`solar-companies/${a.slug}/index.html`, page({
    path: `/solar-companies/${a.slug}/`,
    title: `${a.h1}, TX (${list.length} Installers, 2026)`,
    description: `${list.length} solar companies based in ${a.name}, with phone numbers, Austin Energy rebate status and which utility serves the area.`,
    current: 'directory',
    body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / ${esc(a.name)}</p>
    <h1>${esc(a.h1)}</h1>
    <p>${list.length} solar companies with an office in ${esc(a.places)}.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="callout">
      <h2>Which utility serves you</h2>
      <p>${esc(a.utility)}</p>
    </div>
    <p class="section-intro" style="margin-top:2rem">These companies are based in or near ${esc(a.name)}. Most Austin installers also work across the whole metro area, so the <a href="/#directory">full directory of Austin solar companies</a> is worth a look too.</p>
    <ul class="list">
${list.map(row).join('\n')}
    </ul>
    <h2 style="margin-top:2.5rem">Other areas</h2>
    <ul class="area-links">
${others.map((o) => `      <li><a href="/solar-companies/${o.slug}/">${esc(o.h1)}</a></li>`).join('\n')}
      <li><a href="/biggest-solar-companies-austin/">The biggest solar companies in Austin compared</a></li>
    </ul>
    <h2 style="margin-top:2.5rem;font-size:1.3rem">Sources</h2>
    <ul class="sources">
${a.refs.map(([t, u]) => `      <li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join('\n')}
    </ul>
    <p class="note">Company locations are the office address each company lists. Checked ${UPDATED_TEXT}.</p>
  </div>
</section>`,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'ItemList', name: a.h1, numberOfItems: list.length,
        itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: `${SITE}/companies/${c.slug}/` })) },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Solar companies in Austin', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: a.name, item: `${SITE}/solar-companies/${a.slug}/` } ] },
    ],
  }));
}

// ---------- Biggest providers compared ----------
// Facts as published by the companies and by review sites; checked 17 Nov 2026. Sources listed on the page.
const BIG = [
  { slug: 'freedom-solar-power', name: 'Freedom Solar Power', founded: '2007', base: 'Austin', crews: 'Own crews, no subcontractors', work: '25 years', panels: '25 years product and performance', roof: '10 years', prod: 'Not stated', pay: [1, 1, 1, 1] },
  { slug: 'longhorn-solar', name: 'Longhorn Solar', founded: '2009', base: 'Pflugerville', crews: 'Own NABCEP-certified staff', work: '25 years', panels: '25 years equipment', roof: 'Within workmanship', prod: 'Not stated', pay: [1, 1, 0, 0] },
  { slug: 'tesla-energy', name: 'Tesla Energy', founded: '', base: 'Austin (company HQ)', crews: 'Varies by area', work: '10 years (comprehensive)', panels: '25 years performance', roof: '10 years (in comprehensive)', prod: 'Not stated', pay: [1, 1, 0, 0] },
  { slug: 'sunrun', name: 'Sunrun', founded: '2007', base: 'National', crews: 'Own crews; contracts allow subcontractors', work: '25 years with lease or PPA; 10 years if bought', panels: '25 years with lease or PPA', roof: '10 years', prod: '90% of estimate (lease or PPA)', pay: [1, 1, 1, 1] },
  { slug: 'palmetto', name: 'Palmetto', founded: '2009', base: 'Charleston, SC', crews: 'Partner installers (marketplace)', work: '25 years with LightReach lease; 10 years in many cash or loan deals', panels: '25 years', roof: '5 to 10 years', prod: '95% (Palmetto Protect, cash or loan)', pay: [1, 1, 1, 1] },
  { slug: 'good-faith-energy', name: 'Good Faith Energy', founded: '2014', base: 'Addison (Dallas area)', crews: 'Own employees, no subcontractors', work: '10 years', panels: '25 years product', roof: '5 years', prod: '25 years on power output', pay: [1, 1, 0, 0] },
  { slug: 'trismart-solar', name: 'TriSMART Solar', founded: '2013', base: 'Houston (office in Austin)', crews: 'Not stated', work: '25 years (company listing)', panels: '25 years', roof: '25 years (company listing)', prod: '25 years', pay: [1, 1, 0, 0] },
  { slug: 'freedom-forever-texas', name: 'Freedom Forever', founded: 'about 2011', base: 'Temecula, CA', crews: 'Subcontracted installers', work: '10 years (some reviews say none)', panels: 'Manufacturer warranty', roof: 'Not stated', prod: '25 years', pay: [1, 1, 1, 1] },
];
const BIG_SOURCES = [
  ['Freedom Solar: warranty', 'https://freedomsolarpower.com/warranty'],
  ['NerdWallet: Freedom Solar review', 'https://www.nerdwallet.com/home-ownership/solar/reviews/freedom-solar'],
  ['Best Company: Longhorn Solar', 'https://bestcompany.com/solar/longhorn-solar'],
  ['Tesla: solar panel warranty', 'https://tesla.com/support/energy/solar-panels/learn/warranty'],
  ['ConsumerAffairs: Tesla Energy', 'https://www.consumeraffairs.com/solar-energy/tesla-energy.html'],
  ['Best Company: Sunrun', 'https://www.bestcompany.com/solar/company/sunrun'],
  ['NerdWallet: Sunrun review', 'https://www.nerdwallet.com/home-ownership/solar/reviews/sunrun'],
  ['Palmetto: Palmetto Protect', 'https://help.palmetto.com/en/articles/6325836-palmetto-protect'],
  ['This Old House: Palmetto review', 'https://www.thisoldhouse.com/solar-alternative-energy/palmetto-solar-review'],
  ['ConsumerAffairs: Good Faith Energy', 'https://www.consumeraffairs.com/solar-energy/good-faith-energy.html'],
  ['Best Company: Good Faith Energy', 'https://bestcompany.com/solar/good-faith-energy'],
  ['EnergySage: TriSMART Solar', 'https://www.energysage.com/supplier/23626/trismart-solar'],
  ['NerdWallet: Freedom Forever review', 'https://www.nerdwallet.com/home-ownership/solar/reviews/freedom-forever'],
  ['EcoWatch: Freedom Forever review', 'https://www.ecowatch.com/solar/reviews/freedom-forever'],
  ['PV Tech: Freedom Forever files for Chapter 11', 'https://www.pv-tech.org/freedom-forever-files-for-chapter-11-bankruptcy-with-500-million-debts/'],
];
const mark = (v) => (v ? '<span class="yes" aria-label="Yes">✓</span>' : '<span class="no" aria-label="No">–</span>');
const bigLink = (b) => (companies.some((c) => c.slug === b.slug) ? `<a href="/companies/${b.slug}/">${esc(b.name)}</a>` : esc(b.name));
const bigAe = (b) => (companies.find((c) => c.slug === b.slug)?.aeListed ? 'Yes' : 'No');
write('biggest-solar-companies-austin/index.html', page({
  path: '/biggest-solar-companies-austin/',
  title: 'Biggest Solar Companies in Austin, TX Compared (2026)',
  description: 'Freedom Solar, Longhorn, Tesla, Sunrun, Palmetto, Good Faith Energy, TriSMART and Freedom Forever compared on warranties, installers, financing and the Austin Energy rebate.',
  current: 'big',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / Biggest providers compared</p>
    <h1>The biggest solar companies in Austin, compared</h1>
    <p>Eight of the best-known solar power companies serving Austin, TX, side by side on who installs, how long the warranties run and how you can pay.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <p class="section-intro">Freedom Solar and Longhorn Solar are the largest Austin-based installers here. Tesla, Sunrun, Palmetto and Freedom Forever sell nationwide, and Good Faith Energy and TriSMART work across Texas. Figures are what each company or a named review site publishes as of ${UPDATED_TEXT}. Warranties are contract terms, so get them in writing for your own quote.</p>

    <h2>At a glance</h2>
    <div class="table-scroll" style="margin:1.25rem 0 2.5rem">
      <table>
        <thead><tr><th>Company</th><th>Founded</th><th>Based in</th><th>Who installs</th><th>Austin Energy rebate partner</th></tr></thead>
        <tbody>
${BIG.map((b) => `          <tr><td>${bigLink(b)}</td><td class="num">${b.founded || 'Not stated'}</td><td>${esc(b.base)}</td><td>${esc(b.crews)}</td><td>${bigAe(b)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>

    <h2>Warranties</h2>
    <div class="table-scroll" style="margin:1.25rem 0 2.5rem">
      <table>
        <thead><tr><th>Company</th><th>Workmanship</th><th>Panels and equipment</th><th>Roof penetrations</th><th>Production guarantee</th></tr></thead>
        <tbody>
${BIG.map((b) => `          <tr><td>${bigLink(b)}</td><td>${esc(b.work)}</td><td>${esc(b.panels)}</td><td>${esc(b.roof)}</td><td>${esc(b.prod)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>

    <h2>How you can pay</h2>
    <div class="table-scroll" style="margin:1.25rem 0 1rem">
      <table class="marks">
        <thead><tr><th>Company</th><th>Cash</th><th>Loan</th><th>Lease</th><th>PPA</th></tr></thead>
        <tbody>
${BIG.map((b) => `          <tr><td>${bigLink(b)}</td>${b.pay.map((v) => `<td>${mark(v)}</td>`).join('')}</tr>`).join('\n')}
        </tbody>
      </table>
    </div>
    <p class="note">With a lease or PPA the company owns the panels. In 2026 that is the only way homeowners still get value from the federal tax credit. Austin Energy does not allow third-party PPAs in its service territory, so there the choice is buying, a loan or a lease. A lease runs 20 to 25 years and has to pass to a buyer if you sell. See <a href="/solar-cost-austin/">Austin solar costs and rebates</a>.</p>

    <h2 style="margin-top:2.5rem">Before you sign with a large provider</h2>
    <div class="prose">
      <ul>
        <li><strong>Freedom Forever</strong> filed for Chapter 11 bankruptcy protection on 15 April 2026 and keeps operating under court supervision. Ask who will honor the workmanship warranty.</li>
        <li><strong>Texas Attorney General</strong> announced in April 2026 an investigation into the sales practices of several residential installers, including Freedom Forever and Sunrun. An investigation is not a finding of wrongdoing.</li>
        <li><strong>Sunrun and Palmetto</strong> give their longest warranties to lease and PPA customers. If you buy, check which terms apply to you.</li>
        <li><strong>Palmetto</strong> does not install itself: a partner company in its network does the work, so ask which one.</li>
        <li><strong>Longhorn Solar</strong> was not on Austin Energy's participating contractor list when we checked, so it cannot file for the $4,000 rebate.</li>
      </ul>
    </div>

    <h2 style="margin-top:2.5rem">Sources</h2>
    <ul class="sources">
${BIG_SOURCES.map(([t, u]) => `      <li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join('\n')}
      <li><a href="https://austinenergy.com/green-power/solar-solutions/participating-solar-contractors" rel="noopener">Austin Energy: participating solar contractors</a></li>
    </ul>
    <p class="note">Checked on 17 November 2026. If you represent one of these companies and a figure is out of date, it will be corrected on request.</p>
  </div>
</section>`,
  jsonld: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Solar companies in Austin', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: 'Biggest providers compared', item: `${SITE}/biggest-solar-companies-austin/` } ] }],
}));

// ---------- Cost guide ----------
write('solar-cost-austin/index.html', page({
  path: '/solar-cost-austin/',
  title: 'Solar Panel Cost in Austin, TX (2026): Price per Watt & Rebates',
  description: 'What solar panels cost in Austin, TX in 2026: $2.84 per watt on average, prices for 5 to 12 kW systems, the $4,000 Austin Energy rebate and what changed with the federal tax credit.',
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
        <thead><tr><th>System size</th><th class="num">Price at $2.84 per watt</th><th class="num">After $4,000 rebate</th></tr></thead>
        <tbody>
          ${[5, 7, 9, 12].map((kw) => `<tr><td>${kw} kW</td><td class="num">$${(kw * 2840).toLocaleString('en-US')}</td><td class="num">$${(kw * 2840 - 4000).toLocaleString('en-US')}</td></tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
    <p class="note">These are arithmetic examples, not quotes. Batteries, roof work and premium panels add to the price.</p>
    <h3>Estimate your own system</h3>
    ${calculator}
    <p><a class="btn btn-ink" href="/solar-calculator-austin/">Full calculator: size, savings and payback</a></p>

    <h2>The Austin Energy solar rebate</h2>
    <p>Since 1 October 2026 Austin Energy pays a <strong>$4,000 rebate</strong> for a qualifying home solar system. You need an Austin Energy residential account, a new system of at least 3 kW (DC) that is mostly unshaded, and a participating solar contractor, who applies for you. The rebate confirmation letter has to arrive before installation starts. Step by step: <a href="/austin-energy-solar-rebate/">how to get the Austin Energy solar rebate</a>.</p>
    <p>The current contractor list is on <a href="https://austinenergy.com/green-power/solar-solutions/participating-solar-contractors" rel="noopener">austinenergy.com</a>. When we checked on 17 November 2026 it named ${AE_TOTAL} firms. ${companies.filter((c) => c.aeListed).length} of the ${companies.length} companies in this directory are on it, and each profile says whether it is.</p>

    <h2>Value of Solar instead of net metering</h2>
    <p>Austin Energy does not use traditional net metering. It credits every kilowatt-hour your system produces at the Value of Solar rate, <strong>12.89 cents per kWh</strong> for homes since 1 October 2026, and bills everything your home uses at normal rates. More in <a href="/value-of-solar-austin-energy/">how the Value of Solar rate works</a>.</p>

    <h2>Federal tax credit</h2>
    <p>The 30% federal tax credit for homeowner-owned residential systems ended on December 31, 2025, according to several installer and industry sources. With a lease, the company that owns the system can still claim a credit under Section 48E until the end of 2027, and some of that value may show up in the monthly price. Austin Energy does not allow third-party power purchase agreements (PPAs) in its service territory. Treat any 2026 quote that subtracts 30% for a purchased home system with caution, and confirm your situation with a tax professional. Other incentives, including Oncor, PEC, San Marcos and the Texas property tax exemption, are in <a href="/solar-incentives-austin/">solar incentives by utility</a>.</p>

    <h2>Why quotes from Austin solar companies differ</h2>
    <ul>
      <li>Equipment: premium panels and microinverters cost more than standard ones.</li>
      <li>Company type: national brands are reported to charge roughly 15 to 25% more than local installers.</li>
      <li>Roof: steep, tiled or shaded roofs take more labour.</li>
      <li>Hail: Central Texas sees several significant hail events a year, so ask about panel hail ratings.</li>
      <li>Batteries: a 13 kWh battery adds about $12,900 on average in Austin but provides backup during outages. See <a href="/solar-battery-austin/">solar batteries in Austin</a>.</li>
    </ul>
    <p style="margin-top:2rem"><a class="btn btn-ink" href="/#directory">Compare solar companies in Austin</a></p>
  </div>
</section>
<script src="/assets/app.js" defer></script>`,
}));

const SRC = {
  srCost: ['SolarReviews: solar panel cost in Austin', 'https://www.solarreviews.com/solar-panel-cost/texas/austin'],
  aeHome: ['Austin Energy: rebates for home solar systems', AE_HOME],
  aeVos: ['Austin Energy: Value of Solar rate', AE_VOS],
  aeList: ['Austin Energy: participating solar contractors', AE_LIST],
  aeRates: ['Austin Energy: residential rates', 'https://austinenergy.com/rates/residential-rates'],
  aeBattery: ['Austin Energy: Power Partner Battery', 'https://austinenergy.com/energy-efficiency/rebates-incentives/residential/appliances-equipment/pp-battery'],
  aeBatteryNews: ['City of Austin: Power Partner Battery pilot expands (16 Nov 2026)', 'https://www.austintexas.gov/communications/news/austin-energy-power-partner-program-expands-virtual-power-plant'],
  pvwatts: ['NREL: PVWatts calculator', 'https://pvwatts.nrel.gov/'],
  esBattery: ['EnergySage: storage cost in Austin, TX', 'https://www.energysage.com/local-data/energy-storage-cost/tx/williamson-county/austin/'],
  esPowerwall: ['EnergySage: Tesla Powerwall 3 review', 'https://www.energysage.com/solar/solar-energy-storage/tesla-powerwall-home-battery/'],
  oncor: ['Oncor: residential solar program', 'https://www.oncor.com/takealoadofftexas/pages/residentialsolar'],
  oncorManual: ['Oncor: 2026 solar program manual', 'https://www.oncor.com/content/dam/oncorwww/eepm/documents/commercial-resources/2026/2026%20Solar%20Manual%202_0.pdf.coredownload.pdf'],
  palmetto: ['Palmetto: Texas solar incentives', 'https://palmetto.com/local/texas/'],
  srOncor: ['SolarReviews: going solar with Oncor', 'https://solarreviews.com/going-solar-with-oncor-texas'],
  pecRates: ['PEC: DG interconnection rates', 'https://mypec.com/dg-interconnection-rates/'],
  pecUpdate: ['PEC: rate updates effective 1 March 2026', 'https://mypec.com/residential-rates/2026-rate-update/'],
  pecBill: ['PEC: average cost comparison, March 2026 (Texas Co-op Power)', 'https://mypec.com/wp-content/uploads/2025/06/pede2606.pdf'],
  smtx: ['EnergySage: Texas solar rebates and incentives', 'https://www.energysage.com/solar-rebates-incentives/tx/'],
  srTexas: ['SolarReviews: Texas solar incentives', 'https://www.solarreviews.com/solar-incentives/texas'],
  crs: ['Congressional Research Service: expiration of the residential clean energy credit', 'https://www.everycrsreport.com/reports/IN12611.html'],
  spw: ['Solar Power World: how H.R. 1 changes the residential solar ITC', 'https://www.solarpowerworldonline.com/2025/07/how-does-hr1-change-the-residential-solar-itc/'],
  form50123: ['Texas Comptroller: Form 50-123, solar exemption application', 'https://comptroller.texas.gov/forms/50-123.pdf'],
  taxCode: ['Texas Tax Code § 11.27', 'https://texas.public.law/statutes/tex._tax_code_section_11.27'],
  eiaRate: ['ElectricRates.org: Austin Energy rates (EIA-861 data)', 'https://electricrates.org/texas/electric-utilities/austin-energy/'],
};

// ---------- Solar calculator ----------
const D = EX.ae;
const calcForm = `<form class="sc" data-solar-calc data-mode="vos" data-utility="ae" novalidate aria-label="Solar calculator">
  <div class="sc-in">
    <h2 class="sc-title">Your home</h2>
    <label class="field"><span>Electric utility</span>
      <select name="utility">
        ${Object.entries(UTILITIES).map(([k, u]) => `<option value="${k}"${k === 'ae' ? ' selected' : ''}>${esc(u.label)}</option>`).join('\n        ')}
      </select>
      <small>It is named on your electric bill. <a href="/solar-incentives-austin/#utility">Which utility serves you?</a></small>
    </label>
    <label class="field"><span>Electricity use per month (kWh)</span>
      <input type="number" name="kwh" value="${EX_KWH}" min="0" max="10000" step="10" inputmode="numeric">
      <small>Your 12-month average from the bill. Austin Energy's reference home uses about 860 kWh.</small>
    </label>
    <div class="field-row">
      <label class="field"><span>Main roof faces</span>
        <select name="roof"><option value="s">South</option><option value="sesw">South-east or south-west</option><option value="ew">East or west</option><option value="flat">Flat roof</option></select>
      </label>
      <label class="field"><span>Shade on the roof</span>
        <select name="shade"><option value="none">Little or none</option><option value="some">Some, part of the day</option><option value="heavy">Heavy</option></select>
      </label>
    </div>
    <label class="field"><span>System size: <strong data-out="kw">${D.kw} kW</strong></span>
      <input type="range" name="kw" min="${ASSUME.minKw}" max="${ASSUME.maxKw}" step="0.5" value="${D.kw}">
      <small>Sized from your use. Move the slider to try another size. <button type="button" class="link-btn" data-auto hidden>Back to the recommended size</button></small>
    </label>
    <label class="check"><input type="checkbox" name="battery"> Add a home battery (about ${usd(ASSUME.batteryPrice)} installed)</label>
    <label class="check" data-show="ae"><input type="checkbox" name="aeContractor" checked> My installer is an Austin Energy participating contractor</label>
    <label class="field"><span data-extra-label>Other incentive, e.g. Sunset Valley rebate ($)</span><input type="number" name="extra" min="0" step="100" placeholder="0"></label>
    <details class="sc-adv"><summary>Change the assumptions</summary>
      <div class="field-row">
        <label class="field"><span>Price per watt ($)</span><input type="number" name="ppw" step="0.01" min="1" max="6" placeholder="${ASSUME.pricePerWatt}"></label>
        <label class="field"><span>Yearly output per kW (kWh)</span><input type="number" name="yield" step="10" min="800" max="2000" placeholder="${ASSUME.yieldPerKw}"></label>
        <label class="field" data-show="vos"><span>Value of Solar rate (¢/kWh)</span><input type="number" name="vos" step="0.01" min="0" placeholder="12.89"></label>
        <label class="field" data-show="split"><span>Your electricity rate (¢/kWh)</span><input type="number" name="retail" step="0.1" min="0" placeholder="15.0"></label>
        <label class="field" data-show="split"><span>Credit for exported solar (¢/kWh)</span><input type="number" name="exportRate" step="0.01" min="0" placeholder="9.00"></label>
        <label class="field" data-show="split"><span>Solar you use yourself (%)</span><input type="number" name="selfUse" step="5" min="0" max="100" placeholder="50"></label>
        <label class="field"><span>Yearly rise in power prices (%)</span><input type="number" name="escalation" step="0.5" min="-5" max="10" placeholder="${ASSUME.escalation * 100}"></label>
      </div>
      <p class="note">Leave a box empty to use the default shown in it.</p>
    </details>
  </div>
  <div class="sc-out" aria-live="polite">
    <p class="sc-kicker">Recommended system</p>
    <p class="sc-big" data-out="size">${D.kw} kW</p>
    <p class="sc-sub"><span data-out="panels">about ${D.panels} panels of ${ASSUME.panelWatts} W</span><br><span data-out="offset">covers about ${Math.round(D.offset * 100)}% of the electricity you use in a year</span></p>
    <dl class="sc-figs">
      <div><dt>Yearly production</dt><dd data-out="production">${kwhFmt(D.production)} kWh</dd><dd class="sub" data-out="productionMonth">about ${kwhFmt(D.production / 12)} kWh a month</dd></div>
      <div><dt>Price before incentives</dt><dd data-out="gross">${usd(D.gross)}</dd><dd class="sub" data-out="grossRange">solar ${usd(D.priceLow)} to ${usd(D.priceHigh)} at typical Austin prices</dd></div>
      <div><dt>Incentives</dt><dd data-out="incentives">−${usd(D.incentiveTotal)}</dd><dd class="sub"><ul data-out="incentiveList">${D.incentives.map(([n, v]) => `<li>${esc(n)}: ${usd(v)}</li>`).join('')}<li>Federal tax credit for a home system you buy: $0 (ended 31 December 2025)</li></ul></dd></div>
      <div class="sc-key"><dt>Your net cost</dt><dd data-out="net">${usd(D.net)}</dd></div>
      <div class="sc-key"><dt>Savings in year one</dt><dd data-out="year1">${usd(D.year1)}</dd><dd class="sub" data-out="month1">about ${usd(D.monthly)} a month in the first year</dd></div>
      <div class="sc-key"><dt>Payback</dt><dd data-out="payback">${payText(D)}</dd><dd class="sub"><span class="pay-bar" data-payback-bar style="--pay:${(D.payback / ASSUME.years) * 100}%"><span></span></span><span class="pay-scale"><span>0</span><span>25 years</span></span></dd></div>
      <div><dt>Net savings over 25 years</dt><dd data-out="lifetime">${usd(D.lifetimeNet)}</dd><dd class="sub" data-out="lifetimeNote">${usd(D.lifetime)} in savings minus the ${usd(D.net)} net cost</dd></div>
    </dl>
    <div class="sc-notes" data-out="notes"></div>
    <noscript><p class="note">The calculator needs JavaScript. The figures above are for an Austin Energy home using ${kwhFmt(EX_KWH)} kWh a month.</p></noscript>
    <p class="note">An estimate from published averages, not a quote. Compare at least three quotes on price per watt.</p>
    <div class="sc-actions">
      <a class="btn btn-sun" href="/austin-energy-solar-rebate/#partners" data-show="ae">Installers who can file the rebate</a>
      <a class="btn btn-line" href="/#directory">Compare Austin solar companies</a>
    </div>
  </div>
</form>`;

const calcFaq = [
  ['How many solar panels do I need in Austin?', `Divide your yearly electricity use in kWh by about ${ASSUME.yieldPerKw.toLocaleString('en-US')} to get the system size in kW. A home using ${kwhFmt(EX_KWH)} kWh a month needs about ${D.kw} kW, or roughly ${D.panels} panels of ${ASSUME.panelWatts} W, on an unshaded south-facing roof. East- or west-facing roofs need about 15% more panels.`],
  ['How much electricity does a solar panel produce in Austin?', `About ${ASSUME.yieldPerKw.toLocaleString('en-US')} kWh per kW of panels per year on a south-facing roof without shade, so one ${ASSUME.panelWatts} W panel makes roughly ${kwhFmt(ASSUME.yieldPerKw * ASSUME.panelWatts / 1000)} kWh a year. Summer months produce about twice as much as December and January.`],
  ['How long does solar take to pay for itself in Austin?', `For an Austin Energy customer, the example ${D.kw} kW system costs about ${usd(D.net)} after the $4,000 rebate and earns about ${usd(D.year1)} in Value of Solar credits in the first year, so it pays back in about ${payText(D)}. In PEC and Oncor areas payback is usually longer unless you get an Oncor incentive.`],
  ['Can I still get the 30% federal solar tax credit in 2026?', 'No, not for a system you buy. The residential clean energy credit (Section 25D) does not apply to expenditures made after 31 December 2025. Leased systems are owned by a company, which may still claim a business credit and pass some of it on in the monthly price.'],
  ['Does a battery pay off with Austin Energy?', 'Rarely on savings alone. Austin Energy credits every kWh your panels produce at the same Value of Solar rate whether you use it or not, so storing it does not raise the credit. A battery pays you through the $500 Power Partner Battery rebate and yearly event payments, and keeps power on during outages.'],
];

write('solar-calculator-austin/index.html', page({
  path: '/solar-calculator-austin/',
  title: 'Solar Calculator for Austin, TX: Size, Savings & Rebates (2026)',
  description: `Free solar panel calculator for Austin homes. Enter your monthly kWh and utility to see the system size, price, the $4,000 Austin Energy rebate and other incentives, yearly savings and payback.`,
  current: 'calc',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / Solar calculator</p>
    <h1>Austin solar calculator: size, savings and rebates</h1>
    <p>How big a system your home needs, what it costs after the Austin Energy rebate or your utility's incentive, what it saves and when it pays for itself.</p>
  </div>
</section>
<section class="section section-tight">
  <div class="wrap">
    ${calcForm}
  </div>
</section>
<section class="section section-sky">
  <div class="wrap prose">
    <h2>The same home in four service areas</h2>
    <p>A home using ${kwhFmt(EX_KWH)} kWh a month with an unshaded south-facing roof, a ${D.kw} kW system at $${ASSUME.pricePerWatt} per watt, no battery:</p>
    ${exampleTable()}
    <p class="note">Oncor areas are shown without an Oncor incentive because it is set per project. Read more in <a href="/is-solar-worth-it-austin/">is solar worth it in Austin?</a></p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>How the calculator works</h2>
    <h3>System size and production</h3>
    <p>The recommended size is your yearly use divided by the yearly output of one kW of panels, rounded to half a kW and kept between ${ASSUME.minKw} and ${ASSUME.maxKw} kW. Covering about 100% of your use is the sensible ceiling with every Austin-area utility, because surplus credit is never paid out in cash.</p>
    <p>One kW of panels is assumed to make ${ASSUME.yieldPerKw.toLocaleString('en-US')} kWh a year on a south-facing, unshaded roof. Published estimates for Austin run from about 1,450 to 1,650 kWh. East or west roofs are counted at 85%, south-east and south-west at 96%, flat roofs at 90%; some shade removes 10% and heavy shade 25%. For your exact roof, NREL's free <a href="https://pvwatts.nrel.gov/" rel="noopener">PVWatts calculator</a> gives a month-by-month estimate.</p>
    <h3>Price</h3>
    <p>$${ASSUME.pricePerWatt} per watt is SolarReviews' 2026 average for Austin, with $${ASSUME.priceLow} to $${ASSUME.priceHigh} as the typical range. A battery is priced at ${usd(ASSUME.batteryPrice)}, EnergySage's November 2026 average for a 13 kWh battery installed in Austin.</p>
    <h3>Savings by utility</h3>
    <ul>
      <li><strong>Austin Energy:</strong> every kWh produced is credited at the Value of Solar rate of 12.89 cents, up to the size of your electric bill. The bill is worked out from Austin Energy's inside-city residential rates: the $17.35 customer charge, the four energy tiers and the per-kWh power supply, community benefit and regulatory charges. A ${kwhFmt(EX_KWH)} kWh month comes to about ${usd(aeMonthlyBill(EX_KWH))}. The $4,000 rebate is included when the system is at least 3 kW, mostly unshaded and installed by a participating contractor.</li>
      <li><strong>Oncor areas:</strong> half the solar is assumed to be used in the home, saving 15 cents per kWh (the Texas residential average was 15.4 cents in 2025), and the rest is sold back at 9 cents. Buyback plans from retail providers range from nothing to about 15 cents, so enter yours. With a battery the home share rises to 85%.</li>
      <li><strong>PEC:</strong> solar used at home saves about 13 cents per kWh (PEC's March 2026 average bill was $162.31 for 1,250 kWh) and surplus earns the Sustainable Power Credit of 7.1921 cents.</li>
      <li><strong>SMTX Utilities:</strong> the rebate of $1 per watt, up to $2,500 and no more than half the installed cost, is included. Enter your own electricity and buyback rates; the defaults are placeholders.</li>
    </ul>
    <h3>Over 25 years</h3>
    <p>The value of each solar kWh is assumed to rise ${ASSUME.escalation * 100}% a year, and panels lose ${ASSUME.degradation * 100}% of their output a year. Payback is the point at which cumulative savings equal the net cost. Not included: loan interest, an inverter replacement, the property tax exemption, Power Partner event payments and any effect on your home's value.</p>

    <h2>Questions</h2>
    ${faqHtml(calcFaq)}

    <h2>Sources</h2>
    ${srcList([SRC.srCost, SRC.aeVos, SRC.aeHome, SRC.aeRates, SRC.esBattery, SRC.pvwatts, SRC.eiaRate, SRC.srOncor, SRC.pecRates, SRC.pecBill, SRC.smtx, SRC.crs])}
    <p class="note">${CHECKED} Rates and programs change; the calculator is updated when they do.</p>
  </div>
</section>
<script type="module" src="/assets/calculator.js"></script>`,
  jsonld: [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Austin solar calculator', url: `${SITE}/solar-calculator-austin/`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description: 'Estimates solar system size, cost, incentives, savings and payback for homes in Austin, Texas.' },
    faqLd(calcFaq),
    crumbLd([['Solar companies in Austin', '/'], ['Solar calculator', '/solar-calculator-austin/']]),
  ],
}));

// ---------- Incentives by utility ----------
const incFaq = [
  ['What solar incentives are available in Austin in 2026?', 'Austin Energy customers get a $4,000 rebate through a participating contractor, Value of Solar credits of 12.89 cents for every kWh produced, and a $500 rebate for a new battery enrolled in Power Partner Battery. Every Texas homeowner can also claim the property tax exemption for the value solar adds to the home.'],
  ['Is there a Texas state solar tax credit?', 'No. Texas has no state income tax and no state solar tax credit. The statewide incentive is the property tax exemption under Tax Code section 11.27, claimed with Form 50-123 at your county appraisal district.'],
  ['Does Round Rock have a solar rebate?', 'It depends on the utility on your bill. Homes on the Oncor network can get Oncor\'s project-specific incentive through a registered installer while funds last. Homes served by Austin Energy or PEC follow those utilities\' rules instead.'],
  ['Can I still claim the federal solar tax credit?', 'Only if your system counted as an expenditure by 31 December 2025. For systems bought after that the homeowner credit (Section 25D) is gone. Unused credit from an earlier year can still be carried forward.'],
];
write('solar-incentives-austin/index.html', page({
  path: '/solar-incentives-austin/',
  title: 'Solar Incentives in Austin & Central Texas 2026: Rebates by Utility',
  description: 'Every solar incentive for Austin-area homes in 2026: the $4,000 Austin Energy rebate, Oncor, PEC, San Marcos and Sunset Valley, the Texas property tax exemption, battery rebates and the end of the federal tax credit.',
  current: 'cost',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / <a href="/solar-cost-austin/">Cost and rebates</a> / Incentives by utility</p>
    <h1>Solar incentives in Austin and Central Texas</h1>
    <p>What you can get depends on the utility named on your electric bill, not on your city. Here is every program that applies around Austin in 2026.</p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>At a glance</h2>
    <div class="table-scroll" style="margin:1rem 0 1rem">
      <table>
        <thead><tr><th>Utility</th><th>Upfront incentive</th><th>How your solar is credited</th></tr></thead>
        <tbody>
          <tr><td><strong>Austin Energy</strong></td><td>$4,000 rebate via a participating contractor; $500 per new battery (Power Partner Battery)</td><td>Value of Solar: 12.89¢ for every kWh produced; surplus credit rolls over</td></tr>
          <tr><td><strong>Oncor</strong> (retail choice areas)</td><td>Project-specific incentive paid to registered installers, reported as up to $9,000; limited funds</td><td>Set by your retail provider's buyback plan, from nothing to about 15¢</td></tr>
          <tr><td><strong>Pedernales Electric Co-op (PEC)</strong></td><td>No solar rebate found</td><td>Self-used solar avoids the full rate; surplus earns 7.1921¢ against the base power charge, expiring yearly</td></tr>
          <tr><td><strong>SMTX Utilities</strong> (San Marcos)</td><td>$1 per watt, up to $2,500 and half the installed cost</td><td>Check SMTX's buyback terms</td></tr>
          <tr><td><strong>Georgetown Utility Systems</strong></td><td>No current solar rebate found</td><td>Check GUS's interconnection terms</td></tr>
          <tr><td><strong>All of Texas</strong></td><td>Property tax exemption for the value solar adds</td><td>No federal credit for systems bought in 2026</td></tr>
        </tbody>
      </table>
    </div>
    <p><a class="btn btn-ink" href="/solar-calculator-austin/">Work out your savings with these incentives</a></p>

    <h2 id="utility">Which utility serves you</h2>
    <p>Austin has no retail choice, but its suburbs are split between several utilities. Look at the name on your electric bill:</p>
    <ul>
      <li><strong>Austin Energy</strong> serves the City of Austin and lists Sunset Valley, Manchaca, Pflugerville, Cedar Park, Bee Cave, Lakeway, Rollingwood, West Lake Hills, the Village of the Hills and Buda in its service area, though not every street in those places.</li>
      <li><strong>Oncor</strong> runs the wires in much of Round Rock and other areas where you pick a retail electricity provider.</li>
      <li><strong>Pedernales Electric Cooperative</strong> serves much of the Hill Country, western Travis County and Hays County, including parts of Leander, Cedar Park and the Lake Travis area.</li>
      <li><strong>SMTX Utilities</strong> serves the City of San Marcos, and <strong>Georgetown Utility Systems</strong> the City of Georgetown.</li>
    </ul>

    <h2>Austin Energy</h2>
    <p>Austin Energy pays a <strong>$4,000 rebate</strong> for a new home system of at least 3 kW (DC) that is mostly unshaded, installed by a participating contractor, who applies for you. Austin Energy's confirmation letter must arrive before installation. The rebate was $2,500 before 1 October 2026. Details: <a href="/austin-energy-solar-rebate/">how to get the Austin Energy solar rebate</a>.</p>
    <p>Instead of net metering, Austin Energy credits every kWh your panels produce at the <strong>Value of Solar rate of 12.89 cents</strong>, up from 9.91 cents before October 2026. Credits reduce the electric part of your bill and roll over, but are never paid out. See <a href="/value-of-solar-austin-energy/">the Value of Solar rate explained</a>.</p>
    <p>Battery owners can join <strong>Power Partner Battery</strong>: a $500 rebate for each battery that receives permission to operate after 18 February 2025, plus $75 per kW of average output during grid events each year. Solar is not required, and third-party-owned batteries are not eligible. More in <a href="/solar-battery-austin/">solar batteries in Austin</a>.</p>
    <p><strong>Sunset Valley</strong> homeowners: SolarReviews lists a city rebate of $1 per watt, up to $3,000, for homes that also receive Austin Energy's rebate. Confirm it with the City of Sunset Valley before you count on it.</p>

    <h2>Oncor areas, including much of Round Rock</h2>
    <p>Oncor runs a solar standard offer program that pays an incentive to registered installers, who pass it on in your price. The amount is set per project; Palmetto describes the 2026 residential incentive as up to $9,000, and Oncor's earlier rules capped residential projects at 15 kW (DC). Funds are limited each year and projects can be waitlisted, so ask your installer whether they are registered with Oncor and what your project qualifies for.</p>
    <p>What you earn for surplus solar depends on your retail provider. SolarReviews lists buyback plans paying from nothing to about 15 cents per kWh, some of them only up to your monthly use. Compare the buyback terms as carefully as the energy rate.</p>

    <h2>Pedernales Electric Cooperative</h2>
    <p>PEC has no upfront solar rebate that we could find. Solar you use at home avoids PEC's full charges. Surplus you send to the grid earns the Sustainable Power Credit of 7.1921 cents per kWh since 1 March 2026, down from 8.2666 cents. The credit only offsets the base power charge, and unused credit expires at the end of each calendar year. Since March 2026 PEC also offers an interconnect time-of-use rate with a 12-month commitment.</p>
    <p>Because exports earn less than the full rate, sizing a PEC system below your yearly use, or adding a battery, keeps more of the value. See the <a href="/solar-companies/west-austin-hill-country/">West Austin and Hill Country</a> page for installers nearby.</p>

    <h2>San Marcos and Georgetown</h2>
    <p>SMTX Utilities pays $1 per watt for a new solar system, up to $2,500 and never more than half its installed cost, according to EnergySage. In Georgetown we found no current solar rebate from Georgetown Utility Systems; ask GUS about its interconnection terms before you get quotes.</p>

    <h2>Texas property tax exemption</h2>
    <p>Texas Tax Code section 11.27 exempts from property tax the value a solar energy device adds to your home, as long as it mainly produces energy for use on site. You claim it once with <a href="https://comptroller.texas.gov/forms/50-123.pdf" rel="noopener">Form 50-123</a> at your county appraisal district (Travis, Williamson or Hays CAD), not with the IRS or your utility.</p>

    <h2>The federal solar tax credit in 2026</h2>
    <p>The 30% residential clean energy credit (Section 25D) does not apply to expenditures made after 31 December 2025, under the 2025 budget law (P.L. 119-21). It covered both solar and home batteries. Credit you could not use on your 2025 return can still be carried forward.</p>
    <p>With a lease, the leasing company owns the system and may still claim a business credit under Section 48E for systems in service by the end of 2027, and some of that can show up as a lower monthly payment. Austin Energy does not allow third-party power purchase agreements in its territory. If a 2026 quote for a system you buy still subtracts 30%, ask the installer to explain it in writing and check with a tax professional.</p>

    <h2>Questions</h2>
    ${faqHtml(incFaq)}

    <h2>Sources</h2>
    ${srcList([SRC.aeHome, SRC.aeVos, SRC.aeBattery, SRC.aeBatteryNews, SRC.oncor, SRC.oncorManual, SRC.palmetto, SRC.srOncor, SRC.pecRates, SRC.pecUpdate, SRC.smtx, SRC.srTexas, SRC.taxCode, SRC.form50123, SRC.crs, SRC.spw])}
    <p class="note">${CHECKED} Utility programs change and can run out of funds. Confirm with your utility before you sign.</p>
  </div>
</section>`,
  jsonld: [faqLd(incFaq), crumbLd([['Solar companies in Austin', '/'], ['Cost and rebates', '/solar-cost-austin/'], ['Solar incentives by utility', '/solar-incentives-austin/']])],
}));

// ---------- Batteries ----------
const batteryCos = companies.filter((c) => c.services.includes('Battery') && c.type === 'local' && !c.noindex);
const BAT = ex('ae', { battery: true });
const batFaq = [
  ['How much does a solar battery cost in Austin?', 'EnergySage put the average at $12,904 for a 13 kWh battery installed in Austin in November 2026, or about $993 per kWh, with most quotes between $10,968 and $14,840. Whole-home backup usually needs two or more batteries.'],
  ['Does Austin Energy pay you for a home battery?', 'Yes. Power Partner Battery pays a $500 rebate for each new battery that got permission to operate after 18 February 2025, plus $75 per kW of average output during grid events each year. You do not need solar panels to join.'],
  ['Is a battery worth it with Austin Energy solar?', 'Not for bill savings alone. Austin Energy credits all solar production at one Value of Solar rate, so a battery does not increase that credit. The case for one is backup during outages plus the Power Partner payments.'],
  ['How long will a battery run my house in an outage?', 'A 13.5 kWh battery such as the Tesla Powerwall 3 can run a refrigerator, lights, internet and some outlets for a day or more, especially with solar recharging it. Central air conditioning drains it in a few hours, so most owners back up selected circuits only.'],
];
write('solar-battery-austin/index.html', page({
  path: '/solar-battery-austin/',
  title: 'Solar Batteries in Austin, TX: Cost, Rebates & Are They Worth It (2026)',
  description: 'What a home battery costs in Austin in 2026, the Austin Energy Power Partner Battery rebate of $500 plus $75 per kW a year, whether a battery pays off with Value of Solar, and installers who fit them.',
  current: 'cost',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / <a href="/solar-cost-austin/">Cost and rebates</a> / Solar batteries</p>
    <h1>Solar batteries in Austin: cost, rebates and when they pay</h1>
    <p>A battery keeps the lights on when the grid goes down. Whether it saves money depends on your utility.</p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>What a battery costs</h2>
    <dl class="figures figures-3">
      <div><dt>Average 13 kWh battery, installed</dt><dd>$12,904<small>EnergySage, Austin, November 2026</small></dd></div>
      <div><dt>Typical range</dt><dd>$10,968–$14,840<small>About $993 per kWh</small></dd></div>
      <div><dt>Tesla Powerwall 3, typical</dt><dd>$13,473<small>EnergySage marketplace, 2026</small></dd></div>
    </dl>
    <p>The federal tax credit no longer helps: like solar, home batteries bought after 2025 no longer qualify for the 30% credit. Prices rise with extra units, a main panel upgrade or a separate critical-loads panel.</p>

    <h2>Austin Energy Power Partner Battery</h2>
    <ul>
      <li><strong>$500 rebate</strong> for each battery system that receives permission to operate after passing Austin Energy's final inspection on or after 18 February 2025.</li>
      <li><strong>$75 per kW per year</strong>, based on the average power your battery delivers during Power Partner events.</li>
      <li>Solar panels are not required. Third-party-owned or operated batteries are not eligible.</li>
      <li>Austin Energy typically does not call events when a severe storm is forecast, so the battery stays charged for backup.</li>
    </ul>
    <p>The pilot launched in March 2026 and was expanded on 16 November 2026. Enrollment usually runs through your battery maker's app.</p>

    <h2>Does a battery pay off?</h2>
    <p><strong>With Austin Energy, rarely on savings alone.</strong> Austin Energy credits every kWh your panels produce at the Value of Solar rate, whether you use it, store it or send it to the grid. Storing solar does not raise that credit. In our example home, adding a battery raises the net cost from ${usd(EX.ae.net)} to ${usd(BAT.net)} and stretches payback from ${payText(EX.ae)} to ${payText(BAT)}, before Power Partner payments. The reasons to buy one are backup power and those yearly payments.</p>
    <p><strong>With PEC or an Oncor-area retail plan, it can help.</strong> There, surplus solar earns less than the electricity you buy, so moving midday solar into the evening is worth the difference. In Oncor areas the utility incentive has often been tied to storage, which can cut the battery's cost. Run both cases in the <a href="/solar-calculator-austin/">solar calculator</a>.</p>

    <h2>Backup: what a battery can run</h2>
    <p>One 13.5 kWh battery, such as the Tesla Powerwall 3, can keep a refrigerator, lights, internet, fans and some outlets going for a day or more, longer when panels recharge it. Central air conditioning or an electric range will drain it within hours. Many owners back up selected circuits; whole-home backup usually takes two or three batteries. Ask each installer for a load list showing what stays on.</p>

    <h2>Austin-area installers that fit batteries</h2>
    <ul class="area-links">
${batteryCos.map((c) => `      <li><a href="/companies/${c.slug}/">${esc(c.name)}</a> (${esc(c.city)})</li>`).join('\n')}
    </ul>
    <p>Filter the <a href="/#directory">full directory</a> by "Battery" to include Texas-wide and national companies.</p>

    <h2>Questions</h2>
    ${faqHtml(batFaq)}

    <h2>Sources</h2>
    ${srcList([SRC.esBattery, SRC.esPowerwall, SRC.aeBattery, SRC.aeBatteryNews, SRC.aeVos, SRC.spw, SRC.oncor])}
    <p class="note">${CHECKED}</p>
  </div>
</section>`,
  jsonld: [faqLd(batFaq), crumbLd([['Solar companies in Austin', '/'], ['Cost and rebates', '/solar-cost-austin/'], ['Solar batteries', '/solar-battery-austin/']])],
}));

// ---------- Is solar worth it ----------
const sizes = [600, 1000, 1500, 2000].map((m) => [m, estimate({ utility: 'ae', monthlyKwh: m, roof: 's', shade: 'none', aeContractor: true })]);
const ewAe = ex('ae', { roof: 'ew' });
const worthFaq = [
  ['Is solar worth it in Austin, Texas?', `For most Austin Energy customers with an unshaded roof, yes. A ${D.kw} kW system for a home using ${kwhFmt(EX_KWH)} kWh a month costs about ${usd(D.net)} after the $4,000 rebate, earns about ${usd(D.year1)} in its first year and pays back in about ${payText(D)}, leaving roughly ${usd(D.lifetimeNet)} over 25 years.`],
  ['Why is solar payback longer in Austin than in some other states?', 'Austin Energy\'s electricity is cheaper than the US average, and the federal tax credit ended for systems bought after 2025. The $4,000 rebate and the 12.89 cent Value of Solar credit make up for part of that.'],
  ['Is it better to buy or lease solar in Austin?', 'Buying usually saves more over 25 years and keeps the Austin Energy rebate and credits with you. A lease needs no upfront money and may pass on part of a business tax credit, but it runs 20 to 25 years and has to be taken over by a buyer if you sell. Third-party power purchase agreements are not allowed in Austin Energy\'s territory.'],
  ['When is solar not worth it?', 'When the roof is heavily shaded, needs replacing within a few years, or faces mostly north; when you expect to move soon and the buyer may not value the system; and in areas where surplus solar earns little and no incentive applies.'],
];
write('is-solar-worth-it-austin/index.html', page({
  path: '/is-solar-worth-it-austin/',
  title: 'Is Solar Worth It in Austin, TX? 2026 Payback by Utility',
  description: `Is solar worth it in Austin in 2026? Payback in about ${Math.round(D.payback)} years for a typical Austin Energy home, how Oncor and PEC areas compare, what changed with the tax credit, and when solar does not pay.`,
  current: 'cost',
  body: `
<section class="page-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Solar companies in Austin</a> / <a href="/solar-cost-austin/">Cost and rebates</a> / Is solar worth it?</p>
    <h1>Is solar worth it in Austin?</h1>
    <p>For most Austin Energy homes with a sunny roof, yes: payback in about ${payText(D)}. Here is the arithmetic, and the cases where it does not work.</p>
  </div>
</section>
<section class="section">
  <div class="wrap prose">
    <h2>The short answer</h2>
    <dl class="figures figures-3">
      <div><dt>Net cost, ${D.kw} kW after rebate</dt><dd>${usd(D.net)}<small>${usd(D.gross)} at $${ASSUME.pricePerWatt}/W, minus $4,000</small></dd></div>
      <div><dt>Credit in year one</dt><dd>${usd(D.year1)}<small>${kwhFmt(D.production)} kWh × 12.89¢</small></dd></div>
      <div><dt>Payback</dt><dd>${payText(D)}<small>Then about ${usd(D.lifetimeNet)} net over 25 years</small></dd></div>
    </dl>
    <p>That is an Austin Energy home using ${kwhFmt(EX_KWH)} kWh a month, with a south-facing unshaded roof, paying cash at the 2026 Austin average price. On an east- or west-facing roof the same home needs ${ewAe.kw} kW and pays back in about ${payText(ewAe)}. Try your own numbers in the <a href="/solar-calculator-austin/">Austin solar calculator</a>.</p>

    <h2>Payback by utility</h2>
    <p>The same ${D.kw} kW system on the same house, in four service areas:</p>
    ${exampleTable()}
    <p>Austin Energy comes out ahead because of the $4,000 rebate and because its Value of Solar credit pays for every kWh produced, while PEC and most Oncor-area plans pay less for surplus than you pay for electricity. An Oncor incentive, which is set per project, can close much of that gap. All programs are listed in <a href="/solar-incentives-austin/">solar incentives by utility</a>.</p>

    <h2>Payback by home size (Austin Energy)</h2>
    <div class="table-scroll" style="margin:1.25rem 0 1rem">
      <table>
        <thead><tr><th class="num">Use per month</th><th class="num">System</th><th class="num">Net cost</th><th class="num">Year-one credit</th><th class="num">Payback</th></tr></thead>
        <tbody>
${sizes.map(([m, r]) => `          <tr><td class="num">${kwhFmt(m)} kWh</td><td class="num">${r.kw} kW</td><td class="num">${usd(r.net)}</td><td class="num">${usd(r.year1)}</td><td class="num">${payText(r)}</td></tr>`).join('\n')}
        </tbody>
      </table>
    </div>
    <p>Smaller systems pay back a little sooner because the fixed $4,000 rebate covers a larger share of their price, while every extra kW earns the same credit per kWh. That only holds up to your own use: credit beyond your bill is never paid out.</p>

    <h2>What makes solar pay in Austin</h2>
    <ul>
      <li><strong>Sun:</strong> about ${ASSUME.yieldPerKw.toLocaleString('en-US')} kWh per kW of panels a year, above the US average.</li>
      <li><strong>A fixed credit:</strong> Austin Energy's Value of Solar rate rose to 12.89 cents in October 2026 from 9.91 cents. It is reviewed every three years, so it can move either way.</li>
      <li><strong>The $4,000 rebate,</strong> up from $2,500, via a participating contractor.</li>
      <li><strong>No property tax</strong> on the value solar adds, under Texas Tax Code section 11.27.</li>
    </ul>

    <h2>What works against it</h2>
    <ul>
      <li><strong>No federal tax credit</strong> for systems bought after 2025, which used to take 30% off the price.</li>
      <li><strong>Cheap grid power:</strong> Austin Energy residential customers paid an average of 13.1 cents per kWh in 2025, below the Texas and US averages.</li>
      <li><strong>Shade, an old roof or a short stay.</strong> Replacing a roof later means paying to remove and refit the panels, so re-roof first if the roof is near the end of its life.</li>
      <li><strong>Hail.</strong> Central Texas sees several significant hail events a year. Check the panels' hail rating and that your homeowner's policy covers the system.</li>
      <li><strong>Loans:</strong> interest at today's rates can add years to payback. Compare the loan's total cost with paying cash.</li>
    </ul>

    <h2>Buy, finance or lease?</h2>
    <p>Buying with cash gives the shortest payback and keeps the rebate, the credits and the property tax exemption with you. A loan spreads the cost, but compare the total of all payments with the cash price, because dealer fees can be built into the loan. A lease needs no money upfront and the leasing company may pass on part of its business tax credit, but it runs 20 to 25 years and has to be taken over by a buyer if you sell. Power purchase agreements are not allowed in Austin Energy's territory.</p>

    <h2>Questions</h2>
    ${faqHtml(worthFaq)}

    <p style="margin-top:2rem"><a class="btn btn-ink" href="/#directory">Compare Austin solar companies</a></p>

    <h2>Sources</h2>
    ${srcList([SRC.srCost, SRC.aeVos, SRC.aeHome, SRC.aeRates, SRC.eiaRate, SRC.pecRates, SRC.pecBill, SRC.srOncor, SRC.palmetto, SRC.smtx, SRC.taxCode, SRC.crs])}
    <p class="note">${CHECKED} Examples use the assumptions explained on the <a href="/solar-calculator-austin/">calculator page</a>. They are estimates, not quotes.</p>
  </div>
</section>`,
  jsonld: [faqLd(worthFaq), crumbLd([['Solar companies in Austin', '/'], ['Cost and rebates', '/solar-cost-austin/'], ['Is solar worth it?', '/is-solar-worth-it-austin/']])],
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
    <p>Companies marked as not yet reviewed come from Austin Energy's list of participating solar contractors, copied on 17 November 2026. For those, the directory shows only what that list states: address, phone number and whether they install residential or commercial systems. Details are added as each company is reviewed.</p>
    <h2>How price levels are set</h2>
    <p>Most installers do not publish prices. A price level appears only where a company publishes per-watt pricing or states its own positioning, and each profile says what the level is based on. Everything else is marked as priced by quote.</p>
    <h2>Independence</h2>
    <p>Listings are free. No company pays to be included or to appear higher, and the order is not a ranking of quality.</p>
    <h2>Corrections</h2>
    <p>Details change. If you represent a listed company and something is wrong or out of date, the listing will be corrected on request. Always confirm prices, licenses and warranty terms with the company itself.</p>
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
copyFileSync(join(root, 'src/calculator.js'), join(out, 'assets/calculator.js'));
copyFileSync(join(root, 'src/solar-model.js'), join(out, 'assets/solar-model.js'));
copyFileSync(join(root, 'src/og.jpg'), join(out, 'assets/og.jpg'));
for (const dir of ['fonts', 'leaflet', 'leaflet/images']) {
  mkdirSync(join(out, 'assets', dir), { recursive: true });
  for (const f of readdirSync(join(root, 'src', dir), { withFileTypes: true })) if (f.isFile()) copyFileSync(join(root, 'src', dir, f.name), join(out, 'assets', dir, f.name));
}
write(`${INDEXNOW_KEY}.txt`, INDEXNOW_KEY);
if (existsSync(join(root, 'logos-opt'))) {
  mkdirSync(join(out, 'assets/logos'), { recursive: true });
  for (const f of readdirSync(join(root, 'logos-opt'))) if (f.endsWith('.webp')) copyFileSync(join(root, 'logos-opt', f), join(out, 'assets/logos', f));
}
write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#17224d"/><circle cx="16" cy="16" r="8" fill="#ffc531"/></svg>`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
// Sitemap: every indexable page, lastmod = the day its HTML last changed (tracked in tools/lastmod.json).
const LASTMOD_FILE = join(root, 'tools/lastmod.json');
const known = existsSync(LASTMOD_FILE) ? JSON.parse(readFileSync(LASTMOD_FILE, 'utf8')) : {};
const lastmod = {};
for (const [u, h] of [...PAGE_HASH].sort()) lastmod[u] = known[u]?.hash === h ? known[u] : { hash: h, date: UPDATED };
writeFileSync(LASTMOD_FILE, JSON.stringify(lastmod, null, 1) + '\n');
const urls = [...PAGE_HASH.keys()].filter((u) => u !== '/404.html' && !NOINDEX.has(u));
urls.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : (a.startsWith('/companies/') - b.startsWith('/companies/')) || a.localeCompare(b)));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmod[u].date}</lastmod></url>`).join('\n')}\n</urlset>\n`);

console.log(`Built ${urls.length} pages into public/`);
