/* Independent character lifetimes, one shared clock, and an unchanging semantic phrase. */
(() => {
  "use strict";
  const PHRASE = "THIS IS NOT A DREAM";
  const MODES = {
    signal:   { gap: [2400, 7800], hold: [2200, 4700], cap: 3, drift: 1.8, stretch: .045, chroma: .55, blur: .16, glyph: .72, morph: [340, 450], morphDrift: [1, 1.8], morphBlur: .9, morphChroma: .14 },
    minerva:  { gap: [3800, 10500], hold: [3000, 6500], cap: 2, drift: 1.3, stretch: .085, chroma: .65, blur: .2, glyph: .62, morph: [460, 620], morphDrift: [1.2, 2.2], morphBlur: 1.2, morphChroma: .18 },
    quiet:    { gap: [6500, 18000], hold: [2800, 5500], cap: 1, drift: .25, stretch: .012, chroma: .08, blur: 0, glyph: .82, morph: [550, 760], morphDrift: [.7, 1.3], morphBlur: .65, morphChroma: .04 },
    unstable: { gap: [2600, 7200], hold: [2300, 5100], cap: 3, drift: 1.6, stretch: .055, chroma: .45, blur: .12, glyph: .8, morph: [280, 390], morphDrift: [1, 2.4], morphBlur: 1.1, morphChroma: .2 },
    residual: { gap: [8500, 17000], hold: [6000, 11000], cap: 2, drift: .15, stretch: .012, chroma: .06, blur: 0, glyph: 1, idle: 6500, morph: [720, 920], morphDrift: [.8, 1.5], morphBlur: .8, morphChroma: .04 },
    archive:  { gap: [5500, 13000], hold: [3000, 6000], cap: 2, drift: .55, stretch: .025, chroma: .22, blur: .08, glyph: .7, morph: [420, 560], morphDrift: [.9, 1.7], morphBlur: .8, morphChroma: .08 }
  };
  const GLYPHS = {
    A: ["4", "∆", "Λ"], E: ["3", "€"], I: ["!", "|", "¦"], O: ["0", "Ø"],
    S: ["$", "5"], T: ["†", "+"], N: ["₦", "И"], R: ["Я"], D: ["Ð"], M: ["₥"]
  };
  const RARE = ["#", "%", "/", "\\", "_", "░", "∴", "⌁"];
  const QUIET_GLYPHS = { O: ["0"], R: ["Я"], A: ["∆"] };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)");
  const range = (a, b) => a + Math.random() * (b - a);
  const choose = list => list[Math.floor(Math.random() * list.length)];
  const instances = [];
  let motionOff = document.body.classList.contains("still");
  let frame = 0, refreshFrame = 0, lastFrame = 0, lastMeasure = 0;
  let lastActivity = performance.now();
  let pointer = { x: -10000, y: -10000 };
  const stopped = () => reduced.matches || motionOff;

  document.querySelectorAll("[data-dream-signal]").forEach(el => {
    if (el.dataset.dreamReady) return;
    const mode = MODES[el.dataset.dreamMode] ? el.dataset.dreamMode : "quiet";
    const config = MODES[mode];
    const semantic = document.createElement("span");
    semantic.className = "dream-semantic";
    semantic.textContent = PHRASE;
    const visual = document.createElement("span");
    visual.className = "dream-visual";
    visual.setAttribute("aria-hidden", "true");
    const chars = [];
    PHRASE.split(" ").forEach((word, wordIndex) => {
      if (wordIndex) {
        const space = document.createElement("span");
        space.className = "dream-gap"; space.textContent = " ";
        visual.append(space);
      }
      const group = document.createElement("span");
      group.className = "dream-word";
      for (const canonical of word) {
        const span = document.createElement("span");
        span.className = "dream-letter";
        const currentGlyph = document.createElement("span");
        currentGlyph.className = "dream-char__glyph dream-char__glyph--current";
        currentGlyph.textContent = canonical;
        const nextGlyph = document.createElement("span");
        nextGlyph.className = "dream-char__glyph dream-char__glyph--next";
        nextGlyph.textContent = "";
        span.append(currentGlyph, nextGlyph);
        group.append(span);
        chars.push({
          span, currentGlyph, nextGlyph, canonical, glyph: canonical, displayedGlyph: canonical,
          incomingGlyph: "", morphing: false, morphStart: 0, morphDuration: 0,
          morphAxis: "y", morphDirection: 1, morphDistance: 1,
          active: false, strength: 0, target: 0,
          next: range(1500, config.gap[1]), recover: 0, phase: range(0, Math.PI * 2),
          dx: 0, dy: 0, stretch: 0, faded: false
        });
      }
      visual.append(group);
    });
    el.replaceChildren(semantic, visual);
    el.dataset.dreamReady = "true";
    el.dataset.dreamMutations = "0";
    el.dataset.dreamCorruption = "0";
    instances.push({
      el, mode, config, chars, time: 0, visible: false, rect: null,
      attention: 0, hover: false, focus: false, tension: 0, mutations: 0, count: 0
    });
  });
  if (!instances.length) return;

  function settleGlyph(ch, glyph) {
    ch.glyph = glyph;
    ch.displayedGlyph = glyph;
    ch.incomingGlyph = "";
    ch.morphing = false;
    ch.currentGlyph.textContent = glyph;
    ch.nextGlyph.textContent = "";
    ch.currentGlyph.removeAttribute("style");
    ch.nextGlyph.removeAttribute("style");
    ch.span.dataset.dreamMorphing = "false";
  }
  function setGlyph(instance, ch, glyph, immediate = false) {
    if (immediate) { settleGlyph(ch, glyph); return true; }
    if (ch.morphing || ch.glyph === glyph) return false;
    ch.glyph = glyph;
    ch.incomingGlyph = glyph;
    ch.nextGlyph.textContent = glyph;
    ch.morphing = true;
    ch.morphStart = instance.time;
    ch.morphDuration = range(...instance.config.morph);
    ch.morphAxis = Math.random() < .72 ? "y" : "x";
    ch.morphDirection = Math.random() < .5 ? -1 : 1;
    ch.morphDistance = range(...instance.config.morphDrift);
    ch.span.dataset.dreamMorphing = "true";
    return true;
  }
  function renderGlyphMorph(instance, ch) {
    if (!ch.morphing) return;
    const raw = Math.min(1, Math.max(0, (instance.time - ch.morphStart) / ch.morphDuration));
    // A restrained ease-out makes the exact substitution difficult to locate visually.
    const eased = 1 - Math.pow(1 - raw, 2.35);
    const mobileScale = coarse.matches ? .55 : 1;
    const distance = ch.morphDistance * mobileScale;
    const outShift = ch.morphDirection * distance * eased;
    const inShift = -ch.morphDirection * distance * (1 - eased);
    const outX = ch.morphAxis === "x" ? outShift : 0;
    const outY = ch.morphAxis === "y" ? outShift : 0;
    const inX = ch.morphAxis === "x" ? inShift : 0;
    const inY = ch.morphAxis === "y" ? inShift : 0;
    const blur = coarse.matches ? 0 : instance.config.morphBlur;
    const split = instance.config.morphChroma * 4 * eased * (1 - eased) * mobileScale;
    ch.currentGlyph.style.opacity = (1 - eased).toFixed(3);
    ch.nextGlyph.style.opacity = eased.toFixed(3);
    ch.currentGlyph.style.transform = `translate3d(${outX.toFixed(2)}px,${outY.toFixed(2)}px,0)`;
    ch.nextGlyph.style.transform = `translate3d(${inX.toFixed(2)}px,${inY.toFixed(2)}px,0)`;
    ch.currentGlyph.style.filter = blur ? `blur(${(blur * eased).toFixed(2)}px)` : "none";
    ch.nextGlyph.style.filter = blur ? `blur(${(blur * (1 - eased)).toFixed(2)}px)` : "none";
    ch.currentGlyph.style.textShadow = split > .02 ? `${split.toFixed(2)}px 0 rgba(var(--dream-cyan),.18)` : "none";
    ch.nextGlyph.style.textShadow = split > .02 ? `${(-split).toFixed(2)}px 0 rgba(var(--dream-violet),.16)` : "none";
    if (raw >= 1) settleGlyph(ch, ch.incomingGlyph);
  }
  function publishTension(instance, value) {
    instance.el.style.setProperty("--dream-tension", value.toFixed(3));
    instance.el.style.setProperty("--dream-thread-opacity", (.14 + value * .15).toFixed(3));
    instance.el.style.setProperty("--dream-thread-drift", (value * -1.4).toFixed(2) + "px");
    // Optional integration for a host that mounts the legacy filament renderer.
    // The current reality design uses the local thread beside Minerva's cover.
    if (instance.mode === "minerva") {
      const r = instance.rect;
      instance.el.dispatchEvent(new CustomEvent("dream:signal", {
        bubbles: true,
        detail: { strength: value, x: r ? (r.left + r.width / 2) / innerWidth : .5, y: r ? (r.top + r.height / 2) / innerHeight : .5 }
      }));
    }
  }
  function reset(instance) {
    instance.attention = 0;
    instance.tension = 0;
    instance.count = 0;
    instance.el.dataset.dreamCorruption = "0";
    instance.el.dataset.dreamPaused = "true";
    instance.chars.forEach(ch => {
      ch.active = false; ch.target = 0; ch.strength = 0;
      ch.next = instance.time + range(...instance.config.gap);
      setGlyph(instance, ch, ch.canonical, true);
      ch.span.removeAttribute("style");
    });
    publishTension(instance, 0);
  }
  function schedule() {
    if (!frame && !document.hidden && !stopped() && instances.some(i => i.visible)) frame = requestAnimationFrame(tick);
  }
  function refresh() {
    refreshFrame = 0;
    lastMeasure = performance.now();
    const spatialBottom = document.body.classList.contains("spatial")
      ? document.getElementById("main-content")?.getBoundingClientRect().bottom ?? innerHeight : innerHeight;
    instances.forEach(instance => {
      const r = instance.el.getBoundingClientRect();
      instance.rect = r;
      const visible = !instance.el.closest("[inert]") && r.bottom > 0 && r.top < spatialBottom && r.right > 0 && r.left < innerWidth;
      if (instance.visible && !visible) publishTension(instance, 0);
      instance.visible = visible;
      instance.el.dataset.dreamRunning = visible && !stopped() && !document.hidden ? "true" : "false";
    });
    schedule();
  }
  function queueRefresh() {
    if (!document.hidden && !refreshFrame) refreshFrame = requestAnimationFrame(refresh);
  }
  function proximity(instance) {
    if (coarse.matches || !instance.rect) return 0;
    const r = instance.rect;
    const dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
    const dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
    return Math.max(0, 1 - Math.hypot(dx, dy) / 100);
  }

  function tick(now) {
    frame = 0;
    if (document.hidden || stopped()) { lastFrame = 0; return; }
    if (lastFrame && now - lastFrame < 42) { schedule(); return; }
    const dt = Math.min(80, lastFrame ? now - lastFrame : 42);
    lastFrame = now;
    instances.forEach(instance => {
      if (!instance.visible) return;
      const { config, chars } = instance;
      instance.time += dt;
      const nearby = Math.max(proximity(instance), instance.hover || instance.focus ? .85 : 0);
      instance.attention += (nearby - instance.attention) * (1 - Math.exp(-dt / 1100));
      const influence = instance.attention * .2;
      const idle = !config.idle || now - lastActivity > config.idle;
      let occupied = chars.filter(ch => ch.active || ch.strength > .12 || ch.morphing).length;
      for (const ch of chars) {
        if (ch.active && instance.time >= ch.recover) {
          ch.active = false; ch.target = 0;
          ch.next = instance.time + range(...config.gap);
        } else if (!ch.active && !ch.morphing && ch.strength < .08 && instance.time >= ch.next && idle &&
          (!["quiet", "residual"].includes(instance.mode) || QUIET_GLYPHS[ch.canonical])) {
          if (occupied >= config.cap) { ch.next = instance.time + range(650, 2100); }
          else {
            occupied++;
            ch.active = true; ch.target = range(.45, .85);
            ch.recover = instance.time + range(...config.hold);
            ch.dx = range(-1, 1) * config.drift * (instance.mode === "minerva" ? 1.35 : .65);
            ch.dy = range(-1, 1) * config.drift;
            ch.stretch = range(-1, 1) * config.stretch;
            ch.faded = instance.mode === "unstable" && Math.random() < .025;
            if (Math.random() < config.glyph + influence && GLYPHS[ch.canonical]) {
              const quiet = instance.mode === "quiet" || instance.mode === "residual";
              const alternatives = quiet ? QUIET_GLYPHS[ch.canonical] : GLYPHS[ch.canonical];
              if (alternatives) setGlyph(instance, ch, instance.mode === "unstable" && Math.random() < .012 ? choose(RARE) : choose(alternatives));
            }
            instance.el.dataset.dreamMutations = String(++instance.mutations);
          }
        }
        // Slowly shorten individual waits near the pointer without touching all glyphs.
        if (!ch.active && idle) ch.next -= dt * influence * .5;
        ch.strength += (ch.target - ch.strength) * (1 - Math.exp(-dt / (ch.active ? 900 : 1300)));
        if (!ch.active && !ch.morphing && ch.strength < .12) setGlyph(instance, ch, ch.canonical);
        renderGlyphMorph(instance, ch);
        const s = ch.strength;
        const flow = Math.sin(instance.time * .00038 + ch.phase) * config.drift * .08;
        const mobileScale = coarse.matches ? .55 : 1;
        const x = ch.dx * s * mobileScale;
        const y = (ch.dy * s + flow) * mobileScale;
        const chroma = config.chroma * s * (1 + influence) * mobileScale;
        ch.span.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scaleX(" + (1 + ch.stretch * s).toFixed(3) + ")";
        ch.span.style.opacity = (1 - s * (ch.faded ? .5 : .2)).toFixed(3);
        ch.span.style.textShadow = chroma > .04
          ? chroma.toFixed(2) + "px 0 rgba(var(--dream-cyan),.26), " + (-chroma).toFixed(2) + "px 0 rgba(var(--dream-violet),.22)" : "none";
        ch.span.style.filter = config.blur && !coarse.matches ? "blur(" + (config.blur * s).toFixed(2) + "px)" : "none";
      }
      const corrupted = chars.filter(ch => ch.glyph !== ch.canonical ||
        (ch.morphing && ch.displayedGlyph !== ch.canonical)).length;
      if (instance.count !== corrupted) {
        instance.count = corrupted;
        instance.el.dataset.dreamCorruption = String(corrupted);
      }
      const targetTension = chars.reduce((sum, ch) => sum + ch.strength, 0) / config.cap;
      instance.tension += (targetTension - instance.tension) * (1 - Math.exp(-dt / 1800));
      // Quantize to keep local filament style/event updates infrequent.
      if (Math.abs(instance.tension - (instance.published ?? 0)) > .025) {
        instance.published = instance.tension;
        publishTension(instance, instance.tension);
      }
    });
    schedule();
  }

  const activity = () => { lastActivity = performance.now(); };
  document.addEventListener("pointermove", event => {
    activity();
    if (stopped() || event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  ["pointerdown", "keydown", "wheel"].forEach(type => document.addEventListener(type, activity, { passive: true }));
  document.addEventListener("pointerleave", () => { pointer = { x: -10000, y: -10000 }; });
  document.addEventListener("scroll", () => {
    activity();
    if (performance.now() - lastMeasure > 100) queueRefresh();
  }, { capture: true, passive: true });
  window.addEventListener("resize", queueRefresh, { passive: true });
  const intersection = new IntersectionObserver(queueRefresh, { threshold: [0, .2, 1] });
  instances.forEach(instance => intersection.observe(instance.el));
  new MutationObserver(queueRefresh).observe(document.body, { attributes: true, attributeFilter: ["class", "data-active-layer"] });
  document.fonts?.ready.then(queueRefresh);

  document.querySelectorAll("[data-dream-excite]").forEach(link => {
    const scope = link.closest("[data-layer]") || document;
    const instance = instances.find(i => scope.contains(i.el));
    if (!instance) return;
    link.addEventListener("pointerenter", () => { instance.hover = true; });
    link.addEventListener("pointerleave", () => { instance.hover = false; });
    link.addEventListener("focus", () => { instance.focus = true; });
    link.addEventListener("blur", () => { instance.focus = false; });
  });
  function motionChanged() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    instances.forEach(instance => {
      if (stopped()) reset(instance);
      else instance.el.dataset.dreamPaused = "false";
    });
    queueRefresh();
  }
  reduced.addEventListener("change", motionChanged);
  window.addEventListener("minerva:motion", event => { motionOff = Boolean(event.detail.still); motionChanged(); });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    cancelAnimationFrame(refreshFrame); refreshFrame = 0;
    instances.forEach(i => { i.el.dataset.dreamRunning = "false"; });
    if (!document.hidden) { lastActivity = performance.now(); queueRefresh(); }
  });
  motionChanged();
})();
