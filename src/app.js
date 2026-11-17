// Directory filters and map
(function () {
  var list = document.querySelector('[data-list]');
  if (!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll('.row'));
  var search = document.querySelector('[data-search]');
  var sort = document.querySelector('[data-sort]');
  var count = document.querySelector('[data-count]');
  var empty = document.querySelector('[data-empty]');
  var state = { type: 'all', service: 'all', area: 'all', q: '' };
  var map = null, markers = [];

  function apply() {
    var shown = 0;
    rows.forEach(function (row) {
      var ok =
        (state.type === 'all' || row.dataset.type === state.type) &&
        (state.area === 'all' || row.dataset.area === state.area) &&
        (state.service === 'all' || row.dataset.services.indexOf('|' + state.service + '|') !== -1) &&
        (!state.q || row.dataset.text.indexOf(state.q) !== -1);
      row.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = shown === 1 ? '1 company shown' : shown + ' companies shown';
    empty.hidden = shown !== 0;
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

  document.querySelectorAll('[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.filter;
      if (group === 'area') return setArea(btn.dataset.value);
      state[group] = btn.dataset.value;
      setPressed(group, btn.dataset.value);
      apply();
    });
  });
  search.addEventListener('input', function () { state.q = search.value.trim().toLowerCase(); apply(); });
  sort.addEventListener('change', order);
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function () {
    state = { type: 'all', service: 'all', area: 'all', q: '' };
    search.value = '';
    ['type', 'service', 'area'].forEach(function (g) { setPressed(g, 'all'); });
    apply();
    focusMap();
  });
  apply();

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
  if (document.readyState === 'complete') initMap();
  else window.addEventListener('load', initMap);
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
