// Solar savings calculator (/solar-calculator-austin/). Uses the same model as the build.
import { estimate, UTILITIES, ASSUME } from './solar-model.js';

const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const num = (n) => Math.round(n).toLocaleString('en-US');
const pct = (v) => Math.round(v * 100) + '%';

for (const form of document.querySelectorAll('[data-solar-calc]')) {
  const $ = (sel) => form.querySelector(sel);
  const field = (name) => form.elements[name];
  const out = (key) => form.querySelector(`[data-out="${key}"]`);
  let autoSize = true;

  const optNum = (name, scale = 1) => {
    const el = field(name);
    if (!el || el.value.trim() === '') return undefined;
    const v = Number(el.value);
    return Number.isFinite(v) ? v * scale : undefined;
  };

  function syncUtility() {
    const key = field('utility').value;
    const u = UTILITIES[key];
    form.dataset.mode = u.mode;
    form.dataset.utility = key;
    // Placeholders show the default rate the estimate uses when a box is left empty
    field('vos').placeholder = (UTILITIES.ae.vos * 100).toFixed(2);
    field('retail').placeholder = ((u.retail ?? 0.13) * 100).toFixed(1);
    field('exportRate').placeholder = ((u.exportRate ?? 0.05) * 100).toFixed(2);
    const extra = $('[data-extra-label]');
    if (extra) extra.textContent = key === 'oncor' ? 'Oncor incentive from your quote ($)' : key === 'ae' ? 'Other incentive, e.g. Sunset Valley rebate ($)' : 'Any other incentive ($)';
  }

  function read() {
    const kwh = Math.max(0, Number(field('kwh').value) || 0);
    return {
      utility: field('utility').value,
      monthlyKwh: kwh,
      roof: field('roof').value,
      shade: field('shade').value,
      battery: field('battery').checked,
      aeContractor: field('aeContractor').checked,
      kw: autoSize ? undefined : Number(field('kw').value),
      extraIncentive: optNum('extra'),
      pricePerWatt: optNum('ppw'),
      yieldPerKw: optNum('yield'),
      vos: optNum('vos', 0.01),
      retail: optNum('retail', 0.01),
      exportRate: optNum('exportRate', 0.01),
      selfUse: optNum('selfUse', 0.01),
      escalation: optNum('escalation', 0.01),
    };
  }

  function render() {
    const input = read();
    const r = estimate(input);
    if (autoSize) field('kw').value = r.recommendedKw;
    out('kw').textContent = r.kw + ' kW';
    out('size').textContent = `${r.kw} kW`;
    out('panels').textContent = `about ${r.panels} panels of ${ASSUME.panelWatts} W`;
    out('offset').textContent = input.monthlyKwh ? `covers about ${pct(r.offset)} of the electricity you use in a year` : '';
    out('production').textContent = num(r.production) + ' kWh';
    out('productionMonth').textContent = `about ${num(r.production / 12)} kWh a month`;
    out('gross').textContent = usd(r.gross);
    out('grossRange').textContent = `solar ${usd(r.priceLow)} to ${usd(r.priceHigh)} at typical Austin prices` + (r.batteryPrice ? `, plus ${usd(r.batteryPrice)} battery` : '');
    out('incentives').textContent = r.incentiveTotal ? '−' + usd(r.incentiveTotal) : '$0';
    out('incentiveList').innerHTML = '';
    for (const [name, value] of r.incentives) {
      const li = document.createElement('li');
      li.textContent = `${name}: ${usd(value)}`;
      out('incentiveList').appendChild(li);
    }
    const fed = document.createElement('li');
    fed.textContent = 'Federal tax credit for a home system you buy: $0 (ended 31 December 2025)';
    out('incentiveList').appendChild(fed);
    out('net').textContent = usd(r.net);
    out('year1').textContent = usd(r.year1);
    out('month1').textContent = `about ${usd(r.monthly)} a month in the first year`;
    out('payback').textContent = r.payback === null ? 'Over 25 years' : `${r.payback.toFixed(1)} years`;
    out('lifetime').textContent = (r.lifetimeNet < 0 ? '−' : '') + usd(Math.abs(r.lifetimeNet));
    out('lifetimeNote').textContent = `${usd(r.lifetime)} in savings minus the ${usd(r.net)} net cost`;
    const bar = $('[data-payback-bar]');
    bar.style.setProperty('--pay', r.payback === null ? '100%' : Math.min(100, (r.payback / ASSUME.years) * 100) + '%');
    bar.classList.toggle('is-over', r.payback === null);

    const notes = [];
    if (r.capped) notes.push(input.utility === 'ae'
      ? 'This system would earn more Value of Solar credit than your electric bill. Extra credit rolls over but is never paid out, so the savings are capped at your bill. A smaller system pays back faster.'
      : 'This system produces more than you use, so the savings are capped at your yearly electricity cost. A smaller system pays back faster.');
    if (input.utility === 'ae' && input.shade === 'heavy') notes.push('Austin Energy only pays its rebate for systems that are mostly free of shading, so the $4,000 is left out here.');
    if (input.utility === 'ae' && !input.aeContractor) notes.push('Without a participating contractor there is no Austin Energy rebate. Most Austin installers are on the list; check before you sign.');
    if (input.utility === 'ae' && input.battery) notes.push('Austin Energy credits every kWh your panels produce at the same rate, so a battery does not raise your solar credit. Its value is backup power plus Power Partner payments of $75 per kW a year, which are not counted here.');
    if (input.utility === 'oncor' && !input.extraIncentive) notes.push('Oncor pays a project-specific incentive of up to $9,000 to registered installers while funds last. Ask your installer for the figure and enter it above.');
    if (input.utility === 'pec') notes.push('PEC credits surplus solar at 7.19 cents per kWh against the base power charge only, and unused credit expires at the end of each year.');
    out('notes').innerHTML = '';
    for (const n of notes) { const p = document.createElement('p'); p.textContent = n; out('notes').appendChild(p); }
  }

  field('kw').addEventListener('input', () => { autoSize = false; $('[data-auto]').hidden = false; render(); });
  $('[data-auto]').addEventListener('click', () => { autoSize = true; $('[data-auto]').hidden = true; render(); });
  field('utility').addEventListener('change', () => { field('extra').value = ''; syncUtility(); render(); });
  form.addEventListener('input', (e) => { if (e.target.name !== 'kw') render(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); render(); });
  form.classList.add('is-live');
  syncUtility();
  render();
}
