/**
 * TypeRadar — Main Application Logic
 * Fixed: Zen mode, text effects, font selector, settings overhaul
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
  let quoteLen = 'all';
  let soundEffect = 'off';
  let currentFont = 'JetBrains Mono';
  var audioCtx = null;
  var lineH2 = 0;

  const hiddenInput = document.getElementById('hidden-input');
  const typingContainer = document.getElementById('typing-container');

  // ─── FONTS ───────────────────────────────────────────────────────────────────
  const FONTS = [
    { name: '0xProto', import: '0xProto' },
    { name: 'Atkinson Hyperlegible', import: 'Atkinson+Hyperlegible' },
    { name: 'Cascadia Mono', import: 'Cascadia+Mono' },
    { name: 'Comfortaa', import: 'Comfortaa' },
    { name: 'Coming Soon', import: 'Coming+Soon' },
    { name: 'CommitMono', import: 'CommitMono' },
    { name: 'Courier Prime', import: 'Courier+Prime' },
    { name: 'Fira Code', import: 'Fira+Code' },
    { name: 'Geist', import: 'Geist' },
    { name: 'Geist Mono', import: 'Geist+Mono' },
    { name: 'Georgia', import: null },
    { name: 'Hack', import: 'Hack' },
    { name: 'Helvetica', import: null },
    { name: 'IBM Plex Mono', import: 'IBM+Plex+Mono' },
    { name: 'IBM Plex Sans', import: 'IBM+Plex+Sans' },
    { name: 'Inconsolata', import: 'Inconsolata' },
    { name: 'Iosevka', import: null },
    { name: 'Itim', import: 'Itim' },
    { name: 'JetBrains Mono', import: 'JetBrains+Mono:wght@300;400;500' },
    { name: 'Kanit', import: 'Kanit:wght@300;400' },
    { name: 'Lalezar', import: 'Lalezar' },
    { name: 'Lato', import: 'Lato:wght@300;400' },
    { name: 'Lexend Deca', import: 'Lexend+Deca' },
    { name: 'Mononoki', import: null },
    { name: 'Montserrat', import: 'Montserrat:wght@300;400' },
    { name: 'Noto Naskh Arabic', import: 'Noto+Naskh+Arabic' },
    { name: 'Nunito', import: 'Nunito:wght@300;400' },
    { name: 'Open Dyslexic', import: null },
    { name: 'Overpass Mono', import: 'Overpass+Mono' },
    { name: 'Oxygen', import: 'Oxygen:wght@300;400' },
    { name: 'Parkinsans', import: 'Parkinsans' },
    { name: 'Roboto', import: 'Roboto:wght@300;400' },
    { name: 'Roboto Mono', import: 'Roboto+Mono:wght@300;400' },
    { name: 'Sarabun', import: 'Sarabun:wght@300;400' },
    { name: 'Source Code Pro', import: 'Source+Code+Pro' },
    { name: 'Titillium Web', import: 'Titillium+Web:wght@300;400' },
    { name: 'Ubuntu', import: 'Ubuntu:wght@300;400' },
    { name: 'Ubuntu Mono', import: 'Ubuntu+Mono' },
  ];

  const loadedFonts = new Set(['JetBrains Mono', 'Sora', 'Georgia', 'Helvetica', 'Open Dyslexic', 'Iosevka', 'Mononoki', 'CommitMono', '0xProto', 'Cascadia Mono']);

  function loadGoogleFont(fontObj) {
    if (!fontObj.import || loadedFonts.has(fontObj.name)) return;
    loadedFonts.add(fontObj.name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontObj.import}&display=swap`;
    document.head.appendChild(link);
  }

  function applyFont(fontName) {
    currentFont = fontName;
    const wordsDisplay = document.getElementById('words-display');
    if (wordsDisplay) wordsDisplay.style.fontFamily = `'${fontName}', monospace`;
    // update line height ref
    setTimeout(updateLineH, 100);
    try { localStorage.setItem('typeradar_font', fontName); } catch(e) {}
  }

  function buildFontGrid() {
    const grid = document.getElementById('font-grid');
    if (!grid) return;
    grid.innerHTML = FONTS.map(f => {
      const isActive = f.name === currentFont ? ' active' : '';
      return `<div class="font-card${isActive}" data-font="${f.name}" onclick="selectFont('${f.name}')" style="font-family:'${f.name}',monospace">${f.name}</div>`;
    }).join('');
  }

  window.selectFont = function(name) {
    const fontObj = FONTS.find(f => f.name === name);
    if (fontObj) loadGoogleFont(fontObj);
    applyFont(name);
    document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
    const card = document.querySelector(`.font-card[data-font="${name}"]`);
    if (card) card.classList.add('active');
    setTimeout(positionCursor, 200);
  };

  // ─── LINE HEIGHT CALC ─────────────────────────────────────────────────────────
  function updateLineH() {
    const display = document.getElementById('words-display');
    if (!display) return;
    const fs = parseFloat(getComputedStyle(display).fontSize);
    const lh = parseFloat(getComputedStyle(display).lineHeight);
    lineH2 = isNaN(lh) ? fs * 2.4 : lh;
  }

  // ─── TRANSLATIONS ────────────────────────────────────────────────────────────
  const TRANSLATIONS = {
    en:{ wpm:'wpm', accuracy:'accuracy', time:'time', clickHint:'👆 click or press any key to start typing', restart:'restart', raw:'raw wpm', correct:'correct words', wrong:'wrong words', errors:'errors', total:'total time' },
    tr:{ wpm:'wpm', accuracy:'doğruluk', time:'zaman', clickHint:'👆 yazmaya başlamak için tıkla', restart:'yeniden başlat', raw:'ham wpm', correct:'doğru kelime', wrong:'yanlış kelime', errors:'hata', total:'toplam süre' },
    es:{ wpm:'wpm', accuracy:'precisión', time:'tiempo', clickHint:'👆 haz clic para empezar', restart:'reiniciar', raw:'wpm bruto', correct:'correctas', wrong:'incorrectas', errors:'errores', total:'tiempo total' },
    az:{ wpm:'wpm', accuracy:'dəqiqlik', time:'vaxt', clickHint:'👆 yazmağa başlamaq üçün tıkla', restart:'yenidən başla', raw:'xam wpm', correct:'doğru sözlər', wrong:'yanlış sözlər', errors:'səhv', total:'ümumi vaxt' },
    de:{ wpm:'wpm', accuracy:'Genauigkeit', time:'Zeit', clickHint:'👆 Klicken oder Taste drücken', restart:'Neustart', raw:'roh wpm', correct:'richtige Wörter', wrong:'falsche Wörter', errors:'Fehler', total:'Gesamtzeit' },
    fr:{ wpm:'mpm', accuracy:'précision', time:'temps', clickHint:'👆 cliquez pour commencer', restart:'recommencer', raw:'mpm brut', correct:'mots corrects', wrong:'mots incorrects', errors:'erreurs', total:'temps total' },
    it:{ wpm:'wpm', accuracy:'precisione', time:'tempo', clickHint:'👆 clicca per iniziare', restart:'ricomincia', raw:'wpm grezzo', correct:'parole corrette', wrong:'parole sbagliate', errors:'errori', total:'tempo totale' },
    pt:{ wpm:'wpm', accuracy:'precisão', time:'tempo', clickHint:'👆 clique para começar', restart:'reiniciar', raw:'wpm bruto', correct:'palavras corretas', wrong:'palavras erradas', errors:'erros', total:'tempo total' },
    ru:{ wpm:'сл/м', accuracy:'точность', time:'время', clickHint:'👆 нажмите любую клавишу', restart:'перезапуск', raw:'сырой сл/м', correct:'верные слова', wrong:'неверные слова', errors:'ошибки', total:'всего времени' },
    ja:{ wpm:'wpm', accuracy:'正確度', time:'時間', clickHint:'👆 クリックして開始', restart:'再開', raw:'生wpm', correct:'正解', wrong:'不正解', errors:'エラー', total:'合計時間' },
    ko:{ wpm:'wpm', accuracy:'정확도', time:'시간', clickHint:'👆 클릭하여 시작', restart:'재시작', raw:'원시 wpm', correct:'맞은 단어', wrong:'틀린 단어', errors:'오류', total:'총 시간' },
    zh:{ wpm:'wpm', accuracy:'准确度', time:'时间', clickHint:'👆 点击开始', restart:'重新开始', raw:'原始wpm', correct:'正确词', wrong:'错误词', errors:'错误', total:'总时间' },
    ar:{ wpm:'كلمة/د', accuracy:'دقة', time:'وقت', clickHint:'👆 انقر للبدء', restart:'إعادة', raw:'wpm الخام', correct:'كلمات صحيحة', wrong:'كلمات خاطئة', errors:'أخطاء', total:'الوقت الكلي' },
    hi:{ wpm:'शब्द/मिनट', accuracy:'सटीकता', time:'समय', clickHint:'👆 टाइप शुरू करने के लिए क्लिक करें', restart:'पुनः शुरू', raw:'कच्चा wpm', correct:'सही शब्द', wrong:'गलत शब्द', errors:'त्रुटियां', total:'कुल समय' }
  };

  // ─── LANGUAGE LIST ────────────────────────────────────────────────────────────
  var LANGS = [
    {code:'en',name:'english'},{code:'tr',name:'türkçe'},{code:'az',name:'azərbaycan'},
    {code:'es',name:'español'},{code:'de',name:'deutsch'},{code:'fr',name:'français'},
    {code:'it',name:'italiano'},{code:'pt',name:'português'},{code:'ru',name:'русский'},
    {code:'ja',name:'日本語'},{code:'ko',name:'한국어'},{code:'zh',name:'中文'},
    {code:'ar',name:'العربية'},{code:'hi',name:'हिन्दी'},{code:'nl',name:'nederlands'},
    {code:'pl',name:'polski'},{code:'sv',name:'svenska'},{code:'no',name:'norsk'},
    {code:'da',name:'dansk'},{code:'fi',name:'suomi'},{code:'cs',name:'čeština'},
    {code:'ro',name:'română'},{code:'hu',name:'magyar'},{code:'el',name:'ελληνικά'},
    {code:'id',name:'indonesia'},{code:'vi',name:'tiếng việt'},{code:'th',name:'ภาษาไทย'},
    {code:'uk',name:'українська'},{code:'fa',name:'فارسی'},{code:'he',name:'עברית'}
  ];

  function buildLangList(filter) {
    var list = document.getElementById('lang-list');
    if (!list) return;
    var items = filter
      ? LANGS.filter(l => l.name.toLowerCase().includes(filter.toLowerCase()) || l.code.includes(filter.toLowerCase()))
      : LANGS;
    list.innerHTML = items.map(l =>
      `<div class="lang-item${l.code === uiLang ? ' active' : ''}" onclick="pickLang('${l.code}','${l.name}')">
        <span class="lang-check">✓</span><span>${l.name}</span>
      </div>`
    ).join('');
  }

  window.toggleLangDropdown = function() {
    var dd = document.getElementById('lang-dropdown');
    if (!dd) return;
    var isOpen = dd.classList.contains('open');
    if (isOpen) { dd.classList.remove('open'); }
    else {
      dd.classList.add('open');
      buildLangList('');
      setTimeout(() => { var s = document.getElementById('lang-search'); if(s) s.focus(); }, 50);
    }
  };

  window.filterLangs = function(val) { buildLangList(val); };

  window.pickLang = function(code, name) {
    uiLang = code;
    var ind = document.getElementById('lang-indicator-text');
    if (ind) ind.textContent = name;
    var dd = document.getElementById('lang-dropdown');
    if (dd) dd.classList.remove('open');
    var s = document.getElementById('lang-search');
    if (s) s.value = '';
    // Auto-pick a suitable font for non-latin scripts
    if (['ar','fa','he'].includes(code)) {
      if (!loadedFonts.has('Noto Naskh Arabic')) { selectFont('Noto Naskh Arabic'); }
    }
    updateUILanguage();
    restart();
  };

  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('lang-dropdown-wrap');
    if (wrap && !wrap.contains(e.target)) {
      var dd = document.getElementById('lang-dropdown');
      if (dd) dd.classList.remove('open');
    }
  });

  // ─── SOUND ENGINE ─────────────────────────────────────────────────────────────
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playSound(type) {
    if (type === 'off') return;
    try {
      var ctx = getAudioCtx();
      var now = ctx.currentTime;
      var osc, gain, buf, src;

      if (type === 'click') {
        buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
        src = ctx.createBufferSource(); src.buffer = buf;
        var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1000;
        src.connect(f); f.connect(ctx.destination); src.start();
      } else if (type === 'pop') {
        osc = ctx.createOscillator(); gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.06);
      } else if (type === 'beep') {
        osc = ctx.createOscillator(); gain = ctx.createGain();
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.08);
      } else if (type === 'typewriter') {
        buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        var td = buf.getChannelData(0);
        for (var j = 0; j < td.length; j++) td[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.005));
        src = ctx.createBufferSource(); src.buffer = buf;
        var tf = ctx.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = 3000; tf.Q.value = 0.5;
        src.connect(tf); tf.connect(ctx.destination); src.start();
      } else if (type === 'pentatonic') {
        var notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        var freq = notes[Math.floor(Math.random() * notes.length)];
        osc = ctx.createOscillator(); gain = ctx.createGain();
        osc.frequency.value = freq; osc.type = 'triangle';
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.12);
      } else {
        osc = ctx.createOscillator(); gain = ctx.createGain();
        osc.type = type; osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.07);
      }
    } catch(e) {}
  }

  window.setSound = function(type, el) {
    soundEffect = type;
    document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    if (type !== 'off') playSound(type);
  };

  // ─── THEME ────────────────────────────────────────────────────────────────────
  window.setTheme = function(el) {
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
    document.body.className = el.dataset.theme;
    setTimeout(positionCursor, 50);
  };

  window.setColorTheme = function(theme) {
    colorTheme = theme;
    document.querySelectorAll('#color-theme-selector .theme-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.querySelector(`#color-theme-selector .theme-card[data-theme="${theme}"]`);
    if (activeCard) activeCard.classList.add('active');
    try { localStorage.setItem('typeradar_color_theme', theme); } catch(e) {}
    colorLetters();
  };

  // ─── MODE ─────────────────────────────────────────────────────────────────────
  function showGroup(id, show) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('visible', show);
  }

  window.setMode = function(m, id) {
    mode = m;
    isZen = (m === 'zen');
    document.querySelectorAll('#mode-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    var hasTimer = (m === 'time' || m === 'words');
    var hasPunct = (m === 'time' || m === 'words' || m === 'custom');
    var isQuote  = (m === 'quote');

    showGroup('time-group', hasTimer);
    showGroup('time-sep', hasTimer);
    showGroup('extra-group', hasPunct);
    showGroup('extra-sep', hasPunct);
    showGroup('quote-group', isQuote);
    showGroup('quote-sep', isQuote);

    restart();
  };

  (function() {
    showGroup('time-group', true);
    showGroup('time-sep', true);
    showGroup('extra-group', true);
    showGroup('extra-sep', true);
    showGroup('quote-group', false);
    showGroup('quote-sep', false);
  })();

  window.setQuoteLen = function(len, id) {
    quoteLen = len;
    document.querySelectorAll('#quote-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    restart();
  };

  window.setTime = function(t, id) {
    totalTime = t;
    timeLeft = t;
    document.querySelectorAll('#time-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('timer-display').textContent = mode === 'time' ? t : '0';
    restart();
  };

  window.toggleSpecialMode = function(el, smode) {
    var isActive = el.classList.contains('active');
    if (smode === 'blind') {
      useBlind = !isActive;
      el.classList.toggle('active', useBlind);
    } else if (smode === 'confidence') {
      useConfidence = !isActive;
      el.classList.toggle('active', useConfidence);
    }
  };

  window.togglePunct = function(el) {
    usePunct = !usePunct;
    el.classList.toggle('active', usePunct);
    restart();
  };
  window.toggleNumbers = function(el) {
    useNumbers = !useNumbers;
    el.classList.toggle('active', useNumbers);
    restart();
  };

  // ─── UI LANGUAGE ──────────────────────────────────────────────────────────────
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

  // ─── CUSTOM TEXT ──────────────────────────────────────────────────────────────
  window.saveCustomText = function() {
    const ta = document.getElementById('custom-text-input');
    const text = ta.value.trim();
    if (!text) return;
    customText = text;
    try { localStorage.setItem('typeradar_custom_text', customText); } catch(e) {}
    closeSettings();
    if (mode === 'custom') restart();
  };

  // ─── LOAD SETTINGS ────────────────────────────────────────────────────────────
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
          const card = document.querySelector(`#color-theme-selector .theme-card[data-theme="${colorTheme}"]`);
          if (card) {
            document.querySelectorAll('#color-theme-selector .theme-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
          }
        }, 100);
      }
      const savedFont = localStorage.getItem('typeradar_font');
      if (savedFont) {
        const fontObj = FONTS.find(f => f.name === savedFont);
        if (fontObj) { loadGoogleFont(fontObj); applyFont(savedFont); }
      }
    } catch(e) {}
  }

  // ─── WORD GENERATION ──────────────────────────────────────────────────────────
  var PUNCTS = [',', '.', '!', '?', ';', ':'];

  function generateWords() {
    if (mode === 'quote') {
      var pool = QUOTES;
      if (quoteLen === 'short')  pool = QUOTES.filter(q => q.split(' ').length <= 8);
      if (quoteLen === 'medium') pool = QUOTES.filter(q => { var n = q.split(' ').length; return n > 8 && n <= 15; });
      if (quoteLen === 'long')   pool = QUOTES.filter(q => { var n = q.split(' ').length; return n > 15 && n <= 25; });
      if (quoteLen === 'thicc')  pool = QUOTES.filter(q => q.split(' ').length > 25);
      if (!pool || pool.length === 0) pool = QUOTES;
      return pool[Math.floor(Math.random() * pool.length)].split(' ');
    }
    if (mode === 'custom') return customText.trim().split(/\s+/);
    if (mode === 'zen') return [];

    var list2 = WORDS[uiLang] || WORDS.en;
    var count = mode === 'words' ? 30 : 50;
    var base = Array.from({ length: count }, () => list2[Math.floor(Math.random() * list2.length)]);
    return base.map(word => {
      var w = word;
      if (usePunct && Math.random() < 0.2) w += PUNCTS[Math.floor(Math.random() * PUNCTS.length)];
      if (useNumbers && Math.random() < 0.15) {
        w = String(Math.floor(Math.random() * 999) + 1);
        if (usePunct && Math.random() < 0.2) w += PUNCTS[Math.floor(Math.random() * PUNCTS.length)];
      }
      return w;
    });
  }

  // ─── DISPLAY BUILDER ──────────────────────────────────────────────────────────
  function buildDisplay() {
    words = generateWords();
    var inner = document.getElementById('words-inner');
    inner.style.top = '0px';
    inner.innerHTML = '';

    if (mode === 'zen') {
      var emptyWord = document.createElement('span');
      emptyWord.className = 'word';
      emptyWord.id = 'word-0';
      inner.appendChild(emptyWord);
      currentWordIndex = 0;
      updateLineH();
      return;
    }

    words.forEach((word, wi) => {
      var wordEl = document.createElement('span');
      wordEl.className = 'word';
      wordEl.id = 'word-' + wi;
      word.split('').forEach((ch, ci) => {
        var letter = document.createElement('span');
        letter.className = 'letter';
        letter.id = 'l-' + wi + '-' + ci;
        letter.textContent = ch;
        wordEl.appendChild(letter);
      });
      inner.appendChild(wordEl);
    });

    updateLineH();
    updateWordProgress();
  }

  // ─── CURSOR ───────────────────────────────────────────────────────────────────
  function positionCursor() {
    var cursor = document.getElementById('cursor');
    var display = document.getElementById('words-display');
    var inner = document.getElementById('words-inner');
    var wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl || !display || !cursor) return;

    updateLineH();

    var letters = mode === 'zen'
      ? wordEl.querySelectorAll('.zen-letter')
      : wordEl.querySelectorAll('.letter');
    var cRect = display.getBoundingClientRect();
    var pos;

    if (currentInput.length === 0) {
      if (mode === 'zen') {
        if (letters.length > 0) {
          var zl = letters[letters.length - 1];
          var zlr = zl.getBoundingClientRect();
          pos = { left: zlr.left - cRect.left + zlr.width, top: zlr.top - cRect.top };
        } else if (currentWordIndex > 0) {
          var prevW = document.getElementById('word-' + (currentWordIndex - 1));
          if (prevW) {
            var pletters = prevW.querySelectorAll('.zen-letter');
            if (pletters.length > 0) {
              var pl = pletters[pletters.length - 1];
              var plr = pl.getBoundingClientRect();
              pos = { left: plr.left - cRect.left + plr.width + 10, top: plr.top - cRect.top };
            } else {
              var wr2 = wordEl.getBoundingClientRect();
              pos = { left: wr2.left - cRect.left, top: wr2.top - cRect.top };
            }
          } else {
            pos = { left: 0, top: 0 };
          }
        } else {
          // Very first character in zen — position at start of inner
          var innerRect = inner.getBoundingClientRect();
          pos = { left: innerRect.left - cRect.left, top: innerRect.top - cRect.top };
          if (pos.top < 0) pos.top = 0;
        }
      } else {
        var r0 = wordEl.getBoundingClientRect();
        pos = { left: r0.left - cRect.left, top: r0.top - cRect.top };
      }
    } else {
      if (letters.length > 0) {
        var idx = Math.min(currentInput.length - 1, letters.length - 1);
        var r1 = letters[idx].getBoundingClientRect();
        pos = { left: r1.left - cRect.left + r1.width, top: r1.top - cRect.top };
      } else {
        var r0b = wordEl.getBoundingClientRect();
        pos = { left: r0b.left - cRect.left, top: r0b.top - cRect.top };
      }
    }

    cursor.style.left = pos.left + 'px';
    cursor.style.top = pos.top + 'px';

    // Scroll up when cursor passes 3rd line
    if (lineH2 > 0 && pos.top >= lineH2 * 2.1) {
      var currentTop2 = parseInt(inner.style.top || 0);
      inner.style.top = (currentTop2 - lineH2) + 'px';
      pos.top -= lineH2;
      cursor.style.top = pos.top + 'px';
    }
  }

  // ─── LETTER COLORING ──────────────────────────────────────────────────────────
  function getThemeClasses() {
    return ['theme-classic','theme-rgb','theme-matrix','theme-neon','theme-fire','theme-ocean','theme-purple','theme-rose','theme-mint','theme-gold'];
  }

  function animateLetter(letterIndex, type) {
    var wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl) return;
    var letters = wordEl.querySelectorAll('.letter');
    if (letterIndex >= 0 && letterIndex < letters.length) {
      var letter = letters[letterIndex];
      var themeClasses = getThemeClasses();
      letter.classList.remove('correct', 'wrong', 'deleting', ...themeClasses);
      if (type === 'add') {
        var isCorrect = currentInput[letterIndex] === words[currentWordIndex][letterIndex];
        letter.classList.add(isCorrect ? 'correct' : 'wrong');
        letter.classList.add('theme-' + colorTheme);
      } else if (type === 'delete') {
        letter.classList.add('deleting');
        setTimeout(() => {
          letter.classList.remove('deleting', 'correct', 'wrong', ...themeClasses);
        }, 100);
      }
    }
  }

  function colorLetters() {
    var wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl) return;
    var letters = wordEl.querySelectorAll('.letter');
    var wordStr = words[currentWordIndex] || '';
    var themeClasses = getThemeClasses();
    letters.forEach(l => l.classList.remove('correct', 'wrong', ...themeClasses));
    for (var i = 0; i < currentInput.length && i < wordStr.length; i++) {
      letters[i].classList.add(currentInput[i] === wordStr[i] ? 'correct' : 'wrong');
      letters[i].classList.add('theme-' + colorTheme);
    }
  }

  // ─── STATS VISIBILITY ─────────────────────────────────────────────────────────
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
      var lbl2 = document.getElementById('live-progress');
      if (lbl2) lbl2.textContent = '0';
      var lbl3 = document.querySelector('#stat-progress .stat-label');
      if (lbl3) lbl3.style.visibility = 'hidden';
    } else {
      if (statWpm)      statWpm.style.display      = 'none';
      if (statAcc)      statAcc.style.display      = 'none';
      if (timerStat)    timerStat.style.display    = 'none';
      if (statProgress) statProgress.style.display = 'block';
      if (statErr)      statErr.style.display      = 'none';
      var lbl4 = document.querySelector('#stat-progress .stat-label');
      if (lbl4) lbl4.style.visibility = 'visible';
    }
  }

  function updateWordProgress() {
    var el = document.getElementById('live-progress');
    if (el) el.textContent = currentWordIndex + '/' + words.length;
  }

  function updateZenCount() {
    var el = document.getElementById('live-progress');
    if (el) el.textContent = correctWords;
    var lbl = document.querySelector('#stat-progress .stat-label');
    if (lbl) lbl.style.visibility = 'hidden';
  }

  function updateLiveStats() {
    var elapsed = mode === 'time' ? (totalTime - timeLeft) : wpmTick;
    var wpm = elapsed > 0 ? Math.round((correctWords / elapsed) * 60) : 0;
    var total = totalCorrectChars + totalWrongChars;
    var acc = total > 0 ? Math.round((totalCorrectChars / total) * 100) : 100;
    document.getElementById('live-wpm').textContent = wpm;
    document.getElementById('live-acc').textContent = acc + '%';
    if (mode === 'zen') { updateZenCount(); } else { updateWordProgress(); }
    if (started && !finished && elapsed > 0) {
      if (wpmHistory.length === 0 || wpmHistory[wpmHistory.length - 1] !== wpm) {
        wpmHistory.push(wpm);
      }
    }
  }

  // ─── TIMER ────────────────────────────────────────────────────────────────────
  function startTimer() {
    if (started) return;
    started = true;
    applyStatsLayout();
    if (useBlind) document.getElementById('typing-container').classList.add('blind-mode');
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

  // ─── SHARE ────────────────────────────────────────────────────────────────────
  window.shareResult = function() {
    var wpm = document.getElementById('res-wpm').textContent;
    var acc = document.getElementById('res-acc').textContent;
    var time = document.getElementById('res-time').textContent;
    var modeLabel = mode === 'time' ? totalTime + 's' : mode;
    var text = `TypeRadar result\n⌨️ ${wpm} wpm  ✓ ${acc} accuracy\nmode: ${modeLabel} | time: ${time}\ntyperadar.com`;
    navigator.clipboard.writeText(text).then(() => {
      showShareToast();
    }).catch(() => {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showShareToast();
    });
  };

  function showShareToast() {
    var toast = document.getElementById('share-toast');
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  // ─── END TEST ─────────────────────────────────────────────────────────────────
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

    // WPM Chart
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
    var maxV = Math.max(...data.concat([10]));
    maxV = Math.ceil(maxV / 10) * 10;

    var pad = { t: 12, b: 28, l: 36, r: 16 };
    var cW = W - pad.l - pad.r;
    var cH = H - pad.t - pad.b;
    var px = i => pad.l + (data.length <= 1 ? cW / 2 : (i / (data.length - 1)) * cW);
    var py = v => pad.t + cH - (v / maxV) * cH;

    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    for (var g = 0; g <= 4; g++) {
      var gVal = Math.round((maxV / 4) * g);
      var gY = py(gVal);
      ctx.beginPath(); ctx.moveTo(pad.l, gY); ctx.lineTo(W - pad.r, gY);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText(gVal, pad.l - 6, gY + 3.5);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
    var xLabelCount = Math.min(data.length, 6);
    for (var xi = 0; xi < xLabelCount; xi++) {
      var xIdx = Math.round((xi / Math.max(xLabelCount - 1, 1)) * (data.length - 1));
      ctx.fillText(xIdx + 's', px(xIdx), H - 6);
    }

    if (data.length > 1) {
      var grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grad.addColorStop(0, 'rgba(124,106,247,0.28)');
      grad.addColorStop(1, 'rgba(124,106,247,0.03)');
      ctx.beginPath(); ctx.moveTo(px(0), py(data[0]));
      for (var fi = 1; fi < data.length; fi++) {
        var cpx = px(fi - 0.5);
        ctx.bezierCurveTo(cpx, py(data[fi-1]), cpx, py(data[fi]), px(fi), py(data[fi]));
      }
      ctx.lineTo(px(data.length - 1), H - pad.b);
      ctx.lineTo(px(0), H - pad.b);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath(); ctx.moveTo(px(0), py(data[0]));
      for (var si = 1; si < data.length; si++) {
        var sx = px(si - 0.5);
        ctx.bezierCurveTo(sx, py(data[si-1]), sx, py(data[si]), px(si), py(data[si]));
      }
      ctx.strokeStyle = 'rgba(124,106,247,1)'; ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    }

    for (var di = 0; di < data.length; di++) {
      ctx.beginPath(); ctx.arc(px(di), py(data[di]), 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124,106,247,1)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px(di), py(data[di]), 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(px(data.length-1), py(data[data.length-1]), 5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(124,106,247,0.3)'; ctx.fill();
    ctx.beginPath(); ctx.arc(px(data.length-1), py(data[data.length-1]), 3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(124,106,247,1)'; ctx.fill();

    document.getElementById('test-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'flex';
  }

  // ─── RESTART ──────────────────────────────────────────────────────────────────
  window.restart = function() {
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

    var hint = document.getElementById('click-hint');
    if (hint) {
      var isTouchDev2 = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (mode === 'zen') {
        hint.innerHTML = isTouchDev2
          ? '👆 tap to start typing &nbsp;·&nbsp; <kbd style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:0.65rem;color:var(--text)">Enter</kbd> finish'
          : '👆 click or press any key to start &nbsp;·&nbsp; <kbd style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:0.65rem;color:var(--text)">Shift+Enter</kbd> to finish';
      } else {
        hint.textContent = isTouchDev2 ? '👆 tap to start typing' : '👆 click or press any key to start typing';
      }
    }

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
    document.getElementById('typing-container').classList.remove('blind-mode');

    buildDisplay();
    setTimeout(() => {
      positionCursor();
      hiddenInput.value = '';
      if (!finished) setTimeout(focusInput, 100);
    }, 50);
  };

  // ─── KEY PROCESSING ───────────────────────────────────────────────────────────
  function processKey(key) {
    if (finished) return false;
    if (!started && key !== 'Backspace' && key !== ' ') startTimer();
    if (key !== 'Backspace' && key !== ' ') playSound(soundEffect);

    var wordStr = words[currentWordIndex] || '';

    // ── BACKSPACE ──
    if (key === 'Backspace') {
      if (useConfidence) return true;

      if (mode === 'zen') {
        if (currentInput.length > 0) {
          var wordEl = document.getElementById('word-' + currentWordIndex);
          if (wordEl && wordEl.lastChild) wordEl.removeChild(wordEl.lastChild);
          currentInput = currentInput.slice(0, -1);
          positionCursor();
        } else if (currentWordIndex > 0) {
          // Go back to previous word in zen
          var inner = document.getElementById('words-inner');
          var emptyWord = document.getElementById('word-' + currentWordIndex);
          if (emptyWord) inner.removeChild(emptyWord);
          currentWordIndex--;
          correctWords = Math.max(0, correctWords - 1);
          var prevWord = document.getElementById('word-' + currentWordIndex);
          if (prevWord) {
            currentInput = Array.from(prevWord.querySelectorAll('.zen-letter')).map(l => l.textContent).join('');
          }
          updateZenCount();
          positionCursor();
        }
        return true;
      }

      if (currentInput.length > 0) {
        var deleteIndex = currentInput.length - 1;
        animateLetter(deleteIndex, 'delete');
        setTimeout(() => {
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

    // ── SPACE ──
    if (key === ' ') {
      if (mode === 'zen') {
        if (currentInput.length === 0) return true;
        correctWords++;
        currentInput = '';
        currentWordIndex++;
        var zenSpaceInner = document.getElementById('words-inner');
        var zenSpaceWord = document.createElement('span');
        zenSpaceWord.className = 'word';
        zenSpaceWord.id = 'word-' + currentWordIndex;
        zenSpaceInner.appendChild(zenSpaceWord);
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

      if ((mode === 'words' || mode === 'quote' || mode === 'custom') && currentWordIndex >= words.length) {
        endTest();
        return true;
      }
      colorLetters();
      positionCursor();
      updateLiveStats();
      return true;
    }

    // ── REGULAR CHARACTER ──
    if (key.length === 1) {
      if (mode === 'zen') {
        var wordEl2 = document.getElementById('word-' + currentWordIndex);
        if (!wordEl2) return true;
        var letter = document.createElement('span');
        letter.className = 'letter zen-letter';
        // Apply color theme to zen letters too
        letter.classList.add('correct', 'theme-' + colorTheme);
        letter.textContent = key;
        wordEl2.appendChild(letter);
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
      setTimeout(() => {
        animateLetter(newIndex, 'add');
        positionCursor();
      }, 10);
      updateLiveStats();
      return true;
    }
    return true;
  }

  // ─── FOCUS ────────────────────────────────────────────────────────────────────
  window.focusInput = function(fromTypingArea) {
    var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice && !fromTypingArea) return;
    if (!finished && document.getElementById('test-screen').style.display !== 'none') {
      hiddenInput.focus();
    }
  };

  // ─── SETTINGS MODAL ───────────────────────────────────────────────────────────
  window.openSettings = function() {
    buildFontGrid();
    document.getElementById('settings-modal').style.display = 'flex';
  };
  window.closeSettings = function() {
    document.getElementById('settings-modal').style.display = 'none';
    if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
      setTimeout(() => hiddenInput.focus(), 100);
    }
  };

  // ─── EVENTS ───────────────────────────────────────────────────────────────────
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
    // Don't intercept keys when settings modal is open and user is typing in inputs
    if (document.getElementById('settings-modal').style.display === 'flex') {
      if (e.key === 'Escape') { closeSettings(); e.preventDefault(); }
      return;
    }

    var key = e.key;
    if (key === 'Tab') { e.preventDefault(); restart(); return; }
    if (key === 'Escape') { e.preventDefault(); restart(); return; }

    if (key === 'Enter') {
      var isTouchDev = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (mode === 'zen') {
        e.preventDefault();
        // Mobile: Enter finishes. Desktop: ONLY Shift+Enter finishes. Plain Enter = nothing.
        if (isTouchDev) {
          if (started) endTest();
          else if (currentInput.length > 0) { startTimer(); endTest(); }
        } else if (e.shiftKey) {
          if (started) endTest();
        }
        // Plain Enter on desktop: do nothing (just prevent default above)
        return;
      }
    }

    var ignored = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
      'PageUp','PageDown','Shift','Control','Alt','Meta','CapsLock','Insert','Delete',
      'Enter','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
    if (ignored.includes(key)) return;
    e.preventDefault();
    processKey(key);
  });

  hiddenInput.addEventListener('input', function() {
    var val = this.value;
    if (val.length === 0) return;
    var lastChar = val[val.length - 1];
    this.value = '';
    if (!finished) processKey(lastChar);
  });
  hiddenInput.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace') { e.preventDefault(); if (!finished) processKey('Backspace'); }
    if (e.key === ' ') { e.preventDefault(); if (!finished) processKey(' '); }
  });

  typingContainer.addEventListener('click', function(e) {
    e.preventDefault();
    if (!finished) hiddenInput.focus();
  });
  typingContainer.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (!finished) hiddenInput.focus();
  });

  document.getElementById('settings-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSettings();
  });

  function handleVisualViewport() {
    var vv = window.visualViewport;
    if (!vv) return;
    var keyboardHeight = window.innerHeight - vv.height;
    if (keyboardHeight > 100) {
      document.body.style.paddingBottom = keyboardHeight + 'px';
      setTimeout(() => {
        var container = document.getElementById('typing-container');
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } else {
      document.body.style.paddingBottom = '';
    }
    positionCursor();
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────────
  window.addEventListener('load', function() {
    loadSettings();
    buildDisplay();
    updateUILanguage();
    applyStatsLayout();
    updateLineH();
    positionCursor();
    if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
      setTimeout(() => hiddenInput.focus(), 300);
    }
    document.addEventListener('touchmove', function(e) {
      if (e.target.closest('.typing-container')) e.preventDefault();
    }, { passive: false });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
    }

    window.addEventListener('resize', () => {
      updateLineH();
      positionCursor();
    });
  });

  if (!(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
    setInterval(() => {
      if (!finished && document.getElementById('test-screen').style.display !== 'none'
        && document.activeElement !== hiddenInput
        && document.getElementById('settings-modal').style.display !== 'flex') {
        hiddenInput.focus();
      }
    }, 2000);
    setTimeout(() => hiddenInput.focus(), 400);
  }

})();
