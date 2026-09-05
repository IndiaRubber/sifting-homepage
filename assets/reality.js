/* A draggable sheet edge exposes the layer beneath. All content stays semantic. */
(() => {
  const body = document.body;
  const main = document.querySelector("#main-content");
  const layers = [...document.querySelectorAll("[data-layer]")];
  const handle = document.querySelector("[data-peel]");
  const fold = document.querySelector(".peel-fold");
  const menu = document.querySelector("#layer-index");
  const menuToggle = document.querySelector("[data-index-toggle]");
  const readToggle = document.querySelector("[data-reading]");
  const motionToggle = document.querySelector("[data-motion]");
  const previous = document.querySelector("[data-previous]");
  const status = document.querySelector("[data-layer-status]");
  const depthCounter = document.querySelector("[data-depth]");
  const names = ["The surface", "Minerva Down", "The author", "The machinery", "Open channel"];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const hashIndex = () => {
    const aliases = { top: "signal", books: "minerva", projects: "beyond" };
    const hash = location.hash.slice(1);
    return Math.max(0, layers.findIndex(layer => layer.id === (aliases[hash] || hash)));
  };
  let active = hashIndex();
  let underneath = Math.min(active + 1, layers.length - 1);
  let reading = false;
  let still = reduced.matches;
  let progress = 0;
  let frame = 0;
  let busy = false;
  let drag = null;
  let swallowClick = false;
  let wheelTotal = 0;
  let wheelAt = 0;
  let wheelCooldown = 0;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const smoothstep = (edge0, edge1, value) => {
    const unit = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return unit * unit * (3 - 2 * unit);
  };
  const rootStyle = document.documentElement.style;
  const closeMenu = () => {
    menu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
  };

  function updateControls() {
    depthCounter.textContent = String(active).padStart(2, "0");
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      if (!layers.some(layer => "#" + layer.id === link.getAttribute("href"))) return;
      if (link.getAttribute("href") === "#" + layers[active].id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    previous.disabled = active === 0;
    document.querySelector("[data-next-name]").textContent = names[Math.min(active + 1, layers.length - 1)];
    handle.setAttribute("aria-label", "Peel back this layer to reveal " + names[Math.min(active + 1, layers.length - 1)]);
    body.dataset.activeLayer = String(active);
    body.classList.toggle("is-last", active === layers.length - 1);
  }

  function expose(p) {
    progress = clamp(p, 0, 1);
    const opening = smoothstep(.04, .6, progress);
    const copyReveal = smoothstep(.2, .62, progress);
    const travel = smoothstep(0, 1, progress);
    const seam = 98.2 - travel * 125.2;
    const cut = .5 + opening * 5.5;
    const foldWidth = .72 + opening * 2.48;
    rootStyle.setProperty("--seam", seam + "%");
    rootStyle.setProperty("--peel-progress", progress.toFixed(4));
    rootStyle.setProperty("--peel-copy", copyReveal.toFixed(4));
    rootStyle.setProperty("--fold-width", foldWidth.toFixed(3) + "%");
    rootStyle.setProperty("--fold-turn", (-52 + opening * 24).toFixed(2) + "deg");
    rootStyle.setProperty("--fold-skew", (-2 - opening * 6).toFixed(2) + "deg");
    layers[active].style.clipPath = active === layers.length - 1 && !busy ? "none"
      : "polygon(0 0, " + (seam + cut) + "% 0, " + (seam - cut) + "% 100%, 0 100%)";
    if (underneath !== active) {
      layers[underneath].style.transform = "scale(" + (.965 + progress * .035) + ")";
      layers[underneath].style.filter = "brightness(" + (.8 + progress * .2) + ")";
    }
    fold.style.opacity = String(1 - Math.max(0, progress - .85) / .15);
  }

  function arrange() {
    layers.forEach((layer, index) => {
      layer.style.zIndex = index === active ? "10" : index === underneath ? "5" : "0";
      layer.style.visibility = reading || index === active || index === underneath ? "visible" : "hidden";
      layer.style.transform = "";
      layer.style.filter = "";
      layer.style.clipPath = "";
      layer.inert = !reading && index !== active;
      if (!reading && index !== active) layer.setAttribute("aria-hidden", "true");
      else layer.removeAttribute("aria-hidden");
    });
    updateControls();
    if (!reading) expose(0);
  }

  function finish(target, focusContent) {
    active = target;
    underneath = Math.min(active + 1, layers.length - 1);
    busy = false;
    body.classList.remove("is-peeling");
    arrange();
    history.replaceState(null, "", "#" + layers[active].id);
    status.textContent = "Layer " + active + ": " + names[active];
    if (focusContent) {
      const heading = layers[active].querySelector("h1, h2");
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  function tween(from, to, done) {
    cancelAnimationFrame(frame);
    const start = performance.now();
    const duration = still ? 0 : 950 * Math.max(.35, Math.abs(to - from));
    const tick = now => {
      const elapsed = duration ? clamp((now - start) / duration, 0, 1) : 1;
      const ease = elapsed < .5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
      expose(from + (to - from) * ease);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
      else done();
    };
    frame = requestAnimationFrame(tick);
  }

  function go(target, focusContent = false) {
    target = clamp(target, 0, layers.length - 1);
    if (busy || drag || target === active) return;
    closeMenu();
    if (reading) {
      active = target;
      arrange();
      layers[active].scrollIntoView({ behavior: still ? "instant" : "smooth", block: "start" });
      history.replaceState(null, "", "#" + layers[active].id);
      return;
    }
    busy = true;
    body.classList.add("is-peeling");
    if (target > active) {
      underneath = target;
      arrange();
      tween(0, 1, () => finish(target, focusContent));
    } else {
      underneath = active;
      active = target;
      arrange();
      expose(1);
      tween(1, 0, () => finish(target, focusContent));
    }
  }

  handle.addEventListener("pointerdown", event => {
    if (busy || reading || active === layers.length - 1 || event.button !== 0) return;
    event.preventDefault();
    drag = { x: event.clientX, moved: false };
    swallowClick = false;
    handle.setPointerCapture(event.pointerId);
    body.classList.add("is-peeling");
  });
  handle.addEventListener("pointermove", event => {
    if (!drag) return;
    const dx = drag.x - event.clientX;
    if (Math.abs(dx) > 6) drag.moved = true;
    expose(clamp(dx / (main.clientWidth * .75), 0, 1));
  });
  handle.addEventListener("pointerup", event => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    swallowClick = true;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    if (!moved) {
      body.classList.remove("is-peeling");
      go(active + 1);
    } else {
      busy = true;
      const target = progress > .18 ? active + 1 : active;
      tween(progress, target === active ? 0 : 1, () => finish(target, false));
    }
  });
  handle.addEventListener("pointercancel", () => {
    if (!drag) return;
    drag = null;
    swallowClick = true;
    busy = true;
    tween(progress, 0, () => finish(active, false));
  });
  handle.addEventListener("click", event => {
    if (swallowClick && event.detail !== 0) { swallowClick = false; return; }
    go(active + 1, event.detail === 0);
  });

  document.querySelectorAll("[data-descend]").forEach(button => button.addEventListener("click", event => go(Number(button.closest("[data-layer]").dataset.layer) + 1, event.detail === 0)));
  previous.addEventListener("click", event => go(active - 1, event.detail === 0));
  document.querySelector("[data-return]").addEventListener("click", event => go(0, event.detail === 0));
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const target = layers.findIndex(layer => "#" + layer.id === link.getAttribute("href"));
    if (target < 0) return;
    link.addEventListener("click", event => {
      event.preventDefault();
      if (active === target) closeMenu();
      else go(target, event.detail === 0);
    });
  });
  menuToggle.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    menuToggle.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("pointerdown", event => {
    if (!menu.hidden && !menu.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const wasOpen = !menu.hidden;
      closeMenu();
      if (wasOpen) menuToggle.focus();
      return;
    }
    if (reading || !menu.hidden || event.target.closest("input,textarea,select,[contenteditable]") || event.altKey || event.ctrlKey || event.metaKey) return;
    if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); go(active + 1, true); }
    if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); go(active - 1, true); }
  });

  main.addEventListener("wheel", event => {
    if (reading || event.ctrlKey || !menu.hidden) return;
    const content = layers[active].querySelector(".reality-content");
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
    if (vertical && content.scrollHeight > content.clientHeight + 2) {
      const canScroll = delta > 0 ? content.scrollTop + content.clientHeight < content.scrollHeight - 3 : content.scrollTop > 3;
      if (canScroll) return;
    }
    event.preventDefault();
    const now = performance.now();
    if (busy || drag || now < wheelCooldown) return;
    if (now - wheelAt > 180 || Math.sign(wheelTotal) !== Math.sign(delta)) wheelTotal = 0;
    wheelTotal += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? main.clientHeight : 1);
    wheelAt = now;
    if (Math.abs(wheelTotal) > 170) {
      go(active + Math.sign(wheelTotal));
      wheelTotal = 0;
      wheelCooldown = now + 1250;
    }
  }, { passive: false });

  readToggle.addEventListener("click", () => {
    if (busy || drag) return;
    reading = !reading;
    body.classList.toggle("spatial", !reading);
    readToggle.setAttribute("aria-pressed", String(reading));
    readToggle.textContent = reading ? "Spatial mode" : "Reading mode";
    arrange();
    if (reading) layers[active].scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  });
  function setStill(value) {
    still = value;
    body.classList.toggle("still", still);
    motionToggle.setAttribute("aria-pressed", String(still));
    motionToggle.textContent = still ? "Wake the world" : "Still the world";
    rootStyle.setProperty("--world-x", "0px");
    rootStyle.setProperty("--world-y", "0px");
    window.dispatchEvent(new CustomEvent("minerva:motion", { detail: { still } }));
  }
  motionToggle.addEventListener("click", () => setStill(!still));
  reduced.addEventListener("change", event => setStill(event.matches));
  window.addEventListener("pointermove", event => {
    if (still || reading || drag || event.pointerType === "touch") return;
    rootStyle.setProperty("--world-x", ((event.clientX / innerWidth - .5) * -14).toFixed(1) + "px");
    rootStyle.setProperty("--world-y", ((event.clientY / innerHeight - .5) * -10).toFixed(1) + "px");
  }, { passive: true });
  function resize() {
    rootStyle.setProperty("--fold-angle", (-Math.atan(.12 * main.clientWidth / Math.max(1, main.clientHeight)) * 180 / Math.PI) + "deg");
  }
  window.addEventListener("resize", resize);
  window.addEventListener("hashchange", () => go(hashIndex()));
  const readerObserver = new IntersectionObserver(entries => {
    if (!reading) return;
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    active = Number(visible.target.dataset.layer);
    updateControls();
  }, { threshold: [.25, .5, .75] });
  layers.forEach(layer => readerObserver.observe(layer));
  body.classList.add("spatial");
  setStill(still);
  arrange();
  resize();
})();
