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
  let quoteLen = 'all'; // all | short | medium | long | thicc

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
  function showGroup(id, show) {
    var el = document.getElementById(id);
    if (!el) return;
    if (show) el.classList.add('visible');
    else el.classList.remove('visible');
  }

  window.setMode = function (m, id) {
    mode = m;
    isZen = (m === 'zen');
    document.querySelectorAll('#mode-group .config-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById(id).classList.add('active');

    var hasTimer = (m === 'time' || m === 'words');
    var hasPunct = (m === 'time' || m === 'words' || m === 'custom');
    var isQuote  = (m === 'quote');

    showGroup('time-group',  hasTimer);
    showGroup('time-sep',    hasTimer);
    showGroup('extra-group', hasPunct);
    showGroup('extra-sep',   hasPunct);
    showGroup('quote-group', isQuote);
    showGroup('quote-sep',   isQuote);

    restart();
  };

  // Init: show correct groups for default mode (time)
  (function() {
    showGroup('time-group',  true);
    showGroup('time-sep',    true);
    showGroup('extra-group', true);
    showGroup('extra-sep',   true);
    showGroup('quote-group', false);
    showGroup('quote-sep',   false);
  })();

  window.setQuoteLen = function(len, id) {
    quoteLen = len;
    document.querySelectorAll('#quote-group .config-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
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
    var isActive = el.classList.contains('active');
    if (smode === 'blind') {
      useBlind = !isActive;
      el.classList.toggle('active', useBlind);
      // blind-mode class applied on typing start, not here
    } else if (smode === 'confidence') {
      useConfidence = !isActive;
      el.classList.toggle('active', useConfidence);
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
    if (mode === 'quote') {
      var pool = QUOTES;
      if (quoteLen === 'short')  pool = QUOTES.filter(function(q) { return q.split(' ').length <= 8; });
      if (quoteLen === 'medium') pool = QUOTES.filter(function(q) { var n = q.split(' ').length; return n > 8 && n <= 15; });
      if (quoteLen === 'long')   pool = QUOTES.filter(function(q) { var n = q.split(' ').length; return n > 15 && n <= 25; });
      if (quoteLen === 'thicc')  pool = QUOTES.filter(function(q) { return q.split(' ').length > 25; });
      if (!pool || pool.length === 0) pool = QUOTES;
      return pool[Math.floor(Math.random() * pool.length)].split(' ');
    }
    if (mode === 'custom') return customText.trim().split(/\s+/);
    if (mode === 'zen') {
      return []; // zen: no pre-generated words, user types freely
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
    if (mode === 'zen') {
      // Zen: start with one empty word span for cursor anchor
      var emptyWord = document.createElement('span');
      emptyWord.className = 'word';
      emptyWord.id = 'word-0';
      inner.appendChild(emptyWord);
      currentWordIndex = 0;
      return;
    }
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
  // Called once when typing starts - shows only the relevant stat immediately
  function applyStatsLayout() {
    var statWpm      = document.getElementById('stat-wpm');
    var statAcc      = document.getElementById('stat-acc');
    var timerStat    = document.getElementById('timer-stat');
    var statProgress = document.getElementById('stat-progress');
    var statErr      = document.getElementById('stat-err');
    if (mode === 'time') {
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'block';
      if (statProgress) statProgress.style.display = 'none';
      if (statErr)      statErr.style.display      = 'none';
    } else if (mode === 'zen') {
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'none';
      if (statProgress) statProgress.style.display = 'block';
      if (statErr)      statErr.style.display      = 'none';
      // Label shows just the count, no /total
      var lbl = document.getElementById('live-progress');
      if (lbl) lbl.textContent = '0';
    } else {
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'none';
      if (statProgress) statProgress.style.display = 'block';
      if (statErr)      statErr.style.display      = 'none';
    }
  }
  // Legacy alias kept to avoid breaking any remaining calls
  function updateStatsVisibility() { applyStatsLayout(); }

  function updateWordProgress() {
    var el = document.getElementById('live-progress');
    if (el) el.textContent = currentWordIndex + '/' + words.length;
  }

  function updateZenCount() {
    var el = document.getElementById('live-progress');
    if (el) el.textContent = correctWords;
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
    // Apply correct layout BEFORE making stats visible — no flicker
    applyStatsLayout();
    // Blind mode: hide letters when typing starts (visible before)
    if (useBlind) {
      document.getElementById('typing-container').classList.add('blind-mode');
    }
    document.getElementById('live-stats').classList.add('visible');
    document.getElementById('click-hint').style.opacity = '0.3';
    document.getElementById('timer-label').textContent = mode === 'time' ? 'time' : 'elapsed';
    wpmTick = 0;
    wpmHistory = [];
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

    // ── MonkeyType-style WPM chart ────────────────────────────────────────────
    var canvas = document.getElementById('wpm-chart');
    var wrapper = canvas.parentElement;
    var dpr = window.devicePixelRatio || 1;
    var W_css = wrapper.offsetWidth || 600;
    var H_css = 140;
    canvas.style.width  = W_css + 'px';
    canvas.style.height = H_css + 'px';
    canvas.width  = W_css * dpr;
    canvas.height = H_css * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    var W = W_css, H = H_css;
    ctx.clearRect(0, 0, W, H);

    var data = wpmHistory.length > 0 ? wpmHistory : [wpm];
    var maxV = Math.max.apply(null, data.concat([10]));
    maxV = Math.ceil(maxV / 10) * 10; // round up to nearest 10

    var pad = { t: 12, b: 28, l: 36, r: 16 };
    var cW = W - pad.l - pad.r;
    var cH = H - pad.t - pad.b;

    var px = function(i) {
      return pad.l + (data.length <= 1 ? cW / 2 : (i / (data.length - 1)) * cW);
    };
    var py = function(v) { return pad.t + cH - (v / maxV) * cH; };

    // Grid lines & Y labels
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    var gridCount = 4;
    for (var g = 0; g <= gridCount; g++) {
      var gVal = Math.round((maxV / gridCount) * g);
      var gY = py(gVal);
      ctx.beginPath();
      ctx.moveTo(pad.l, gY);
      ctx.lineTo(W - pad.r, gY);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(gVal, pad.l - 6, gY + 3.5);
    }

    // X labels (seconds)
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    var xLabelCount = Math.min(data.length, 6);
    for (var xi = 0; xi < xLabelCount; xi++) {
      var xIdx = Math.round((xi / (xLabelCount - 1)) * (data.length - 1));
      if (isNaN(xIdx)) xIdx = 0;
      ctx.fillText(xIdx + 's', px(xIdx), H - 6);
    }

    if (data.length > 1) {
      // Smooth bezier fill
      var grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, 'rgba(124,106,247,0.28)');
      grad.addColorStop(1, 'rgba(124,106,247,0.03)');
      ctx.beginPath();
      ctx.moveTo(px(0), py(data[0]));
      for (var fi = 1; fi < data.length; fi++) {
        var cpx1 = px(fi - 0.5);
        var cpy1 = py(data[fi - 1]);
        var cpx2 = px(fi - 0.5);
        var cpy2 = py(data[fi]);
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, px(fi), py(data[fi]));
      }
      ctx.lineTo(px(data.length - 1), H - pad.b);
      ctx.lineTo(px(0), H - pad.b);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Smooth stroke
      ctx.beginPath();
      ctx.moveTo(px(0), py(data[0]));
      for (var si = 1; si < data.length; si++) {
        var sx1 = px(si - 0.5), sy1 = py(data[si - 1]);
        var sx2 = px(si - 0.5), sy2 = py(data[si]);
        ctx.bezierCurveTo(sx1, sy1, sx2, sy2, px(si), py(data[si]));
      }
      ctx.strokeStyle = 'rgba(124,106,247,1)';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Dot at each second
    for (var di = 0; di < data.length; di++) {
      ctx.beginPath();
      ctx.arc(px(di), py(data[di]), 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124,106,247,1)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px(di), py(data[di]), 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    // Final WPM dot highlighted
    ctx.beginPath();
    ctx.arc(px(data.length - 1), py(data[data.length - 1]), 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124,106,247,0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px(data.length - 1), py(data[data.length - 1]), 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124,106,247,1)';
    ctx.fill();

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
    // Update hint text for zen
    var hint = document.getElementById('click-hint');
    if (hint) {
      var isTouchDev2 = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (mode === 'zen') {
        hint.textContent = isTouchDev2
          ? '👆 tap to start — enter to finish'
          : '👆 click or press any key to start — shift+enter to finish';
      } else {
        hint.textContent = isTouchDev2
          ? '👆 tap to start typing'
          : '👆 click or press any key to start typing';
      }
    }
    // Update footer hint
    var footer = document.querySelector('footer');
    if (footer) {
      var isTouchDev3 = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (mode === 'zen' && !isTouchDev3) {
        footer.innerHTML = '<kbd>Tab</kbd> restart &nbsp;·&nbsp; <kbd>Esc</kbd> reset &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> finish zen';
      } else {
        footer.innerHTML = '<kbd>Tab</kbd> restart &nbsp;·&nbsp; <kbd>Esc</kbd> reset';
      }
    }
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('test-screen').style.display = 'flex';
    // Remove blind-mode so letters are visible before typing starts
    document.getElementById('typing-container').classList.remove('blind-mode');

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
      if (mode === 'zen') {
        if (currentInput.length > 0) {
          // Remove last letter element from current word
          var wordEl = document.getElementById('word-' + currentWordIndex);
          if (wordEl && wordEl.lastChild) wordEl.removeChild(wordEl.lastChild);
          currentInput = currentInput.slice(0, -1);
          positionCursor();
        } else if (currentWordIndex > 0) {
          // Go back to previous word
          var inner = document.getElementById('words-inner');
          var emptyWord = document.getElementById('word-' + currentWordIndex);
          if (emptyWord) inner.removeChild(emptyWord);
          currentWordIndex--;
          var prevWord = document.getElementById('word-' + currentWordIndex);
          if (prevWord) {
            // Rebuild currentInput from prev word letters
            currentInput = Array.from(prevWord.querySelectorAll('.zen-letter')).map(function(l){ return l.textContent; }).join('');
          }
          positionCursor();
        }
        return true;
      }
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
      if (mode === 'zen') {
        if (currentInput.length === 0) return true;
        // Commit word, start new one
        correctWords++; // count every completed word in zen
        currentInput = '';
        currentWordIndex++;
        var inner = document.getElementById('words-inner');
        var newWordEl = document.createElement('span');
        newWordEl.className = 'word';
        newWordEl.id = 'word-' + currentWordIndex;
        inner.appendChild(newWordEl);
        updateZenCount();
        positionCursor();
        return true;
      }
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
      if (mode === 'zen') {
        // Zen: just render typed chars, no word list, no right/wrong
        var wordEl = document.getElementById('word-' + currentWordIndex);
        if (!wordEl) return true;
        var letter = document.createElement('span');
        letter.className = 'letter zen-letter';
        letter.textContent = key;
        wordEl.appendChild(letter);
        currentInput += key;
        positionCursor();
        return true;
      }
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
  window.focusInput = function (fromTypingArea) {
    // On touch devices, only open keyboard when user taps the typing area directly
    var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice && !fromTypingArea) return;
    if (!finished && document.getElementById('test-screen').style.display !== 'none') {
      hiddenInput.focus();
    }
  };

  // ─── SETTINGS MODAL ──────────────────────────────────────────────────────────
  window.openSettings = function () {
    document.getElementById('settings-modal').style.display = 'flex';
  };
  window.closeSettings = function () {
    document.getElementById('settings-modal').style.display = 'none';
    if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
      setTimeout(function(){ hiddenInput.focus(); }, 100);
    }
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
    // Zen end: Shift+Enter on desktop, Enter on mobile
    if (key === 'Enter') {
      var isTouchDev = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (mode === 'zen' && started) {
        if (isTouchDev || e.shiftKey) {
          e.preventDefault();
          endTest();
          return;
        }
      }
    }
    var ignored = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
      'PageUp','PageDown','Shift','Control','Alt','Meta','CapsLock','Insert','Delete',
      'Enter','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
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

  // Desktop click
  typingContainer.addEventListener('click', function(e) {
    e.preventDefault();
    if (!finished) hiddenInput.focus();
  });
  // Mobile tap — focus must happen synchronously inside touchend (user gesture)
  typingContainer.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (!finished) hiddenInput.focus();
  });

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
    positionCursor();
    if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
      setTimeout(function(){ hiddenInput.focus(); }, 300);
    }
    document.addEventListener('touchmove', function(e) {
      if (e.target.closest('.typing-container')) e.preventDefault();
    }, { passive: false });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
    }
  });

  // Desktop only: re-focus if user accidentally clicks away
  if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
    setInterval(function() {
      if (!finished && document.getElementById('test-screen').style.display !== 'none'
        && document.activeElement !== hiddenInput) {
        hiddenInput.focus();
      }
    }, 2000);
    setTimeout(function(){ hiddenInput.focus(); }, 400);
  }

})();
