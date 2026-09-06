/* The generated document is the reference; JS only adds ways to explore it. */
(() => {
  const search = document.querySelector('#codex-search');
  const entries = [...document.querySelectorAll('.codex-entry')];
  const groups = [...document.querySelectorAll('.codex-group')];
  const count = document.querySelector('[data-count]');
  const empty = document.querySelector('[data-empty]');
  const expand = document.querySelector('[data-expand]');
  const normalize = text => text.normalize('NFKD').toLowerCase().trim().replace(/\s+/g, ' ');
  const content = new Map(entries.map(entry => [entry, normalize(entry.querySelector('summary').textContent + ' ' + [...entry.querySelectorAll('p, li')].map(el => el.textContent).join(' '))]));
  let beforeSearch = null;

  function updateExpand() {
    const visible = entries.filter(entry => !entry.hidden);
    expand.hidden = visible.length === 0;
    expand.textContent = visible.every(entry => entry.open) ? 'Collapse all' : 'Expand all';
  }

  function filter() {
    const query = normalize(search.value);
    if (query && !beforeSearch) beforeSearch = new Set(entries.filter(entry => entry.open));
    for (const entry of entries) {
      entry.hidden = Boolean(query) && !content.get(entry).includes(query);
      if (query) entry.open = !entry.hidden;
      else if (beforeSearch) entry.open = beforeSearch.has(entry);
    }
    if (!query) beforeSearch = null;
    groups.forEach(group => { group.hidden = ![...group.querySelectorAll('details')].some(entry => !entry.hidden); });
    const total = entries.filter(entry => !entry.hidden).length;
    const message = query === 'observer' ? 'NO RECORD FOUND.' : 'No matching records.';
    count.textContent = total ? `${total} ${total === 1 ? 'record' : 'records'}` : message;
    empty.hidden = total > 0;
    empty.textContent = total ? '' : message;
    updateExpand();
  }

  function followHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !(target.matches('.codex-entry') || target.matches('.codex-group > h2'))) return;
    if (search.value) { search.value = ''; filter(); }
    if (target.matches('.codex-entry')) {
      target.open = true;
      target.querySelector('summary').focus({ preventScroll: true });
    } else target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
    updateExpand();
  }

  search.addEventListener('input', filter);
  document.querySelector('[data-clear]').addEventListener('click', () => {
    search.value = '';
    filter();
    search.focus();
  });
  expand.addEventListener('click', () => {
    const visible = entries.filter(entry => !entry.hidden);
    const open = !visible.every(entry => entry.open);
    visible.forEach(entry => { entry.open = open; });
    updateExpand();
  });
  entries.forEach(entry => entry.addEventListener('toggle', updateExpand));
  document.querySelector('.codex-alphabet').addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    search.value = '';
    filter();
    // Also handles selecting the same letter after a search hid that group.
    requestAnimationFrame(followHash);
  });
  window.addEventListener('hashchange', followHash);
  document.querySelector('.codex-tools').hidden = false;
  expand.hidden = false;
  filter();
  followHash();
})();
