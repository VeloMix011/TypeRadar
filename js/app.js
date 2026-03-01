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

  // Flag to prevent double-processing of Backspace/Space
  // We use a timestamp: if < 20ms since last processed, skip
  let lastKeyTime = 0;

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

  // ─── THEME DEFINITIONS ────────────────────────────────────────────────────────
  const THEMES = {
    'moon':        ['#0d0d0f','#141417','#1c1c21','#2a2a32','#e8e8f0','#555566','#7c6af7','#f7c26a','#6af7b2','#f76a8a','#7c6af7'],
    'forest':      ['#0c110e','#131a15','#1a241d','#243028','#d4e8d8','#4a6152','#5ebb7a','#b5e87d','#7de8b5','#e87d7d','#5ebb7a'],
    'ember':       ['#0f0c0a','#181310','#221a16','#342520','#f0ddd4','#6b4c40','#f77b4a','#f7c26a','#f7c26a','#f75a6a','#f77b4a'],
    'arctic':      ['#f5f7fb','#eef1f7','#e4e8f2','#d0d5e8','#1a1d2e','#9099bb','#4a6cf7','#f7884a','#2ab87a','#e83d5a','#4a6cf7'],
    'dark':        ['#323437','#2c2e31','#3a3c40','#4a4c50','#d1d0c5','#646669','#e2b714','#ca4754','#e2b714','#ca4754','#e2b714'],
    'light':       ['#e1e1e3','#d5d5d7','#cacaca','#b8b8ba','#323437','#aaaaac','#e2b714','#ca4754','#46c263','#ca4754','#e2b714'],
    'serika dark': ['#323437','#2c2e31','#3a3c40','#4a4c50','#d1d0c5','#646669','#e2b714','#d79922','#e2b714','#ca4754','#e2b714'],
    'serika':      ['#e8e0d5','#ddd5c8','#d2c9bc','#c5b9a9','#323437','#888880','#e2b714','#d79922','#327a3c','#ca4754','#e2b714'],
    'botanical':   ['#1e2a20','#253228','#2d3d30','#3a5040','#c8d8c0','#4a6050','#a8c88a','#e8d070','#a8c88a','#e87070','#a8c88a'],
    'alpine':      ['#2b3a4a','#324455','#3a5060','#4a6070','#d8e8f0','#5a7888','#78b8e0','#f0c870','#78e8b8','#e87878','#78b8e0'],
    'dualshot':    ['#1a1a2e','#16213e','#1e2a50','#2a3a60','#e8e0d0','#5a6070','#c0a868','#e87878','#c0a868','#e87878','#c0a868'],
    'fundamentals':['#1e2a38','#253040','#2d3850','#3a4860','#d0dce8','#507080','#70a8d8','#f0d870','#70d8a0','#e87870','#70a8d8'],
    'comfy':       ['#2c3639','#3f4e4f','#4a5e5f','#5a7070','#dfd3c3','#7a8880','#c8a880','#e8d0a0','#a8c880','#e89080','#c8a880'],
    'gruvbox dark':['#282828','#1d2021','#3c3836','#504945','#ebdbb2','#928374','#d79921','#fb4934','#b8bb26','#fb4934','#d79921'],
    'gruvbox':     ['#fbf1c7','#f2e5bc','#ebdbb2','#d5c4a1','#3c3836','#928374','#d79921','#cc241d','#98971a','#cc241d','#d79921'],
    'solarized dark':['#002b36','#073642','#0d3d4a','#1a5060','#839496','#586e75','#268bd2','#cb4b16','#859900','#dc322f','#268bd2'],
    'solarized':   ['#fdf6e3','#eee8d5','#e8e0c8','#d0c8b0','#657b83','#93a1a1','#268bd2','#cb4b16','#859900','#dc322f','#268bd2'],
    'nord':        ['#2e3440','#3b4252','#434c5e','#4c566a','#eceff4','#8892a0','#88c0d0','#81a1c1','#a3be8c','#bf616a','#88c0d0'],
    'nord light':  ['#eceff4','#e5e9f0','#d8dee9','#c8d0dc','#2e3440','#8892a0','#5e81ac','#bf616a','#a3be8c','#bf616a','#5e81ac'],
    'catppuccin':  ['#1e1e2e','#181825','#313244','#45475a','#cdd6f4','#6c7086','#cba6f7','#f38ba8','#a6e3a1','#f38ba8','#cba6f7'],
    'monokai':     ['#272822','#1e1f1c','#2f3120','#3e4034','#f8f8f2','#75715e','#a6e22e','#f92672','#a6e22e','#f92672','#a6e22e'],
    'dracula':     ['#282a36','#1e1f29','#343746','#44475a','#f8f8f2','#6272a4','#bd93f9','#ff79c6','#50fa7b','#ff5555','#bd93f9'],
    'night runner': ['#161c2a','#1a2235','#202a40','#2a3850','#e8eaf5','#4a5878','#f8c94a','#ff6b6b','#50fa7b','#ff5555','#f8c94a'],
    'rose pine':   ['#191724','#1f1d2e','#26233a','#403d52','#e0def4','#6e6a86','#ebbcba','#eb6f92','#9ccfd8','#eb6f92','#ebbcba'],
    'rose pine moon':['#232136','#2a273f','#393552','#44415a','#e0def4','#6e6a86','#c4a7e7','#eb6f92','#9ccfd8','#eb6f92','#c4a7e7'],
    'carbon':      ['#0f0f0f','#161616','#1e1e1e','#262626','#f4f4f4','#6f6f6f','#78a9ff','#3ddbd9','#42be65','#ff5555','#78a9ff'],
    'metaverse':   ['#0a0e1a','#0f1525','#152040','#1e2d58','#a0c0f0','#3a5080','#6080e0','#a060c0','#40c080','#e04060','#6080e0'],
    'horizon':     ['#1c1e26','#1e2132','#252836','#2e3244','#d5d8da','#6c6f82','#e93c58','#fab28e','#29d398','#e93c58','#e93c58'],
    'vscode':      ['#1e1e1e','#252526','#2d2d30','#3e3e42','#d4d4d4','#808080','#569cd6','#ce9178','#4ec9b0','#f44747','#569cd6'],
    'github':      ['#0d1117','#161b22','#21262d','#30363d','#c9d1d9','#8b949e','#58a6ff','#f78166','#56d364','#f85149','#58a6ff'],
    'aether':      ['#16141f','#1e1c2e','#26233a','#322f48','#e0def4','#6e6a86','#a78bfa','#f472b6','#34d399','#f87171','#a78bfa'],
    'laser':       ['#1a0a2e','#250d3e','#30155a','#3d2070','#d0b8ff','#7050a0','#bf5af2','#ff6fd8','#30d5c8','#ff453a','#bf5af2'],
    'terminal':    ['#0a0e0a','#0f1a0f','#182818','#203020','#00ff41','#1a4a1a','#00ff41','#00cc33','#00ff41','#ff4444','#00ff41'],
    'matrix':      ['#000000','#050f05','#0a1a0a','#102010','#00ff00','#004400','#00ff00','#00cc00','#00ff00','#ff0000','#00ff00'],
    'superuser':   ['#2e0b3a','#3a1050','#451868','#553080','#e0c8f0','#7a58a0','#c070f0','#f0a0e0','#70f0c0','#f07070','#c070f0'],
    'oblivion':    ['#292c2e','#1e2022','#303336','#3d4042','#d8d8d8','#686868','#c8c8c8','#f0a868','#a8c880','#f07878','#c8c8c8'],
    'nebula':      ['#0c0e1a','#111425','#181c38','#202a50','#c8d0f8','#4050a0','#8090f0','#c070e0','#60d0a0','#e07080','#8090f0'],
    'moonlight':   ['#212337','#2a2b4a','#303356','#3c3f6a','#c8d0f8','#5060a8','#82aaff','#c792ea','#c3e88d','#ff5370','#82aaff'],
    'sunset':      ['#2a1a0e','#382516','#483020','#583c2a','#f0d8c0','#9a7060','#f0a050','#e87040','#f0c850','#e05030','#f0a050'],
    'future funk': ['#180d26','#231540','#2e1d58','#3a2870','#ffd6f6','#8860c0','#ee8ff8','#f0a8e0','#80f0c0','#f07090','#ee8ff8'],
    'cyan':        ['#06111e','#091826','#0c2030','#102840','#80d8ff','#2060a0','#00bcd4','#80d8ff','#00e5ff','#ff5252','#00bcd4'],
    'wavez':       ['#181c44','#1e2258','#242a70','#2c3488','#c0c8ff','#5060c0','#7080f0','#d070e0','#70e0b0','#e07090','#7080f0'],
    'earthsong':   ['#2a2018','#352a20','#403428','#504030','#e8d8c0','#8a7060','#c8a060','#d88040','#a0c870','#d87060','#c8a060'],
    'watermelon':  ['#1a2e1a','#1e3820','#243e28','#2c4a30','#d8f0d0','#6a9868','#70c870','#e87080','#60d898','#f06878','#70c870'],
    'strawberry':  ['#2e0a16','#3a1020','#481828','#582034','#f0c0c8','#a05870','#f04068','#f86080','#70e0a0','#ff4060','#f04068'],
    'mint':        ['#0a2a20','#103428','#183e30','#20503c','#c0f0e0','#408068','#40c890','#f0d040','#40e890','#f06870','#40c890'],
    'lavender':    ['#1a1030','#221840','#2c2050','#383060','#e8d8f8','#7860b0','#b890f8','#e880c8','#80f0b8','#f07090','#b890f8'],
    'dino':        ['#111823','#182030','#202a3e','#2a384e','#c8e0f8','#507098','#78a8e8','#e8c878','#78e8a8','#e87878','#78a8e8'],
    'magic girl':  ['#2a1234','#361848','#42205a','#503070','#f8d8f8','#9060c0','#f060d0','#f8a0e8','#80f0c0','#ff60a0','#f060d0'],
    'milkshake':   ['#fce8d5','#f8dcc0','#f4d0ac','#efc498','#4a3020','#a88060','#f86a28','#e84060','#50c880','#e83048','#f86a28'],
    'modern ink':  ['#1a1a2a','#222236','#2c2c46','#383858','#e8e0f0','#5858a0','#6868d8','#d868a8','#68d8a8','#e86878','#6868d8'],
    'ns cupcakes': ['#2a0f1e','#38162a','#481e38','#582848','#f8c8e0','#b06090','#f878b8','#f8a0d0','#78e8b8','#f86888','#f878b8'],
    'vesper light':['#fffff8','#f8f8e8','#f0f0d8','#e0e0c0','#2a2820','#8a8870','#c8a030','#e07820','#5a8830','#d03020','#c8a030'],
    'lilac mist':  ['#2a2038','#342848','#403060','#503878','#e8d8f8','#8070b8','#c0a0f0','#e8a0c8','#a0e8c8','#e878a8','#c0a0f0'],
    'rose pine dawn':['#faf4ed','#fffaf3','#f2e9e1','#9893a5','#575279','#9893a5','#d7827e','#286983','#56949f','#b4637a','#d7827e'],
    'soaring skies':['#e8f0f8','#dae4f0','#ccd8e8','#b8c8dc','#1a2a3a','#6080a0','#4090c8','#c04080','#40a870','#e04050','#4090c8'],
    'camping':     ['#1e2a18','#283618','#304020','#3a4c28','#d8e8c0','#607848','#8ab850','#f0c040','#70d870','#e86840','#8ab850'],
    'slambook':    ['#1a1a2e','#16213e','#0f3460','#533483','#e8e0f8','#6060a8','#e94560','#533483','#a8e8c8','#e94560','#e94560'],
    'paper':       ['#f8f4ec','#f0eae0','#e8dfd0','#d5ccba','#2c2820','#9a8e7a','#5a6890','#b05038','#407850','#c04030','#5a6890'],
    'desert oasis':['#e8d5b0','#e0c898','#d8bc82','#c8a868','#3a2810','#9a7840','#2890c8','#e86830','#58a030','#d83020','#2890c8'],
    'iceberg light':['#dce4f5','#d1d9ee','#c6cfe7','#b8c2dc','#161821','#5c6a90','#2d539e','#e27878','#2d8f6f','#e27878','#2d539e'],
    'witch girl':  ['#1a0a2e','#261040','#341858','#422070','#f0d0f8','#9050c0','#c060e0','#e880c0','#70e0a0','#f06080','#c060e0'],
    'terrazzo':    ['#e8e0d8','#ddd5cc','#d2cac0','#c0b8a8','#282420','#8a8278','#c87060','#70a8c8','#60b880','#d84030','#c87060'],
    'goldilocks':  ['#1a1408','#241c0e','#2e2414','#3a2e1a','#f0e0b0','#806840','#e8c840','#e09020','#a8e050','#e05030','#e8c840'],
    'dollar':      ['#0a1a0e','#101e14','#16261a','#1e3022','#c0d8c0','#406848','#50b060','#88c048','#70d870','#e07060','#50b060'],
    'dms':         ['#1a1a2e','#16213e','#0f3460','#1a4080','#e0e8f8','#5070a8','#4a90e2','#e25c4a','#50d0a8','#e24a4a','#4a90e2'],
    'lil dragon':  ['#1a1025','#22153a','#2c1e4e','#382862','#e8d0f8','#7850b8','#a870e8','#e870a8','#70e8a8','#f85080','#a870e8'],
    'blueberry light':['#e8eef8','#dce5f5','#d0daf0','#b8cae5','#1a2540','#5070a8','#3a6ac0','#c84a70','#2a9050','#d83a3a','#3a6ac0'],
    'witch girl (dark)':['#0e0618','#140c22','#1c1230','#261a42','#e0c8f8','#6a40a8','#b050d8','#e068b0','#60d890','#f04870','#b050d8'],
    'repose light':['#f8f4f0','#f0eae4','#e8dfd8','#d8ccc4','#28201c','#9a8880','#6a5a98','#c8604a','#50985a','#c83a2e','#6a5a98'],
    'goldilocks (2)':['#f5e8c8','#f0e0b8','#e8d8a8','#daca90','#2a2010','#9a8850','#c8a030','#e07820','#70a828','#d84020','#c8a030'],
    'shoko':       ['#f8f0e8','#f0e8dc','#e8dfd0','#d8cec0','#302820','#a09080','#c8702a','#5898c8','#70b850','#e04830','#c8702a'],
    'baeach':      ['#f0f8f8','#e4f0f4','#d8e8f0','#c4d8e8','#1a3040','#6090b0','#3890c8','#e87840','#40b890','#e05040','#3890c8'],
    'breeze':      ['#1a2a3a','#203040','#283a4c','#304858','#d8e8f8','#5878a0','#5fa8dc','#f0a050','#5fd8a8','#f07058','#5fa8dc'],
    'froyo':       ['#fff8f0','#fff0e4','#ffe8d8','#ffd8c4','#3a2810','#b09070','#e86030','#f0a028','#70b840','#e03828','#e86030'],
    'mr. sleeves': ['#282040','#302858','#3c3268','#4a4080','#e8d8f8','#7868b8','#a890f0','#f0a070','#80f0b0','#f07080','#a890f0'],
    'fruit chew':  ['#1a2e18','#20381e','#283e24','#30502c','#d8f0d0','#60a058','#70d858','#f8d028','#70e860','#f85038','#70d858'],
    'peaches':     ['#fff5f0','#ffede4','#ffe5d8','#ffd5c4','#3a2018','#b08070','#f08060','#e04050','#60c880','#e03040','#f08060'],
    'hanok':       ['#1e2830','#283440','#303e4c','#3c4c5c','#e0d8c8','#708090','#90a8c0','#d8a070','#90c8a0','#e07870','#90a8c0'],
    'retro':       ['#e8e0d0','#e0d8c8','#d8d0b8','#c8c0a0','#282018','#9a9080','#c87030','#3870b0','#5a9030','#c83020','#c87030'],
    'metal':       ['#1a1e22','#20262c','#283036','#303c42','#d8dce0','#6a7278','#90a8c0','#a8c0d8','#80c0a0','#e07060','#90a8c0'],
    'cyberspace':  ['#0a0e18','#0e1422','#14203a','#1c2c50','#a0c8f0','#304a78','#0090ff','#00f0ff','#00ff90','#ff3060','#0090ff'],
    'joker':       ['#1a1a1a','#222222','#2c2c2c','#383838','#f8d000','#888800','#f8d000','#008000','#f8d000','#ff0000','#f8d000'],
    'miami nights':['#0a1020','#0e1830','#141e40','#1a2858','#d0d8ff','#4050a0','#ff5fa2','#00d8ff','#7df9ff','#ff5fa2','#ff5fa2'],
    'aesther':     ['#f0ece8','#e8e4e0','#e0dbd5','#d0ccc6','#282420','#9a9490','#c07848','#688ab8','#68a878','#c84838','#c07848'],
    'terror below':['#0a1820','#102028','#162c38','#1e3848','#a8d8f0','#3870a0','#00a8e0','#f8a818','#40d8a0','#f82828','#00a8e0'],
    'anti hero':   ['#1c1c1c','#242424','#2c2c2c','#383838','#f0f0f0','#707070','#ff3333','#ff8833','#33ff88','#ff3333','#ff3333'],
    'aurora':      ['#0a1628','#0e1e38','#14284a','#1c3460','#a0c8f8','#3868b0','#5590e0','#a060e0','#60d8a0','#f06080','#5590e0'],
    'spiderman':   ['#0e1626','#141e34','#1a2840','#203050','#e0e8f8','#4a6898','#3a70d8','#e82020','#60d870','#f82020','#3a70d8'],
    'red dragon':  ['#1a0808','#240e10','#2e1418','#3a1c20','#f0d0d0','#a07070','#e84040','#f09040','#a0e040','#ff2020','#e84040'],
    'voc':         ['#1a2820','#20302a','#283c32','#30483c','#c8e0d0','#5a8070','#70b890','#e8c050','#80e0a0','#f07060','#70b890'],
    'dark magic girl':['#1a0e2a','#241438','#2e1c48','#3a2460','#f0d0e8','#8850b8','#c868e0','#e880b8','#70e8a8','#f06080','#c868e0'],
    'tron orange': ['#0a0e0e','#101616','#181e1e','#202828','#e8d0a0','#607068','#ff8c00','#ff6000','#ffa020','#ff3000','#ff8c00'],
    'midnight':    ['#0a0e1a','#0e1426','#141c38','#1c2648','#c8d0f0','#3a4880','#4860d8','#8048c8','#40c8a0','#e04860','#4860d8'],
    'mountain':    ['#1e2a38','#263040','#2e3a4c','#384858','#d0dce8','#5a7090','#80a8d0','#c8a068','#80c8a0','#e08070','#80a8d0'],
    'arch':        ['#1793d1','#0d7eb8','#1488c6','#2a9ed8','#ffffff','#80c8e8','#ffffff','#c0e8ff','#80ff80','#ff8080','#ffffff'],
    'incognito':   ['#1c1c1c','#242424','#2c2c2c','#383838','#e0e0e0','#707070','#b0b0b0','#808080','#a0a0a0','#ff6060','#b0b0b0'],
    'terra':       ['#292117','#352a1e','#413326','#503e30','#e8d8c0','#9a8060','#d87840','#8ab050','#e8b840','#e05030','#d87840'],
    'trance':      ['#1a0a30','#24103e','#30185a','#3c2070','#e8c8ff','#8050c0','#d060f8','#f060a0','#60f0c0','#f03070','#d060f8'],
    'iv spade':    ['#1a2a1a','#203020','#283c28','#304830','#c8e0c8','#588058','#60a860','#e8d050','#70d870','#f06060','#60a860'],
    'phantom':     ['#1a1a2a','#222238','#2c2c48','#383860','#d8d8f8','#6868b0','#a0a0e8','#e0a0e0','#a0e8c0','#e87880','#a0a0e8'],
    'jiku':        ['#0e0e16','#141420','#1c1c2c','#242438','#d0d0f0','#5858a8','#7878e0','#e07870','#78e0a0','#f07060','#7878e0'],
    'stealth':     ['#0c0c0c','#141414','#1c1c1c','#282828','#a0a0a0','#484848','#606060','#787878','#808080','#d04040','#606060'],
    'husqy':       ['#1a1028','#221538','#2c1c4a','#3a2560','#e8d0f8','#7048c0','#b868f0','#f07898','#78f0a8','#f04878','#b868f0'],
    'mxtrix':      ['#000000','#040804','#081008','#0c180c','#00ff41','#004010','#00ff41','#00cc33','#00ff41','#ff4444','#00ff41'],
    'shadow':      ['#0a0a0a','#121212','#1a1a1a','#242424','#c8c8c8','#484848','#888888','#666666','#a0a0a0','#ff5555','#888888'],
    'pulse':       ['#1a0a2e','#241040','#2e1858','#3c2270','#f0d0ff','#8858c8','#d060ff','#ff60c0','#60ffd0','#ff4080','#d060ff'],
    'floret':      ['#f8f0e8','#f0e8dc','#e8e0d0','#d8d0c0','#2c2418','#9a9080','#c89860','#a87848','#78b050','#e04830','#c89860'],
    'dev':         ['#0d1117','#161b22','#21262d','#30363d','#c9d1d9','#8b949e','#79c0ff','#ffa657','#56d364','#f85149','#79c0ff'],
    'material':    ['#263238','#1e2a30','#2c3a40','#37474f','#eceff1','#607d8b','#80cbc4','#ff5252','#80cbc4','#ff5252','#80cbc4'],
    'nautilus':    ['#1e2832','#263040','#2e3a4c','#384858','#d0dce8','#5a7090','#4898d8','#e8a850','#48d8a0','#e86858','#4898d8'],
    'noise':       ['#1a1a1a','#222222','#2a2a2a','#343434','#d8d8d8','#686868','#a0a0a0','#c0c0c0','#b0b0b0','#e87070','#a0a0a0'],
    'bento':       ['#1e2030','#252837','#2d3145','#3a3f58','#c8d0e8','#5060a0','#7888d8','#d878a0','#78d8a0','#f07880','#7888d8'],
    'bliss':       ['#e8f0f8','#dce8f4','#d0e0f0','#bcd0e8','#1a2a3a','#6090b8','#3878c8','#c04878','#38a878','#d83040','#3878c8'],
    'purplish':    ['#2a1040','#361858','#422268','#502e80','#e8d0f8','#9068c8','#c888f8','#f888c8','#88f8c8','#f86898','#c888f8'],
    'droving':     ['#1e2030','#252837','#2d3145','#3a3f58','#d8d0c0','#706858','#c09868','#e8a848','#a8c868','#e87858','#c09868'],
    'olivia':      ['#1c1820','#24202a','#2c2838','#382e46','#e8d8e8','#7868a8','#c888c8','#e8a8b8','#88c8a8','#e86888','#c888c8'],
    'iceberg dark':['#161821','#1e2132','#252a3e','#2e3550','#c6c8d1','#4a5278','#2d539e','#6b7089','#9a9ec5','#e98989','#2d539e'],
    'aiduin':      ['#1a1e28','#20263a','#262e48','#2e3858','#c8d0f0','#5060a8','#5888e0','#e07860','#58e0a0','#f06858','#5888e0'],
    'dots':        ['#1a1a2e','#22223a','#2a2a46','#343454','#d0d0f0','#6060b0','#8080f0','#f08080','#80f0a0','#f06060','#8080f0'],
    'everblush':   ['#181e2a','#1e2838','#263044','#2e3c54','#d8e0f0','#5870a8','#70a8e0','#e090b8','#70e0a8','#e07080','#70a8e0'],
    'ryujinscales':['#1a0a10','#241018','#2e1820','#3a2028','#f0c8d0','#a06070','#e84068','#f07040','#e8c040','#ff3050','#e84068'],
    'ez mode':     ['#1e2838','#263040','#2e3a4c','#384858','#d0dce8','#5a7090','#5aaced','#e8c058','#5ae8a8','#e85878','#5aaced'],
    'evil eye':    ['#1a0028','#220038','#2c0050','#380068','#e8c0ff','#8030c0','#c040ff','#ff4080','#40ffc0','#ff2060','#c040ff'],
    'mönthul':     ['#1e2838','#263040','#2e3a4c','#384858','#d8e0f0','#5878a8','#78a8e0','#e0a870','#78e0a8','#e07878','#78a8e0'],
    'swodon':      ['#1a2030','#20283a','#283048','#303c58','#d0d8f0','#5068a8','#6888e0','#e07868','#68e0a0','#f07068','#6888e0'],
    'passion fruit':['#2a0818','#380e22','#461630','#542040','#f8c0d8','#b06080','#f040a0','#ff6840','#40f0a0','#ff2060','#f040a0'],
    'red samurai': ['#1a0808','#240e10','#2e1418','#3a1c20','#f0d0d0','#a07070','#e84040','#f09040','#a0e040','#ff2020','#e84040'],
    'cy rod':      ['#0a1a0a','#102010','#182818','#203020','#c8e0c8','#508050','#60d060','#e0d040','#60e860','#e04040','#60d060'],
    'grand prix':  ['#1a1a2a','#222230','#2c2c3a','#383848','#e0e0f0','#7070b0','#b0b0f8','#f8d040','#80f880','#f85050','#b0b0f8'],
    'aim':         ['#0e1620','#14202c','#1c2c3c','#263848','#c8dce8','#4878a0','#5aa0d8','#e8a848','#58d8a8','#f05858','#5aa0d8'],
    'hedge':       ['#1a2818','#203020','#283a28','#304830','#c8e0c0','#587850','#70b860','#e8d048','#78e868','#f07060','#70b860'],
    'rotrocast':   ['#2a1010','#381818','#482020','#582c2c','#f0d0c8','#b07870','#e85040','#f09838','#e8b838','#ff3820','#e85040'],
    'pale nimbus': ['#eeeef8','#e4e4f0','#d8d8ec','#c8c8e0','#1a1a38','#6868a8','#5858c8','#c84858','#48a870','#d83048','#5858c8'],
    'matcha moccha':['#1e2818','#263020','#2e3c28','#384a30','#d8e8c8','#608058','#88c068','#d8a040','#88e068','#e87058','#88c068'],
    'fledgling':   ['#1a2838','#203040','#28384c','#304858','#d0dce8','#5878a8','#78aad8','#e8c878','#78d8a8','#e87878','#78aad8'],
    'onedark':     ['#282c34','#21252b','#2c3038','#3a3f48','#abb2bf','#5c6370','#61afef','#e06c75','#98c379','#e06c75','#61afef'],
    'copper':      ['#1a1408','#20180e','#2a2014','#34281c','#e8d8c0','#8a7858','#d89858','#c87040','#a0c858','#e06040','#d89858'],
    'grason':      ['#1a2818','#202e20','#283a28','#304830','#c8e0c8','#5a8058','#80c080','#e0c040','#80e088','#e06060','#80c080'],
    'cherry blossom':['#2a1828','#381e34','#462640','#54304e','#f8d0e8','#b060a0','#f878c8','#f8a0b8','#80f8c0','#ff5890','#f878c8'],
    'discord':     ['#36393f','#2f3136','#40444b','#4f545c','#dcddde','#72767d','#7289da','#f04747','#43b581','#f04747','#7289da'],
    'sarika dark': ['#1e2028','#262830','#2e303c','#383a48','#d0d4e8','#5860a0','#7888d8','#e8a858','#78d8a8','#e87858','#7888d8'],
    'repose dark': ['#2a2430','#32293a','#3a3044','#443858','#e8d8f0','#8068b0','#b090e0','#e8b8d0','#90e0b8','#f07888','#b090e0'],
    'blueberry dark':['#121c30','#182338','#1e2c44','#263854','#c0d0f0','#4060a8','#5880d0','#c04870','#50c890','#d84060','#5880d0'],
    'oblivion (2)':['#1a1e22','#20262c','#283036','#30393e','#d8dce0','#6a7278','#90a8c0','#f0a868','#a8c880','#f07878','#90a8c0'],
    'watermelon (2)':['#1a3020','#1e3826','#243e2c','#2c4c34','#c8f0d8','#4a9868','#50d888','#f07080','#60f8a0','#f06070','#50d888'],
    'carbon (2)':  ['#161616','#1c1c1c','#222222','#2a2a2a','#f4f4f4','#6f6f6f','#0062ff','#ff6161','#42be65','#fa4d56','#0062ff'],
    'tradeday':    ['#1a2030','#202838','#28304a','#30405a','#d0dce8','#5878b0','#60a8e8','#e8a860','#60d8a8','#e87060','#60a8e8'],
    'suisei':      ['#1a1a2e','#1e2240','#222850','#2a3060','#d0d8f8','#5060c0','#6878f0','#f068a0','#68f0b0','#f05878','#6878f0'],
    '8008':        ['#212121','#1a1a1a','#282828','#343434','#e8e8e8','#686868','#ff8000','#ff4040','#80ff80','#ff4040','#ff8000'],
    'metropolis':  ['#1e2430','#262c38','#2e3444','#38404e','#d0d8e8','#5868a0','#7890d8','#d8a870','#78d8a8','#e87878','#7890d8'],
  };

  let currentBgTheme = 'moon';

  function applyThemeVars(themeKey) {
    const t = THEMES[themeKey];
    if (!t) return;
    const root = document.documentElement;
    root.style.setProperty('--bg',      t[0]);
    root.style.setProperty('--surface', t[1]);
    root.style.setProperty('--surface2',t[2]);
    root.style.setProperty('--border',  t[3]);
    root.style.setProperty('--text',    t[4]);
    root.style.setProperty('--muted',   t[5]);
    root.style.setProperty('--accent',  t[6]);
    root.style.setProperty('--accent2', t[7]);
    root.style.setProperty('--correct', t[8]);
    root.style.setProperty('--wrong',   t[9]);
    root.style.setProperty('--cursor',  t[10]);
    var hex = t[6].replace('#','');
    var r = parseInt(hex.substring(0,2),16);
    var g = parseInt(hex.substring(2,4),16);
    var b = parseInt(hex.substring(4,6),16);
    root.style.setProperty('--glow', `rgba(${r},${g},${b},0.18)`);
  }

  applyThemeVars(currentBgTheme);

  window.setTheme = function(el) {
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
    var map = { 'theme-moon':'moon', 'theme-forest':'forest', 'theme-ember':'ember', 'theme-arctic':'arctic' };
    var key = map[el.dataset.theme] || 'moon';
    currentBgTheme = key;
    document.body.className = '';
    applyThemeVars(key);
    document.querySelectorAll('#bg-theme-selector .theme-card').forEach(c => c.classList.remove('active'));
    var card = document.querySelector(`#bg-theme-selector .theme-card[data-theme="${key}"]`);
    if (card) card.classList.add('active');
    try { localStorage.setItem('typeradar_bg_theme_v2', key); } catch(e) {}
    setTimeout(positionCursor, 50);
  };

  window.setBgTheme = function(key) {
    currentBgTheme = key;
    document.body.className = '';
    applyThemeVars(key);
    document.querySelectorAll('#bg-theme-selector .theme-card').forEach(c => c.classList.remove('active'));
    var card = document.querySelector(`#bg-theme-selector .theme-card[data-theme="${key}"]`);
    if (card) card.classList.add('active');
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
    var dotMap = { moon:'theme-moon', forest:'theme-forest', ember:'theme-ember', arctic:'theme-arctic' };
    if (dotMap[key]) {
      var dot = document.querySelector(`.theme-dot[data-theme="${dotMap[key]}"]`);
      if (dot) dot.classList.add('active');
    }
    try { localStorage.setItem('typeradar_bg_theme_v2', key); } catch(e) {}
    setTimeout(positionCursor, 50);
  };

  function buildBgThemeGrid() {
    var grid = document.getElementById('bg-theme-selector');
    if (!grid) return;
    var keys = Object.keys(THEMES);
    grid.innerHTML = keys.map(key => {
      const t = THEMES[key];
      var isActive = key === currentBgTheme ? ' active' : '';
      return `<div class="theme-card${isActive}" data-theme="${key}" onclick="setBgTheme('${key}')">
        <span class="btp-dot" style="background:${t[0]};border:2px solid ${t[6]};"></span>
        <span class="btp-accent" style="color:${t[6]}">${key}</span>
      </div>`;
    }).join('');
  }

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
      document.body.className = '';
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
      const savedBgTheme = localStorage.getItem('typeradar_bg_theme_v2');
      if (savedBgTheme && THEMES[savedBgTheme]) {
        currentBgTheme = savedBgTheme;
      } else {
        currentBgTheme = 'moon';
      }
      applyThemeVars(currentBgTheme);
      const savedFont = localStorage.getItem('typeradar_font');
      if (savedFont) {
        const fontObj = FONTS.find(f => f.name === savedFont);
        if (fontObj) { loadGoogleFont(fontObj); applyFont(savedFont); }
      }
    } catch(e) {
      applyThemeVars('moon');
    }
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
  // Uses offsetLeft/offsetTop traversal so padding/scroll changes don't affect it.
  // `ancestor` should be the element that has position:relative (words-display).
  function getOffsetRelativeTo(el, ancestor) {
    var left = 0, top = 0;
    var node = el;
    while (node && node !== ancestor) {
      left += node.offsetLeft;
      top  += node.offsetTop;
      node  = node.offsetParent;
    }
    return { left: left, top: top };
  }

  function positionCursor() {
    var cursor  = document.getElementById('cursor');
    var display = document.getElementById('words-display');
    var inner   = document.getElementById('words-inner');
    var wordEl  = document.getElementById('word-' + currentWordIndex);
    if (!wordEl || !display || !cursor || !inner) return;

    updateLineH();

    var letters = mode === 'zen'
      ? wordEl.querySelectorAll('.zen-letter')
      : wordEl.querySelectorAll('.letter');

    // inner's current top offset (negative when scrolled)
    var innerTopPx = parseInt(inner.style.top || '0', 10);

    var left, top;

    if (currentInput.length === 0) {
      if (mode === 'zen') {
        if (letters.length > 0) {
          var zl  = letters[letters.length - 1];
          var zlO = getOffsetRelativeTo(zl, display);
          left = zlO.left + zl.offsetWidth;
          top  = zlO.top  + innerTopPx;
        } else if (currentWordIndex > 0) {
          var prevW = document.getElementById('word-' + (currentWordIndex - 1));
          if (prevW) {
            var pletters = prevW.querySelectorAll('.zen-letter');
            if (pletters.length > 0) {
              var pl  = pletters[pletters.length - 1];
              var plO = getOffsetRelativeTo(pl, display);
              left = plO.left + pl.offsetWidth + 10;
              top  = plO.top  + innerTopPx;
            } else {
              var wO2 = getOffsetRelativeTo(wordEl, display);
              left = wO2.left; top = wO2.top + innerTopPx;
            }
          } else {
            left = 0; top = innerTopPx;
          }
        } else {
          left = 0; top = innerTopPx;
        }
      } else {
        var wO = getOffsetRelativeTo(wordEl, display);
        left = wO.left;
        top  = wO.top + innerTopPx;
      }
    } else {
      if (letters.length > 0) {
        var idx = Math.min(currentInput.length - 1, letters.length - 1);
        var lO  = getOffsetRelativeTo(letters[idx], display);
        left = lO.left + letters[idx].offsetWidth;
        top  = lO.top  + innerTopPx;
      } else {
        var wOb = getOffsetRelativeTo(wordEl, display);
        left = wOb.left;
        top  = wOb.top + innerTopPx;
      }
    }

    cursor.style.left = left + 'px';
    cursor.style.top  = top  + 'px';

    // Scroll down one line when cursor reaches 3rd line
    if (lineH2 > 0 && top >= lineH2 * 2.1) {
      inner.style.top  = (innerTopPx - lineH2) + 'px';
      cursor.style.top = (top - lineH2) + 'px';
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
    lastKeyTime = 0;

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

    if (key === 'Backspace') {
      if (useConfidence) return true;

      if (mode === 'zen') {
        if (currentInput.length > 0) {
          var wordEl = document.getElementById('word-' + currentWordIndex);
          if (wordEl && wordEl.lastChild) wordEl.removeChild(wordEl.lastChild);
          currentInput = currentInput.slice(0, -1);
          positionCursor();
        } else if (currentWordIndex > 0) {
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

    if (key.length === 1) {
      if (mode === 'zen') {
        var wordEl2 = document.getElementById('word-' + currentWordIndex);
        if (!wordEl2) return true;
        var letter = document.createElement('span');
        letter.className = 'letter zen-letter';
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
    buildBgThemeGrid();
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

  // ─── MAIN KEYDOWN — handles ALL key routing including Backspace/Space ─────────
  document.addEventListener('keydown', function(e) {
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
        if (isTouchDev) {
          if (started) endTest();
          else if (currentInput.length > 0) { startTimer(); endTest(); }
        } else if (e.shiftKey) {
          if (started) endTest();
        }
        return;
      }
    }

    var ignored = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
      'PageUp','PageDown','Shift','Control','Alt','Meta','CapsLock','Insert','Delete',
      'Enter','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
    if (ignored.includes(key)) return;

    // For Backspace and Space: process here and prevent hiddenInput from also firing
    if (key === 'Backspace' || key === ' ') {
      e.preventDefault();
      if (!finished) {
        lastKeyTime = Date.now();
        processKey(key);
      }
      return;
    }

    // For printable characters: let the hidden input's `input` event handle it
    // (we preventDefault to stop double-fire on desktop)
    e.preventDefault();
    if (!finished) processKey(key);
  });

  // ─── HIDDEN INPUT ─────────────────────────────────────────────────────────────
  // `input` event fires on mobile when the OS keyboard inserts/deletes a character.
  // On desktop this fires too, but timestamp check prevents double-processing.
  // We intentionally do NOT add a separate `keydown` on hiddenInput —
  // that caused double-fire because document keydown already handled it.
  hiddenInput.addEventListener('input', function(e) {
    if (finished) return;
    // If a document keydown just fired within 30ms, skip (desktop dedup)
    if (Date.now() - lastKeyTime < 30) return;

    // inputType tells us what happened (works on modern mobile Chrome/Safari)
    var itype = e.inputType || '';

    if (itype === 'deleteContentBackward' || itype === 'deleteWordBackward') {
      this.value = '';
      lastKeyTime = Date.now();
      processKey('Backspace');
      return;
    }

    var val = this.value;
    if (!val || val.length === 0) return;
    var lastChar = val[val.length - 1];
    this.value = '';
    lastKeyTime = Date.now();

    if (lastChar === ' ') {
      processKey(' ');
    } else {
      processKey(lastChar);
    }
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
