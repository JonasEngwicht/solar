// Adds researched details to Austin Energy contractors (17 Nov 2026). Sources are stored per company.
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'data/companies.json';
const c = JSON.parse(readFileSync(p, 'utf8'));
const by = Object.fromEntries(c.map((x) => [x.slug, x]));
const E = {
  'axis-solar': { founded: 2018, usp: 'Built the first commercial project under Austin Energy\'s Solar Standard Offer in 2025; Tesla Powerwall certified.',
    about: 'Axis Solar was founded in Austin in 2018 and works mostly on commercial systems. Its team is a Tesla Powerwall Certified Installer and an Enphase Silver Installer. In December 2025 Austin Energy presented its first commercial Solar Standard Offer project, an 812-panel warehouse roof that Axis Solar installed.',
    services: ['Residential', 'Commercial', 'Battery'],
    refs: [['Solar Power World: Axis Solar', 'https://www.solarpowerworldonline.com/suppliers/axis-solar/'], ['Austin Energy: first commercial Solar Standard Offer project', 'https://austinenergy.com/about/news/news-releases/2025/austin-energy-unveils-the-first-commercial-solar-standard-offer-project'], ['Expertise.com: Austin solar companies', 'https://www.expertise.com/home-improvement/solar-company/texas/austin']] },
  'boost-electric': { usp: 'Buda electrical contractor that installs solar, home batteries, generators and EV chargers.',
    about: 'Boost Electric is an electrical contractor in Buda. Besides solar panels it installs and maintains battery systems, generators and EV charging. It is BBB accredited with an A+ rating.',
    services: ['Residential', 'Battery', 'EV charging', 'Generators'],
    refs: [['BBB: Boost Electric', 'https://www.bbb.org/us/tx/buda/profile/electrical-contractors/boost-electric-llc-0825-1000198258']] },
  'elk-electric': { founded: 1961, usp: 'Austin commercial electrical contractor since 1961; solar is one part of its work.',
    about: 'Elk Electric has done electrical construction in the Austin area since 1961, mainly for offices, hospitals, data centres and other commercial buildings. Its work includes solar, wind and storage sites. It is not a residential solar installer.',
    services: ['Commercial'],
    refs: [['Electrical Contractor magazine: Austin contractors', 'https://www.ecmag.com/magazine/articles/article-detail/serving-big-growth-in-the-lone-star-state-texas-sized-electrical-contracting-projects-in-the-capital']] },
  energyrey: { usp: 'Family-run Austin company for solar, EV chargers and roofing.',
    about: 'EnergyRey is a family-run company in north Austin that installs solar, EV chargers and roofing. Its BBB profile lists about five years in business and solar installation, roofing and electrical work as its categories.',
    services: ['Residential', 'Commercial', 'EV charging', 'Roofing'],
    refs: [['BBB: EnergyRey', 'https://www.bbb.org/central-texas/quote/request-energy-rey-llc-1000228846']] },
  'holt-renewables': { usp: 'Commercial solar builder behind CapMetro\'s 12-acre solar bus-charging canopy; part of the HOLT group.',
    about: 'HOLT Renewables designs and builds commercial solar, battery storage and EV charging projects across the US from its Austin base. It grew out of Austin\'s PCI Solar, which HOLT, the San Antonio owner of the HOLT CAT dealership, acquired in 2019. It designed the 12-acre solar canopy that charges CapMetro\'s electric buses.',
    services: ['Commercial', 'Battery', 'EV charging'],
    refs: [['Business Wire: CapMetro solar charging', 'https://www.businesswire.com/news/home/20230424005624/en/Transforming-Public-Transportation-Austin%E2%80%99s-CapMetro-to-Install-First-of-its-Kind-Solar-Charging-Infrastructure'], ['TXSES: HOLT Renewables industry highlight', 'https://txses.org/holt-renewables-industry-highlight/']] },
  'ion-solar': { founded: 2013, type: 'national', city: 'Provo, UT (office in Austin)', usp: 'Utah-based national installer with an Austin office; reviews are mixed.',
    about: 'ION Solar is headquartered in Provo, Utah, has installed solar since 2013 and lists an Austin office with Austin Energy. On SolarReviews it averages 3.98 out of 5 from more than 1,100 reviews. In BBB complaint responses the company has described a two-year labor warranty on past installations, so ask for the current terms in writing.',
    ratings: ['SolarReviews 3.98/5 (1,135 reviews)'],
    refs: [['SolarReviews: ION Solar', 'https://www.solarreviews.com/installers/ion-solar-reviews'], ['BBB: ION Solar complaints', 'https://prod.bbb.org/us/ut/orem/profile/solar-energy-contractors/ion-solar-llc-1166-22338175/complaints?page=15']] },
  'm2-power-solutions': { url: 'https://m2powersolutions.com', usp: 'Pflugerville electrical contractor that installs REC solar panels.',
    about: 'M2 Power Solutions is a licensed electrical contractor in Pflugerville that installs residential and commercial solar, using REC panels according to the ENF solar directory.',
    refs: [['ENF Solar: M2 Power Solutions', 'https://www.enfsolar.com/m2-power-solutions']] },
  'now-energy': { founded: 2019, usp: 'Family-owned Austin installer with NABCEP-certified technicians, installing since 2019.',
    about: 'Now Energy is a family-owned, BBB-accredited residential installer in southwest Austin that has installed solar since 2019. It says its technicians are NABCEP certified and offers free in-home consultations.',
    refs: [['SolarReviews: Now Energy', 'https://www.solarreviews.com/installers/now-energy-reviews'], ['EnergySage: Now Energy', 'https://www.energysage.com/supplier/24446/now-energy-llc/']] },
  'power-home-remodeling-group': { founded: 1992, type: 'national', city: 'Austin office (national company)', url: 'https://www.powerhrg.com/locations/austin-tx/',
    usp: 'Large national exterior remodeler (windows, roofing, siding) that also sells solar.',
    about: 'Power Home Remodeling calls itself the nation\'s largest exterior home remodeler. Solar is one of its services next to windows, siding, roofing and insulation, and it has an Austin office on Metropolis Drive.',
    refs: [['Power Home Remodeling: services', 'https://www.powerhrg.com/?p=22770'], ['HomeAdvisor: Power Home Remodeling Solar', 'https://www.homeadvisor.com/tloc/Austin-TX/Solar-Panels-Install-or-Replace']] },
  powerfin: { usp: 'Austin solar developer behind community solar for Austin Energy and CPS Energy\'s SolarHost rooftop programme.',
    about: 'PowerFin develops, builds and operates solar projects from Austin and San Antonio. It signed a 25-year agreement to sell community solar power to Austin Energy and built and owns the rooftop arrays of CPS Energy\'s SolarHost programme in San Antonio. It is a developer more than a home installer.',
    services: ['Commercial'],
    refs: [['PR Newswire: PowerFin community solar with Austin Energy', 'https://prnewswire.com/news-releases/powerfin-announces-community-solar-project-with-austin-energy-300087530.html'], ['Texas Public Radio: PowerFin', 'https://www.tpr.org/technology-entrepreneurship/2018-06-11/texas-could-see-100-million-in-solar-investments']] },
  'silver-electric-and-solar': { founded: 2017, url: 'https://silverelectricandsolar.com', usp: 'Leander electrical and solar shop; 25-year product warranty but a two-year installation warranty.',
    about: 'Silver Electric and Solar was founded in 2017 in Leander and installs residential and commercial solar with Enphase, Qcells and SolarEdge equipment. ConsumerAffairs lists a two-year installation warranty and a 25-year product warranty, with payment upfront or by loan.',
    services: ['Residential', 'Commercial', 'Repair'],
    ratings: ['Angi 5.0/5 (9 reviews)'],
    refs: [['ConsumerAffairs: Silver Electric and Solar', 'https://www.consumeraffairs.com/solar-energy/silver-electric-and-solar.html'], ['HomeGuide: Silver Electric and Solar', 'https://homeguide.com/tx/cedar-park/solar-panel-installation/silver-electric-and-solar-I0x2yNzyq'], ['Angi: Silver Electric and Solar', 'https://angi.com/companylist/us/tx/leander/silver-electric-and-solar-llc-reviews-1.htm']] },
  'volthouse-electric': { usp: 'Family-owned union electrical shop in Manchaca that also designs and installs solar.',
    about: 'Volthouse Electric is a family-owned electrical company in Manchaca run by master electrician Cory Shope and Victoria Shope. It works with IBEW Local 520 and designs and installs solar systems for homes and businesses besides general electrical work.',
    refs: [['Volthouse Electric: about', 'https://as-4493b6d7.pages.dev/about'], ['NAICS list: Volthouse Electric', 'https://naicslist.com/company-profile/volthouse-electric-llc-manchaca-tx-78652']] },
  'freedom-forever-texas': { founded: 2011, usp: 'Large national installer that filed for Chapter 11 bankruptcy protection in April 2026.',
    about: 'Freedom Forever is based in Temecula, California, and was one of the largest US residential installers. It uses subcontracted installers. On 15 April 2026 it filed for Chapter 11 bankruptcy protection in Delaware and keeps operating under court supervision, so ask who will service the system and honour its warranties.',
    refs: [['PV Tech: Freedom Forever files for Chapter 11', 'https://www.pv-tech.org/freedom-forever-files-for-chapter-11-bankruptcy-with-500-million-debts/'], ['EcoWatch: Freedom Forever review', 'https://www.ecowatch.com/solar/reviews/freedom-forever']] },
};
for (const [slug, v] of Object.entries(E)) {
  const x = by[slug]; if (!x) throw new Error('missing ' + slug);
  Object.assign(x, v, { reviewed: true });
  if (v.type === 'national') { delete x.area; delete x.lat; delete x.lng; }
}
for (const x of c) if (x.source === 'ae' && !x.reviewed) x.noindex = true;
// keep groups ordered local, region, state, national
const order = ['local', 'region', 'state', 'national'];
const out = order.flatMap((t) => c.filter((x) => x.type === t));
writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
console.log('reviewed', out.filter((x) => x.reviewed).length, 'noindex', out.filter((x) => x.noindex).length, 'total', out.length);
