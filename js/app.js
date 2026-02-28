/**
 * TypeRadar — Main Application Logic
 * Handles all typing test functionality, UI state, and settings.
 */

(function () {
  // ─── STATE ──────────────────────────────────────────────────────────────────
  let words = [];
  let currentWordIndex = 0;
  let currentInput = '';
  let totalCorrectChars = 0;
  let totalWrongChars = 0;
  let correctWords = 0;
  let wrongWords = 0;
  let started = false;
  let finished = false;
  let timerInterval = null;
  let timeLeft = 30;
  let totalTime = 30;
  let mode = 'time';
  let wpmHistory = [];
  let wpmTick = 0;
  let wordHistory = [];
  let uiLang = 'en';
  let colorTheme = 'classic';
  let customText = 'The five boxing wizards jump quickly.';
  let usePunct = false;
  let useNumbers = false;
  let useBlind = false;
  let useConfidence = false;
  let isZen = false;
  let totalErrors = 0;

  // ─── DOM REFS ────────────────────────────────────────────────────────────────
  const hiddenInput = document.getElementById('hidden-input');
  const typingContainer = document.getElementById('typing-container');

  // ─── TRANSLATIONS ────────────────────────────────────────────────────────────
  const TRANSLATIONS = {
    en: {
      time: 'time', words: 'words', quote: 'quote', custom: 'custom',
      wpm: 'wpm', accuracy: 'accuracy',
      clickHint: '👆 click or press any key to start typing',
      restart: 'restart', raw: 'raw wpm', correct: 'correct words',
      wrong: 'wrong words', total: 'total time'
    },
    tr: {
      time: 'zaman', words: 'kelime', quote: 'alıntı', custom: 'özel',
      wpm: 'wpm', accuracy: 'doğruluk',
      clickHint: '👆 yazmaya başlamak için tıkla',
      restart: 'yeniden başlat', raw: 'ham wpm', correct: 'doğru kelime',
      wrong: 'yanlış kelime', total: 'toplam süre'
    },
    es: {
      time: 'tiempo', words: 'palabras', quote: 'cita', custom: 'personalizado',
      wpm: 'wpm', accuracy: 'precisión',
      clickHint: '👆 haz clic para empezar',
      restart: 'reiniciar', raw: 'wpm bruto', correct: 'correctas',
      wrong: 'incorrectas', total: 'tiempo total'
    },
    az: {
      time: 'vaxt', words: 'sözlər', quote: 'sitat', custom: 'xüsusi',
      wpm: 'wpm', accuracy: 'dəqiqlik',
      clickHint: '👆 yazmağa başlamaq üçün tıkla',
      restart: 'yenidən başla', raw: 'xam wpm', correct: 'doğru sözlər',
      wrong: 'yanlış sözlər', total: 'ümumi vaxt'
    }
  };

  // ─── THEME ───────────────────────────────────────────────────────────────────
  window.setTheme = function (el) {
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
    document.body.className = el.dataset.theme;
    setTimeout(positionCursor, 50);
  };

  // ─── COLOR THEME ─────────────────────────────────────────────────────────────
  window.setColorTheme = function (theme) {
    colorTheme = theme;
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
    const activeCard = Array.from(document.querySelectorAll('.theme-card')).find(
      card => card.querySelector('.name').textContent.toLowerCase().includes(theme)
    );
    if (activeCard) activeCard.classList.add('active');
    localStorage.setItem('typeradar_color_theme', theme);
    colorLetters();
  };

  // ─── MODE SELECTION (config bar) ────────────────────────────────────────────
  window.setMode = function (m, id) {
    mode = m;
    document.querySelectorAll('#mode-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    isZen = false;
    const noTimer = (m === 'quote' || m === 'custom');
    const timeGroup = document.getElementById('time-group');
    const extraSep  = document.getElementById('extra-sep');
    const extraGroup = document.getElementById('extra-group');
    if (timeGroup)  timeGroup.style.display  = noTimer ? 'none' : 'flex';
    if (extraSep)   extraSep.style.display   = noTimer ? 'none' : 'block';
    if (extraGroup) extraGroup.style.display = noTimer ? 'none' : 'flex';
    restart();
  };

  // ─── SPECIAL MODES (settings modal) — toggle, not exclusive ─────────────────
  window.toggleSpecialMode = function (el, smode) {
    const isActive = el.classList.contains('active');
    if (smode === 'blind') {
      useBlind = !isActive;
      document.getElementById('typing-container').classList.toggle('blind-mode', useBlind);
      el.classList.toggle('active', useBlind);
    } else if (smode === 'confidence') {
      useConfidence = !isActive;
      el.classList.toggle('active', useConfidence);
    } else if (smode === 'zen') {
      // zen replaces current mode while active
      if (!isActive) {
        isZen = true;
        el.classList.add('active');
        // Hide time group & extras since zen has no timer
        const timeGroup  = document.getElementById('time-group');
        const extraSep   = document.getElementById('extra-sep');
        const extraGroup = document.getElementById('extra-group');
        if (timeGroup)  timeGroup.style.display  = 'none';
        if (extraSep)   extraSep.style.display   = 'none';
        if (extraGroup) extraGroup.style.display = 'none';
        // Deactivate mode buttons visually
        document.querySelectorAll('#mode-group .config-btn').forEach(b => b.classList.remove('active'));
        mode = 'zen';
      } else {
        isZen = false;
        el.classList.remove('active');
        mode = 'time';
        document.getElementById('mode-time').classList.add('active');
        const timeGroup  = document.getElementById('time-group');
        const extraSep   = document.getElementById('extra-sep');
        const extraGroup = document.getElementById('extra-group');
        if (timeGroup)  timeGroup.style.display  = 'flex';
        if (extraSep)   extraSep.style.display   = 'block';
        if (extraGroup) extraGroup.style.display = 'flex';
      }
      restart();
    }
  };
    totalTime = t;
    timeLeft = t;
    document.querySelectorAll('#time-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('timer-display').textContent = mode === 'time' ? t : '0';
    restart();
  };

  // ─── LIVE STATS VISIBILITY ────────────────────────────────────────────────────
  // time mode  → while typing: only show timer (wpm/acc hidden)
  // words/quote/custom → while typing: show progress counter (0/N), hide wpm/acc
  function updateStatsVisibility(isTyping) {
    const statWpm      = document.getElementById('stat-wpm');
    const statAcc      = document.getElementById('stat-acc');
    const timerStat    = document.getElementById('timer-stat');
    const statProgress = document.getElementById('stat-progress');
    const statErr      = document.getElementById('stat-err');

    if (!isTyping) {
      // Before typing starts — show nothing (live-stats is opacity:0 anyway)
      if (statWpm)      statWpm.style.display      = 'block';
      if (statAcc)      statAcc.style.display      = 'block';
      if (timerStat)    timerStat.style.display    = 'block';
      if (statProgress) statProgress.style.display = 'none';
      if (statErr)      statErr.style.display      = 'block';
      return;
    }

    if (mode === 'time') {
      // Typing in time mode → only timer + err
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'block';
      if (statProgress) statProgress.style.display = 'none';
      if (statErr)      statErr.style.display      = 'none';
    } else {
      // words / quote / custom → progress counter + err, hide wpm/acc/timer
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'none';
      if (statProgress) statProgress.style.display = 'block';
      if (statErr)      statErr.style.display      = 'none';
    }
  }

  function updateWordProgress() {
    const el = document.getElementById('live-progress');
    if (el) el.textContent = currentWordIndex + '/' + words.length;
  }

  window.setTime = function (t, id) {
    totalTime = t;
    timeLeft = t;
    document.querySelectorAll('#time-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('timer-display').textContent = mode === 'time' ? t : '0';
    restart();
  };

  // ─── PUNCT & NUMBERS TOGGLE ─────────────────────────────────────────────────
  window.togglePunct = function (el) {
    usePunct = !usePunct;
    el.classList.toggle('active', usePunct);
    restart();
  };
  window.toggleNumbers = function (el) {
    useNumbers = !useNumbers;
    el.classList.toggle('active', useNumbers);
    restart();
  };
  window.toggleBlind = function (el) {
    useBlind = !useBlind;
    el.classList.toggle('active', useBlind);
    document.getElementById('typing-container').classList.toggle('blind-mode', useBlind);
  };
  window.toggleConfidence = function (el) {
    useConfidence = !useConfidence;
    el.classList.toggle('active', useConfidence);
  };

  // ─── UI LANGUAGE ─────────────────────────────────────────────────────────────
  window.setUILang = function (lang, el) {
    uiLang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    updateUILanguage();
    restart();
  };

  function updateUILanguage() {
    const t = TRANSLATIONS[uiLang] || TRANSLATIONS.en;
    document.querySelectorAll('.stat-label')[0].textContent = t.wpm;
    document.querySelectorAll('.stat-label')[1].textContent = t.accuracy;
    document.getElementById('timer-label').textContent = t.time;
    document.getElementById('click-hint').innerHTML = t.clickHint;
    document.querySelector('.restart-btn').innerHTML = `↺ ${t.restart}`;
    document.querySelectorAll('.result-detail-item')[0].querySelector('.label').textContent = t.raw;
    document.querySelectorAll('.result-detail-item')[1].querySelector('.label').textContent = t.correct;
    document.querySelectorAll('.result-detail-item')[2].querySelector('.label').textContent = t.wrong;
    document.querySelectorAll('.result-detail-item')[4].querySelector('.label').textContent = t.total;
  }

  // ─── CUSTOM WORDS ────────────────────────────────────────────────────────────
  window.saveCustomText = function () {
    const ta = document.getElementById('custom-text-input');
    const text = ta.value.trim();
    if (!text) return;
    customText = text;
    localStorage.setItem('typeradar_custom_text', customText);
    closeSettings();
    if (mode === 'custom') restart();
  };

  // ─── LOAD SAVED SETTINGS ─────────────────────────────────────────────────────
  function loadSettings() {
    try {
      const savedText = localStorage.getItem('typeradar_custom_text');
      if (savedText) {
        customText = savedText;
        const ta = document.getElementById('custom-text-input');
        if (ta) ta.value = customText;
      }

      const savedColorTheme = localStorage.getItem('typeradar_color_theme');
      if (savedColorTheme) {
        colorTheme = savedColorTheme;
        setTimeout(() => {
          const activeCard = Array.from(document.querySelectorAll('.theme-card')).find(
            card => card.querySelector('.name').textContent.toLowerCase().includes(colorTheme)
          );
          if (activeCard) {
            document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
            activeCard.classList.add('active');
          }
        }, 100);
      }


    } catch (e) { /* ignore storage errors */ }
  }

  // ─── WORD GENERATION ─────────────────────────────────────────────────────────
  const PUNCTS = [',', '.', '!', '?', ';', ':'];

  function generateWords() {
    if (mode === 'quote') return QUOTES[Math.floor(Math.random() * QUOTES.length)].split(' ');
    if (mode === 'custom') return customText.trim().split(/\s+/);
    if (mode === 'zen') {
      const list = WORDS[uiLang] || WORDS.en;
      return Array.from({ length: 200 }, () => list[Math.floor(Math.random() * list.length)]);
    }

    const list = WORDS[uiLang] || WORDS.en;
    const count = mode === 'words' ? 30 : 50;
    const base = Array.from({ length: count }, () => list[Math.floor(Math.random() * list.length)]);

    return base.map(word => {
      let w = word;
      if (usePunct && Math.random() < 0.2) {
        w += PUNCTS[Math.floor(Math.random() * PUNCTS.length)];
      }
      if (useNumbers && Math.random() < 0.15) {
        w = String(Math.floor(Math.random() * 999) + 1);
        if (usePunct && Math.random() < 0.2) w += PUNCTS[Math.floor(Math.random() * PUNCTS.length)];
      }
      return w;
    });
  }

  // ─── DISPLAY BUILDER ─────────────────────────────────────────────────────────
  function buildDisplay() {
    words = generateWords();
    const inner = document.getElementById('words-inner');
    inner.style.top = '0px';
    inner.innerHTML = '';
    words.forEach((word, wi) => {
      const wordEl = document.createElement('span');
      wordEl.className = 'word';
      wordEl.id = 'word-' + wi;
      word.split('').forEach((ch, ci) => {
        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.id = 'l-' + wi + '-' + ci;
        letter.textContent = ch;
        wordEl.appendChild(letter);
      });
      inner.appendChild(wordEl);
    });
    updateWordProgress();
  }

  // ─── CURSOR ───────────────────────────────────────────────────────────────────
  function positionCursor() {
    const cursor = document.getElementById('cursor');
    const display = document.getElementById('words-display');
    const inner = document.getElementById('words-inner');
    const wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl || !display || !cursor) return;

    const letters = wordEl.querySelectorAll('.letter');
    const cRect = display.getBoundingClientRect();

    const getCharPosition = () => {
      if (currentInput.length === 0) {
        const r = wordEl.getBoundingClientRect();
        return { left: r.left - cRect.left, top: r.top - cRect.top };
      } else {
        const idx = Math.min(currentInput.length - 1, letters.length - 1);
        const r = letters[idx].getBoundingClientRect();
        return { left: r.left - cRect.left + r.width, top: r.top - cRect.top };
      }
    };

    const pos = getCharPosition();
    cursor.style.left = pos.left + 'px';
    cursor.style.top = pos.top + 'px';

    // ── Monkeytype-style row scroll: when current word moves past row 1, scroll up ──
    const wRect = wordEl.getBoundingClientRect();
    const relTop = wRect.top - cRect.top;
    const lineH = parseFloat(getComputedStyle(display).fontSize) * 2.4;

    // If the current word is on the 3rd row or beyond, shift inner up by one row
    // This creates the effect of text sliding up and disappearing
    if (relTop >= lineH * 2) {
      const currentTop = parseInt(inner.style.top || 0);
      inner.style.top = (currentTop - lineH) + 'px';
    }
  }

  // ─── LETTER ANIMATION ────────────────────────────────────────────────────────
  function animateLetter(letterIndex, type) {
    const wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl) return;
    const letters = wordEl.querySelectorAll('.letter');
    if (letterIndex >= 0 && letterIndex < letters.length) {
      const letter = letters[letterIndex];
      letter.classList.remove('correct', 'wrong', 'deleting');
      if (type === 'add') {
        letter.classList.add(currentInput[letterIndex] === words[currentWordIndex][letterIndex] ? 'correct' : 'wrong');
        letter.classList.add(`theme-${colorTheme}`);
      } else if (type === 'delete') {
        letter.classList.add('deleting');
        setTimeout(() => {
          letter.classList.remove('deleting', 'correct', 'wrong', `theme-${colorTheme}`);
        }, 100);
      }
    }
  }

  function colorLetters() {
    const wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl) return;
    const letters = wordEl.querySelectorAll('.letter');
    const wordStr = words[currentWordIndex] || '';
    letters.forEach(l => l.classList.remove('correct', 'wrong', `theme-${colorTheme}`));
    for (let i = 0; i < currentInput.length && i < wordStr.length; i++) {
      letters[i].classList.add(currentInput[i] === wordStr[i] ? 'correct' : 'wrong');
      letters[i].classList.add(`theme-${colorTheme}`);
    }
  }

  // ─── LIVE STATS ──────────────────────────────────────────────────────────────
  function updateLiveStats() {
    const elapsed = mode === 'time' ? (totalTime - timeLeft) : wpmTick;
    const wpm = elapsed > 0 ? Math.round((correctWords / elapsed) * 60) : 0;
    const total = totalCorrectChars + totalWrongChars;
    const acc = total > 0 ? Math.round((totalCorrectChars / total) * 100) : 100;
    document.getElementById('live-wpm').textContent = wpm;
    document.getElementById('live-acc').textContent = acc + '%';
    updateWordProgress();
    if (started && !finished && elapsed > 0) {
      if (wpmHistory.length === 0 || wpmHistory[wpmHistory.length - 1] !== wpm) {
        wpmHistory.push(wpm);
      }
    }
  }

  // ─── TIMER ───────────────────────────────────────────────────────────────────
  function startTimer() {
    if (started) return;
    started = true;
    document.getElementById('live-stats').classList.add('visible');
    document.getElementById('click-hint').style.opacity = '0.3';
    document.getElementById('timer-label').textContent = mode === 'time' ? 'time' : 'elapsed';
    wpmTick = 0;
    wpmHistory = [];

    // Update stats visibility as soon as typing starts
    updateStatsVisibility(true);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (finished) return;
      if (mode === 'time') {
        timeLeft--;
        const td = document.getElementById('timer-display');
        td.textContent = timeLeft;
        if (timeLeft <= 5) td.classList.add('warning');
        if (timeLeft <= 0) { endTest(); return; }
      } else {
        wpmTick++;
        document.getElementById('timer-display').textContent = wpmTick;
      }
      updateLiveStats();
    }, 1000);
  }

  // ─── SHARE RESULT ────────────────────────────────────────────────────────────
  window.shareResult = function () {
    const wpm = document.getElementById('res-wpm').textContent;
    const acc = document.getElementById('res-acc').textContent;
    const time = document.getElementById('res-time').textContent;
    const modeLabel = mode === 'time' ? totalTime + 's' : mode;
    const text = `TypeRadar result\n⌨️ ${wpm} wpm  ✓ ${acc} accuracy\nmode: ${modeLabel} | time: ${time}\ntyperadar.com`;
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.getElementById('share-toast');
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      const toast = document.getElementById('share-toast');
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 2000);
    });
  };

  // ─── END TEST ────────────────────────────────────────────────────────────────
  function endTest() {
    if (finished) return;
    clearInterval(timerInterval);
    finished = true;
    started = false;
    hiddenInput.blur();

    const elapsed = mode === 'time' ? totalTime : wpmTick;
    const wpm = Math.round((correctWords / Math.max(elapsed, 1)) * 60);
    const rawWpm = Math.round(((totalCorrectChars + totalWrongChars) / 5) / (Math.max(elapsed, 1) / 60));
    const total = totalCorrectChars + totalWrongChars;
    const acc = total > 0 ? Math.round((totalCorrectChars / total) * 100) : 100;

    document.getElementById('res-wpm').textContent = wpm;
    document.getElementById('res-acc').textContent = acc + '%';
    document.getElementById('res-raw').textContent = rawWpm;
    document.getElementById('res-correct').textContent = correctWords;
    document.getElementById('res-wrong').textContent = wrongWords;
    document.getElementById('res-time').textContent = elapsed + 's';
    document.getElementById('res-errors').textContent = totalErrors;

    // Draw line chart on canvas
    const canvas = document.getElementById('wpm-chart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr || 600 * dpr;
    canvas.height = 100 * dpr;
    ctx.scale(dpr, dpr);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    ctx.clearRect(0, 0, W, H);

    const data = wpmHistory.slice(-60);
    if (data.length > 1) {
      const maxV = Math.max(...data, 1);
      const pad = { t: 10, b: 10, l: 4, r: 4 };
      const chartW = W - pad.l - pad.r;
      const chartH = H - pad.t - pad.b;

      const px = i => pad.l + (i / (data.length - 1)) * chartW;
      const py = v => pad.t + chartH - (v / maxV) * chartH;

      const grad = ctx.createLinearGradient(0, pad.t, 0, H);
      grad.addColorStop(0, 'rgba(124,106,247,0.35)');
      grad.addColorStop(1, 'rgba(124,106,247,0)');
      ctx.beginPath();
      ctx.moveTo(px(0), py(data[0]));
      for (let i = 1; i < data.length; i++) ctx.lineTo(px(i), py(data[i]));
      ctx.lineTo(px(data.length - 1), H);
      ctx.lineTo(px(0), H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(px(0), py(data[0]));
      for (let i = 1; i < data.length; i++) ctx.lineTo(px(i), py(data[i]));
      ctx.strokeStyle = 'rgba(124,106,247,0.9)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    document.getElementById('test-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'flex';
  }

  // ─── RESTART ─────────────────────────────────────────────────────────────────
  window.restart = function () {
    clearInterval(timerInterval);
    started = false; finished = false;
    currentWordIndex = 0; currentInput = '';
    totalCorrectChars = 0; totalWrongChars = 0;
    correctWords = 0; wrongWords = 0;
    wpmHistory = []; wpmTick = 0; wordHistory = []; totalErrors = 0;
    timeLeft = totalTime;

    document.getElementById('timer-display').textContent = mode === 'time' ? totalTime : '0';
    document.getElementById('timer-display').classList.remove('warning');
    document.getElementById('live-wpm').textContent = '0';
    document.getElementById('live-acc').textContent = '100%';
    document.getElementById('live-err').textContent = '0';
    document.getElementById('live-stats').classList.remove('visible');
    document.getElementById('click-hint').style.opacity = '0.6';
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('test-screen').style.display = 'flex';

    // Reset stats visibility for pre-typing state
    updateStatsVisibility(false);

    buildDisplay();
    setTimeout(() => {
      positionCursor();
      hiddenInput.value = '';
      if (!finished) setTimeout(focusInput, 100);
    }, 50);
  };

  // ─── KEY PROCESSING ──────────────────────────────────────────────────────────
  function processKey(key) {
    if (finished) return false;
    if (!started && key !== 'Backspace' && key !== ' ') startTimer();

    const wordStr = words[currentWordIndex] || '';

    if (key === 'Backspace') {
      if (useConfidence) return true;
      if (currentInput.length > 0) {
        const deleteIndex = currentInput.length - 1;
        animateLetter(deleteIndex, 'delete');
        setTimeout(() => {
          currentInput = currentInput.slice(0, -1);
          colorLetters();
          positionCursor();
        }, 30);
      } else if (currentWordIndex > 0) {
        const prev = wordHistory[wordHistory.length - 1];
        if (prev && !prev.locked) {
          wordHistory.pop();
          currentWordIndex--;

          const prevWordStr = words[currentWordIndex];
          const prevInput = prev.input;
          const len = Math.min(prevInput.length, prevWordStr.length);
          for (let i = 0; i < len; i++) {
            if (prevInput[i] === prevWordStr[i]) totalCorrectChars--;
            else totalWrongChars--;
          }
          totalWrongChars -= Math.max(0, prevWordStr.length - prevInput.length);
          if (prev.wasCorrect) correctWords--;
          else wrongWords--;

          currentInput = prevInput;
          colorLetters();
          positionCursor();
          updateLiveStats();
        }
      }
      return true;
    }

    if (key === ' ') {
      if (currentInput.length === 0) return true;
      const wasCorrect = (currentInput === wordStr);

      if (wasCorrect && wordHistory.length > 0) {
        wordHistory[wordHistory.length - 1].locked = true;
      }
      wordHistory.push({ input: currentInput, wasCorrect, locked: wasCorrect });

      const prevWordEl = document.getElementById('word-' + (currentWordIndex));
      if (prevWordEl) prevWordEl.classList.toggle('has-error', !wasCorrect);

      const len = Math.min(currentInput.length, wordStr.length);
      for (let i = 0; i < len; i++) {
        if (currentInput[i] === wordStr[i]) totalCorrectChars++;
        else totalWrongChars++;
      }
      totalWrongChars += Math.max(0, wordStr.length - currentInput.length);
      if (wasCorrect) correctWords++;
      else wrongWords++;
      currentInput = '';
      currentWordIndex++;

      if (mode === 'zen' && currentWordIndex >= words.length - 20) {
        const list = WORDS[uiLang] || WORDS.en;
        const more = Array.from({ length: 50 }, () => list[Math.floor(Math.random() * list.length)]);
        more.forEach(word => {
          words.push(word);
          const inner = document.getElementById('words-inner');
          const wordEl = document.createElement('span');
          wordEl.className = 'word';
          wordEl.id = 'word-' + (words.length - 1);
          word.split('').forEach(ch => {
            const letter = document.createElement('span');
            letter.className = 'letter';
            letter.textContent = ch;
            wordEl.appendChild(letter);
          });
          inner.appendChild(wordEl);
        });
      }

      if ((mode === 'words' || mode === 'quote' || mode === 'custom') && currentWordIndex >= words.length) {
        endTest();
        return true;
      }
      colorLetters();
      positionCursor();
      updateLiveStats();
      return true;
    }

    if (key.length === 1) {
      if (currentInput.length >= wordStr.length + 5) return true;
      const newIndex = currentInput.length;
      if (newIndex < wordStr.length && key !== wordStr[newIndex]) {
        totalErrors++;
        document.getElementById('live-err').textContent = totalErrors;
      }
      currentInput += key;
      setTimeout(() => {
        animateLetter(newIndex, 'add');
        positionCursor();
      }, 10);
      updateLiveStats();
      return true;
    }

    return true;
  }

  // ─── FOCUS ───────────────────────────────────────────────────────────────────
  window.focusInput = function () {
    if (!finished && document.getElementById('test-screen').style.display !== 'none') {
      hiddenInput.focus();
      hiddenInput.click();
    }
  };

  // ─── SETTINGS MODAL ──────────────────────────────────────────────────────────
  window.openSettings = function () {
    document.getElementById('settings-modal').style.display = 'flex';
  };

  window.closeSettings = function () {
    document.getElementById('settings-modal').style.display = 'none';
    setTimeout(focusInput, 100);
  };

  // ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    const capsOn = e.getModifierState && e.getModifierState('CapsLock');
    const warning = document.getElementById('caps-warning');
    if (warning) warning.classList.toggle('visible', !!capsOn);
  });
  document.addEventListener('keyup', e => {
    const capsOn = e.getModifierState && e.getModifierState('CapsLock');
    const warning = document.getElementById('caps-warning');
    if (warning) warning.classList.toggle('visible', !!capsOn);
  });

  document.addEventListener('keydown', e => {
    const key = e.key;
    if (key === 'Tab') { e.preventDefault(); restart(); return; }
    if (key === 'Escape') {
      e.preventDefault();
      if (document.getElementById('settings-modal').style.display === 'flex') closeSettings();
      else restart();
      return;
    }
    const ignored = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
      'PageUp','PageDown','Shift','Control','Alt','Meta','CapsLock','Insert','Delete',
      'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
    if (ignored.includes(key)) return;
    e.preventDefault();
    processKey(key);
  });

  hiddenInput.addEventListener('input', function () {
    const val = this.value;
    if (val.length === 0) return;
    const lastChar = val[val.length - 1];
    this.value = '';
    if (!finished) processKey(lastChar);
  });

  hiddenInput.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' || e.key === ' ') {
      e.preventDefault();
    }
  });

  typingContainer.addEventListener('click', e => { e.preventDefault(); focusInput(); });
  typingContainer.addEventListener('touchstart', e => { e.preventDefault(); focusInput(); });

  document.getElementById('settings-modal').addEventListener('click', function (e) {
    if (e.target === this) closeSettings();
  });

  // ─── MOBILE KEYBOARD FIX ─────────────────────────────────────────────────────
  function handleVisualViewport() {
    const vv = window.visualViewport;
    if (!vv) return;
    const container = document.getElementById('typing-container');
    if (!container) return;
    const keyboardHeight = window.innerHeight - vv.height;
    if (keyboardHeight > 100) {
      document.body.style.paddingBottom = keyboardHeight + 'px';
      setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } else {
      document.body.style.paddingBottom = '';
    }
    positionCursor();
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────
  window.addEventListener('load', function () {
    loadSettings();
    buildDisplay();
    updateUILanguage();
    updateStatsVisibility(false);
    setTimeout(() => { positionCursor(); focusInput(); }, 300);
    document.addEventListener('touchmove', e => {
      if (e.target.closest('.typing-container')) e.preventDefault();
    }, { passive: false });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
    }
  });

  setInterval(() => {
    if (!finished && document.getElementById('test-screen').style.display !== 'none'
      && document.activeElement !== hiddenInput) {
      if (!document.activeElement || document.activeElement.tagName !== 'INPUT') focusInput();
    }
  }, 1000);

  setTimeout(focusInput, 500);

})();
