// Directory filters and map
(function () {
  var list = document.querySelector('[data-list]');
  if (!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll('.row'));
  var search = document.querySelector('[data-search]');
  var sort = document.querySelector('[data-sort]');
  var count = document.querySelector('[data-count]');
  var empty = document.querySelector('[data-empty]');
  var more = document.querySelector('[data-more]');
  var resets = document.querySelectorAll('[data-reset]');
  var LIMIT = 20;
  var state = { type: 'all', service: 'all', area: 'all', ae: 'all', q: '' };
  var expanded = false;
  var map = null, markers = [];

  function filtered() {
    return state.type !== 'all' || state.service !== 'all' || state.area !== 'all' || state.ae !== 'all' || state.q !== '';
  }

  function apply() {
    var shown = 0;
    rows.forEach(function (row) {
      var ok =
        (state.type === 'all' || row.dataset.type === state.type) &&
        (state.area === 'all' || row.dataset.area === state.area) &&
        (state.ae === 'all' || row.dataset.ae === '1') &&
        (state.service === 'all' || row.dataset.services.indexOf('|' + state.service + '|') !== -1) &&
        (!state.q || row.dataset.text.indexOf(state.q) !== -1);
      row.hidden = !ok;
      if (ok) shown++;
    });
    // The full list is long: show the first 20 until the visitor filters or asks for all of them.
    var collapse = !!more && !filtered() && !expanded && rows.length > LIMIT;
    list.classList.toggle('is-collapsed', collapse);
    if (more) more.hidden = !collapse;
    if (collapse) count.textContent = 'Showing ' + LIMIT + ' of ' + rows.length + ' companies';
    else count.textContent = shown === 1 ? '1 company' : shown + ' companies';
    empty.hidden = shown !== 0;
    resets.forEach(function (b) { if (!empty.contains(b)) b.hidden = !filtered(); });
  }

  function order() {
    var key = sort.value;
    rows.slice().sort(function (a, b) {
      if (key === 'name') return a.dataset.name.localeCompare(b.dataset.name);
      if (key === 'oldest') return (Number(a.dataset.founded) || 9999) - (Number(b.dataset.founded) || 9999);
      return Number(a.dataset.rank) - Number(b.dataset.rank);
    }).forEach(function (row) { list.appendChild(row); });
  }

  function setPressed(group, value) {
    document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.value === value));
    });
  }

  function focusMap() {
    if (!map) return;
    var pts = [];
    markers.forEach(function (m) {
      var on = state.area === 'all' ? m.area !== 'outside' : m.area === state.area;
      var lit = state.area === 'all' || m.area === state.area;
      m.layer.setStyle({ fillOpacity: lit ? 1 : 0.25, opacity: lit ? 1 : 0.3 });
      if (on) pts.push(m.layer.getLatLng());
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 12, animate: true });
  }

  function setArea(value) {
    state.area = value;
    setPressed('area', value);
    apply();
    focusMap();
  }

  function setQuery(q) {
    state.q = q.trim().toLowerCase();
    if (search && search.value !== q) search.value = q;
    apply();
  }

  document.querySelectorAll('[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.filter;
      if (group === 'area') return setArea(btn.dataset.value);
      if (group === 'ae') {
        // A single on/off chip; it shares the row with the service chips but filters independently.
        state.ae = state.ae === 'all' ? '1' : 'all';
        btn.setAttribute('aria-pressed', String(state.ae === '1'));
        return apply();
      }
      state[group] = btn.dataset.value;
      setPressed(group, btn.dataset.value);
      apply();
    });
  });
  if (search) search.addEventListener('input', function () { setQuery(search.value); });
  if (sort) sort.addEventListener('change', order);
  if (more) more.querySelector('button').addEventListener('click', function () { expanded = true; apply(); });
  resets.forEach(function (reset) {
    reset.addEventListener('click', function () {
      state = { type: 'all', service: 'all', area: 'all', ae: 'all', q: '' };
      if (search) search.value = '';
      ['type', 'service', 'area'].forEach(function (g) { setPressed(g, 'all'); });
      document.querySelectorAll('[data-filter="ae"]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      apply();
      focusMap();
    });
  });

  // The search box in the hero and ?q= links both feed the directory search.
  var hero = document.querySelector('[data-hero-search]');
  if (hero) hero.addEventListener('submit', function (e) {
    e.preventDefault();
    setQuery(hero.querySelector('input').value);
    document.getElementById('directory').scrollIntoView();
    if (search) search.focus({ preventScroll: true });
  });
  var initial = '';
  try { initial = new URLSearchParams(location.search).get('q') || ''; } catch (e) {}
  if (initial) {
    setQuery(initial);
    if (hero) hero.querySelector('input').value = initial;
    document.getElementById('directory').scrollIntoView();
  } else apply();

  function initMap() {
    var el = document.getElementById('map');
    var dataEl = document.getElementById('map-data');
    if (!el || !dataEl || !window.L) return;
    el.innerHTML = '';
    el.classList.add('is-live');
    map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    JSON.parse(dataEl.textContent).forEach(function (c) {
      var layer = L.circleMarker([c.lat, c.lng], {
        radius: 9, color: '#17224d', weight: 3, fillColor: '#ffc531', fillOpacity: 1
      }).addTo(map);
      var box = document.createElement('div');
      var a = document.createElement('a');
      a.href = '/companies/' + c.s + '/';
      a.textContent = c.n;
      a.className = 'map-name';
      box.appendChild(a);
      var city = document.createElement('div');
      city.textContent = c.c;
      box.appendChild(city);
      if (c.p) {
        var tel = document.createElement('a');
        tel.href = 'tel:+1' + c.p;
        tel.textContent = '(' + c.p.slice(0, 3) + ') ' + c.p.slice(3, 6) + '-' + c.p.slice(6);
        box.appendChild(tel);
      }
      layer.bindPopup(box);
      layer.bindTooltip(c.n);
      markers.push({ area: c.a, layer: layer });
    });
    focusMap();
  }
  // The map (Leaflet + OpenStreetMap tiles) loads only after the visitor asks for it.
  function loadMap() {
    if (window.L) { initMap(); return; }
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/assets/leaflet/leaflet.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = '/assets/leaflet/leaflet.js';
    js.onload = initMap;
    document.head.appendChild(js);
    try { localStorage.setItem('map-ok', '1'); } catch (e) {}
  }
  var mapBtn = document.querySelector('[data-load-map]');
  if (mapBtn) {
    mapBtn.addEventListener('click', loadMap);
    var remembered = false;
    try { remembered = localStorage.getItem('map-ok') === '1'; } catch (e) {}
    if (remembered) loadMap();
  }
})();

// Cost calculator
(function () {
  var usd = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  document.querySelectorAll('[data-calc]').forEach(function (calc) {
    var input = calc.querySelector('[data-calc-input]');
    var bar = calc.querySelector('.calc-bar');
    function update() {
      var kw = Number(input.value), w = kw * 1000;
      calc.querySelector('[data-calc-size]').textContent = kw + ' kW';
      calc.querySelector('[data-calc-avg]').textContent = usd(w * 2.84);
      calc.querySelector('[data-calc-range]').textContent = usd(w * 2.22) + '–' + usd(w * 3.32);
      calc.querySelector('[data-calc-net]').textContent = usd(w * 2.84 - 4000);
      // Bar scale: $0 to the top of the range for the largest system (15 kW)
      var max = 15000 * 3.32;
      bar.style.setProperty('--lo', (w * 2.22 / max * 100) + '%');
      bar.style.setProperty('--hi', (w * 3.32 / max * 100) + '%');
      bar.style.setProperty('--avg', (w * 2.84 / max * 100) + '%');
    }
    input.addEventListener('input', update);
    update();
  });
})();
