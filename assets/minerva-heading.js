(() => {
  "use strict";

  const down = document.querySelector("[data-minerva-down]");
  if (!down) return;

  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const visibleWord = down.textContent;
  const letters = [...visibleWord].map((character, index) => {
    const letter = document.createElement("span");
    letter.className = "minerva-title__down-letter";
    letter.textContent = character;
    letter.dataset.downLetter = String(index);
    down.append(letter);
    return letter;
  });
  down.firstChild?.nodeType === Node.TEXT_NODE && down.firstChild.remove();

  let still = document.body.classList.contains("still");
  let state = "ready";
  let intentTimer = 0;
  let recoveryTimer = 0;
  let recoveryFrame = 0;
  const completedFalls = new Set();
  const completedReforms = new Set();

  const motionStopped = () => still || reducedMotion.matches;

  const clearTimers = () => {
    if (intentTimer) clearTimeout(intentTimer);
    if (recoveryTimer) clearTimeout(recoveryTimer);
    if (recoveryFrame) cancelAnimationFrame(recoveryFrame);
    intentTimer = 0;
    recoveryTimer = 0;
    recoveryFrame = 0;
  };

  const clearLetterStyles = () => letters.forEach(letter => {
    letter.removeAttribute("style");
  });

  const reset = () => {
    clearTimers();
    state = "ready";
    completedFalls.clear();
    completedReforms.clear();
    down.classList.remove("is-primed", "is-falling", "is-gone", "is-resetting", "is-reforming");
    down.dataset.downState = "ready";
    down.dataset.motionPaused = motionStopped() ? "true" : "false";
    clearLetterStyles();
  };

  const reform = () => {
    if (motionStopped()) {
      reset();
      return;
    }
    state = "reforming";
    completedReforms.clear();
    down.dataset.downState = state;
    down.classList.remove("is-gone", "is-resetting");
    clearLetterStyles();
    letters.forEach((letter, index) => {
      const reverseIndex = letters.length - 1 - index;
      letter.style.setProperty("--down-reform-delay", `${reverseIndex * 42 + Math.random() * 28}ms`);
      letter.style.setProperty("--down-reform-duration", `${560 + Math.random() * 220}ms`);
      letter.style.setProperty("--down-settle", `${1 + Math.random() * 2}px`);
    });
    down.classList.add("is-reforming");
  };

  const recoverFromFall = () => {
    if (state === "gone") {
      reform();
      return;
    }
    if (state !== "falling") return;

    state = "recovering";
    down.dataset.downState = state;
    const current = letters.map(letter => {
      const style = getComputedStyle(letter);
      return { transform: style.transform, opacity: style.opacity };
    });
    down.classList.remove("is-falling");
    letters.forEach((letter, index) => {
      letter.style.transform = current[index].transform;
      letter.style.opacity = current[index].opacity;
      letter.style.transition = "transform 170ms cubic-bezier(.5,.05,.9,.45), opacity 145ms ease-out";
    });

    recoveryFrame = requestAnimationFrame(() => {
      recoveryFrame = 0;
      letters.forEach(letter => {
        letter.style.transform = `${letter.style.transform} translateY(12px)`;
        letter.style.opacity = "0";
      });
      recoveryTimer = window.setTimeout(() => {
        recoveryTimer = 0;
        down.classList.add("is-resetting");
        reform();
      }, 180);
    });
  };

  const fall = () => {
    intentTimer = 0;
    if (state !== "primed" || motionStopped() || !finePointer.matches) {
      reset();
      return;
    }

    state = "falling";
    completedFalls.clear();
    const delayRanges = [[0, 0], [60, 120], [120, 220], [180, 320], [280, 420]];
    letters.forEach((letter, index) => {
      const [delayMin, delayMax] = delayRanges[index] || delayRanges.at(-1);
      const drift = -10 + Math.random() * 20;
      const rotation = -5 + Math.random() * 10;
      letter.style.setProperty("--down-delay", `${delayMin + Math.random() * (delayMax - delayMin)}ms`);
      letter.style.setProperty("--down-duration", `${650 + Math.random() * 550}ms`);
      letter.style.setProperty("--down-distance", `${80 + Math.random() * 140}px`);
      letter.style.setProperty("--down-drift", `${drift.toFixed(2)}px`);
      letter.style.setProperty("--down-rotation", `${rotation.toFixed(2)}deg`);
    });
    down.dataset.downState = state;
    down.classList.remove("is-primed");
    down.classList.add("is-falling");
  };

  down.addEventListener("pointerenter", event => {
    if (state !== "ready" || motionStopped() || !finePointer.matches || event.pointerType === "touch") return;
    state = "primed";
    down.dataset.downState = state;
    down.classList.add("is-primed");
    intentTimer = window.setTimeout(fall, 130);
  });

  down.addEventListener("pointerleave", () => {
    if (state === "primed") {
      clearTimeout(intentTimer);
      intentTimer = 0;
      state = "ready";
      down.dataset.downState = state;
      down.classList.remove("is-primed");
      return;
    }
    recoverFromFall();
  });

  letters.forEach(letter => letter.addEventListener("animationend", event => {
    if (event.animationName === "minerva-down-letter-fall" && state === "falling") {
      completedFalls.add(letter);
      if (completedFalls.size !== letters.length) return;
      state = "gone";
      down.dataset.downState = state;
      down.classList.remove("is-falling");
      down.classList.add("is-gone");
    } else if (event.animationName === "minerva-down-letter-reform" && state === "reforming") {
      completedReforms.add(letter);
      if (completedReforms.size !== letters.length) return;
      reset();
    }
  }));

  window.addEventListener("minerva:motion", event => {
    still = Boolean(event.detail?.still);
    reset();
  });
  reducedMotion.addEventListener("change", reset);
  finePointer.addEventListener("change", reset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
  window.addEventListener("pagehide", clearTimers);

  reset();
})();
