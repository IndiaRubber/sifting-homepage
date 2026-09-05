(() => {
  const stage = document.querySelector("[data-book-stage]");
  if (!stage) return;

  const section = stage.closest(".reality--minerva");
  const book = stage.querySelector("[data-minerva-book]");
  const cover = stage.querySelector("[data-book-cover]");
  const page = stage.querySelector("[data-book-page]");
  const continueLink = stage.querySelector("[data-book-continue]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!section || !book || !cover || !page || !continueLink) return;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (edge0, edge1, value) => {
    const unit = clamp((value - edge0) / (edge1 - edge0));
    return unit * unit * (3 - 2 * unit);
  };

  let progress = 0;
  let animationFrame = 0;
  let drag = null;
  let suppressClick = false;
  let clickResetTimer = 0;
  let committing = false;
  let navigateTimer = 0;
  let still = document.body.classList.contains("still") || reducedMotion.matches;
  let pageTravelX = 0;
  let pageTravelY = 0;
  let pageFinalScale = 2.8;

  const measureAperture = () => {
    const rect = page.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pageTravelX = (window.innerWidth / 2) - (rect.left + rect.width / 2);
    pageTravelY = (window.innerHeight / 2) - (rect.top + rect.height / 2);
    pageFinalScale = clamp(
      Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.06,
      2.4,
      5.2
    );
  };

  const exposePage = (exposed) => {
    cover.setAttribute("aria-expanded", String(exposed));
    page.setAttribute("aria-hidden", String(!exposed));
    continueLink.tabIndex = exposed ? 0 : -1;
  };

  const render = (value) => {
    progress = clamp(value);

    const reveal = smoothstep(.24, .58, progress);
    const expansion = smoothstep(.64, .86, progress);
    const aperture = smoothstep(.84, 1, progress);
    const pageSpread = smoothstep(.25, .58, progress);
    const spreadLimit = window.innerWidth <= 760 ? 1.22 : 1.42;
    const coverAngle = -158 * smoothstep(0, .64, progress);
    const coverOpacity = 1 - (.82 * smoothstep(.7, 1, progress));
    const pageScale = 1 + (.18 * expansion) + ((pageFinalScale - 1.18) * aperture);
    const bookLift = -22 * expansion;
    const bookScale = 1 + (.12 * expansion);

    stage.style.setProperty("--book-open", progress.toFixed(4));
    stage.style.setProperty("--book-page-reveal", reveal.toFixed(4));
    stage.style.setProperty("--book-aperture", aperture.toFixed(4));
    section.style.setProperty("--book-panel-dim", (smoothstep(.62, 1, progress) * .92).toFixed(4));

    cover.style.transform = `rotateY(${coverAngle.toFixed(3)}deg)`;
    cover.style.opacity = coverOpacity.toFixed(4);
    book.style.setProperty("--book-lift", `${bookLift.toFixed(2)}px`);
    book.style.setProperty("--book-gesture-scale", bookScale.toFixed(4));
    page.style.width = `${(100 * (1 + ((spreadLimit - 1) * pageSpread))).toFixed(2)}%`;
    page.style.transform = `translate3d(${(pageTravelX * aperture).toFixed(2)}px, ${(pageTravelY * aperture).toFixed(2)}px, 2px) scale(${pageScale.toFixed(4)})`;

    exposePage(progress >= .44);
    if (committing || progress >= .9) stage.dataset.bookState = "threshold";
    else if (progress >= .38) stage.dataset.bookState = "preview";
    else if (progress > .01) stage.dataset.bookState = "opening";
    else stage.dataset.bookState = "closed";
  };

  const stopAnimation = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const animateTo = (target, duration = 440, complete) => {
    stopAnimation();
    const from = progress;
    const distance = Math.abs(target - from);
    const started = performance.now();
    const actualDuration = still ? 0 : Math.max(180, duration * Math.max(.42, distance));

    if (!actualDuration) {
      render(target);
      complete?.();
      return;
    }

    const tick = (now) => {
      const raw = clamp((now - started) / actualDuration);
      const eased = raw * raw * (3 - 2 * raw);
      render(from + ((target - from) * eased));
      if (raw < 1) animationFrame = requestAnimationFrame(tick);
      else {
        animationFrame = 0;
        complete?.();
      }
    };

    animationFrame = requestAnimationFrame(tick);
  };

  const resist = (raw) => {
    if (raw <= .82) return Math.max(0, raw);
    return .82 + (.18 * (1 - Math.exp(-(raw - .82) * 4.2)));
  };

  const suppressPointerClick = () => {
    suppressClick = true;
    if (clickResetTimer) clearTimeout(clickResetTimer);
    clickResetTimer = window.setTimeout(() => {
      suppressClick = false;
      clickResetTimer = 0;
    }, 0);
  };

  const finishGesture = () => {
    stage.classList.remove("is-dragging");
    document.body.classList.remove("minerva-book-dragging");

    if (progress >= .92) {
      commitToPrologue();
    } else if (progress >= .34) {
      animateTo(.62, 460);
    } else {
      animateTo(0, 390);
    }
  };

  const commitToPrologue = () => {
    if (committing) return;
    committing = true;
    drag = null;
    measureAperture();
    stage.classList.add("is-committing");
    animateTo(1, 720, () => {
      navigateTimer = window.setTimeout(() => {
        window.location.assign(continueLink.href);
      }, still ? 0 : 120);
    });
  };

  const onPointerDown = (event) => {
    if (committing || event.button !== 0 || event.target.closest("[data-book-continue]")) return;

    stopAnimation();
    measureAperture();
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startProgress: progress,
      horizontal: event.pointerType !== "touch",
      moved: false
    };
    suppressClick = false;

    if (drag.horizontal) {
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
      document.body.classList.add("minerva-book-dragging");
    }
  };

  const onPointerMove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.horizontal) {
      if (Math.abs(deltaY) > 9 && Math.abs(deltaY) > Math.abs(deltaX) * 1.12) {
        drag = null;
        return;
      }
      if (Math.abs(deltaX) < 9 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.18) return;
      drag.horizontal = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
      document.body.classList.add("minerva-book-dragging");
    }

    event.preventDefault();
    if (Math.abs(deltaX) > 10) drag.moved = true;
    const travel = Math.max(170, Math.min(320, book.getBoundingClientRect().width * .96));
    const raw = drag.startProgress - (deltaX / travel);
    render(resist(raw));
  };

  const releasePointer = (event, cancelled = false) => {
    if (!drag || event.pointerId !== drag.id) return;
    const wasHorizontal = drag.horizontal;
    const moved = drag.moved;
    drag = null;

    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!wasHorizontal) return;

    if (!moved && !cancelled) {
      stage.classList.remove("is-dragging");
      document.body.classList.remove("minerva-book-dragging");
      suppressPointerClick();
      measureAperture();
      animateTo(progress >= .38 ? 0 : .62, still ? 0 : 460);
      return;
    }

    suppressPointerClick();
    if (cancelled) {
      stage.classList.remove("is-dragging");
      document.body.classList.remove("minerva-book-dragging");
      animateTo(progress >= .48 ? .62 : 0, 360);
      return;
    }
    finishGesture();
  };

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove, { passive: false });
  stage.addEventListener("pointerup", (event) => releasePointer(event));
  stage.addEventListener("pointercancel", (event) => releasePointer(event, true));

  cover.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (committing) return;
    measureAperture();
    animateTo(progress >= .38 ? 0 : .62, still ? 0 : 460);
  });

  continueLink.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    commitToPrologue();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || progress < .01 || committing) return;
    animateTo(0, 380, () => cover.focus());
  });

  window.addEventListener("resize", measureAperture, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || committing) return;
    stopAnimation();
    drag = null;
    stage.classList.remove("is-dragging");
    document.body.classList.remove("minerva-book-dragging");
    render(progress >= .34 ? .62 : 0);
  });

  window.addEventListener("minerva:motion", (event) => {
    still = Boolean(event.detail?.still) || reducedMotion.matches;
    if (!still || committing) return;
    stopAnimation();
    drag = null;
    stage.classList.remove("is-dragging");
    document.body.classList.remove("minerva-book-dragging");
    render(progress >= .34 ? .62 : 0);
  });

  const onReducedMotionChange = () => {
    still = document.body.classList.contains("still") || reducedMotion.matches;
    if (still && !committing) render(progress >= .34 ? .62 : 0);
  };

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", onReducedMotionChange);
  } else {
    reducedMotion.addListener(onReducedMotionChange);
  }

  window.addEventListener("pagehide", () => {
    stopAnimation();
    if (navigateTimer) clearTimeout(navigateTimer);
    if (clickResetTimer) clearTimeout(clickResetTimer);
  });

  measureAperture();
  render(0);
})();
