/* One motion preference follows the visitor between the existing site routes. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = [...document.querySelectorAll('[data-motion]')];
  const key = 'exsifting-still';
  let preferred = false;
  try { preferred = localStorage.getItem(key) === 'true'; } catch { /* Private storage may be unavailable. */ }
  function apply() {
    const still = preferred || reduced.matches;
    document.body.classList.toggle('still', still);
    controls.forEach(button => {
      button.setAttribute('aria-pressed', String(still));
      button.disabled = reduced.matches;
      button.textContent = reduced.matches ? 'Reduced motion' : still ? 'Wake the world' : 'Still the world';
    });
    window.dispatchEvent(new CustomEvent('minerva:motion', { detail: { still } }));
  }
  controls.forEach(button => button.addEventListener('click', () => {
    preferred = !preferred;
    try { localStorage.setItem(key, String(preferred)); } catch { /* Keep the session control working. */ }
    apply();
  }));
  reduced.addEventListener('change', apply);
  window.addEventListener('pageshow', apply);
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preferred = event.newValue === 'true';
    apply();
  });
  // The Archive's existing transmission fades only while it can be seen.
  const pulses = [...document.querySelectorAll('[data-world-pulse]')];
  const visibility = new IntersectionObserver(entries => entries.forEach(entry => {
    entry.target.dataset.inView = String(entry.isIntersecting);
  }));
  pulses.forEach(el => visibility.observe(el));
  const pageVisibility = () => document.body.classList.toggle('world-hidden', document.hidden);
  document.addEventListener('visibilitychange', pageVisibility);
  pageVisibility();
  apply();
})();
