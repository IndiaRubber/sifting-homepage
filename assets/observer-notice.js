/* Only runs animation frames while this particular seam is opening/resealing. */
(() => {
  const seam = document.querySelector('[data-notice]');
  if (!seam) return;
  const trigger = seam.querySelector('button');
  const link = seam.querySelector('a');
  const halves = [...seam.querySelectorAll('.observer-notice__half')];
  const letters = [...seam.querySelectorAll('.observer-notice__half > span')];
  const period = seam.nextElementSibling;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let progress = 0, target = 0, frame = 0, previous = 0, leaveTimer = 0;
  let hovered = false, keyboard = false, latched = false, navigating = false;
  let compression = .65;
  const calm = () => reduced.matches || document.body.classList.contains('still');
  const ramp = (start, end) => {
    const x = Math.max(0, Math.min(1, (progress - start) / (end - start)));
    return x * x * (3 - 2 * x);
  };

  function paint() {
    const quiet = calm();
    const split = ramp(2200, 3200);
    const shudder = ramp(500, 2200) * (1 - split);
    seam.classList.toggle('is-calm', quiet);
    seam.style.setProperty('--density', ramp(0, 1200));
    seam.style.setProperty('--rift-opacity', ramp(1200, 1850));
    seam.style.setProperty('--rift-width', .012 + split * .988);
    seam.style.setProperty('--rift-height', .25 + ramp(1200, 3000) * .75);
    seam.style.setProperty('--reveal', quiet ? ramp(0, 3200) : ramp(2500, 3200));
    halves.forEach((half, i) => {
      const side = i === 0 ? -.18 : .42;
      half.style.transform = quiet || progress === 0 ? '' : `translateX(${side * split}em) scaleX(${1 - split * (1 - compression)})`;
    });
    period.style.transform = quiet || progress === 0 ? '' : `translateX(${split * .42}em)`;
    letters.forEach((letter, i) => {
      const jitter = Math.sin(progress / (29 + i * 7) + i * 2) * shudder;
      letter.style.transform = quiet || progress === 0 ? '' : `translateY(${jitter * 1.35}px) rotate(${jitter * .65}deg)`;
      letter.style.textShadow = !quiet && shudder > 0 ? `${shudder * .45}px 0 #c2d5d955` : '';
    });
    const ready = progress === 3200;
    seam.classList.toggle('is-emerging', quiet ? progress > 0 : progress > 2500);
    seam.classList.toggle('is-revealed', ready);
    trigger.setAttribute('aria-expanded', String(ready));
    link.tabIndex = ready ? 0 : -1;
    link.setAttribute('aria-hidden', String(!ready));
  }

  function tick(now) {
    const elapsed = Math.min(now - previous, 64);
    previous = now;
    const speed = calm() ? 3200 / 240 : target ? 1 : 3200 / 1500;
    progress = target ? Math.min(target, progress + elapsed * speed) : Math.max(0, progress - elapsed * speed);
    paint();
    frame = progress !== target ? requestAnimationFrame(tick) : 0;
  }

  function aim(value) {
    clearTimeout(leaveTimer);
    if (value && !target) measure();
    target = value;
    if (!frame && target !== progress) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function measure() {
    const width = trigger.getBoundingClientRect().width;
    const size = parseFloat(getComputedStyle(trigger).fontSize);
    // The two fragments compress away from the gap, preserving nearby text.
    compression = Math.max(.25, Math.min(.7, (width + size * .6 - link.getBoundingClientRect().width - 12) / width));
  }

  function reseal() {
    if (hovered || keyboard || latched || navigating) return;
    clearTimeout(leaveTimer);
    // A brief bridge lets a visitor move from the word to its recessed link.
    if (progress === 3200) leaveTimer = setTimeout(() => aim(0), 700);
    else aim(0);
  }

  seam.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    aim(3200);
  });
  seam.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return;
    hovered = false;
    reseal();
  });
  seam.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible') || event.target === link) {
      keyboard = true;
      aim(3200);
    }
  });
  seam.addEventListener('focusout', event => {
    if (seam.contains(event.relatedTarget)) return;
    keyboard = false;
    reseal();
  });
  trigger.addEventListener('click', () => {
    latched = true;
    aim(3200);
  });
  document.addEventListener('pointerdown', event => {
    if (seam.contains(event.target)) return;
    latched = false;
    keyboard = false;
    reseal();
  }, { passive: true });
  seam.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    latched = keyboard = hovered = false;
    if (document.activeElement === link) trigger.focus({ preventScroll: true });
    keyboard = false;
    aim(0);
  });

  link.addEventListener('click', event => {
    if (progress !== 3200) { event.preventDefault(); return; }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || calm()) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    const rect = seam.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / innerWidth * 100;
    const y = (rect.top + rect.height / 2) / innerHeight * 100;
    const veil = document.createElement('div');
    veil.className = 'observer-transit';
    veil.setAttribute('aria-hidden', 'true');
    document.body.append(veil);
    const departure = veil.animate([
      { clipPath: `polygon(${x}% ${y - 5}%, ${x + .4}% ${y}%, ${x}% ${y + 6}%, ${x - .3}% ${y}%)` },
      { clipPath: `polygon(${x + 12}% -30%, 125% ${y - 9}%, ${x - 15}% 140%, -25% ${y + 11}%)`, offset: .7 },
      { clipPath: 'polygon(-100% -100%, 200% -100%, 200% 200%, -100% 200%)' }
    ], { duration: 520, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' });
    departure.finished.then(() => location.assign(link.href));
  });

  function reset() {
    cancelAnimationFrame(frame);
    clearTimeout(leaveTimer);
    progress = target = frame = 0;
    hovered = keyboard = latched = navigating = false;
    document.querySelector('.observer-transit')?.remove();
    paint();
  }
  // Re-entering from history or a different reality starts with an intact word.
  window.addEventListener('pageshow', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  new MutationObserver(() => {
    if (document.body.classList.contains('spatial') && document.body.dataset.activeLayer !== '2') reset();
  }).observe(document.body, { attributes: true, attributeFilter: ['data-active-layer'] });
  reduced.addEventListener('change', paint);
  window.addEventListener('resize', () => { measure(); paint(); });
  window.addEventListener('minerva:motion', paint);
  paint();
})();
