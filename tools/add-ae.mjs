// Adds Austin Energy participating contractors that are not yet in data/companies.json.
// Source: tools/ae-2026-11-17.txt (copied from austinenergy.com on 17 Nov 2026).
import { readFileSync, writeFileSync } from 'node:fs';
const companies = JSON.parse(readFileSync('data/companies.json', 'utf8'));
const lines = readFileSync('tools/ae-2026-11-17.txt', 'utf8').trim().split('\n').map((l) => l.split('|'));
const have = new Set(['512 Solar', 'Alba Energy', 'ATMA Energy', 'ATX Solar LLC', 'Freedom Solar', 'Good Faith Energy', 'Greenbelt Solar LLC', 'Greenstar Power', 'HEsolar LLC', 'Lighthouse Solar', 'NATiVE Solar', 'Palmetto Solar', 'Tesla Energy Operations, Inc.', 'Texas Solar Guys', 'Texas Solar Power Co.']);
// Approximate area centre per ZIP / city (district level, like the existing pins).
const ZIP = { '78746': ['west', 30.29, -97.80], '78704': ['south', 30.243, -97.765], '78745': ['south', 30.207, -97.796], '78750': ['north', 30.44, -97.80], '78744': ['south', 30.18, -97.74], '78759': ['north', 30.40, -97.75], '78735': ['west', 30.26, -97.87], '78731': ['west', 30.35, -97.76], '78732': ['west', 30.37, -97.90], '78610': ['hays', 30.085, -97.84], '78660': ['north', 30.44, -97.62], '78641': ['north', 30.58, -97.85] };
const CITY = { 'San Antonio': [29.45, -98.49], Houston: [29.76, -95.37], Dallas: [32.80, -96.80], Irving: [32.87, -96.94], 'New Braunfels': [29.70, -98.12], Temple: [31.10, -97.34], Abilene: [32.45, -99.73], Bryan: [30.67, -96.37], 'Grand Prairie': [32.75, -97.00], 'Cedar Hill': [32.59, -96.96] };
const AUSTIN_AREA = ['Austin', 'Buda', 'Pflugerville', 'Leander', 'Manchaca', 'Round Rock'];
const CENTRAL = ['San Antonio', 'New Braunfels', 'Temple', 'Boerne', 'Bryan'];
const clean = (n) => n.replace(/,? (LLC|Inc\.?)$/i, '').replace(/,$/, '').trim();
const slugify = (n) => n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const jitter = (i) => ((i * 37) % 9 - 4) * 0.004;
const fresh = [];
lines.forEach(([raw, street, cityLine, tel, svc], i) => {
  if (have.has(raw)) return;
  const name = clean(raw);
  const [, city, zip] = (cityLine || '').match(/^(.*), ([A-Z]{2}) (\d{5})$/) ? cityLine.match(/^(.*), [A-Z]{2} (\d{5})$/) && [null, ...cityLine.match(/^(.*), [A-Z]{2} (\d{5})$/).slice(1)] : [null, '', ''];
  const state = (cityLine.match(/, ([A-Z]{2}) /) || [])[1] || '';
  const type = !city || state !== 'TX' ? 'national' : AUSTIN_AREA.includes(city) ? 'local' : CENTRAL.includes(city) ? 'region' : 'state';
  const services = [];
  if (/Residential/.test(svc)) services.push('Residential');
  if (/Commercial|Standard Offer/.test(svc)) services.push('Commercial');
  const po = /^PO Box/i.test(street);
  let area = null, lat = null, lng = null;
  if (type === 'local') { const z = ZIP[zip]; area = z ? z[0] : city === 'Manchaca' ? 'south' : 'central'; if (z && !po) { lat = +(z[1] + jitter(i)).toFixed(3); lng = +(z[2] + jitter(i + 3)).toFixed(3); } }
  else if (type !== 'national') { area = 'outside'; const c = CITY[city]; if (c && !po) { lat = +(c[0] + jitter(i)).toFixed(3); lng = +(c[1] + jitter(i + 3)).toFixed(3); } }
  const where = type === 'national' ? (city ? `${city}, ${state}` : 'outside Texas') : city;
  const scope = services.length === 2 ? 'residential and commercial' : services[0].toLowerCase();
  const so = /Standard Offer/.test(svc) ? ' It is also registered for Austin Energy\'s Solar Standard Offer programme for larger commercial systems.' : '';
  const entry = {
    slug: slugify(name), name, type, founded: null, tier: null, tierNote: '',
    usp: `Austin Energy participating solar contractor for ${scope} systems, based in ${where}.`,
    about: `${name} is listed by Austin Energy as a participating solar contractor for ${scope} installations, which means it can file for Austin Energy's solar rebates and incentives on a customer's behalf. Its listed office is ${po ? 'a PO box in ' + city : street ? 'in ' + city : 'not given'}.${so} We have not yet reviewed its website, warranties or prices.`,
    city: type === 'national' && !city ? 'Outside Texas' : city,
    address: street ? `${street}, ${cityLine}` : '',
    phone: tel ? tel.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '') : '',
    services, ratings: [], aeListed: true, source: 'ae',
  };
  if (area) entry.area = area;
  if (lat) { entry.lat = lat; entry.lng = lng; }
  fresh.push(entry);
});
// Fill gaps in existing entries from the list.
const tsg = companies.find((c) => c.slug === 'texas-solar-guys');
if (tsg && !tsg.phone) tsg.phone = '5125654767';
// Keep the list grouped: local, region, state, national; new ones at the end of their group.
const order = ['local', 'region', 'state', 'national'];
const out = order.flatMap((t) => [...companies.filter((c) => c.type === t), ...fresh.filter((c) => c.type === t)]);
writeFileSync('data/companies.json', JSON.stringify(out, null, 2) + '\n');
console.log('added', fresh.length, 'total', out.length);
for (const f of fresh) console.log(f.type.padEnd(8), (f.area || '-').padEnd(8), f.lat ?? '-', '|', f.slug, '|', f.city, '|', f.services.join(','));
