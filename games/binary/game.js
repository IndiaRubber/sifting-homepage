(() => {
  const board = document.querySelector('#board');
  const startPanel = document.querySelector('#start-panel');
  const scoreEl = document.querySelector('#score');
  const levelEl = document.querySelector('#level');
  const clearedEl = document.querySelector('#cleared');
  const bestEl = document.querySelector('#best');
  const pauseBtn = document.querySelector('#pause');
  const endBtn = document.querySelector('#end');
  const message = document.querySelector('#message');
  const prompt = document.querySelector('#prompt');
  const submitBtn = document.querySelector('#submit');
  let rows = [], score = 0, cleared = 0, level = 1, challengeCount = 0, timer = null, paused = false, active = false;

  const best = () => Number(localStorage.getItem('signal-eight-best') || 0);
  const bitsFor = value => Array.from({length: 8}, (_, i) => (value >> (7 - i)) & 1);
  const valueOf = bits => bits.reduce((total, bit, i) => total + bit * (128 >> i), 0);
  const interval = () => Math.max(2200, 7600 - (level - 1) * 520);
  const pad = (value, size) => String(value).padStart(size, '0');

  function toast(text, kind) {
    message.textContent = text; message.className = `message show ${kind}`;
    clearTimeout(message.hideTimer); message.hideTimer = setTimeout(() => message.className = 'message', 900);
  }

  function updateStats() {
    level = Math.min(12, Math.floor(cleared / 6) + 1);
    scoreEl.textContent = pad(score, 6); levelEl.textContent = pad(level, 2);
    clearedEl.textContent = pad(cleared, 2); bestEl.textContent = pad(Math.max(best(), score), 6);
  }

  function newChallenge() {
    if (!active || paused) return;
    const target = Math.floor(Math.random() * 256);
    const mode = challengeCount++ % 2 === 0 ? 'toDecimal' : 'toBinary';
    rows.push({id: crypto.randomUUID(), target, mode, bits: mode === 'toDecimal' ? bitsFor(target) : Array(8).fill(0), answer: ''});
    if (rows.length > 7) return gameOver();
    render(); schedule();
  }

  function schedule() { clearTimeout(timer); if (active && !paused) timer = setTimeout(newChallenge, interval()); }

  function render() {
    board.replaceChildren();
    rows.forEach((row, index) => {
      const element = document.createElement('div');
      element.className = `challenge-row${index === 0 ? ' current' : ''}`;
      row.bits.forEach((bit, bitIndex) => {
        const button = document.createElement('button');
        button.className = `bit${bit ? ' active' : ''}${row.mode === 'toDecimal' ? ' fixed' : ''}`;
        button.textContent = bit; button.disabled = index !== 0 || row.mode === 'toDecimal';
        button.setAttribute('aria-label', `${128 >> bitIndex} bit: ${bit}`);
        button.onclick = () => { row.bits[bitIndex] ^= 1; render(); };
        element.append(button);
      });
      const equals = document.createElement('span'); equals.className = 'equals'; equals.textContent = '='; element.append(equals);
      if (row.mode === 'toBinary') {
        const target = document.createElement('span'); target.className = 'decimal target'; target.textContent = row.target; element.append(target);
      } else {
        const input = document.createElement('input'); input.className = 'decimal'; input.inputMode = 'numeric'; input.maxLength = 3;
        input.value = row.answer; input.placeholder = '?'; input.disabled = index !== 0;
        input.oninput = event => row.answer = event.target.value.replace(/\D/g, '').slice(0, 3);
        input.onkeydown = event => { if (event.key === 'Enter') submit(); };
        element.append(input); if (index === 0) setTimeout(() => input.focus(), 0);
      }
      board.append(element);
    });
    const current = rows[0];
    if (current) prompt.textContent = current.mode === 'toDecimal'
      ? 'BINARY → DECIMAL: type the octet value in the DEC field, then submit.'
      : `DECIMAL → BINARY: toggle the bits to total ${current.target}, then submit.`;
  }

  function submit() {
    if (!active || paused || !rows.length) return;
    const row = rows[0];
    const correct = row.mode === 'toDecimal' ? Number(row.answer) === row.target : valueOf(row.bits) === row.target;
    if (!correct) {
      score = Math.max(0, score - 25); updateStats(); toast('SIGNAL MISMATCH −25', 'bad');
      board.firstElementChild?.classList.add('wrong'); return;
    }
    const gained = 100 * level + Math.round(1000 / Math.max(1, rows.length));
    score += gained; cleared++; rows.shift(); updateStats(); toast(`PACKET CLEARED +${gained}`, 'good');
    if (!rows.length) newChallenge(); else { render(); schedule(); }
  }

  function start() {
    rows = []; score = 0; cleared = 0; level = 1; challengeCount = 0; paused = false; active = true;
    startPanel.classList.add('hidden'); submitBtn.disabled = false; pauseBtn.disabled = false; endBtn.disabled = false; pauseBtn.textContent = 'Pause';
    updateStats(); newChallenge();
  }

  function gameOver() {
    active = false; clearTimeout(timer); localStorage.setItem('signal-eight-best', Math.max(best(), score)); updateStats();
    startPanel.classList.remove('hidden'); startPanel.querySelector('h2').textContent = 'Signal stack breached.';
    startPanel.querySelector('p:not(.eyebrow)').textContent = `Final score ${score}. You cleared ${cleared} octets and reached level ${level}.`;
    document.querySelector('#start').textContent = 'Run again'; submitBtn.disabled = true; pauseBtn.disabled = true; endBtn.disabled = true;
  }

  document.querySelector('#start').onclick = start;
  submitBtn.onclick = submit;
  document.querySelector('#how').onclick = () => document.querySelector('#instructions').scrollIntoView();
  pauseBtn.onclick = () => { paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; if (!paused) schedule(); else clearTimeout(timer); };
  endBtn.onclick = gameOver;
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.code === 'Space' && !['INPUT','BUTTON'].includes(document.activeElement.tagName)) { event.preventDefault(); pauseBtn.click(); return; }
    if (paused || !rows.length) return;
    if (/^[1-8]$/.test(event.key) && rows[0].mode === 'toBinary') { rows[0].bits[Number(event.key) - 1] ^= 1; render(); }
    if (event.key === 'Enter' && rows[0].mode === 'toBinary') submit();
  });
  bestEl.textContent = pad(best(), 6);
})();
