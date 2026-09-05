/* Independent character lifetimes, one shared clock, and an unchanging semantic phrase. */
(() => {
  "use strict";
  const PHRASE = "THIS IS NOT A DREAM";
  const MODES = {
    signal:   { gap: [2400, 7800], hold: [2200, 4700], cap: 3, drift: 1.8, stretch: .045, chroma: .55, blur: .16, glyph: .72, morph: [340, 450], morphDrift: [1, 1.8], morphBlur: .9, morphChroma: .14, scatter: { x: 28, y: 48, rotate: 5, fade: .68, radius: 145, attack: 520, recover: [1200, 1900], glyph: .16, stretch: .025 } },
    minerva:  { gap: [3800, 10500], hold: [3000, 6500], cap: 2, drift: 1.3, stretch: .085, chroma: .65, blur: .2, glyph: .62, morph: [460, 620], morphDrift: [1.2, 2.2], morphBlur: 1.2, morphChroma: .18, scatter: { x: 22, y: 34, rotate: 3, fade: .55, radius: 135, attack: 600, recover: [1400, 2100], glyph: .13, stretch: .06 } },
    quiet:    { gap: [6500, 18000], hold: [2800, 5500], cap: 1, drift: .25, stretch: .012, chroma: .08, blur: 0, glyph: .82, morph: [550, 760], morphDrift: [.7, 1.3], morphBlur: .65, morphChroma: .04, scatter: { x: 10, y: 16, rotate: 1.5, fade: .35, radius: 110, attack: 700, recover: [1400, 2200], glyph: .08, stretch: .01 } },
    unstable: { gap: [2600, 7200], hold: [2300, 5100], cap: 3, drift: 1.6, stretch: .055, chroma: .45, blur: .12, glyph: .8, morph: [280, 390], morphDrift: [1, 2.4], morphBlur: 1.1, morphChroma: .2, scatter: { x: 45, y: 68, rotate: 8, fade: .75, radius: 165, attack: 420, recover: [900, 1600], glyph: .25, stretch: .04 } },
    residual: { gap: [8500, 17000], hold: [6000, 11000], cap: 2, drift: .15, stretch: .012, chroma: .06, blur: 0, glyph: 1, idle: 6500, morph: [720, 920], morphDrift: [.8, 1.5], morphBlur: .8, morphChroma: .04, scatter: { x: 18, y: 58, rotate: 2.5, fade: .66, radius: 140, attack: 750, recover: [1600, 2200], glyph: .1, stretch: .015 } },
    archive:  { gap: [5500, 13000], hold: [3000, 6000], cap: 2, drift: .55, stretch: .025, chroma: .22, blur: .08, glyph: .7, morph: [420, 560], morphDrift: [.9, 1.7], morphBlur: .8, morphChroma: .08, scatter: { x: 38, y: 28, rotate: 4, fade: .6, radius: 145, attack: 540, recover: [1200, 1900], glyph: .16, stretch: .02 } }
  };
  const GLYPHS = {
    A: ["4", "∆", "Λ"], E: ["3", "€"], I: ["!", "|", "¦"], O: ["0", "Ø"],
    S: ["$", "5"], T: ["†", "+"], N: ["₦", "И"], R: ["Я"], D: ["Ð"], M: ["₥"]
  };
  const RARE = ["#", "%", "/", "\\", "_", "░", "∴", "⌁"];
  const QUIET_GLYPHS = { O: ["0"], R: ["Я"], A: ["∆"] };
  const HEADLINE_MODES = {
    signal:    { gap: [9000, 18000], hold: [2600, 4800], count: [2, 3], motion: [900, 1300], returnMotion: [1000, 1450], stagger: [35, 90], lift: [3, 7], rotate: 2 },
    minerva:   { gap: [11000, 22000], hold: [3000, 5500], count: [2, 3], motion: [1200, 1750], returnMotion: [1300, 1800], stagger: [50, 120], lift: [5, 9], rotate: 2 },
    quiet:     { gap: [15000, 25000], hold: [3500, 6000], count: [2, 2], motion: [1100, 1500], returnMotion: [1200, 1600], stagger: [60, 110], lift: [2, 5], rotate: 1.4 },
    unstable:  { gap: [8000, 15000], hold: [2200, 4500], count: [3, 5], motion: [800, 1250], returnMotion: [900, 1400], stagger: [30, 80], lift: [3, 8], rotate: 2.7 },
    residual:  { gap: [18000, 25000], hold: [4000, 6000], count: [2, 3], motion: [1300, 1800], returnMotion: [1400, 1800], stagger: [70, 120], lift: [3, 7], rotate: 1.5 },
    archive:   { gap: [13000, 23000], hold: [3000, 5500], count: [2, 4], motion: [950, 1500], returnMotion: [1050, 1600], stagger: [30, 120], lift: [3, 7], rotate: 2.2 },
    extension: { gap: [18000, 25000], hold: [3500, 5500], count: [2, 2], motion: [1200, 1600], returnMotion: [1300, 1700], stagger: [70, 120], lift: [2, 4], rotate: 1.2 }
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)");
  const range = (a, b) => a + Math.random() * (b - a);
  const choose = list => list[Math.floor(Math.random() * list.length)];
  const instances = [];
  const headlineInstances = [];
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
          scatter: 0, scatterTarget: 0, scatterX: 0, scatterY: 0, scatterRotate: 0,
          scatterStretch: 0, scatterReturn: range(...config.scatter.recover), hoverTried: false, hoverGlyph: false,
          homeX: 0, homeY: 0,
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
      attention: 0, hover: false, focus: false, disintegrating: false,
      tension: 0, mutations: 0, count: 0
    });
  });

  document.querySelectorAll("[data-dream-headline]").forEach(el => {
    if (el.dataset.dreamHeadlineReady) return;
    const mode = HEADLINE_MODES[el.dataset.dreamMode] ? el.dataset.dreamMode : "quiet";
    const config = HEADLINE_MODES[mode];
    const word = el.textContent;
    const semantic = document.createElement("span");
    semantic.className = "dream-headline__semantic";
    semantic.textContent = word;
    const visual = document.createElement("span");
    visual.className = "dream-headline__visual";
    visual.setAttribute("aria-hidden", "true");
    const chars = [];
    el.style.setProperty("--dream-headline-count", String(word.length));
    for (const [index, canonical] of [...word].entries()) {
      const span = document.createElement("span");
      span.className = "dream-headline__letter";
      span.dataset.canonical = canonical;
      span.style.setProperty("--dream-headline-stop", word.length > 1 ? (index / (word.length - 1) * 100).toFixed(3) + "%" : "0%");
      span.textContent = canonical;
      visual.append(span);
      chars.push({
        span, canonical, index, currentSlot: index, targetSlot: index,
        startX: 0, targetX: 0, motionStart: 0, motionDuration: 0,
        crossY: 0, rotation: 0, settled: true
      });
    }
    el.replaceChildren(semantic, visual);
    el.dataset.dreamHeadlineReady = "true";
    el.dataset.dreamHeadlineEvents = "0";
    el.dataset.dreamHeadlineState = "canonical";
    el.dataset.dreamHeadlineMoving = "false";
    headlineInstances.push({
      el, mode, config, chars, time: 0, next: range(...config.gap),
      visible: false, rect: null, slots: [], affected: [], state: "idle",
      holdUntil: 0, events: 0, needsMeasure: true
    });
  });
  if (!instances.length && !headlineInstances.length) return;

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
  function setGlyph(instance, ch, glyph, immediate = false, durationRange = instance.config.morph) {
    if (immediate) { settleGlyph(ch, glyph); return true; }
    if (ch.morphing || ch.glyph === glyph) return false;
    ch.glyph = glyph;
    ch.incomingGlyph = glyph;
    ch.nextGlyph.textContent = glyph;
    ch.morphing = true;
    ch.morphStart = instance.time;
    ch.morphDuration = range(...durationRange);
    ch.morphAxis = Math.random() < .72 ? "y" : "x";
    ch.morphDirection = Math.random() < .5 ? -1 : 1;
    ch.morphDistance = range(...instance.config.morphDrift);
    ch.span.dataset.dreamMorphing = "true";
    return true;
  }
  function renderGlyphMorph(instance, ch) {
    if (!ch.morphing) return;
    const raw = Math.min(1, Math.max(0, (instance.time - ch.morphStart) / ch.morphDuration));
    // Symmetric smoothstep keeps each glyph dominant on its own side of midpoint.
    const eased = raw * raw * (3 - 2 * raw);
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
    instance.disintegrating = false;
    instance.tension = 0;
    instance.count = 0;
    instance.el.dataset.dreamCorruption = "0";
    instance.el.dataset.dreamDisintegrating = "false";
    instance.el.style.setProperty("--dream-scatter", "0");
    instance.el.dataset.dreamPaused = "true";
    instance.chars.forEach(ch => {
      ch.active = false; ch.target = 0; ch.strength = 0;
      ch.scatter = 0; ch.scatterTarget = 0; ch.hoverTried = false; ch.hoverGlyph = false;
      ch.next = instance.time + range(...instance.config.gap);
      setGlyph(instance, ch, ch.canonical, true);
      ch.span.removeAttribute("style");
    });
    publishTension(instance, 0);
  }
  function resetHeadline(instance, paused = stopped()) {
    instance.state = "idle";
    instance.affected = [];
    instance.holdUntil = 0;
    instance.next = instance.time + range(...instance.config.gap);
    instance.needsMeasure = true;
    instance.el.dataset.dreamHeadlineState = "canonical";
    instance.el.dataset.dreamHeadlineMoving = "false";
    instance.el.dataset.dreamPaused = paused ? "true" : "false";
    instance.chars.forEach(ch => {
      ch.currentSlot = ch.index;
      ch.targetSlot = ch.index;
      ch.startX = 0;
      ch.targetX = 0;
      ch.settled = true;
      ch.span.style.removeProperty("transform");
      ch.span.style.removeProperty("z-index");
    });
  }
  function measureHeadline(instance) {
    instance.slots = instance.chars.map(ch => ch.span.offsetLeft + ch.span.offsetWidth / 2);
    instance.needsMeasure = false;
  }
  function shuffled(list) {
    const result = [...list];
    for (let index = result.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
  function scrambleAssignments(instance) {
    const eligible = instance.chars.filter(ch => /[a-z]/i.test(ch.canonical));
    const minimum = Math.min(instance.config.count[0], eligible.length);
    const maximum = Math.min(instance.config.count[1], eligible.length);
    const strongerChance = instance.mode === "unstable" ? .32 : instance.mode === "archive" ? .22 : .16;
    const count = maximum > minimum && Math.random() < strongerChance
      ? minimum + 1 + Math.floor(Math.random() * (maximum - minimum)) : minimum;
    const start = Math.floor(Math.random() * (eligible.length - count + 1));
    const selected = eligible.slice(start, start + count);
    const shift = selected.length > 2 && Math.random() < .2 ? selected.length - 1 : 1;
    return selected.map((ch, index) => ({ ch, slot: selected[(index + shift) % selected.length].index }));
  }
  function beginHeadlineMotion(instance, returning) {
    if (instance.needsMeasure || instance.slots.length !== instance.chars.length) measureHeadline(instance);
    const assignments = returning
      ? instance.chars.filter(ch => ch.currentSlot !== ch.index).map(ch => ({ ch, slot: ch.index }))
      : scrambleAssignments(instance);
    if (!assignments.length) {
      resetHeadline(instance, false);
      return;
    }
    instance.affected = assignments.map(({ ch }) => ch);
    instance.state = returning ? "returning" : "outbound";
    instance.el.dataset.dreamHeadlineState = returning ? "reconstructing" : "rearranging";
    instance.el.dataset.dreamHeadlineMoving = "true";
    let delay = 0;
    shuffled(assignments).forEach(({ ch, slot }, order) => {
      if (order) delay += range(...instance.config.stagger);
      ch.startX = instance.slots[ch.currentSlot] - instance.slots[ch.index];
      ch.targetSlot = slot;
      ch.targetX = instance.slots[slot] - instance.slots[ch.index];
      ch.motionStart = instance.time + delay;
      ch.motionDuration = range(...(returning ? instance.config.returnMotion : instance.config.motion));
      ch.crossY = range(...instance.config.lift) * (Math.random() < .5 ? -1 : 1);
      ch.rotation = range(-instance.config.rotate, instance.config.rotate);
      ch.settled = false;
    });
  }
  function renderHeadlineMotion(instance) {
    let complete = true;
    instance.affected.forEach(ch => {
      if (instance.time < ch.motionStart) { complete = false; return; }
      const raw = Math.min(1, (instance.time - ch.motionStart) / ch.motionDuration);
      const eased = raw * raw * (3 - 2 * raw);
      const x = ch.startX + (ch.targetX - ch.startX) * eased;
      const y = Math.sin(Math.PI * raw) * ch.crossY;
      const rotation = Math.sin(Math.PI * raw) * ch.rotation;
      ch.span.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg)`;
      ch.span.style.zIndex = ch.crossY < 0 ? "2" : "1";
      if (raw < 1) complete = false;
      else if (!ch.settled) {
        ch.settled = true;
        ch.currentSlot = ch.targetSlot;
        ch.span.style.transform = ch.currentSlot === ch.index
          ? "" : `translate3d(${ch.targetX.toFixed(2)}px,0,0)`;
        ch.span.style.removeProperty("z-index");
      }
    });
    if (!complete) return;
    instance.el.dataset.dreamHeadlineMoving = "false";
    if (instance.state === "outbound") {
      instance.state = "holding";
      instance.holdUntil = instance.time + range(...instance.config.hold);
      instance.el.dataset.dreamHeadlineState = "scrambled";
      instance.el.dataset.dreamHeadlineEvents = String(++instance.events);
    } else {
      instance.state = "idle";
      instance.affected = [];
      instance.next = instance.time + range(...instance.config.gap);
      instance.el.dataset.dreamHeadlineState = "canonical";
      instance.chars.forEach(ch => ch.span.style.removeProperty("transform"));
      if (instance.needsMeasure) measureHeadline(instance);
    }
  }
  function seedScatter(instance) {
    const scatter = instance.config.scatter;
    instance.chars.forEach(ch => {
      // Give the physical interaction a clean, canonical baseline without a
      // second glitch cycle competing beneath it.
      ch.active = false;
      ch.target = 0;
      ch.strength = 0;
      ch.faded = false;
      ch.hoverGlyph = false;
      ch.next = instance.time + range(...instance.config.gap);
      if (ch.morphing) settleGlyph(ch, ch.glyph);
      if (ch.glyph !== ch.canonical) setGlyph(instance, ch, ch.canonical);
      ch.scatterX = range(-1, 1) * scatter.x;
      ch.scatterY = range(.38, 1) * scatter.y;
      ch.scatterRotate = range(-1, 1) * scatter.rotate;
      ch.scatterStretch = range(-.35, 1) * scatter.stretch;
      ch.scatterReturn = range(...scatter.recover);
      ch.hoverTried = false;
    });
  }
  function scatterProximity(instance, ch) {
    if (!instance.disintegrating || coarse.matches) return 0;
    const distance = Math.hypot(pointer.x - ch.homeX, pointer.y - ch.homeY);
    const raw = Math.max(0, 1 - distance / instance.config.scatter.radius);
    return raw * raw * (3 - 2 * raw);
  }
  function schedule() {
    if (!frame && !document.hidden && !stopped() &&
      (instances.some(i => i.visible) || headlineInstances.some(i => i.visible))) {
      frame = requestAnimationFrame(tick);
    }
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
      if (visible) {
        instance.chars.forEach(ch => {
          const characterRect = ch.span.getBoundingClientRect();
          ch.homeX = characterRect.left + characterRect.width / 2;
          ch.homeY = characterRect.top + characterRect.height / 2;
        });
      } else {
        instance.disintegrating = false;
        instance.el.dataset.dreamDisintegrating = "false";
      }
      instance.el.dataset.dreamRunning = visible && !stopped() && !document.hidden ? "true" : "false";
    });
    headlineInstances.forEach(instance => {
      const r = instance.el.getBoundingClientRect();
      instance.rect = r;
      const visible = !instance.el.closest("[inert]") && r.bottom > 0 && r.top < spatialBottom && r.right > 0 && r.left < innerWidth;
      if (instance.visible && !visible) resetHeadline(instance, false);
      instance.visible = visible;
      if (visible) {
        if (instance.state === "idle") measureHeadline(instance);
        else instance.needsMeasure = true;
      }
      instance.el.dataset.dreamRunning = instance.visible && !stopped() && !document.hidden ? "true" : "false";
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
    const hasVisibleDetailMotion = instances.some(instance => instance.visible &&
      (instance.disintegrating || instance.chars.some(ch => ch.morphing || ch.scatter > .003))) ||
      headlineInstances.some(instance => instance.visible && ["outbound", "returning"].includes(instance.state));
    if (!hasVisibleDetailMotion && lastFrame && now - lastFrame < 42) { schedule(); return; }
    const dt = Math.min(80, lastFrame ? now - lastFrame : 42);
    lastFrame = now;
    instances.forEach(instance => {
      if (!instance.visible) return;
      const { config, chars } = instance;
      instance.time += dt;
      const nearby = Math.max(proximity(instance), instance.hover || instance.focus ? .85 : 0);
      instance.attention += (nearby - instance.attention) * (1 - Math.exp(-dt / 1100));
      // The direct hover response is physical; do not also turn it into a
      // faster mutation trigger while the phrase is being pulled apart.
      const influence = instance.disintegrating ? 0 : instance.attention * .2;
      const idle = !config.idle || now - lastActivity > config.idle;
      let occupied = chars.filter(ch => ch.active || ch.strength > .12 || ch.morphing).length;
      for (const ch of chars) {
        if (ch.active && instance.time >= ch.recover) {
          ch.active = false; ch.target = 0;
          ch.next = instance.time + range(...config.gap);
        } else if (!instance.disintegrating && !ch.active && !ch.morphing && ch.strength < .08 && instance.time >= ch.next && idle &&
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
        if (!ch.active && !ch.hoverGlyph && !ch.morphing && ch.strength < .12) setGlyph(instance, ch, ch.canonical);
        const scatterTarget = scatterProximity(instance, ch);
        ch.scatterTarget = scatterTarget;
        const scatterDuration = scatterTarget > ch.scatter ? config.scatter.attack : ch.scatterReturn;
        const scatterDivisor = scatterTarget > ch.scatter ? 3 : 6;
        ch.scatter += (scatterTarget - ch.scatter) * (1 - Math.exp(-dt / (scatterDuration / scatterDivisor)));
        if (!instance.disintegrating && ch.scatter < .003) {
          ch.scatter = 0;
          ch.hoverTried = false;
        }
        if (instance.disintegrating && scatterTarget > .62 && !ch.hoverTried) {
          ch.hoverTried = true;
          const corruptedNow = chars.filter(character => character.glyph !== character.canonical).length;
          if (!ch.active && !ch.morphing && ch.glyph === ch.canonical && corruptedNow < config.cap &&
            Math.random() < config.scatter.glyph && GLYPHS[ch.canonical]) {
            const quiet = instance.mode === "quiet" || instance.mode === "residual";
            const alternatives = quiet ? QUIET_GLYPHS[ch.canonical] : GLYPHS[ch.canonical];
            if (alternatives) {
              ch.hoverGlyph = true;
              setGlyph(instance, ch, choose(alternatives));
            }
          }
        }
        if (ch.hoverGlyph && !ch.morphing && (!instance.disintegrating || scatterTarget < .08)) {
          ch.hoverGlyph = false;
          setGlyph(instance, ch, ch.canonical);
        }
        renderGlyphMorph(instance, ch);
        const s = ch.strength;
        const flow = Math.sin(instance.time * .00038 + ch.phase) * config.drift * .08;
        const mobileScale = coarse.matches ? .55 : 1;
        const x = (ch.dx * s + ch.scatterX * ch.scatter) * mobileScale;
        const y = (ch.dy * s + flow + ch.scatterY * ch.scatter) * mobileScale;
        const chroma = config.chroma * s * (1 + influence) * mobileScale;
        const rotate = ch.scatterRotate * ch.scatter * mobileScale;
        const scaleY = 1 + ch.scatterStretch * ch.scatter;
        ch.span.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scaleX(" + (1 + ch.stretch * s).toFixed(3) + ") scaleY(" + scaleY.toFixed(3) + ") rotate(" + rotate.toFixed(2) + "deg)";
        const idleOpacity = 1 - s * (ch.faded ? .5 : .2);
        ch.span.style.opacity = (idleOpacity * (1 - ch.scatter * config.scatter.fade)).toFixed(3);
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
      const scatterAmount = Math.max(...chars.map(ch => ch.scatter));
      instance.el.style.setProperty("--dream-scatter", scatterAmount.toFixed(3));
      instance.el.dataset.dreamDisintegrating = instance.disintegrating || scatterAmount > .003 ? "true" : "false";
    });
    headlineInstances.forEach(instance => {
      if (!instance.visible) return;
      instance.time += dt;
      if (instance.state === "idle" && instance.time >= instance.next) beginHeadlineMotion(instance, false);
      else if (instance.state === "holding" && instance.time >= instance.holdUntil) beginHeadlineMotion(instance, true);
      if (["outbound", "returning"].includes(instance.state)) renderHeadlineMotion(instance);
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
  document.addEventListener("pointerleave", () => {
    pointer = { x: -10000, y: -10000 };
    instances.forEach(instance => { instance.disintegrating = false; });
  });
  document.addEventListener("scroll", () => {
    activity();
    if (performance.now() - lastMeasure > 100) queueRefresh();
  }, { capture: true, passive: true });
  window.addEventListener("resize", queueRefresh, { passive: true });
  const intersection = new IntersectionObserver(queueRefresh, { threshold: [0, .2, 1] });
  instances.forEach(instance => intersection.observe(instance.el));
  headlineInstances.forEach(instance => intersection.observe(instance.el));
  new MutationObserver(queueRefresh).observe(document.body, { attributes: true, attributeFilter: ["class", "data-active-layer"] });
  document.fonts?.ready.then(queueRefresh);

  instances.forEach(instance => {
    instance.el.addEventListener("pointerenter", event => {
      if (stopped() || coarse.matches || event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      instance.disintegrating = true;
      seedScatter(instance);
      schedule();
    });
    instance.el.addEventListener("pointermove", event => {
      if (!instance.disintegrating || event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
    }, { passive: true });
    instance.el.addEventListener("pointerleave", () => {
      instance.disintegrating = false;
      instance.chars.forEach(ch => { ch.next = instance.time + range(...instance.config.gap); });
    });
  });

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
    headlineInstances.forEach(instance => {
      if (stopped()) resetHeadline(instance);
      else instance.el.dataset.dreamPaused = "false";
    });
    queueRefresh();
  }
  reduced.addEventListener("change", motionChanged);
  window.addEventListener("minerva:motion", event => { motionOff = Boolean(event.detail.still); motionChanged(); });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    cancelAnimationFrame(refreshFrame); refreshFrame = 0;
    instances.forEach(i => {
      i.disintegrating = false;
      i.el.dataset.dreamRunning = "false";
    });
    headlineInstances.forEach(i => { i.el.dataset.dreamRunning = "false"; });
    if (!document.hidden) { lastActivity = performance.now(); queueRefresh(); }
  });
  motionChanged();
})();
