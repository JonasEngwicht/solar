// Shared solar estimate model. Used by build.mjs (worked examples on the guide pages)
// and by the browser calculator (/assets/calculator.js), so the published examples and the tool always agree.
// All figures checked November 2026; sources are listed on /solar-calculator-austin/.

export const ASSUME = {
  pricePerWatt: 2.84, // SolarReviews, Austin 2026 average
  priceLow: 2.22,
  priceHigh: 3.32,
  yieldPerKw: 1500, // kWh per kW (DC) per year, south-facing, unshaded; published Austin estimates run about 1,450 to 1,650
  panelWatts: 430,
  degradation: 0.005, // output loss per year
  escalation: 0.02, // yearly rise in the value of a solar kWh
  years: 25,
  batteryPrice: 12904, // EnergySage, average 13 kWh battery installed in Austin, Nov 2026
  minKw: 3,
  maxKw: 20,
};

// Austin Energy inside-city residential rates (austinenergy.com, checked Nov 2026), used only to cap Value of Solar credits.
const AE_BILL = {
  customer: 17.35,
  tiers: [[300, 0.04872], [900, 0.05395], [2000, 0.07901], [Infinity, 0.11428]],
  perKwh: 0.03912 + 0.00415 + 0.00272 + 0.0041 + 0.01799, // power supply, community benefit charges, regulatory
};
export function aeMonthlyBill(kwh) {
  let cost = AE_BILL.customer, prev = 0;
  for (const [upTo, rate] of AE_BILL.tiers) {
    if (kwh <= prev) break;
    cost += (Math.min(kwh, upTo) - prev) * rate;
    prev = upTo;
  }
  return cost + kwh * AE_BILL.perKwh;
}

export const UTILITIES = {
  ae: { label: 'Austin Energy', mode: 'vos', vos: 0.1289, rebate: 4000, batteryRebate: 500 },
  oncor: { label: 'Oncor (you choose a retail provider)', mode: 'split', retail: 0.15, exportRate: 0.09, rebate: 0 },
  pec: { label: 'Pedernales Electric Cooperative (PEC)', mode: 'split', retail: 0.13, exportRate: 0.071921, rebate: 0 },
  smtx: { label: 'SMTX Utilities (San Marcos)', mode: 'split', retail: 0.13, exportRate: 0.05, rebatePerWatt: 1, rebateCap: 2500, rebateShare: 0.5 },
  other: { label: 'Another utility or co-op', mode: 'split', retail: 0.13, exportRate: 0.05, rebate: 0 },
};

export const ROOF = { s: 1, sesw: 0.96, ew: 0.85, flat: 0.9 };
export const SHADE = { none: 1, some: 0.9, heavy: 0.75 };

const round = (n, step) => Math.round(n / step) * step;

// Inputs: { utility, monthlyKwh, kw?, roof, shade, battery, aeContractor, pricePerWatt?, yieldPerKw?, retail?, exportRate?, selfUse?, escalation?, extraIncentive? }
export function estimate(input) {
  const u = UTILITIES[input.utility] || UTILITIES.other;
  const ppw = input.pricePerWatt ?? ASSUME.pricePerWatt;
  const perKw = (input.yieldPerKw ?? ASSUME.yieldPerKw) * (ROOF[input.roof] ?? 1) * (SHADE[input.shade] ?? 1);
  const yearUse = Math.max(0, input.monthlyKwh) * 12;
  const recommendedKw = Math.min(ASSUME.maxKw, Math.max(ASSUME.minKw, round(yearUse / perKw, 0.5)));
  const kw = input.kw ?? recommendedKw;
  const production = kw * perKw;
  const panels = Math.ceil((kw * 1000) / ASSUME.panelWatts);
  const offset = yearUse ? production / yearUse : 0;

  const systemPrice = kw * 1000 * ppw;
  const batteryPrice = input.battery ? (input.batteryPrice ?? ASSUME.batteryPrice) : 0;
  const gross = systemPrice + batteryPrice;

  const incentives = [];
  if (input.utility === 'ae') {
    if (kw >= ASSUME.minKw && input.aeContractor !== false && input.shade !== 'heavy') incentives.push(['Austin Energy solar rebate', u.rebate]);
    if (input.battery) incentives.push(['Austin Energy Power Partner Battery rebate', u.batteryRebate]);
  }
  if (input.utility === 'smtx') incentives.push(['SMTX Utilities solar rebate', Math.min(u.rebateCap, kw * 1000 * u.rebatePerWatt, systemPrice * u.rebateShare)]);
  if (input.extraIncentive > 0) incentives.push([input.utility === 'oncor' ? 'Oncor incentive (from your quote)' : 'Other incentive you entered', input.extraIncentive]);
  const incentiveTotal = incentives.reduce((s, [, v]) => s + v, 0);
  const net = Math.max(0, gross - incentiveTotal);

  // First-year savings
  let year1, cap, rateNote;
  if (u.mode === 'vos') {
    // Austin Energy credits every kWh produced at the Value of Solar rate; credits beyond the electric bill roll over but are never paid out.
    const vos = input.vos ?? u.vos;
    cap = aeMonthlyBill(input.monthlyKwh) * 12;
    year1 = Math.min(production * vos, cap);
    rateNote = 'vos';
  } else {
    const retail = input.retail ?? u.retail;
    const exp = input.exportRate ?? u.exportRate;
    const selfUse = Math.min(1, input.selfUse ?? (input.battery ? 0.85 : 0.5));
    const used = Math.min(production * selfUse, yearUse);
    const exported = production - used;
    cap = yearUse * retail;
    year1 = Math.min(used * retail + exported * exp, cap);
    rateNote = 'split';
  }

  const esc = input.escalation ?? ASSUME.escalation;
  let cum = 0, payback = null;
  const yearly = [];
  for (let y = 1; y <= ASSUME.years; y++) {
    const s = year1 * Math.pow(1 + esc, y - 1) * Math.pow(1 - ASSUME.degradation, y - 1);
    if (payback === null && cum + s >= net) payback = y - 1 + (net - cum) / s;
    cum += s;
    yearly.push(cum);
  }
  return {
    kw, recommendedKw, panels, production, offset, perKw,
    systemPrice, priceLow: kw * 1000 * ASSUME.priceLow, priceHigh: kw * 1000 * ASSUME.priceHigh,
    batteryPrice, gross, incentives, incentiveTotal, net,
    year1, monthly: year1 / 12, capped: year1 >= cap - 0.5, rateNote,
    payback, lifetime: cum, lifetimeNet: cum - net, yearly,
  };
}
