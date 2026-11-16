(function () {
  var list = document.querySelector('[data-list]');
  if (!list) return;
  var rows = Array.prototype.slice.call(list.querySelectorAll('.row'));
  var search = document.querySelector('[data-search]');
  var sort = document.querySelector('[data-sort]');
  var count = document.querySelector('[data-count]');
  var empty = document.querySelector('[data-empty]');
  var state = { type: 'all', service: 'all', q: '' };

  function apply() {
    var shown = 0;
    rows.forEach(function (row) {
      var ok =
        (state.type === 'all' || row.dataset.type === state.type) &&
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
    var sorted = rows.slice().sort(function (a, b) {
      if (key === 'name') return a.dataset.name.localeCompare(b.dataset.name);
      if (key === 'oldest') return (Number(a.dataset.founded) || 9999) - (Number(b.dataset.founded) || 9999);
      return Number(a.dataset.rank) - Number(b.dataset.rank);
    });
    sorted.forEach(function (row) { list.appendChild(row); });
  }

  document.querySelectorAll('[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.filter;
      state[group] = btn.dataset.value;
      document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      apply();
    });
  });
  search.addEventListener('input', function () { state.q = search.value.trim().toLowerCase(); apply(); });
  sort.addEventListener('change', order);
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function () {
    state = { type: 'all', service: 'all', q: '' };
    search.value = '';
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.value === 'all'));
    });
    apply();
  });
  apply();
})();
