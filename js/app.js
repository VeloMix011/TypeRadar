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
  // wordHistory: array of {input, wasCorrect, locked}
  let wordHistory = [];
  let uiLang = 'en';
  let colorTheme = 'classic';
  let customText = 'The five boxing wizards jump quickly.';
  let usePunct = false;
  let useNumbers = false;

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

  // ─── CONFIG ──────────────────────────────────────────────────────────────────
  window.setMode = function (m, id) {
    mode = m;
    document.querySelectorAll('#mode-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const timeGroup = document.getElementById('time-group');
    const timerStat = document.getElementById('timer-stat');
    const noTimer = (m === 'quote' || m === 'custom');
    if (timeGroup) timeGroup.style.display = noTimer ? 'none' : 'flex';
    if (timerStat) timerStat.style.display = noTimer ? 'none' : 'block';
    const extraGroup = document.getElementById('extra-group');
    const extraSep = document.getElementById('extra-sep');
    if (extraGroup) extraGroup.style.display = noTimer ? 'none' : 'flex';
    if (extraSep) extraSep.style.display = noTimer ? 'none' : 'block';
    restart();
  };

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
    document.getElementById('mode-time').innerHTML = `⏱ ${t.time}`;
    document.getElementById('mode-words').innerHTML = `≡ ${t.words}`;
    document.getElementById('mode-quote').innerHTML = `❝ ${t.quote}`;
    document.getElementById('mode-custom').innerHTML = `✎ ${t.custom}`;
    document.querySelectorAll('.stat-label')[0].textContent = t.wpm;
    document.querySelectorAll('.stat-label')[1].textContent = t.accuracy;
    document.getElementById('timer-label').textContent = t.time;
    document.getElementById('click-hint').innerHTML = t.clickHint;
    document.querySelector('.restart-btn').innerHTML = `↺ ${t.restart}`;
    document.querySelectorAll('.result-detail-item')[0].querySelector('.label').textContent = t.raw;
    document.querySelectorAll('.result-detail-item')[1].querySelector('.label').textContent = t.correct;
    document.querySelectorAll('.result-detail-item')[2].querySelector('.label').textContent = t.wrong;
    document.querySelectorAll('.result-detail-item')[3].querySelector('.label').textContent = t.total;
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
  // Punctuation marks inserted randomly between words
  const PUNCTS = [',', '.', '!', '?', ';', ':'];
  const NUMBERS = ['0','1','2','3','4','5','6','7','8','9'];

  function generateWords() {
    if (mode === 'quote') return QUOTES[Math.floor(Math.random() * QUOTES.length)].split(' ');
    if (mode === 'custom') return customText.trim().split(/\s+/);

    const list = WORDS[uiLang] || WORDS.en;
    const count = mode === 'words' ? 30 : 50;
    const base = Array.from({ length: count }, () => list[Math.floor(Math.random() * list.length)]);

    return base.map(word => {
      let w = word;
      // ~20% chance to append punctuation
      if (usePunct && Math.random() < 0.2) {
        w += PUNCTS[Math.floor(Math.random() * PUNCTS.length)];
      }
      // ~15% chance to replace word with a number (1-999)
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

    const wRect = wordEl.getBoundingClientRect();
    const relTop = wRect.top - cRect.top;
    const lineH = parseFloat(getComputedStyle(display).fontSize) * 2.4;
    if (relTop > lineH * 1.5) {
      inner.style.top = (parseInt(inner.style.top || 0) - lineH) + 'px';
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

  // ─── END TEST ────────────────────────────────────────────────────────────────
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
      // fallback for browsers without clipboard API
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

    const chart = document.getElementById('wpm-chart');
    chart.innerHTML = '';
    const maxW = Math.max(...wpmHistory, 1);
    wpmHistory.slice(-30).forEach(w => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.height = Math.max(4, (w / maxW) * 66) + 'px';
      bar.title = w + ' wpm';
      chart.appendChild(bar);
    });

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
    wpmHistory = []; wpmTick = 0; wordHistory = [];
    timeLeft = totalTime;

    document.getElementById('timer-display').textContent = mode === 'time' ? totalTime : '0';
    document.getElementById('timer-display').classList.remove('warning');
    document.getElementById('live-wpm').textContent = '0';
    document.getElementById('live-acc').textContent = '100%';
    document.getElementById('live-stats').classList.remove('visible');
    document.getElementById('click-hint').style.opacity = '0.6';
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('test-screen').style.display = 'flex';

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
      if (currentInput.length > 0) {
        const deleteIndex = currentInput.length - 1;
        animateLetter(deleteIndex, 'delete');
        setTimeout(() => {
          currentInput = currentInput.slice(0, -1);
          colorLetters();
          positionCursor();
        }, 30);
      } else if (currentWordIndex > 0) {
        // Try to go back to previous word
        const prev = wordHistory[wordHistory.length - 1];
        if (prev && !prev.locked) {
          // Go back: restore previous word's input
          wordHistory.pop();
          currentWordIndex--;

          // Undo stats for the word we're returning to
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

      // Locking rule:
      //   wrong word  → unlocked (can go back)
      //   correct word → locked (can't go back to it)
      //   wrong word followed by correct word → the wrong word gets locked too
      if (wasCorrect && wordHistory.length > 0) {
        // Lock the previous word (whether wrong or correct) because we just proved
        // we moved on correctly — no going back past this point.
        wordHistory[wordHistory.length - 1].locked = true;
      }
      wordHistory.push({ input: currentInput, wasCorrect, locked: wasCorrect });

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
  // ─── CAPS LOCK DETECTION ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    // Detect caps lock via getModifierState
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
    // Backspace and Space are already handled by the global document keydown listener.
    // We only preventDefault here to stop the browser from modifying the hidden input
    // before the input event fires — do NOT call processKey again.
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
  // When the soft keyboard opens on mobile, the visual viewport shrinks.
  // We scroll the typing container into the visible area so users can always see it.
  function handleVisualViewport() {
    const vv = window.visualViewport;
    if (!vv) return;

    const container = document.getElementById('typing-container');
    const testScreen = document.getElementById('test-screen');
    if (!container || !testScreen) return;

    const keyboardHeight = window.innerHeight - vv.height;

    if (keyboardHeight > 100) {
      // Keyboard is open — push main content up so typing area stays visible
      document.body.style.paddingBottom = keyboardHeight + 'px';
      // Scroll the typing container into view smoothly
      setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } else {
      // Keyboard closed — restore
      document.body.style.paddingBottom = '';
    }
    positionCursor();
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────
  window.addEventListener('load', function () {
    loadSettings();
    buildDisplay();
    updateUILanguage();
    setTimeout(() => { positionCursor(); focusInput(); }, 300);
    document.addEventListener('touchmove', e => {
      if (e.target.closest('.typing-container')) e.preventDefault();
    }, { passive: false });

    // Visual Viewport API — fires when keyboard opens/closes on mobile
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
    }
  });

  // Keep input focused
  setInterval(() => {
    if (!finished && document.getElementById('test-screen').style.display !== 'none'
      && document.activeElement !== hiddenInput) {
      if (!document.activeElement || document.activeElement.tagName !== 'INPUT') focusInput();
    }
  }, 1000);

  setTimeout(focusInput, 500);

})();
