/* User-controlled soundtrack, spectrum telemetry, and spatial artifact response. */
(() => {
  const player = document.querySelector("[data-audio-player]");
  const audio = player?.querySelector("[data-audio-source]");
  const toggles = [...document.querySelectorAll("[data-audio-toggle]")];
  const seek = player?.querySelector("[data-audio-seek]");
  const mute = player?.querySelector("[data-audio-mute]");
  const current = player?.querySelector("[data-audio-current]");
  const duration = player?.querySelector("[data-audio-duration]");
  const spectrum = player?.querySelector("[data-audio-spectrum]");
  const bookStage = document.querySelector("[data-book-stage]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!player || !audio || !seek || !mute || !spectrum) return;

  const spectrumContext = spectrum.getContext("2d");
  let audioContext;
  let analyser;
  let source;
  let frequencyData;
  let animationFrame;
  let smoothEnergy = 0;
  let draggingSeek = false;

  const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return "—:—";
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  };

  const setToggleState = playing => {
    toggles.forEach(button => {
      const icon = button.querySelector("[aria-hidden='true']");
      const label = button.querySelector("[data-audio-toggle-label]");
      if (icon) icon.textContent = playing ? "Ⅱ" : "▶";
      if (label) label.textContent = playing ? "Pause soundtrack" : "Enter soundtrack";
      button.setAttribute("aria-label", playing ? "Pause Minerva Down soundtrack" : "Play Minerva Down soundtrack");
      button.setAttribute("aria-pressed", String(playing));
    });
    document.body.classList.toggle("audio-playing", playing);
  };

  const setupAudioGraph = () => {
    if (audioContext) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = .82;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  };

  const drawSpectrum = () => {
    if (!spectrumContext) return;
    const width = spectrum.width;
    const height = spectrum.height;
    spectrumContext.clearRect(0, 0, width, height);
    const bars = 18;
    const gap = 3;
    const barWidth = (width - gap * (bars - 1)) / bars;
    for (let index = 0; index < bars; index += 1) {
      const sourceIndex = Math.min(frequencyData?.length - 1 || 0, Math.floor(index * 1.8));
      const level = frequencyData ? frequencyData[sourceIndex] / 255 : 0;
      const idle = .12 + Math.sin(performance.now() * .0018 + index * .72) * .035;
      const barHeight = Math.max(2, (audio.paused ? idle : level) * height);
      const gradient = spectrumContext.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, `rgba(117, 220, 235, ${.48 + level * .5})`);
      gradient.addColorStop(1, `rgba(155, 139, 231, ${.2 + level * .52})`);
      spectrumContext.fillStyle = gradient;
      spectrumContext.fillRect(index * (barWidth + gap), height - barHeight, barWidth, barHeight);
    }
  };

  const animate = () => {
    if (analyser && frequencyData && !audio.paused) {
      analyser.getByteFrequencyData(frequencyData);
      const lowBand = frequencyData.slice(1, 13);
      const average = lowBand.reduce((sum, value) => sum + value, 0) / (lowBand.length * 255);
      smoothEnergy += (average - smoothEnergy) * .16;
    } else {
      smoothEnergy *= .91;
    }
    const energy = reducedMotion.matches ? 0 : Math.min(1, smoothEnergy * 1.45);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--audio-energy", energy.toFixed(3));
    rootStyle.setProperty("--audio-stage-alpha", (.11 + energy * .2).toFixed(3));
    rootStyle.setProperty("--audio-depth", `${24 + energy * 14}px`);
    rootStyle.setProperty("--audio-face-glow", `${22 + energy * 42}px`);
    rootStyle.setProperty("--audio-face-alpha", (.08 + energy * .22).toFixed(3));
    rootStyle.setProperty("--audio-sheen-alpha", (.05 + energy * .08).toFixed(3));
    rootStyle.setProperty("--audio-sheen-shift", `${-54 + energy * 38}%`);
    rootStyle.setProperty("--audio-orbit-alpha", (.14 + energy * .18).toFixed(3));
    rootStyle.setProperty("--audio-node-alpha", (.25 + energy * .5).toFixed(3));
    rootStyle.setProperty("--audio-inner-alpha", (.12 + energy * .24).toFixed(3));
    rootStyle.setProperty("--audio-axis-opacity", (.35 + energy * .4).toFixed(3));
    rootStyle.setProperty("--audio-shadow-blur", `${15 + energy * 8}px`);
    rootStyle.setProperty("--audio-player-alpha", (.03 + energy * .35).toFixed(3));
    rootStyle.setProperty("--audio-player-glow", `${4 + energy * 18}px`);
    rootStyle.setProperty("--audio-player-glow-alpha", (energy * .24).toFixed(3));
    window.dispatchEvent(new CustomEvent("minerva:energy", { detail: { value: energy } }));
    drawSpectrum();
    animationFrame = requestAnimationFrame(animate);
  };

  const togglePlayback = async () => {
    try {
      setupAudioGraph();
      if (audioContext?.state === "suspended") await audioContext.resume();
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (error) {
      player.classList.add("soundtrack-player--error");
      player.setAttribute("aria-label", "Soundtrack could not start. Try the play control again.");
    }
  };

  toggles.forEach(button => button.addEventListener("click", togglePlayback));

  audio.addEventListener("play", () => setToggleState(true));
  audio.addEventListener("pause", () => setToggleState(false));
  audio.addEventListener("loadedmetadata", () => {
    if (duration) duration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (current) current.textContent = formatTime(audio.currentTime);
    if (!draggingSeek && Number.isFinite(audio.duration) && audio.duration > 0) {
      seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
    }
  });
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    seek.value = "0";
  });

  seek.addEventListener("pointerdown", () => { draggingSeek = true; });
  seek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) {
      const previewTime = Number(seek.value) / 1000 * audio.duration;
      if (current) current.textContent = formatTime(previewTime);
    }
  });
  const commitSeek = () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
    draggingSeek = false;
  };
  seek.addEventListener("change", commitSeek);
  seek.addEventListener("pointerup", commitSeek);

  mute.addEventListener("click", () => {
    audio.muted = !audio.muted;
    mute.querySelector("[aria-hidden='true']").textContent = audio.muted ? "×" : "◖";
    mute.setAttribute("aria-label", audio.muted ? "Unmute soundtrack" : "Mute soundtrack");
    mute.setAttribute("aria-pressed", String(audio.muted));
  });

  if (bookStage && !reducedMotion.matches) {
    const moveBook = event => {
      const bounds = bookStage.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      bookStage.style.setProperty("--book-ry", `${x * 28}deg`);
      bookStage.style.setProperty("--book-rx", `${y * -20}deg`);
      bookStage.style.setProperty("--book-lift", `${Math.abs(x) * -4 - 4}px`);
    };
    const resetBook = () => {
      bookStage.style.setProperty("--book-ry", "-15deg");
      bookStage.style.setProperty("--book-rx", "-4deg");
      bookStage.style.setProperty("--book-lift", "0px");
    };
    bookStage.addEventListener("pointermove", moveBook, { passive: true });
    bookStage.addEventListener("pointerleave", resetBook);
  }

  if (audio.readyState >= 1 && duration) duration.textContent = formatTime(audio.duration);
  setToggleState(false);
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
})();
