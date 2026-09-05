/* A quiet procedural layer: one continuous Minerva filament beneath the panels. */
(() => {
  const canvas = document.getElementById("minerva-canvas");
  if (!canvas) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 780px)");
  const panelStates = [
    { name: "AWAKE / OBSERVING", branches: 4, alpha: .28, drift: .18, color: [143, 220, 224] },
    { name: "RECOGNITION", branches: 8, alpha: .52, drift: .28, color: [177, 211, 244] },
    { name: "QUIET", branches: 2, alpha: .13, drift: .08, color: [179, 195, 210] },
    { name: "INSTABILITY", branches: 6, alpha: .34, drift: .42, color: [165, 190, 237] },
    { name: "RESIDUAL", branches: 3, alpha: .2, drift: .2, color: [146, 208, 217] }
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let branches = [];
  let depthNodes = [];
  let activePanel = 0;
  let pointerTarget = { x: .62, y: .48 };
  let pointer = { x: .62, y: .48 };
  let pointerSeen = false;
  let archiveActive = false;
  let corruption = 0;
  let pulse = 0;
  let audioEnergy = 0;
  let depthPhase = 0;
  let frame = 0;
  let lastFrame = 0;
  let running = false;
  let reducedListener;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rgba = (color, alpha) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  const random = (seed) => {
    const value = Math.sin(seed * 127.13 + 19.7) * 43758.5453;
    return value - Math.floor(value);
  };

  const trunkX = y => .62 + Math.sin(y * 7.2 + 1.2) * .055 + Math.sin(y * 2.4) * .035;

  function buildBranches() {
    branches = [];
    const count = mobile.matches ? 1 : 8;
    for (let index = 0; index < count; index += 1) {
      const startY = .08 + index * .115 + random(index + 2) * .035;
      const direction = index % 2 ? 1 : -1;
      const angle = direction * (.42 + random(index + 8) * .42);
      const length = .18 + random(index + 22) * .25;
      const points = [];
      for (let point = 0; point < 11; point += 1) {
        const progress = point / 10;
        const distance = progress * length;
        const y = startY + (random(index * 4 + point + 3) - .5) * .012 + direction * distance * .1;
        const x = trunkX(startY) + Math.cos(angle) * distance + Math.sin(progress * 5 + index) * .018 * progress;
        points.push({ x, y: clamp(y, -.1, 1.1), phase: random(index * 18 + point + 1) * Math.PI * 2 });
      }
      branches.push({ points, phase: random(index + 61) * Math.PI * 2, index });
    }
    depthNodes = [];
    const depthCount = mobile.matches ? 0 : Math.min(140, Math.max(72, Math.round(width / 9)));
    for (let index = 0; index < depthCount; index += 1) {
      depthNodes.push({
        x: random(index + 180) * 2 - 1,
        y: random(index + 420) * 1.55 - .77,
        z: .06 + random(index + 680) * .94,
        size: .35 + random(index + 910) * 1.35,
        phase: random(index + 1200) * Math.PI * 2
      });
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildBranches();
    draw(performance.now());
  }

  function setPanelState(index, withPulse = true) {
    activePanel = clamp(Number(index) || 0, 0, panelStates.length - 1);
    if (withPulse && !reducedMotion.matches && !mobile.matches) pulse = 1;
    document.documentElement.dataset.minervaState = panelStates[activePanel].name.toLowerCase().replaceAll(" / ", "-").replaceAll(" ", "-");
  }

  function branchPoint(point, branch, time, state) {
    const branchDrift = state.drift * (.003 + branch.index * .00025);
    let x = point.x + Math.sin(time * .000035 + point.phase + branch.phase) * branchDrift;
    let y = point.y + Math.cos(time * .000028 + point.phase) * branchDrift * .7;
    if (pointerSeen && !mobile.matches) {
      const dx = pointer.x - x;
      const dy = pointer.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const influence = clamp(1 - distance * 2.8, 0, 1) * .025;
      x += dx * influence;
      y += dy * influence;
    }
    if (activePanel === 3) x += Math.sin(time * .00018 + branch.phase) * .0025;
    if (activePanel === 4) y += Math.sin(time * .00005 + branch.phase) * .0018;
    return [x * width, y * height];
  }

  function strokePath(points, branch, time, state, lineWidth, alpha) {
    context.beginPath();
    points.forEach((point, index) => {
      const [x, y] = branchPoint(point, branch, time, state);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.lineWidth = lineWidth;
    context.strokeStyle = rgba(state.color, alpha);
    context.stroke();
  }

  function draw(time) {
    if (!width || !height) return;
    const state = panelStates[activePanel];
    const elapsed = Math.max(0, time - lastFrame);
    pointer.x += (pointerTarget.x - pointer.x) * .028;
    pointer.y += (pointerTarget.y - pointer.y) * .028;
    corruption = Math.max(0, corruption - elapsed / 850);
    pulse = Math.max(0, pulse - elapsed / 330);
    depthPhase += elapsed * (.000018 + state.drift * .00002 + audioEnergy * .000055);

    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    context.lineJoin = "round";

    const boost = pulse * .22 + corruption * .12 + (archiveActive ? .1 : 0) + audioEnergy * .23;
    const centerX = width * (.5 + (pointer.x - .5) * .045);
    const centerY = height * (.5 + (pointer.y - .5) * .035);
    depthNodes.forEach(node => {
      const cycle = ((node.z - depthPhase) % 1 + 1) % 1;
      const z = .04 + cycle * .96;
      const perspective = 1 / (.25 + z * 1.55);
      const x = centerX + node.x * width * .58 * perspective;
      const y = centerY + node.y * height * .62 * perspective;
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return;
      const alpha = (1 - z) * (.09 + state.alpha * .24 + audioEnergy * .3);
      const radius = node.size * perspective * (1 + audioEnergy * .9);
      context.beginPath();
      context.arc(x, y, Math.min(3.2, radius), 0, Math.PI * 2);
      context.fillStyle = rgba(state.color, alpha);
      context.fill();
      if (audioEnergy > .08 && node.size > 1.05) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(centerX + node.x * width * .58 / (.29 + z * 1.55), centerY + node.y * height * .62 / (.29 + z * 1.55));
        context.strokeStyle = rgba(state.color, alpha * audioEnergy * 1.5);
        context.lineWidth = .55;
        context.stroke();
      }
    });

    const trunk = [];
    for (let point = 0; point < 24; point += 1) {
      const y = -.12 + point / 23 * 1.24;
      trunk.push({ x: trunkX(y), y, phase: point * .35 });
    }
    const trunkBranch = { index: 0, phase: .6 };
    context.shadowBlur = 22;
    context.shadowColor = rgba(state.color, .35);
    strokePath(trunk, trunkBranch, time, state, 5 + state.alpha * 4, state.alpha * .18 + boost);
    context.shadowBlur = 0;
    strokePath(trunk, trunkBranch, time, state, 1.1 + state.alpha, state.alpha * .72 + boost * 1.6);

    branches.slice(0, state.branches).forEach(branch => {
      context.shadowBlur = 16;
      context.shadowColor = rgba(state.color, .28);
      strokePath(branch.points, branch, time, state, 3 + state.alpha * 3, state.alpha * .11 + boost * .45);
      context.shadowBlur = 0;
      strokePath(branch.points, branch, time, state, .65 + state.alpha * .75, state.alpha * .56 + boost);
    });

    if (pointerSeen && !mobile.matches && activePanel !== 2) {
      const nodeAlpha = (.08 + state.alpha * .18) * (archiveActive ? 1.5 : 1);
      const nx = pointer.x * width;
      const ny = pointer.y * height;
      context.beginPath();
      context.arc(nx, ny, 2.2 + state.alpha * 3, 0, Math.PI * 2);
      context.fillStyle = rgba([214, 242, 239], nodeAlpha);
      context.shadowBlur = 14;
      context.shadowColor = rgba(state.color, nodeAlpha);
      context.fill();
      context.shadowBlur = 0;
    }

    if (pulse > 0 && !reducedMotion.matches) {
      const progress = 1 - pulse;
      const x = (progress * 1.25 - .12) * width;
      const gradient = context.createLinearGradient(x - 80, 0, x + 80, 0);
      gradient.addColorStop(0, "rgba(117,220,235,0)");
      gradient.addColorStop(.5, `rgba(155,139,231,${pulse * .22})`);
      gradient.addColorStop(1, "rgba(117,220,235,0)");
      context.fillStyle = gradient;
      context.fillRect(x - 80, 0, 160, height);
    }
    context.restore();
    lastFrame = time;
  }

  function loop(time) {
    if (!running) return;
    if (document.hidden) {
      running = false;
      return;
    }
    if (time - lastFrame < 30) {
      frame = requestAnimationFrame(loop);
      return;
    }
    draw(time);
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (reducedMotion.matches || mobile.matches || running) {
      draw(performance.now());
      return;
    }
    running = true;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", event => {
    if (mobile.matches) return;
    pointerTarget.x = clamp(event.clientX / width, 0, 1);
    pointerTarget.y = clamp(event.clientY / height, 0, 1);
    pointerSeen = true;
  }, { passive: true });
  window.addEventListener("pointerleave", () => { pointerSeen = false; });
  window.addEventListener("minerva:panel", event => setPanelState(event.detail?.index ?? 0));
  window.addEventListener("minerva:energy", event => {
    audioEnergy = clamp(Number(event.detail?.value) || 0, 0, 1);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else { lastFrame = performance.now(); start(); }
  });

  const dream = document.querySelector(".dream-warning");
  if (dream) {
    new MutationObserver(() => {
      if (dream.classList.contains("dream-warning--corrupt")) corruption = 1;
    }).observe(dream, { attributes: true, attributeFilter: ["class"] });
  }

  const archive = document.querySelector(".project-entry-archive");
  if (archive) {
    const activateArchive = () => {
      archiveActive = true;
      document.body.classList.add("minerva-archive-active");
    };
    const deactivateArchive = () => {
      archiveActive = false;
      document.body.classList.remove("minerva-archive-active");
    };
    archive.addEventListener("pointerenter", activateArchive);
    archive.addEventListener("pointerleave", deactivateArchive);
    archive.addEventListener("focusin", activateArchive);
    archive.addEventListener("focusout", deactivateArchive);
    archive.addEventListener("click", event => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      pulse = 1;
      document.body.classList.add("minerva-archive-transition");
      window.setTimeout(() => { window.location.href = archive.href; }, 190);
    });
  }

  reducedListener = event => {
    if (event.matches) {
      stop();
      pulse = 0;
      draw(performance.now());
    } else if (!mobile.matches) start();
  };
  reducedMotion.addEventListener?.("change", reducedListener);
  mobile.addEventListener?.("change", () => {
    buildBranches();
    if (mobile.matches) stop();
    else start();
    draw(performance.now());
  });

  const hashIndex = ["signal", "minerva", "about", "projects", "contact"].indexOf(location.hash.slice(1));
  setPanelState(hashIndex >= 0 ? hashIndex : 0, false);
  resize();
  if (!reducedMotion.matches && !mobile.matches) start();
})();
