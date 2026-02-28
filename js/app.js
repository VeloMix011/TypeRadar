/**
 * TypeRadar — Main Application Logic
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

  const hiddenInput = document.getElementById('hidden-input');
  const typingContainer = document.getElementById('typing-container');

  // ─── TRANSLATIONS ────────────────────────────────────────────────────────────
  const TRANSLATIONS = {
    en: {
      wpm: 'wpm', accuracy: 'accuracy', time: 'time',
      clickHint: '👆 click or press any key to start typing',
      restart: 'restart', raw: 'raw wpm', correct: 'correct words',
      wrong: 'wrong words', errors: 'errors', total: 'total time'
    },
    tr: {
      wpm: 'wpm', accuracy: 'doğruluk', time: 'zaman',
      clickHint: '👆 yazmaya başlamak için tıkla',
      restart: 'yeniden başlat', raw: 'ham wpm', correct: 'doğru kelime',
      wrong: 'yanlış kelime', errors: 'hata', total: 'toplam süre'
    },
    es: {
      wpm: 'wpm', accuracy: 'precisión', time: 'tiempo',
      clickHint: '👆 haz clic para empezar',
      restart: 'reiniciar', raw: 'wpm bruto', correct: 'correctas',
      wrong: 'incorrectas', errors: 'errores', total: 'tiempo total'
    },
    az: {
      wpm: 'wpm', accuracy: 'dəqiqlik', time: 'vaxt',
      clickHint: '👆 yazmağa başlamaq üçün tıkla',
      restart: 'yenidən başla', raw: 'xam wpm', correct: 'doğru sözlər',
      wrong: 'yanlış sözlər', errors: 'səhv', total: 'ümumi vaxt'
    }
  };

  // ─── THEME ───────────────────────────────────────────────────────────────────
  window.setTheme = function (el) {
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
    document.body.className = el.dataset.theme;
    setTimeout(positionCursor, 50);
  };

  window.setColorTheme = function (theme) {
    colorTheme = theme;
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
    const activeCard = Array.from(document.querySelectorAll('.theme-card')).find(
      card => card.querySelector('.name') && card.querySelector('.name').textContent.toLowerCase().includes(theme)
    );
    if (activeCard) activeCard.classList.add('active');
    try { localStorage.setItem('typeradar_color_theme', theme); } catch(e) {}
    colorLetters();
  };

  // ─── MODE (config bar) ───────────────────────────────────────────────────────
  window.setMode = function (m, id) {
    if (isZen) {
      isZen = false;
      const zenCard = document.querySelector('[data-smode="zen"]');
      if (zenCard) zenCard.classList.remove('active');
    }
    mode = m;
    document.querySelectorAll('#mode-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const noTimer = (m === 'quote' || m === 'custom');
    const timeGroup  = document.getElementById('time-group');
    const extraSep   = document.getElementById('extra-sep');
    const extraGroup = document.getElementById('extra-group');
    if (timeGroup)  timeGroup.style.display  = noTimer ? 'none' : 'flex';
    if (extraSep)   extraSep.style.display   = noTimer ? 'none' : 'block';
    if (extraGroup) extraGroup.style.display = noTimer ? 'none' : 'flex';
    restart();
  };

  // ─── TIME ────────────────────────────────────────────────────────────────────
  window.setTime = function (t, id) {
    totalTime = t;
    timeLeft = t;
    document.querySelectorAll('#time-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('timer-display').textContent = mode === 'time' ? t : '0';
    restart();
  };

  // ─── SPECIAL MODES (settings) ────────────────────────────────────────────────
  window.toggleSpecialMode = function (el, smode) {
    const isActive = el.classList.contains('active');
    if (smode === 'blind') {
      useBlind = !isActive;
      el.classList.toggle('active', useBlind);
      document.getElementById('typing-container').classList.toggle('blind-mode', useBlind);
    } else if (smode === 'confidence') {
      useConfidence = !isActive;
      el.classList.toggle('active', useConfidence);
    } else if (smode === 'zen') {
      if (!isActive) {
        isZen = true;
        el.classList.add('active');
        mode = 'zen';
        document.querySelectorAll('#mode-group .config-btn').forEach(b => b.classList.remove('active'));
        const timeGroup  = document.getElementById('time-group');
        const extraSep   = document.getElementById('extra-sep');
        const extraGroup = document.getElementById('extra-group');
        if (timeGroup)  timeGroup.style.display  = 'none';
        if (extraSep)   extraSep.style.display   = 'none';
        if (extraGroup) extraGroup.style.display = 'none';
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

  // ─── PUNCT & NUMBERS ─────────────────────────────────────────────────────────
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
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels[0]) statLabels[0].textContent = t.wpm;
    if (statLabels[1]) statLabels[1].textContent = t.accuracy;
    const timerLabel = document.getElementById('timer-label');
    if (timerLabel) timerLabel.textContent = t.time;
    const clickHint = document.getElementById('click-hint');
    if (clickHint) clickHint.innerHTML = t.clickHint;
    const restartBtn = document.querySelector('.restart-btn');
    if (restartBtn) restartBtn.innerHTML = '↺ ' + t.restart;
    const items = document.querySelectorAll('.result-detail-item');
    if (items[0]) items[0].querySelector('.label').textContent = t.raw;
    if (items[1]) items[1].querySelector('.label').textContent = t.correct;
    if (items[2]) items[2].querySelector('.label').textContent = t.wrong;
    if (items[3]) items[3].querySelector('.label').textContent = t.errors;
    if (items[4]) items[4].querySelector('.label').textContent = t.total;
  }

  // ─── CUSTOM TEXT ─────────────────────────────────────────────────────────────
  window.saveCustomText = function () {
    const ta = document.getElementById('custom-text-input');
    const text = ta.value.trim();
    if (!text) return;
    customText = text;
    try { localStorage.setItem('typeradar_custom_text', customText); } catch(e) {}
    closeSettings();
    if (mode === 'custom') restart();
  };

  // ─── LOAD SETTINGS ───────────────────────────────────────────────────────────
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
        setTimeout(function() {
          const activeCard = Array.from(document.querySelectorAll('.theme-card')).find(
            function(card) { return card.querySelector('.name') && card.querySelector('.name').textContent.toLowerCase().includes(colorTheme); }
          );
          if (activeCard) {
            document.querySelectorAll('.theme-card').forEach(function(c) { c.classList.remove('active'); });
            activeCard.classList.add('active');
          }
        }, 100);
      }
    } catch(e) {}
  }

  // ─── WORD GENERATION ─────────────────────────────────────────────────────────
  var PUNCTS = [',', '.', '!', '?', ';', ':'];

  function generateWords() {
    if (mode === 'quote') return QUOTES[Math.floor(Math.random() * QUOTES.length)].split(' ');
    if (mode === 'custom') return customText.trim().split(/\s+/);
    if (mode === 'zen') {
      var list = WORDS[uiLang] || WORDS.en;
      return Array.from({ length: 200 }, function() { return list[Math.floor(Math.random() * list.length)]; });
    }
    var list2 = WORDS[uiLang] || WORDS.en;
    var count = mode === 'words' ? 30 : 50;
    var base = Array.from({ length: count }, function() { return list2[Math.floor(Math.random() * list2.length)]; });
    return base.map(function(word) {
      var w = word;
      if (usePunct && Math.random() < 0.2) w += PUNCTS[Math.floor(Math.random() * PUNCTS.length)];
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
    var inner = document.getElementById('words-inner');
    inner.style.top = '0px';
    inner.innerHTML = '';
    words.forEach(function(word, wi) {
      var wordEl = document.createElement('span');
      wordEl.className = 'word';
      wordEl.id = 'word-' + wi;
      word.split('').forEach(function(ch, ci) {
        var letter = document.createElement('span');
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
    var cursor = document.getElementById('cursor');
    var display = document.getElementById('words-display');
    var inner = document.getElementById('words-inner');
    var wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl || !display || !cursor) return;

    var letters = wordEl.querySelectorAll('.letter');
    var cRect = display.getBoundingClientRect();
    var pos;

    if (currentInput.length === 0) {
      var r0 = wordEl.getBoundingClientRect();
      pos = { left: r0.left - cRect.left, top: r0.top - cRect.top };
    } else {
      var idx = Math.min(currentInput.length - 1, letters.length - 1);
      var r1 = letters[idx].getBoundingClientRect();
      pos = { left: r1.left - cRect.left + r1.width, top: r1.top - cRect.top };
    }
    cursor.style.left = pos.left + 'px';
    cursor.style.top = pos.top + 'px';

    // Scroll up when word reaches 3rd row
    var wRect = wordEl.getBoundingClientRect();
    var relTop = wRect.top - cRect.top;
    var lineH = parseFloat(getComputedStyle(display).fontSize) * 2.4;
    if (relTop >= lineH * 2) {
      var currentTop = parseInt(inner.style.top || 0);
      inner.style.top = (currentTop - lineH) + 'px';
    }
  }

  // ─── LETTER COLORING ─────────────────────────────────────────────────────────
  function animateLetter(letterIndex, type) {
    var wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl) return;
    var letters = wordEl.querySelectorAll('.letter');
    if (letterIndex >= 0 && letterIndex < letters.length) {
      var letter = letters[letterIndex];
      letter.classList.remove('correct', 'wrong', 'deleting');
      if (type === 'add') {
        letter.classList.add(currentInput[letterIndex] === words[currentWordIndex][letterIndex] ? 'correct' : 'wrong');
        letter.classList.add('theme-' + colorTheme);
      } else if (type === 'delete') {
        letter.classList.add('deleting');
        setTimeout(function() {
          letter.classList.remove('deleting', 'correct', 'wrong', 'theme-' + colorTheme);
        }, 100);
      }
    }
  }

  function colorLetters() {
    var wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl) return;
    var letters = wordEl.querySelectorAll('.letter');
    var wordStr = words[currentWordIndex] || '';
    letters.forEach(function(l) { l.classList.remove('correct', 'wrong', 'theme-' + colorTheme); });
    for (var i = 0; i < currentInput.length && i < wordStr.length; i++) {
      letters[i].classList.add(currentInput[i] === wordStr[i] ? 'correct' : 'wrong');
      letters[i].classList.add('theme-' + colorTheme);
    }
  }

  // ─── STATS VISIBILITY ────────────────────────────────────────────────────────
  function updateStatsVisibility(isTyping) {
    var statWpm      = document.getElementById('stat-wpm');
    var statAcc      = document.getElementById('stat-acc');
    var timerStat    = document.getElementById('timer-stat');
    var statProgress = document.getElementById('stat-progress');
    var statErr      = document.getElementById('stat-err');

    if (!isTyping) {
      if (statWpm)      statWpm.style.display      = 'block';
      if (statAcc)      statAcc.style.display      = 'block';
      if (timerStat)    timerStat.style.display    = 'block';
      if (statProgress) statProgress.style.display = 'none';
      if (statErr)      statErr.style.display      = 'block';
      return;
    }
    if (mode === 'time') {
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'block';
      if (statProgress) statProgress.style.display = 'none';
      if (statErr)      statErr.style.display      = 'none';
    } else {
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'none';
      if (statProgress) statProgress.style.display = 'block';
      if (statErr)      statErr.style.display      = 'none';
    }
  }

  function updateWordProgress() {
    var el = document.getElementById('live-progress');
    if (el) el.textContent = currentWordIndex + '/' + words.length;
  }

  function updateLiveStats() {
    var elapsed = mode === 'time' ? (totalTime - timeLeft) : wpmTick;
    var wpm = elapsed > 0 ? Math.round((correctWords / elapsed) * 60) : 0;
    var total = totalCorrectChars + totalWrongChars;
    var acc = total > 0 ? Math.round((totalCorrectChars / total) * 100) : 100;
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
    updateStatsVisibility(true);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function() {
      if (finished) return;
      if (mode === 'time') {
        timeLeft--;
        var td = document.getElementById('timer-display');
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

  // ─── SHARE ───────────────────────────────────────────────────────────────────
  window.shareResult = function () {
    var wpm = document.getElementById('res-wpm').textContent;
    var acc = document.getElementById('res-acc').textContent;
    var time = document.getElementById('res-time').textContent;
    var modeLabel = mode === 'time' ? totalTime + 's' : mode;
    var text = 'TypeRadar result\n⌨️ ' + wpm + ' wpm  ✓ ' + acc + ' accuracy\nmode: ' + modeLabel + ' | time: ' + time + '\ntyperadar.com';
    navigator.clipboard.writeText(text).then(function() {
      var toast = document.getElementById('share-toast');
      toast.classList.add('visible');
      setTimeout(function() { toast.classList.remove('visible'); }, 2000);
    }).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      var toast = document.getElementById('share-toast');
      toast.classList.add('visible');
      setTimeout(function() { toast.classList.remove('visible'); }, 2000);
    });
  };

  // ─── END TEST ────────────────────────────────────────────────────────────────
  function endTest() {
    if (finished) return;
    clearInterval(timerInterval);
    finished = true;
    started = false;
    hiddenInput.blur();

    var elapsed = mode === 'time' ? totalTime : wpmTick;
    var wpm = Math.round((correctWords / Math.max(elapsed, 1)) * 60);
    var rawWpm = Math.round(((totalCorrectChars + totalWrongChars) / 5) / (Math.max(elapsed, 1) / 60));
    var total = totalCorrectChars + totalWrongChars;
    var acc = total > 0 ? Math.round((totalCorrectChars / total) * 100) : 100;

    document.getElementById('res-wpm').textContent = wpm;
    document.getElementById('res-acc').textContent = acc + '%';
    document.getElementById('res-raw').textContent = rawWpm;
    document.getElementById('res-correct').textContent = correctWords;
    document.getElementById('res-wrong').textContent = wrongWords;
    document.getElementById('res-errors').textContent = totalErrors;
    document.getElementById('res-time').textContent = elapsed + 's';

    var canvas = document.getElementById('wpm-chart');
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = (canvas.offsetWidth || 600) * dpr;
    canvas.height = 100 * dpr;
    ctx.scale(dpr, dpr);
    var W = canvas.width / dpr;
    var H = canvas.height / dpr;
    ctx.clearRect(0, 0, W, H);
    var data = wpmHistory.slice(-60);
    if (data.length > 1) {
      var maxV = Math.max.apply(null, data.concat([1]));
      var pad = { t: 10, b: 10, l: 4, r: 4 };
      var cW = W - pad.l - pad.r;
      var cH = H - pad.t - pad.b;
      var px = function(i) { return pad.l + (i / (data.length - 1)) * cW; };
      var py = function(v) { return pad.t + cH - (v / maxV) * cH; };
      var grad = ctx.createLinearGradient(0, pad.t, 0, H);
      grad.addColorStop(0, 'rgba(124,106,247,0.35)');
      grad.addColorStop(1, 'rgba(124,106,247,0)');
      ctx.beginPath();
      ctx.moveTo(px(0), py(data[0]));
      for (var i = 1; i < data.length; i++) ctx.lineTo(px(i), py(data[i]));
      ctx.lineTo(px(data.length - 1), H);
      ctx.lineTo(px(0), H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px(0), py(data[0]));
      for (var j = 1; j < data.length; j++) ctx.lineTo(px(j), py(data[j]));
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

    updateStatsVisibility(false);
    buildDisplay();
    setTimeout(function() {
      positionCursor();
      hiddenInput.value = '';
      if (!finished) setTimeout(focusInput, 100);
    }, 50);
  };

  // ─── KEY PROCESSING ──────────────────────────────────────────────────────────
  function processKey(key) {
    if (finished) return false;
    if (!started && key !== 'Backspace' && key !== ' ') startTimer();

    var wordStr = words[currentWordIndex] || '';

    if (key === 'Backspace') {
      if (useConfidence) return true;
      if (currentInput.length > 0) {
        var deleteIndex = currentInput.length - 1;
        animateLetter(deleteIndex, 'delete');
        setTimeout(function() {
          currentInput = currentInput.slice(0, -1);
          colorLetters();
          positionCursor();
        }, 30);
      } else if (currentWordIndex > 0) {
        var prev = wordHistory[wordHistory.length - 1];
        if (prev && !prev.locked) {
          wordHistory.pop();
          currentWordIndex--;
          var prevWordStr = words[currentWordIndex];
          var prevInput = prev.input;
          var len = Math.min(prevInput.length, prevWordStr.length);
          for (var i = 0; i < len; i++) {
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
      var wasCorrect = (currentInput === wordStr);
      if (wasCorrect && wordHistory.length > 0) wordHistory[wordHistory.length - 1].locked = true;
      wordHistory.push({ input: currentInput, wasCorrect: wasCorrect, locked: wasCorrect });
      var prevWordEl = document.getElementById('word-' + currentWordIndex);
      if (prevWordEl) prevWordEl.classList.toggle('has-error', !wasCorrect);
      var len2 = Math.min(currentInput.length, wordStr.length);
      for (var i2 = 0; i2 < len2; i2++) {
        if (currentInput[i2] === wordStr[i2]) totalCorrectChars++;
        else totalWrongChars++;
      }
      totalWrongChars += Math.max(0, wordStr.length - currentInput.length);
      if (wasCorrect) correctWords++;
      else wrongWords++;
      currentInput = '';
      currentWordIndex++;

      if (mode === 'zen' && currentWordIndex >= words.length - 20) {
        var list = WORDS[uiLang] || WORDS.en;
        var more = Array.from({ length: 50 }, function() { return list[Math.floor(Math.random() * list.length)]; });
        more.forEach(function(word) {
          words.push(word);
          var inner = document.getElementById('words-inner');
          var wordEl = document.createElement('span');
          wordEl.className = 'word';
          wordEl.id = 'word-' + (words.length - 1);
          word.split('').forEach(function(ch) {
            var letter = document.createElement('span');
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
      var newIndex = currentInput.length;
      if (newIndex < wordStr.length && key !== wordStr[newIndex]) {
        totalErrors++;
        document.getElementById('live-err').textContent = totalErrors;
      }
      currentInput += key;
      setTimeout(function() {
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

  // ─── EVENTS ──────────────────────────────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    var capsOn = e.getModifierState && e.getModifierState('CapsLock');
    var warning = document.getElementById('caps-warning');
    if (warning) warning.classList.toggle('visible', !!capsOn);
  });
  document.addEventListener('keyup', function(e) {
    var capsOn = e.getModifierState && e.getModifierState('CapsLock');
    var warning = document.getElementById('caps-warning');
    if (warning) warning.classList.toggle('visible', !!capsOn);
  });
  document.addEventListener('keydown', function(e) {
    var key = e.key;
    if (key === 'Tab') { e.preventDefault(); restart(); return; }
    if (key === 'Escape') {
      e.preventDefault();
      if (document.getElementById('settings-modal').style.display === 'flex') closeSettings();
      else restart();
      return;
    }
    var ignored = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
      'PageUp','PageDown','Shift','Control','Alt','Meta','CapsLock','Insert','Delete',
      'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
    if (ignored.includes(key)) return;
    e.preventDefault();
    processKey(key);
  });

  hiddenInput.addEventListener('input', function () {
    var val = this.value;
    if (val.length === 0) return;
    var lastChar = val[val.length - 1];
    this.value = '';
    if (!finished) processKey(lastChar);
  });
  hiddenInput.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' || e.key === ' ') e.preventDefault();
  });

  typingContainer.addEventListener('click', function(e) { e.preventDefault(); focusInput(); });
  typingContainer.addEventListener('touchstart', function(e) { e.preventDefault(); focusInput(); });

  document.getElementById('settings-modal').addEventListener('click', function (e) {
    if (e.target === this) closeSettings();
  });

  function handleVisualViewport() {
    var vv = window.visualViewport;
    if (!vv) return;
    var container = document.getElementById('typing-container');
    if (!container) return;
    var keyboardHeight = window.innerHeight - vv.height;
    if (keyboardHeight > 100) {
      document.body.style.paddingBottom = keyboardHeight + 'px';
      setTimeout(function() { container.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
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
    setTimeout(function() { positionCursor(); focusInput(); }, 300);
    document.addEventListener('touchmove', function(e) {
      if (e.target.closest('.typing-container')) e.preventDefault();
    }, { passive: false });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
    }
  });

  setInterval(function() {
    if (!finished && document.getElementById('test-screen').style.display !== 'none'
      && document.activeElement !== hiddenInput) {
      if (!document.activeElement || document.activeElement.tagName !== 'INPUT') focusInput();
    }
  }, 1000);

  setTimeout(focusInput, 500);

})();
