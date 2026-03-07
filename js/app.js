(function () {
'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   SUPABASE CONFIG
═══════════════════════════════════════════════════════════════════════ */
const SUPABASE_URL  = 'https://diqzysrdzzdinjjydtsk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpcXp5c3JkenpkaW5qanlkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjkwNTEsImV4cCI6MjA4ODMwNTA1MX0.t-uJmkQtEwJwuq7SWWCQGp3NbjrI3VJF1f-Qh8nLV9g';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    storageKey: "typeradar_auth",
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════════════ */
let words = [], currentWordIndex = 0, currentInput = '';
let totalCorrectChars = 0, totalWrongChars = 0;
let correctWords = 0, wrongWords = 0, totalErrors = 0;
let started = false, finished = false;
let timerInterval = null, timeLeft = 30, totalTime = 30;
let mode = 'time', isZen = false;
let wpmHistory = [], rawHistory = [], errHistory = [], wpmTick = 0, wordHistory = [];
let uiLang = 'en', colorTheme = 'classic', customText = 'The five boxing wizards jump quickly.';
let usePunct = false, useNumbers = false, useBlind = false, useConfidence = false;
let quoteLen = 'all', soundEffect = 'off', currentFont = 'JetBrains Mono';
let caretStyle = 'line';
let currentBgTheme = 'moon';
let currentUser = null, currentProfile = null;
let isDailyMode = false;
let lastKeyTime = 0;
var audioCtx = null, lineH2 = 0;

const hiddenInput = document.getElementById('hidden-input');
const typingContainer = document.getElementById('typing-container');

/* ═══════════════════════════════════════════════════════════════════════
   FONTS
═══════════════════════════════════════════════════════════════════════ */
const FONTS = [
  {name:'JetBrains Mono',import:'JetBrains+Mono:wght@300;400;500'},
  {name:'Fira Code',import:'Fira+Code'},{name:'Source Code Pro',import:'Source+Code+Pro'},
  {name:'Roboto Mono',import:'Roboto+Mono:wght@300;400'},{name:'IBM Plex Mono',import:'IBM+Plex+Mono'},
  {name:'Inconsolata',import:'Inconsolata'},{name:'Ubuntu Mono',import:'Ubuntu+Mono'},
  {name:'Overpass Mono',import:'Overpass+Mono'},{name:'Courier Prime',import:'Courier+Prime'},
  {name:'Sora',import:'Sora:wght@300;400'},{name:'Montserrat',import:'Montserrat:wght@300;400'},
  {name:'Nunito',import:'Nunito:wght@300;400'},{name:'Lato',import:'Lato:wght@300;400'},
  {name:'Comfortaa',import:'Comfortaa'},{name:'Kanit',import:'Kanit:wght@300;400'},
  {name:'Lexend Deca',import:'Lexend+Deca'},{name:'Itim',import:'Itim'},
  {name:'IBM Plex Sans',import:'IBM+Plex+Sans'},{name:'Roboto',import:'Roboto:wght@300;400'},
  {name:'Georgia',import:null},{name:'Helvetica',import:null},
];
const loadedFonts = new Set(['JetBrains Mono','Sora','Georgia','Helvetica']);

function loadGoogleFont(f){
  if(!f.import||loadedFonts.has(f.name))return;
  loadedFonts.add(f.name);
  const l=document.createElement('link');l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family='+f.import+'&display=swap';
  document.head.appendChild(l);
}
function applyFont(name){
  currentFont=name;
  const d=document.getElementById('words-display');
  if(d)d.style.fontFamily="'"+name+"',monospace";
  setTimeout(updateLineH,120);
  try{localStorage.setItem('typeradar_font',name);}catch(e){}
}

window.selectFont=function(name){
  const f=FONTS.find(function(x){return x.name===name;});
  if(f)loadGoogleFont(f);
  applyFont(name);
  document.querySelectorAll('.font-card').forEach(function(c){c.classList.remove('active');});
  document.querySelectorAll('.font-card').forEach(function(c){
    if(c.getAttribute('data-font')===name) c.classList.add('active');
  });
  setTimeout(positionCursor,200);
};

function buildFontGrid(){
  var g=document.getElementById('font-grid');if(!g)return;
  g.innerHTML='';
  FONTS.forEach(function(f){
    var div=document.createElement('div');
    div.className='font-card'+(f.name===currentFont?' active':'');
    div.setAttribute('data-font',f.name);
    div.style.fontFamily="'"+f.name+"',monospace";
    div.textContent=f.name;
    div.addEventListener('click',function(){window.selectFont(f.name);});
    g.appendChild(div);
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   CARET STYLE
═══════════════════════════════════════════════════════════════════════ */
window.setCaretStyle=function(style,el){
  caretStyle=style;
  document.querySelectorAll('.caret-btn').forEach(function(b){b.classList.remove('active');});
  if(el)el.classList.add('active');
  var cursor=document.getElementById('cursor');
  if(cursor){
    cursor.classList.remove('caret-line','caret-block','caret-underline');
    cursor.classList.add('caret-'+style);
  }
  try{localStorage.setItem('typeradar_caret',style);}catch(e){}
  positionCursor();
};

/* ═══════════════════════════════════════════════════════════════════════
   THEMES
═══════════════════════════════════════════════════════════════════════ */
var THEMES = {
  'moon':        ['#0d0d0f','#141417','#1c1c21','#2a2a32','#e8e8f0','#555566','#7c6af7','#f7c26a','#6af7b2','#f76a8a','#7c6af7'],
  'forest':      ['#0c110e','#131a15','#1a241d','#243028','#d4e8d8','#4a6152','#5ebb7a','#b5e87d','#7de8b5','#e87d7d','#5ebb7a'],
  'ember':       ['#0f0c0a','#181310','#221a16','#342520','#f0ddd4','#6b4c40','#f77b4a','#f7c26a','#f7c26a','#f75a6a','#f77b4a'],
  'arctic':      ['#f5f7fb','#eef1f7','#e4e8f2','#d0d5e8','#1a1d2e','#9099bb','#4a6cf7','#f7884a','#2ab87a','#e83d5a','#4a6cf7'],
  'dark':        ['#323437','#2c2e31','#3a3c40','#4a4c50','#d1d0c5','#646669','#e2b714','#ca4754','#e2b714','#ca4754','#e2b714'],
  'nord':        ['#2e3440','#3b4252','#434c5e','#4c566a','#eceff4','#8892a0','#88c0d0','#81a1c1','#a3be8c','#bf616a','#88c0d0'],
  'catppuccin':  ['#1e1e2e','#181825','#313244','#45475a','#cdd6f4','#6c7086','#cba6f7','#f38ba8','#a6e3a1','#f38ba8','#cba6f7'],
  'dracula':     ['#282a36','#1e1f29','#343746','#44475a','#f8f8f2','#6272a4','#bd93f9','#ff79c6','#50fa7b','#ff5555','#bd93f9'],
  'gruvbox dark':['#282828','#1d2021','#3c3836','#504945','#ebdbb2','#928374','#d79921','#fb4934','#b8bb26','#fb4934','#d79921'],
  'monokai':     ['#272822','#1e1f1c','#2f3120','#3e4034','#f8f8f2','#75715e','#a6e22e','#f92672','#a6e22e','#f92672','#a6e22e'],
  'rose pine':   ['#191724','#1f1d2e','#26233a','#403d52','#e0def4','#6e6a86','#ebbcba','#eb6f92','#9ccfd8','#eb6f92','#ebbcba'],
  'solarized dark':['#002b36','#073642','#0d3d4a','#1a5060','#839496','#586e75','#268bd2','#cb4b16','#859900','#dc322f','#268bd2'],
  'onedark':     ['#282c34','#21252b','#2c3038','#3a3f48','#abb2bf','#5c6370','#61afef','#e06c75','#98c379','#e06c75','#61afef'],
  'github':      ['#0d1117','#161b22','#21262d','#30363d','#c9d1d9','#8b949e','#58a6ff','#f78166','#56d364','#f85149','#58a6ff'],
  'vscode':      ['#1e1e1e','#252526','#2d2d30','#3e3e42','#d4d4d4','#808080','#569cd6','#ce9178','#4ec9b0','#f44747','#569cd6'],
  'terminal':    ['#0a0e0a','#0f1a0f','#182818','#203020','#00ff41','#1a4a1a','#00ff41','#00cc33','#00ff41','#ff4444','#00ff41'],
  'midnight':    ['#0a0e1a','#0e1426','#141c38','#1c2648','#c8d0f0','#3a4880','#4860d8','#8048c8','#40c8a0','#e04860','#4860d8'],
  'sunset':      ['#2a1a0e','#382516','#483020','#583c2a','#f0d8c0','#9a7060','#f0a050','#e87040','#f0c850','#e05030','#f0a050'],
  'ocean':       ['#06111e','#091826','#0c2030','#102840','#80d8ff','#2060a0','#00bcd4','#80d8ff','#00e5ff','#ff5252','#00bcd4'],
  'copper':      ['#1a1408','#20180e','#2a2014','#34281c','#e8d8c0','#8a7858','#d89858','#c87040','#a0c858','#e06040','#d89858'],
};

function applyThemeVars(key){
  var t=THEMES[key];if(!t)return;
  var r=document.documentElement;
  r.style.setProperty('--bg',t[0]);r.style.setProperty('--surface',t[1]);r.style.setProperty('--surface2',t[2]);
  r.style.setProperty('--border',t[3]);r.style.setProperty('--text',t[4]);r.style.setProperty('--muted',t[5]);
  r.style.setProperty('--accent',t[6]);r.style.setProperty('--accent2',t[7]);r.style.setProperty('--correct',t[8]);
  r.style.setProperty('--wrong',t[9]);r.style.setProperty('--cursor',t[10]);
  var hex=t[6].replace('#','');
  var rv=parseInt(hex.substring(0,2),16),gv=parseInt(hex.substring(2,4),16),bv=parseInt(hex.substring(4,6),16);
  r.style.setProperty('--glow','rgba('+rv+','+gv+','+bv+',0.18)');
}
applyThemeVars(currentBgTheme);

window.setBgTheme=function(key){
  currentBgTheme=key; document.body.className=''; applyThemeVars(key);
  document.querySelectorAll('#bg-theme-selector .theme-card').forEach(function(c){c.classList.remove('active');});
  document.querySelectorAll('#bg-theme-selector .theme-card').forEach(function(c){
    if(c.getAttribute('data-theme')===key) c.classList.add('active');
  });
  try{localStorage.setItem('typeradar_bg_theme_v2',key);}catch(e){}
  setTimeout(positionCursor,50);
};

function buildBgThemeGrid(){
  var g=document.getElementById('bg-theme-selector');if(!g)return;
  g.innerHTML='';
  Object.keys(THEMES).forEach(function(key){
    var t=THEMES[key];
    var div=document.createElement('div');
    div.className='theme-card'+(key===currentBgTheme?' active':'');
    div.setAttribute('data-theme',key);
    div.innerHTML='<span class="btp-dot" style="background:'+t[0]+';border:2px solid '+t[6]+';"></span><span class="btp-accent" style="color:'+t[6]+'">'+key+'</span>';
    div.addEventListener('click',function(){window.setBgTheme(key);});
    g.appendChild(div);
  });
}

window.setColorTheme=function(theme){
  colorTheme=theme;
  document.querySelectorAll('#color-theme-selector .theme-card').forEach(function(c){c.classList.remove('active');});
  document.querySelectorAll('#color-theme-selector .theme-card').forEach(function(c){
    if(c.getAttribute('data-theme')===theme) c.classList.add('active');
  });
  try{localStorage.setItem('typeradar_color_theme',theme);}catch(e){}
  colorLetters();
};

/* ═══════════════════════════════════════════════════════════════════════
   LANG
═══════════════════════════════════════════════════════════════════════ */
var LANGS=[
  {code:'en',name:'english'},{code:'tr',name:'türkçe'},{code:'az',name:'azərbaycan'},
  {code:'es',name:'español'},{code:'de',name:'deutsch'},{code:'fr',name:'français'},
  {code:'it',name:'italiano'},{code:'pt',name:'português'},{code:'ru',name:'русский'},
  {code:'ja',name:'日本語'},{code:'ko',name:'한국어'},{code:'zh',name:'中文'},
  {code:'ar',name:'العربية'},{code:'hi',name:'हिन्दी'},{code:'nl',name:'nederlands'},
  {code:'pl',name:'polski'},{code:'sv',name:'svenska'},{code:'fi',name:'suomi'},
  {code:'cs',name:'čeština'},{code:'ro',name:'română'},{code:'el',name:'ελληνικά'},
  {code:'id',name:'indonesia'},{code:'vi',name:'tiếng việt'},{code:'uk',name:'українська'},
];

function buildLangList(filter){
  var list=document.getElementById('lang-list');if(!list)return;
  var items=filter?LANGS.filter(function(l){return l.name.toLowerCase().includes(filter.toLowerCase())||l.code.includes(filter);}):LANGS;
  list.innerHTML='';
  items.forEach(function(l){
    var div=document.createElement('div');
    div.className='lang-item'+(l.code===uiLang?' active':'');
    div.innerHTML='<span class="lang-check">✓</span><span>'+l.name+'</span>';
    div.addEventListener('click',function(){window.pickLang(l.code,l.name);});
    list.appendChild(div);
  });
}

window.toggleLangDropdown=function(){
  var dd=document.getElementById('lang-dropdown');if(!dd)return;
  if(dd.classList.contains('open')){dd.classList.remove('open');}
  else{dd.classList.add('open');buildLangList('');setTimeout(function(){var s=document.getElementById('lang-search');if(s)s.focus();},50);}
};
window.filterLangs=function(v){buildLangList(v);};
window.pickLang=function(code,name){
  uiLang=code;
  var ind=document.getElementById('lang-indicator-text');if(ind)ind.textContent=name;
  var dd=document.getElementById('lang-dropdown');if(dd)dd.classList.remove('open');
  var s=document.getElementById('lang-search');if(s)s.value='';
  restart();
};
document.addEventListener('click',function(e){
  var wrap=document.getElementById('lang-dropdown-wrap');
  if(wrap&&!wrap.contains(e.target)){var dd=document.getElementById('lang-dropdown');if(dd)dd.classList.remove('open');}
});

/* ═══════════════════════════════════════════════════════════════════════
   MODE
═══════════════════════════════════════════════════════════════════════ */
function showGroup(id,show){var el=document.getElementById(id);if(el)el.classList.toggle('visible',show);}
window.setMode=function(m,id){
  mode=m; isZen=(m==='zen');
  document.querySelectorAll('#mode-group .config-btn').forEach(function(b){b.classList.remove('active');});
  var el=document.getElementById(id);if(el)el.classList.add('active');
  var hasTimer=(m==='time'||m==='words');
  var hasPunct=(m==='time'||m==='words'||m==='custom');
  showGroup('time-group',hasTimer);showGroup('time-sep',hasTimer);
  showGroup('extra-group',hasPunct);showGroup('extra-sep',hasPunct);
  showGroup('quote-group',m==='quote');showGroup('quote-sep',m==='quote');
  restart();
};
(function(){showGroup('time-group',true);showGroup('time-sep',true);showGroup('extra-group',true);showGroup('extra-sep',true);})();
window.setQuoteLen=function(len,id){
  quoteLen=len;
  document.querySelectorAll('#quote-group .config-btn').forEach(function(b){b.classList.remove('active');});
  var el=document.getElementById(id);if(el)el.classList.add('active');
  restart();
};
window.setTime=function(t,id){
  totalTime=t;timeLeft=t;
  document.querySelectorAll('#time-group .config-btn').forEach(function(b){b.classList.remove('active');});
  var el=document.getElementById(id);if(el)el.classList.add('active');
  var td=document.getElementById('timer-display');
  if(td)td.textContent=mode==='time'?t:'0';
  restart();
};
window.toggleSpecialMode=function(el,smode){
  var isActive=el.classList.contains('active');
  if(smode==='blind'){useBlind=!isActive;el.classList.toggle('active',useBlind);}
  else if(smode==='confidence'){useConfidence=!isActive;el.classList.toggle('active',useConfidence);}
};
window.togglePunct=function(el){usePunct=!usePunct;el.classList.toggle('active',usePunct);restart();};
window.toggleNumbers=function(el){useNumbers=!useNumbers;el.classList.toggle('active',useNumbers);restart();};

/* ═══════════════════════════════════════════════════════════════════════
   SOUND
═══════════════════════════════════════════════════════════════════════ */
function getAudioCtx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
function playSound(type){
  if(type==='off')return;
  try{
    var ctx=getAudioCtx(),now=ctx.currentTime;
    var osc,gain,buf,src;
    if(type==='click'){
      buf=ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
      var d=buf.getChannelData(0);
      for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.008));
      src=ctx.createBufferSource();src.buffer=buf;
      var f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=1000;
      src.connect(f);f.connect(ctx.destination);src.start();
    }else if(type==='pop'){
      osc=ctx.createOscillator();gain=ctx.createGain();
      osc.frequency.setValueAtTime(800,now);osc.frequency.exponentialRampToValueAtTime(200,now+0.06);
      gain.gain.setValueAtTime(0.4,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.06);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+0.06);
    }else if(type==='beep'){
      osc=ctx.createOscillator();gain=ctx.createGain();
      osc.frequency.value=880;osc.type='sine';
      gain.gain.setValueAtTime(0.15,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.08);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+0.08);
    }else if(type==='typewriter'){
      buf=ctx.createBuffer(1,ctx.sampleRate*0.03,ctx.sampleRate);
      var td2=buf.getChannelData(0);
      for(var j=0;j<td2.length;j++)td2[j]=(Math.random()*2-1)*Math.exp(-j/(ctx.sampleRate*0.005));
      src=ctx.createBufferSource();src.buffer=buf;
      var tf=ctx.createBiquadFilter();tf.type='bandpass';tf.frequency.value=3000;tf.Q.value=0.5;
      src.connect(tf);tf.connect(ctx.destination);src.start();
    }else if(type==='pentatonic'){
      var notes=[261.63,293.66,329.63,392.00,440.00,523.25];
      osc=ctx.createOscillator();gain=ctx.createGain();
      osc.frequency.value=notes[Math.floor(Math.random()*notes.length)];osc.type='triangle';
      gain.gain.setValueAtTime(0.2,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.12);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+0.12);
    }else{
      osc=ctx.createOscillator();gain=ctx.createGain();
      osc.type=type;osc.frequency.value=600;
      gain.gain.setValueAtTime(0.1,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.07);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+0.07);
    }
  }catch(e){}
}
window.setSound=function(type,el){
  soundEffect=type;
  document.querySelectorAll('.sound-btn').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  if(type!=='off')playSound(type);
};

/* ═══════════════════════════════════════════════════════════════════════
   WORD GENERATION
═══════════════════════════════════════════════════════════════════════ */
var PUNCTS=[',','.','!','?',';',':'];
function generateWords(seedWords){
  if(seedWords)return seedWords;
  if(mode==='quote'){
    if(typeof QUOTES==='undefined'||!QUOTES||!QUOTES.length){return ['quotes','not','loaded','yet'];}
    var pool=QUOTES;
    if(quoteLen==='short')pool=QUOTES.filter(function(q){return q.split(' ').length<=8;});
    if(quoteLen==='medium')pool=QUOTES.filter(function(q){var n=q.split(' ').length;return n>8&&n<=15;});
    if(quoteLen==='long')pool=QUOTES.filter(function(q){var n=q.split(' ').length;return n>15&&n<=25;});
    if(quoteLen==='thicc')pool=QUOTES.filter(function(q){return q.split(' ').length>25;});
    if(!pool||!pool.length)pool=QUOTES;
    return pool[Math.floor(Math.random()*pool.length)].split(' ');
  }
  if(mode==='custom')return customText.trim().split(/\s+/);
  if(mode==='zen')return[];
  if(typeof WORDS==='undefined'||!WORDS){return ['words','not','loaded','yet'];}
  var list=WORDS[uiLang]||WORDS.en||['the','quick','brown','fox','jumps'];
  var count=mode==='words'?30:50;
  return Array.from({length:count},function(){
    var w=list[Math.floor(Math.random()*list.length)];
    if(usePunct&&Math.random()<0.2)w+=PUNCTS[Math.floor(Math.random()*PUNCTS.length)];
    if(useNumbers&&Math.random()<0.15){
      w=String(Math.floor(Math.random()*999)+1);
      if(usePunct&&Math.random()<0.2)w+=PUNCTS[Math.floor(Math.random()*PUNCTS.length)];
    }
    return w;
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   DISPLAY BUILD
═══════════════════════════════════════════════════════════════════════ */
function buildDisplay(seedWords){
  words=generateWords(seedWords);
  var inner=document.getElementById('words-inner');
  if(!inner)return;
  inner.style.top='0px';inner.innerHTML='';

  if(mode==='zen'){
    var ew=document.createElement('span');ew.className='word';ew.id='word-0';inner.appendChild(ew);
    currentWordIndex=0;
  }else{
    words.forEach(function(word,wi){
      var we=document.createElement('span');we.className='word';we.id='word-'+wi;
      word.split('').forEach(function(ch,ci){
        var le=document.createElement('span');le.className='letter';le.id='l-'+wi+'-'+ci;le.textContent=ch;we.appendChild(le);
      });
      inner.appendChild(we);
    });
  }

  var cursor=document.createElement('div');
  cursor.className='cursor-line caret-'+caretStyle;
  cursor.id='cursor';inner.appendChild(cursor);

  highlightWord(0);
  updateLineH();
  updateWordProgress();
}

function updateLineH(){
  var d=document.getElementById('words-display');if(!d)return;
  var lh=parseFloat(getComputedStyle(d).lineHeight);
  var fs=parseFloat(getComputedStyle(d).fontSize);
  lineH2=isNaN(lh)?fs*2.4:lh;
}

function highlightWord(idx){
  document.querySelectorAll('.word').forEach(function(w){w.classList.remove('active-word');});
  var w=document.getElementById('word-'+idx);if(w)w.classList.add('active-word');
}

function positionCursor(){
  var cursor=document.getElementById('cursor');
  var inner=document.getElementById('words-inner');
  var wordEl=document.getElementById('word-'+currentWordIndex);
  if(!wordEl||!inner||!cursor)return;

  updateLineH();
  var display=document.getElementById('words-display');
  var fontSize=display?parseFloat(getComputedStyle(display).fontSize):lineH2/2.4;
  var isUnderline=(caretStyle==='underline');
  var vOffset=isUnderline?(lineH2-fontSize*0.1)/2:(lineH2-fontSize*1.1)/2;

  var letters=mode==='zen'?wordEl.querySelectorAll('.zen-letter'):wordEl.querySelectorAll('.letter');
  var left,top;

  if(currentInput.length===0){
    if(mode==='zen'){
      if(letters.length>0){
        var zl=letters[letters.length-1];
        left=wordEl.offsetLeft+zl.offsetLeft+zl.offsetWidth;top=wordEl.offsetTop+zl.offsetTop;
      }else if(currentWordIndex>0){
        var pw=document.getElementById('word-'+(currentWordIndex-1));
        if(pw){
          var pls=pw.querySelectorAll('.zen-letter');
          if(pls.length>0){
            var pl=pls[pls.length-1];
            left=pw.offsetLeft+pl.offsetLeft+pl.offsetWidth+8;top=pw.offsetTop+pl.offsetTop;
          }else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}
        }else{left=0;top=0;}
      }else{left=0;top=0;}
    }else{
      if(letters.length>0){var fl=letters[0];left=wordEl.offsetLeft+fl.offsetLeft;top=wordEl.offsetTop+fl.offsetTop;}
      else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}
    }
  }else{
    if(letters.length>0){
      var idx2=Math.min(currentInput.length-1,letters.length-1);
      var lt=letters[idx2];
      left=wordEl.offsetLeft+lt.offsetLeft+lt.offsetWidth;top=wordEl.offsetTop+lt.offsetTop;
    }else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}
  }

  cursor.style.left=left+'px';
  cursor.style.top=(top+vOffset)+'px';

  if(lineH2>0&&top>=lineH2*2.1){
    var currentTop=parseInt(inner.style.top||'0',10);
    inner.style.top=(currentTop-lineH2)+'px';
    cursor.style.top=(top-lineH2+vOffset)+'px';
  }
}

function resetCursorBlink(){
  var cursor=document.getElementById('cursor');if(!cursor)return;
  cursor.style.animation='none';cursor.style.opacity='1';
  void cursor.offsetWidth;
  cursor.style.animation='cursorBlink 1s ease-in-out infinite';
}

/* ═══════════════════════════════════════════════════════════════════════
   LETTER COLORING
═══════════════════════════════════════════════════════════════════════ */
var THEME_CLASSES=['theme-classic','theme-rgb','theme-matrix','theme-neon','theme-fire','theme-ocean','theme-purple','theme-rose','theme-mint','theme-gold'];
function animateLetter(li,type){
  var we=document.getElementById('word-'+currentWordIndex);if(!we)return;
  var letters=we.querySelectorAll('.letter');
  if(li>=0&&li<letters.length){
    var l=letters[li];
    var removeClasses=['correct','wrong','deleting'].concat(THEME_CLASSES);
    removeClasses.forEach(function(cls){l.classList.remove(cls);});
    if(type==='add'){
      var isCorrect=currentInput[li]===words[currentWordIndex][li];
      l.classList.add(isCorrect?'correct':'wrong');
      l.classList.add('theme-'+colorTheme);
    }else if(type==='delete'){
      l.classList.add('deleting');
      setTimeout(function(){
        ['deleting','correct','wrong'].concat(THEME_CLASSES).forEach(function(cls){l.classList.remove(cls);});
      },100);
    }
  }
}
function colorLetters(){
  var we=document.getElementById('word-'+currentWordIndex);if(!we)return;
  var letters=we.querySelectorAll('.letter');
  var ws=words[currentWordIndex]||'';
  letters.forEach(function(l){
    ['correct','wrong'].concat(THEME_CLASSES).forEach(function(cls){l.classList.remove(cls);});
  });
  for(var i=0;i<currentInput.length&&i<ws.length;i++){
    letters[i].classList.add(currentInput[i]===ws[i]?'correct':'wrong');
    letters[i].classList.add('theme-'+colorTheme);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════════════════════ */
function applyStatsLayout(){
  var sw=document.getElementById('stat-wpm'),sa=document.getElementById('stat-acc');
  var ts=document.getElementById('timer-stat'),sp=document.getElementById('stat-progress');
  var se=document.getElementById('stat-err');
  if(mode==='time'){
    if(sw)sw.style.display='none';if(sa)sa.style.display='none';
    if(ts)ts.style.display='block';if(sp)sp.style.display='none';if(se)se.style.display='none';
  }else if(mode==='zen'){
    if(sw)sw.style.display='none';if(sa)sa.style.display='none';
    if(ts)ts.style.display='none';if(sp)sp.style.display='block';if(se)se.style.display='none';
  }else{
    if(sw)sw.style.display='none';if(sa)sa.style.display='none';
    if(ts)ts.style.display='none';if(sp)sp.style.display='block';if(se)se.style.display='none';
  }
}
function updateWordProgress(){var el=document.getElementById('live-progress');if(el)el.textContent=currentWordIndex+'/'+words.length;}
function updateLiveStats(){
  var elapsed=mode==='time'?(totalTime-timeLeft):wpmTick;
  var wpm=elapsed>0?Math.round((correctWords/elapsed)*60):0;
  var total=totalCorrectChars+totalWrongChars;
  var acc=total>0?Math.round((totalCorrectChars/total)*100):100;
  var wpmEl=document.getElementById('live-wpm');if(wpmEl)wpmEl.textContent=wpm;
  var accEl=document.getElementById('live-acc');if(accEl)accEl.textContent=acc+'%';
  if(mode==='zen'){var el=document.getElementById('live-progress');if(el)el.textContent=correctWords;}
  else updateWordProgress();
  if(started&&!finished&&elapsed>0)wpmHistory.push(wpm);
}

/* ═══════════════════════════════════════════════════════════════════════
   TIMER
═══════════════════════════════════════════════════════════════════════ */
function startTimer(){
  if(started)return;started=true;
  applyStatsLayout();
  if(useBlind)typingContainer.classList.add('blind-mode');
  var ls=document.getElementById('live-stats');if(ls)ls.classList.add('visible');
  var ch=document.getElementById('click-hint');if(ch)ch.style.opacity='0.3';
  wpmTick=0;wpmHistory=[];rawHistory=[];errHistory=[];
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=setInterval(function(){
    if(finished)return;
    if(mode==='time'){
      timeLeft--;
      var td=document.getElementById('timer-display');
      if(td){
        td.textContent=timeLeft;
        if(timeLeft<=5)td.classList.add('warning');
      }
      if(timeLeft<=0){endTest();return;}
    }else{
      wpmTick++;
      var td2=document.getElementById('timer-display');
      if(td2)td2.textContent=wpmTick;
    }
    var totalTyped=totalCorrectChars+totalWrongChars;
    var elapsed=mode==='time'?(totalTime-timeLeft):wpmTick;
    var raw=elapsed>0?Math.round((totalTyped/5)/(elapsed/60)):0;
    rawHistory.push(raw);
    errHistory.push(totalErrors);
    updateLiveStats();
  },1000);
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSISTENCY
═══════════════════════════════════════════════════════════════════════ */
function calcConsistency(arr){
  if(!arr||arr.length<2)return 100;
  var mean=arr.reduce(function(a,b){return a+b;},0)/arr.length;
  var variance=arr.reduce(function(s,v){return s+Math.pow(v-mean,2);},0)/arr.length;
  var std=Math.sqrt(variance);
  var cv=mean>0?(std/mean)*100:0;
  return Math.max(0,Math.round(100-cv));
}

/* ═══════════════════════════════════════════════════════════════════════
   CONFETTI
═══════════════════════════════════════════════════════════════════════ */
function launchConfetti(){
  var canvas=document.getElementById('confetti-canvas');
  if(!canvas)return;
  canvas.style.display='block';
  var ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  var pieces=[];
  var colors=['#7c6af7','#f7c26a','#6af7b2','#f76a8a','#60d0ff','#ff80ab'];
  for(var i=0;i<160;i++){
    pieces.push({
      x:Math.random()*canvas.width,y:-10,
      w:Math.random()*12+4,h:Math.random()*6+3,
      color:colors[Math.floor(Math.random()*colors.length)],
      rot:Math.random()*360,rotSpeed:(Math.random()-0.5)*8,
      vx:(Math.random()-0.5)*6,vy:Math.random()*4+2,
      opacity:1,
    });
  }
  var frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(function(p){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.globalAlpha=p.opacity;ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.rotSpeed;p.vy+=0.07;
      if(frame>80)p.opacity-=0.015;
    });
    frame++;
    if(frame<160&&pieces.some(function(p){return p.opacity>0;}))requestAnimationFrame(draw);
    else{canvas.style.display='none';ctx.clearRect(0,0,canvas.width,canvas.height);}
  }
  draw();
}

/* ═══════════════════════════════════════════════════════════════════════
   PERSONAL BEST
═══════════════════════════════════════════════════════════════════════ */
function checkPB(wpm){
  try{
    var key='typeradar_pb_'+mode+'_'+totalTime;
    var prev=parseInt(localStorage.getItem(key)||'0',10);
    if(wpm>prev){
      localStorage.setItem(key,String(wpm));
      var badge=document.getElementById('pb-badge');
      if(badge){badge.classList.add('visible');setTimeout(function(){badge.classList.remove('visible');},4000);}
      return true;
    }
  }catch(e){}
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════
   END TEST
═══════════════════════════════════════════════════════════════════════ */
function endTest(){
  if(finished)return;
  clearInterval(timerInterval);finished=true;started=false;
  hiddenInput.blur();

  var elapsed=mode==='time'?totalTime:wpmTick;
  var wpm=Math.round((correctWords/Math.max(elapsed,1))*60);
  var rawWpm=Math.round(((totalCorrectChars+totalWrongChars)/5)/(Math.max(elapsed,1)/60));
  var total=totalCorrectChars+totalWrongChars;
  var acc=total>0?Math.round((totalCorrectChars/total)*100):100;
  var consistency=calcConsistency(rawHistory);

  var resWpm=document.getElementById('res-wpm');if(resWpm)resWpm.textContent=wpm;
  var resAcc=document.getElementById('res-acc');if(resAcc)resAcc.textContent=acc+'%';
  var resRaw=document.getElementById('res-raw');if(resRaw)resRaw.textContent=rawWpm;
  var resChars=document.getElementById('res-chars');if(resChars)resChars.textContent=totalCorrectChars+'/'+totalWrongChars+'/0/'+totalErrors;
  var resCon=document.getElementById('res-consistency');if(resCon)resCon.textContent=consistency+'%';
  var resTime=document.getElementById('res-time');if(resTime)resTime.textContent=elapsed+'s';
  var resType=document.getElementById('res-type');if(resType)resType.textContent=mode+' '+(mode==='time'?totalTime+'s':'')+' ';
  var resLang=document.getElementById('res-lang');if(resLang)resLang.textContent=uiLang;

  drawResultChart();
  var testScreen=document.getElementById('test-screen');if(testScreen)testScreen.style.display='none';
  var resultScreen=document.getElementById('result-screen');if(resultScreen)resultScreen.style.display='flex';

  var isPB=checkPB(wpm);
  if(isPB||wpm>=80)launchConfetti();

  if(currentUser)saveResult(wpm,acc,rawWpm,consistency);

  if(isDailyMode&&currentUser){
    saveDailyResult(wpm,acc);
    isDailyMode=false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   RESULT CHART — MonkeyType style
═══════════════════════════════════════════════════════════════════════ */
function drawResultChart(){
  var canvas=document.getElementById('wpm-chart');
  if(!canvas)return;
  var wrapper=canvas.parentElement;
  if(!wrapper)return;
  var dpr=window.devicePixelRatio||1;
  var W_css=wrapper.offsetWidth||700,H_css=220;
  canvas.style.width=W_css+'px';canvas.style.height=H_css+'px';
  canvas.width=W_css*dpr;canvas.height=H_css*dpr;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var W=W_css,H=H_css;
  ctx.clearRect(0,0,W,H);

  var wpmData=wpmHistory.length>0?wpmHistory:[0];
  var rawData=rawHistory.length>0?rawHistory:null;
  var errData=errHistory.length>0?errHistory:null;

  // Compute combined max for WPM axis
  var allWpm=wpmData.slice();
  if(rawData)allWpm=allWpm.concat(rawData);
  allWpm.push(10);
  var maxWpm=Math.max.apply(null,allWpm);
  var maxWpmR=Math.ceil(maxWpm/10)*10;

  // Compute max for errors axis
  var maxErr=errData?Math.max.apply(null,errData.concat([1])):1;
  var maxErrR=Math.ceil(maxErr);

  var pad={t:20,b:36,l:44,r:44};
  var cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;

  var n=wpmData.length;
  var px=function(i){return pad.l+(n<=1?cW/2:(i/(n-1))*cW);};
  var py=function(v){return pad.t+cH-(v/maxWpmR)*cH;};
  var pyErr=function(v){return pad.t+cH-(v/maxErrR)*cH;};

  // ── grid lines ──
  ctx.font="11px 'JetBrains Mono', monospace";
  for(var g=0;g<=5;g++){
    var gVal=Math.round((maxWpmR/5)*g);
    var gY=py(gVal);
    ctx.beginPath();ctx.moveTo(pad.l,gY);ctx.lineTo(W-pad.r,gY);
    ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;ctx.stroke();
    ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.fillText(gVal,pad.l-7,gY+4);
  }

  // Right axis — errors
  if(maxErrR>0){
    for(var ge=0;ge<=maxErrR;ge++){
      var geY=pyErr(ge);
      ctx.textAlign='left';ctx.fillStyle='rgba(247,106,138,0.5)';
      ctx.fillText(ge,W-pad.r+7,geY+4);
    }
  }

  // ── x-axis labels ──
  ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.2)';
  var xCount=Math.min(n,10);
  for(var xi=0;xi<xCount;xi++){
    var xIdx=Math.round((xi/Math.max(xCount-1,1))*(n-1));
    ctx.fillText((xIdx+1)+'s',px(xIdx),H-8);
  }

  // ── raw WPM line (grey) ──
  if(rawData&&rawData.length>1){
    ctx.beginPath();ctx.moveTo(px(0),py(rawData[0]));
    for(var ri=1;ri<Math.min(rawData.length,n);ri++){
      var cpxR=px(ri-0.5);
      ctx.bezierCurveTo(cpxR,py(rawData[ri-1]),cpxR,py(rawData[ri]),px(ri),py(rawData[ri]));
    }
    ctx.strokeStyle='rgba(200,200,200,0.28)';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }

  // ── WPM area + line (accent color) ──
  if(n>1){
    // area fill
    var grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
    grad.addColorStop(0,'rgba(124,106,247,0.22)');
    grad.addColorStop(1,'rgba(124,106,247,0.01)');
    ctx.beginPath();ctx.moveTo(px(0),py(wpmData[0]));
    for(var fi=1;fi<n;fi++){var cpF=px(fi-0.5);ctx.bezierCurveTo(cpF,py(wpmData[fi-1]),cpF,py(wpmData[fi]),px(fi),py(wpmData[fi]));}
    ctx.lineTo(px(n-1),H-pad.b);ctx.lineTo(px(0),H-pad.b);
    ctx.closePath();ctx.fillStyle=grad;ctx.fill();

    // wpm line
    ctx.beginPath();ctx.moveTo(px(0),py(wpmData[0]));
    for(var si=1;si<n;si++){var cpS=px(si-0.5);ctx.bezierCurveTo(cpS,py(wpmData[si-1]),cpS,py(wpmData[si]),px(si),py(wpmData[si]));}
    ctx.strokeStyle='rgba(124,106,247,1)';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }

  // ── WPM dots ──
  for(var di=0;di<n;di++){
    ctx.beginPath();ctx.arc(px(di),py(wpmData[di]),2.5,0,Math.PI*2);
    ctx.fillStyle='rgba(124,106,247,1)';ctx.fill();
  }
  // last dot highlight
  ctx.beginPath();ctx.arc(px(n-1),py(wpmData[n-1]),5,0,Math.PI*2);
  ctx.fillStyle='rgba(124,106,247,0.25)';ctx.fill();
  ctx.beginPath();ctx.arc(px(n-1),py(wpmData[n-1]),3,0,Math.PI*2);
  ctx.fillStyle='#fff';ctx.fill();

  // ── Error markers (MonkeyType red X style) ──
  if(errData&&errData.length>0){
    var prevErr=0;
    for(var ei=0;ei<errData.length;ei++){
      var eCount=errData[ei]-prevErr;
      if(eCount>0){
        var ex=px(ei);
        var ey=pyErr(errData[ei]);
        // draw red X marker
        ctx.save();
        ctx.strokeStyle='rgba(247,106,138,0.9)';
        ctx.lineWidth=1.8;
        var sz=5;
        ctx.beginPath();ctx.moveTo(ex-sz,ey-sz);ctx.lineTo(ex+sz,ey+sz);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ex+sz,ey-sz);ctx.lineTo(ex-sz,ey+sz);ctx.stroke();
        ctx.restore();
      }
      prevErr=errData[ei];
    }
  }

  // ── Legend ──
  var lx=pad.l+8, ly=pad.t+8;
  ctx.font="10px 'JetBrains Mono', monospace";
  // wpm
  ctx.beginPath();ctx.moveTo(lx,ly+4);ctx.lineTo(lx+18,ly+4);
  ctx.strokeStyle='rgba(124,106,247,1)';ctx.lineWidth=2.5;ctx.stroke();
  ctx.fillStyle='rgba(200,200,200,0.5)';ctx.textAlign='left';ctx.fillText('wpm',lx+22,ly+8);
  // raw
  ctx.beginPath();ctx.moveTo(lx+60,ly+4);ctx.lineTo(lx+78,ly+4);
  ctx.strokeStyle='rgba(200,200,200,0.28)';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='rgba(200,200,200,0.35)';ctx.fillText('raw',lx+82,ly+8);
  // errors
  ctx.fillStyle='rgba(247,106,138,0.7)';ctx.fillText('errors',lx+115,ly+8);
}

/* ═══════════════════════════════════════════════════════════════════════
   SHARE
═══════════════════════════════════════════════════════════════════════ */
window.shareResult=function(){
  var resWpm=document.getElementById('res-wpm');
  var resAcc=document.getElementById('res-acc');
  var wpm=resWpm?resWpm.textContent:'0';
  var acc=resAcc?resAcc.textContent:'0%';
  var text='TypeRadar result\n⌨️ '+wpm+' wpm  ✓ '+acc+'\nmode: '+mode+' '+(mode==='time'?totalTime+'s':'')+'\ntyperadar.com';
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(showShareToast).catch(function(){fallbackCopy(text);});
  }else{fallbackCopy(text);}
};
function fallbackCopy(text){
  var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');}catch(e){}
  document.body.removeChild(ta);showShareToast();
}
function showShareToast(){
  var t=document.getElementById('share-toast');
  if(t){t.classList.add('visible');setTimeout(function(){t.classList.remove('visible');},2000);}
}

/* ═══════════════════════════════════════════════════════════════════════
   RESTART
═══════════════════════════════════════════════════════════════════════ */
window.restart=function(seedWords){
  clearInterval(timerInterval);
  started=false;finished=false;isDailyMode=false;
  currentWordIndex=0;currentInput='';
  totalCorrectChars=0;totalWrongChars=0;correctWords=0;wrongWords=0;totalErrors=0;
  wpmHistory=[];rawHistory=[];errHistory=[];wpmTick=0;wordHistory=[];timeLeft=totalTime;lastKeyTime=0;

  var td=document.getElementById('timer-display');
  if(td){td.textContent=mode==='time'?totalTime:'0';td.classList.remove('warning');}
  var lw=document.getElementById('live-wpm');if(lw)lw.textContent='0';
  var la=document.getElementById('live-acc');if(la)la.textContent='100%';
  var le=document.getElementById('live-err');if(le)le.textContent='0';
  var ls=document.getElementById('live-stats');if(ls)ls.classList.remove('visible');
  var ch=document.getElementById('click-hint');if(ch)ch.style.opacity='0.6';
  var rs=document.getElementById('result-screen');if(rs)rs.style.display='none';
  var ts=document.getElementById('test-screen');if(ts)ts.style.display='flex';
  if(typingContainer)typingContainer.classList.remove('blind-mode');

  buildDisplay(seedWords);
  setTimeout(function(){positionCursor();resetCursorBlink();hiddenInput.value='';setTimeout(focusInput,100);},60);
};

/* ═══════════════════════════════════════════════════════════════════════
   KEY PROCESSING
═══════════════════════════════════════════════════════════════════════ */
function processKey(key){
  if(finished)return;
  if(!started&&key!=='Backspace'&&key!==' ')startTimer();
  if(key!=='Backspace'&&key!==' ')playSound(soundEffect);

  var wordStr=words[currentWordIndex]||'';

  if(key==='Backspace'){
    if(useConfidence)return;
    if(mode==='zen'){
      if(currentInput.length>0){
        var we=document.getElementById('word-'+currentWordIndex);
        if(we&&we.lastChild&&we.lastChild.classList&&we.lastChild.classList.contains('zen-letter'))we.removeChild(we.lastChild);
        currentInput=currentInput.slice(0,-1);positionCursor();
      }else if(currentWordIndex>0){
        var inner=document.getElementById('words-inner');
        var ew=document.getElementById('word-'+currentWordIndex);if(ew&&inner)inner.removeChild(ew);
        currentWordIndex--;correctWords=Math.max(0,correctWords-1);
        var pw2=document.getElementById('word-'+currentWordIndex);
        if(pw2)currentInput=Array.from(pw2.querySelectorAll('.zen-letter')).map(function(l){return l.textContent;}).join('');
        highlightWord(currentWordIndex);positionCursor();
      }
      return;
    }
    if(currentInput.length>0){
      var di=currentInput.length-1;animateLetter(di,'delete');
      setTimeout(function(){currentInput=currentInput.slice(0,-1);colorLetters();positionCursor();},30);
    }else if(currentWordIndex>0){
      var prev=wordHistory[wordHistory.length-1];
      if(prev&&!prev.locked){
        wordHistory.pop();currentWordIndex--;
        var pws=words[currentWordIndex];var pi=prev.input;
        var len=Math.min(pi.length,pws.length);
        for(var i=0;i<len;i++){if(pi[i]===pws[i])totalCorrectChars--;else totalWrongChars--;}
        totalWrongChars-=Math.max(0,pws.length-pi.length);
        if(prev.wasCorrect)correctWords--;else wrongWords--;
        currentInput=pi;highlightWord(currentWordIndex);colorLetters();positionCursor();updateLiveStats();
      }
    }
    return;
  }

  if(key===' '){
    if(mode==='zen'){
      if(currentInput.length===0)return;
      correctWords++;currentInput='';currentWordIndex++;
      var innerZ=document.getElementById('words-inner');
      if(innerZ){
        var nw=document.createElement('span');nw.className='word';nw.id='word-'+currentWordIndex;innerZ.appendChild(nw);
      }
      highlightWord(currentWordIndex);positionCursor();return;
    }
    if(currentInput.length===0)return;
    var wasCorrect=(currentInput===wordStr);
    wordHistory.push({input:currentInput,wasCorrect:wasCorrect,locked:wasCorrect});
    var pwe=document.getElementById('word-'+currentWordIndex);
    if(pwe)pwe.classList.toggle('has-error',!wasCorrect);
    var len2=Math.min(currentInput.length,wordStr.length);
    for(var j=0;j<len2;j++){if(currentInput[j]===wordStr[j])totalCorrectChars++;else totalWrongChars++;}
    totalWrongChars+=Math.max(0,wordStr.length-currentInput.length);
    if(wasCorrect)correctWords++;else wrongWords++;
    currentInput='';currentWordIndex++;
    if((mode==='words'||mode==='quote'||mode==='custom')&&currentWordIndex>=words.length){endTest();return;}
    highlightWord(currentWordIndex);colorLetters();positionCursor();updateLiveStats();return;
  }

  if(key.length===1){
    if(mode==='zen'){
      var weZ=document.getElementById('word-'+currentWordIndex);if(!weZ)return;
      var leZ=document.createElement('span');leZ.className='letter zen-letter correct theme-'+colorTheme;leZ.textContent=key;weZ.appendChild(leZ);
      currentInput+=key;positionCursor();return;
    }
    if(currentInput.length>=wordStr.length+5)return;
    var ni=currentInput.length;
    if(ni<wordStr.length&&key!==wordStr[ni]){
      totalErrors++;
      var errEl=document.getElementById('live-err');if(errEl)errEl.textContent=totalErrors;
    }
    currentInput+=key;
    setTimeout(function(){animateLetter(ni,'add');positionCursor();},10);
    updateLiveStats();
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   FOCUS
═══════════════════════════════════════════════════════════════════════ */
window.focusInput=function(fromClick){
  var isTouch=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
  if(isTouch&&!fromClick)return;
  var testScreen=document.getElementById('test-screen');
  if(!finished&&testScreen&&testScreen.style.display!=='none')hiddenInput.focus();
};

/* ═══════════════════════════════════════════════════════════════════════
   PANEL SYSTEM (MonkeyType-style dropdowns)
═══════════════════════════════════════════════════════════════════════ */
var activePanel=null;

function openPanel(id){
  closeAllPanels();
  var p=document.getElementById(id);
  var overlay=document.getElementById('panel-overlay');
  if(p){p.classList.add('open');activePanel=id;}
  if(overlay)overlay.classList.add('active');
}
function closeAllPanels(){
  document.querySelectorAll('.side-panel').forEach(function(p){p.classList.remove('open');});
  var overlay=document.getElementById('panel-overlay');
  if(overlay)overlay.classList.remove('active');
  activePanel=null;
}
function togglePanel(id){
  if(activePanel===id){closeAllPanels();}else{openPanel(id);}
}

// Settings modal still uses overlay modal
window.openSettings=function(){buildFontGrid();buildBgThemeGrid();closeAllPanels();var sm=document.getElementById('settings-modal');if(sm)sm.style.display='flex';};
window.closeSettings=function(){var sm=document.getElementById('settings-modal');if(sm)sm.style.display='none';setTimeout(function(){if(!('ontouchstart' in window))hiddenInput.focus();},100);};
window.saveCustomText=function(){
  var ta=document.getElementById('custom-text-input');if(!ta)return;
  var text=ta.value.trim();if(!text)return;
  customText=text;try{localStorage.setItem('typeradar_custom_text',customText);}catch(e){}
  closeSettings();if(mode==='custom')restart();
};

/* ═══════════════════════════════════════════════════════════════════════
   AUTH PANEL
═══════════════════════════════════════════════════════════════════════ */
function setAuthMsg(id,msg,isInfo){
  var el=document.getElementById(id);
  if(!el)return;
  el.textContent=msg;
  el.style.color=isInfo?'var(--accent)':'var(--wrong)';
}
// keep old alias for compatibility
function setAuthErr(elId,msg,isInfo){setAuthMsg(elId,msg,isInfo);}

function openUserPanel(){
  if(currentUser){showProfilePanel();}else{showLoginPanel();}
  openPanel('auth-panel');
}

function showLoginPanel(){
  var lp=document.getElementById('auth-panel-login');if(lp)lp.style.display='block';
  var pp=document.getElementById('auth-panel-profile');if(pp)pp.style.display='none';
  ['signup-username','signup-email','signup-pass','signin-email','signin-pass'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  setAuthMsg('signup-msg','');setAuthMsg('signin-msg','');
}

function showProfilePanel(){
  var lp=document.getElementById('auth-panel-login');if(lp)lp.style.display='none';
  var pp=document.getElementById('auth-panel-profile');if(pp)pp.style.display='block';
  var username=currentProfile?currentProfile.username:(currentUser?currentUser.email.split('@')[0]:'?');
  var joinDate=currentProfile?currentProfile.created_at:(currentUser?currentUser.created_at:'');

  var avEl=document.getElementById('pp-avatar');
  if(avEl){
    avEl.textContent=username[0].toUpperCase();
    avEl.style.background=getAvatarColor(username);
  }
  var unEl=document.getElementById('pp-username');if(unEl)unEl.textContent=username;
  var jEl=document.getElementById('pp-joined');if(jEl)jEl.textContent=joinDate?('joined '+new Date(joinDate).toLocaleDateString()):'';

  // Avatar renk seçici
  var colorWrap=document.getElementById('pp-avatar-colors');
  if(colorWrap){
    var colors=['#7c6af7','#f7c26a','#6af7b2','#f76a8a','#60d0ff','#ff80ab','#5ebb7a','#f77b4a'];
    colorWrap.innerHTML='';
    colors.forEach(function(c){
      var btn=document.createElement('button');
      btn.className='avatar-color-dot';
      btn.style.background=c;
      btn.title=c;
      if(c===getAvatarColor(username))btn.classList.add('selected');
      btn.addEventListener('click',function(){
        try{localStorage.setItem('typeradar_avatar_color_'+username,c);}catch(e){}
        var av=document.getElementById('pp-avatar');if(av)av.style.background=c;
        colorWrap.querySelectorAll('.avatar-color-dot').forEach(function(d){d.classList.remove('selected');});
        btn.classList.add('selected');
        updateAuthUI();
      });
      colorWrap.appendChild(btn);
    });
  }

  loadProfileStatsPanel();
}

async function loadProfileStatsPanel(){
  if(!currentUser)return;
  var ps=document.getElementById('pp-stats');if(!ps)return;
  ps.innerHTML='<div class="notif-empty">loading...</div>';
  try{
    var result=await sb.from('results').select('wpm,accuracy').eq('user_id',currentUser.id).order('wpm',{ascending:false}).limit(50);
    var data=result.data;
    if(data&&data.length>0){
      var bestWpm=data[0].wpm;
      var avgWpm=Math.round(data.reduce(function(s,r){return s+r.wpm;},0)/data.length);
      var tests=data.length;
      var bestAcc=Math.max.apply(null,data.map(function(r){return r.accuracy;}));
      ps.innerHTML=
        '<div class="pp-stat-grid">'+
        '<div class="pp-stat"><div class="pp-stat-label">best wpm</div><div class="pp-stat-val">'+bestWpm+'</div></div>'+
        '<div class="pp-stat"><div class="pp-stat-label">avg wpm</div><div class="pp-stat-val">'+avgWpm+'</div></div>'+
        '<div class="pp-stat"><div class="pp-stat-label">tests</div><div class="pp-stat-val">'+tests+'</div></div>'+
        '<div class="pp-stat"><div class="pp-stat-label">best acc</div><div class="pp-stat-val">'+bestAcc+'%</div></div>'+
        '</div>';
    }else{
      ps.innerHTML='<div class="notif-empty">no tests yet</div>';
    }
  }catch(e){
    ps.innerHTML='<div class="notif-empty">could not load</div>';
  }
}

// compat stubs
window.openAuth=openUserPanel;
window.closeAuth=closeAllPanels;

window.doSignIn=async function(){
  var emailEl=document.getElementById('signin-email');
  var passEl=document.getElementById('signin-pass');
  if(!emailEl||!passEl)return;
  var email=emailEl.value.trim();var pass=passEl.value;
  if(!email||!pass){setAuthMsg('signin-msg','Please fill all fields');return;}
  setAuthMsg('signin-msg','signing in...', true);
  var btn=document.getElementById('signin-btn');if(btn)btn.disabled=true;
  try{
    var result=await Promise.race([
      sb.auth.signInWithPassword({email:email,password:pass}),
      new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'));},12000);})
    ]);
    if(result.error){
      var msg=result.error.message||'';
      if(msg.toLowerCase().indexOf('email not confirmed')!==-1)setAuthMsg('signin-msg','Please confirm your email first.');
      else if(msg.toLowerCase().indexOf('invalid')!==-1||msg.toLowerCase().indexOf('credentials')!==-1)setAuthMsg('signin-msg','Wrong email or password.');
      else setAuthMsg('signin-msg',msg||'Sign in failed.');
      return;
    }
    if(result.data&&result.data.user){
      currentUser=result.data.user;
      await loadProfile(result.data.user.id);
      showProfilePanel();
    }else{setAuthMsg('signin-msg','Sign in failed.');}
  }catch(e){
    setAuthMsg('signin-msg',e.message==='timeout'?'Request timed out.':'Error: '+e.message);
  }finally{if(btn)btn.disabled=false;}
};

window.doSignUp=async function(){
  var unEl=document.getElementById('signup-username');
  var emEl=document.getElementById('signup-email');
  var psEl=document.getElementById('signup-pass');
  if(!unEl||!emEl||!psEl)return;
  var username=unEl.value.trim();var email=emEl.value.trim();var pass=psEl.value;
  if(!username||username.length<3){setAuthMsg('signup-msg','Username min 3 chars');return;}
  if(!email||email.indexOf('@')===-1){setAuthMsg('signup-msg','Valid email required');return;}
  if(!pass||pass.length<6){setAuthMsg('signup-msg','Password min 6 chars');return;}
  setAuthMsg('signup-msg','creating account...', true);
  var btn=document.getElementById('signup-btn');if(btn)btn.disabled=true;
  try{
    var sr=await Promise.race([
      sb.auth.signUp({email:email,password:pass}),
      new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'));},12000);})
    ]);
    if(sr.error){
      var m=sr.error.message||'';
      setAuthMsg('signup-msg',(m.toLowerCase().indexOf('already')!==-1)?'Email already registered.':m||'Sign up failed.');
      return;
    }
    if(!sr.data||!sr.data.user){setAuthMsg('signup-msg','Sign up failed.');return;}
    var sinR=await sb.auth.signInWithPassword({email:email,password:pass});
    if(sinR.error||!sinR.data||!sinR.data.user){
      setAuthMsg('signup-msg','Check your email to confirm, then sign in.',true);return;
    }
    var uid=sinR.data.user.id;
    var pr=await sb.from('profiles').insert({id:uid,username:username});
    if(pr.error&&(pr.error.message.indexOf('duplicate')!==-1||pr.error.message.indexOf('unique')!==-1)){
      var alt=username+'_'+(Math.floor(Math.random()*9000)+1000);
      await sb.from('profiles').insert({id:uid,username:alt});
    }
    currentUser=sinR.data.user;
    await loadProfile(uid);
    showProfilePanel();
  }catch(e){
    setAuthMsg('signup-msg',e.message==='timeout'?'Request timed out.':'Error: '+e.message);
  }finally{if(btn)btn.disabled=false;}
};

async function doSignOutInternal(){
  currentUser=null;currentProfile=null;
  updateAuthUI();closeAllPanels();
  try{await sb.auth.signOut();}catch(e){}
}
window.doSignOut=function(){doSignOutInternal();};

async function loadProfile(userId){
  try{
    var result=await sb.from('profiles').select('*').eq('id',userId).single();
    if(result.error||!result.data){
      currentProfile=null;
    }else{
      currentProfile=result.data;
    }
  }catch(e){
    currentProfile=null;
  }
  updateAuthUI();
}

async function loadProfileStats(){
  if(!currentUser)return;
  var ps=document.getElementById('profile-stats');if(!ps)return;
  ps.innerHTML='<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.78rem;padding:8px;">loading...</div>';
  try{
    var result=await sb.from('results').select('wpm,accuracy').eq('user_id',currentUser.id).order('wpm',{ascending:false}).limit(50);
    var data=result.data;
    if(data&&data.length>0){
      var bestWpm=data[0].wpm;
      var avgWpm=Math.round(data.reduce(function(s,r){return s+r.wpm;},0)/data.length);
      var tests=data.length;
      var bestAcc=Math.max.apply(null,data.map(function(r){return r.accuracy;}));
      ps.innerHTML=
        '<div class="ps-item"><div class="ps-label">best wpm</div><div class="ps-val">'+bestWpm+'</div></div>'+
        '<div class="ps-item"><div class="ps-label">avg wpm</div><div class="ps-val">'+avgWpm+'</div></div>'+
        '<div class="ps-item"><div class="ps-label">tests</div><div class="ps-val">'+tests+'</div></div>'+
        '<div class="ps-item"><div class="ps-label">best acc</div><div class="ps-val">'+bestAcc+'%</div></div>';
    }else{
      ps.innerHTML='<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.78rem;">no tests yet</div>';
    }
  }catch(e){
    ps.innerHTML='<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.78rem;">could not load stats</div>';
  }
}

function updateAuthUI(){
  var btn=document.getElementById('nav-user');
  var mini=document.getElementById('user-avatar-mini');
  if(!btn)return;
  if(currentUser){
    var username=currentProfile?currentProfile.username:currentUser.email.split('@')[0];
    btn.classList.add('user-logged');
    // avatar harfini küçük badge olarak göster
    if(mini){
      mini.textContent=username[0].toUpperCase();
      mini.style.background=getAvatarColor(username);
      mini.style.display='flex';
    }
  }else{
    btn.classList.remove('user-logged');
    if(mini)mini.style.display='none';
  }
}

async function saveResult(wpm,acc,raw,consistency){
  if(!currentUser)return;
  try{
    await sb.from('results').insert({
      user_id:currentUser.id,wpm:wpm||0,accuracy:acc||0,raw_wpm:raw||0,
      mode:mode||'time',time_seconds:mode==='time'?totalTime:(wpmTick||0),language:uiLang||'en',consistency:consistency||0
    });
  }catch(e){console.warn('saveResult error:',e);}
}

/* ═══════════════════════════════════════════════════════════════════════
   LEADERBOARD
═══════════════════════════════════════════════════════════════════════ */
var lbMode='time',lbTime=30;
window.openLeaderboard=function(){
  closeAllPanels();
  var lm=document.getElementById('leaderboard-modal');if(lm)lm.style.display='flex';
  loadLeaderboard('time',30,document.querySelector('.lb-tab'));
};
window.closeLeaderboard=function(){var lm=document.getElementById('leaderboard-modal');if(lm)lm.style.display='none';};

window.loadLeaderboard=async function(m,t,el){
  lbMode=m;lbTime=t;
  document.querySelectorAll('.lb-tab').forEach(function(b){b.classList.remove('active');});
  if(el)el.classList.add('active');
  var list=document.getElementById('lb-list');
  if(!list)return;
  list.innerHTML='<div class="lb-loading">loading...</div>';

  try{
    // Get top results with user_id
    var result=await sb.from('results')
      .select('wpm,accuracy,user_id')
      .eq('mode',m).eq('time_seconds',t)
      .order('wpm',{ascending:false}).limit(200);

    if(result.error){list.innerHTML='<div class="lb-loading">failed to load</div>';return;}
    if(!result.data||result.data.length===0){list.innerHTML='<div class="lb-loading">no results yet — be first!</div>';return;}

    // Deduplicate: best per user_id
    var best={};
    result.data.forEach(function(r){
      var uid=r.user_id||'anon';
      if(!best[uid]||r.wpm>best[uid].wpm)best[uid]={wpm:r.wpm,accuracy:r.accuracy,user_id:uid};
    });
    var rows=Object.values(best).sort(function(a,b){return b.wpm-a.wpm;}).slice(0,20);

    // Fetch usernames for these user_ids
    var uids=rows.map(function(r){return r.user_id;}).filter(function(uid){return uid!=='anon';});
    var nameMap={};
    if(uids.length>0){
      var pRes=await sb.from('profiles').select('id,username').in('id',uids);
      if(pRes.data)pRes.data.forEach(function(p){nameMap[p.id]=p.username;});
    }

    var rankIcons=['🥇','🥈','🥉'];
    var myUsername=currentProfile?currentProfile.username:null;
    list.innerHTML=rows.map(function(r,i){
      var uname=nameMap[r.user_id]||'anonymous';
      var isMe=myUsername&&uname===myUsername;
      var rankDisplay=i<3?
        '<span class="lb-rank '+['gold','silver','bronze'][i]+'">'+rankIcons[i]+'</span>':
        '<span class="lb-rank">'+(i+1)+'</span>';
      return '<div class="lb-row'+(isMe?' me':'')+'">'+
        rankDisplay+
        '<span class="lb-user">'+uname+'</span>'+
        '<span class="lb-wpm">'+r.wpm+'</span>'+
        '<span class="lb-acc">'+r.accuracy+'%</span>'+
      '</div>';
    }).join('');
  }catch(e){list.innerHTML='<div class="lb-loading">error: '+e.message+'</div>';}
};

/* ═══════════════════════════════════════════════════════════════════════
   DAILY CHALLENGE
═══════════════════════════════════════════════════════════════════════ */
function getDailyDateStr(){
  var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function getDailySeed(){
  var dateStr=getDailyDateStr();
  var hash=0;for(var i=0;i<dateStr.length;i++)hash=((hash<<5)-hash)+dateStr.charCodeAt(i);
  var rng=function(s){s=Math.sin(s)*10000;return s-Math.floor(s);};
  var list=(typeof WORDS!=='undefined'&&WORDS)?WORDS['en']||[]:[];
  if(!list.length)list=['the','quick','brown','fox','jumps','over','lazy','dog'];
  var count=30;var chosen=[];
  for(var j=0;j<count;j++){
    var idx=Math.floor(rng(hash+j)*list.length);
    chosen.push(list[idx]||'the');
  }
  return chosen;
}

window.openDaily=function(){
  var dateStr=getDailyDateStr();
  var dateBadge=document.getElementById('daily-date');if(dateBadge)dateBadge.textContent=dateStr;
  var dm=document.getElementById('daily-modal');if(dm)dm.style.display='flex';
  loadDailyBoard();
  var savedKey='typeradar_daily_'+dateStr;
  try{
    var saved=localStorage.getItem(savedKey);
    if(saved){
      var dailyResult=JSON.parse(saved);
      var mr=document.getElementById('daily-my-result');
      if(mr){mr.style.display='block';mr.innerHTML='<div style="font-family:\'JetBrains Mono\',monospace;font-size:0.8rem;color:var(--correct);margin-bottom:12px;">✓ Today\'s result: <strong>'+dailyResult.wpm+' wpm</strong> — '+dailyResult.accuracy+'% acc</div>';}
      var startBtn=document.getElementById('daily-start-btn');if(startBtn)startBtn.textContent='redo challenge';
    }
  }catch(e){}
};
window.closeDaily=function(){var dm=document.getElementById('daily-modal');if(dm)dm.style.display='none';};

window.startDaily=function(){
  closeDaily();
  isDailyMode=true;
  var seed=getDailySeed();
  mode='time';totalTime=30;timeLeft=30;
  document.querySelectorAll('#mode-group .config-btn').forEach(function(b){b.classList.remove('active');});
  var mb=document.getElementById('mode-time');if(mb)mb.classList.add('active');
  document.querySelectorAll('#time-group .config-btn').forEach(function(b){b.classList.remove('active');});
  var tb=document.getElementById('t-30');if(tb)tb.classList.add('active');
  showGroup('time-group',true);showGroup('time-sep',true);
  showGroup('extra-group',true);showGroup('extra-sep',true);
  restart(seed);
};

async function saveDailyResult(wpm,acc){
  var dateStr=getDailyDateStr();
  var key='typeradar_daily_'+dateStr;
  try{localStorage.setItem(key,JSON.stringify({wpm:wpm,accuracy:acc}));}catch(e){}
  if(!currentUser||!currentProfile)return;
  try{
    await sb.from('daily_results').upsert({
      user_id:currentUser.id,username:currentProfile.username,
      date:dateStr,wpm:wpm,accuracy:acc
    },{onConflict:'user_id,date'});
  }catch(e){}
}

async function loadDailyBoard(){
  var dateStr=getDailyDateStr();
  var board=document.getElementById('daily-board');
  if(!board)return;
  board.innerHTML='<div class="lb-loading">loading...</div>';
  try{
    var result=await sb.from('daily_results')
      .select('username,wpm,accuracy').eq('date',dateStr)
      .order('wpm',{ascending:false}).limit(20);
    if(result.error||!result.data||result.data.length===0){
      board.innerHTML='<div class="lb-loading">no entries yet — be first!</div>';return;
    }
    var rankIcons=['🥇','🥈','🥉'];
    board.innerHTML=result.data.map(function(r,i){
      var isMe=currentProfile&&r.username===currentProfile.username;
      var rankD=i<3?'<span class="lb-rank '+['gold','silver','bronze'][i]+'">'+rankIcons[i]+'</span>':'<span class="lb-rank">'+(i+1)+'</span>';
      return '<div class="lb-row'+(isMe?' me':'')+'">'+
        rankD+'<span class="lb-user">'+r.username+'</span>'+
        '<span class="lb-wpm">'+r.wpm+'</span><span class="lb-acc">'+r.accuracy+'%</span>'+
      '</div>';
    }).join('');
  }catch(e){board.innerHTML='<div class="lb-loading">error loading board</div>';}
}

/* ═══════════════════════════════════════════════════════════════════════
   KEYBOARD EVENTS
═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown',function(e){
  var capsOn=e.getModifierState&&e.getModifierState('CapsLock');
  var warn=document.getElementById('caps-warning');
  if(warn)warn.classList.toggle('visible',!!capsOn);
});
document.addEventListener('keyup',function(e){
  var capsOn=e.getModifierState&&e.getModifierState('CapsLock');
  var warn=document.getElementById('caps-warning');
  if(warn)warn.classList.toggle('visible',!!capsOn);
});
document.addEventListener('keydown',function(e){
  var settingsModal=document.getElementById('settings-modal');
  var leaderboardModal=document.getElementById('leaderboard-modal');
  var dailyModal=document.getElementById('daily-modal');

  if((settingsModal&&settingsModal.style.display==='flex')||
     (leaderboardModal&&leaderboardModal.style.display==='flex')||
     (dailyModal&&dailyModal.style.display==='flex')||
     activePanel){
    if(e.key==='Escape'){closeSettings();closeLeaderboard();closeDaily();closeAllPanels();e.preventDefault();}
    return;
  }
  var key=e.key;
  if(key==='Tab'){e.preventDefault();restart();return;}
  if(key==='Escape'){e.preventDefault();restart();return;}
  if(key==='Enter'&&mode==='zen'&&e.shiftKey){e.preventDefault();if(started)endTest();return;}
  var ignored=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown',
    'Shift','Control','Alt','Meta','CapsLock','Insert','Delete','Enter',
    'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
  if(ignored.indexOf(key)!==-1)return;
  if(key==='Backspace'||key===' '){e.preventDefault();if(!finished){lastKeyTime=Date.now();processKey(key);}return;}
  e.preventDefault();if(!finished)processKey(key);
});

hiddenInput.addEventListener('input',function(e){
  if(finished)return;
  if(Date.now()-lastKeyTime<30)return;
  var itype=e.inputType||'';
  if(itype==='deleteContentBackward'||itype==='deleteWordBackward'){
    this.value='';lastKeyTime=Date.now();processKey('Backspace');return;
  }
  var val=this.value;if(!val||val.length===0)return;
  var lastChar=val[val.length-1];this.value='';lastKeyTime=Date.now();
  if(lastChar===' ')processKey(' ');else processKey(lastChar);
});

typingContainer.addEventListener('click',function(e){e.preventDefault();if(!finished)hiddenInput.focus();});
typingContainer.addEventListener('touchend',function(e){e.preventDefault();if(!finished)hiddenInput.focus();});

var settingsModalEl=document.getElementById('settings-modal');
if(settingsModalEl)settingsModalEl.addEventListener('click',function(e){if(e.target===this)closeSettings();});
var leaderboardModalEl=document.getElementById('leaderboard-modal');
if(leaderboardModalEl)leaderboardModalEl.addEventListener('click',function(e){if(e.target===this)closeLeaderboard();});
var dailyModalEl=document.getElementById('daily-modal');
if(dailyModalEl)dailyModalEl.addEventListener('click',function(e){if(e.target===this)closeDaily();});

// Panel overlay click — close panels
var panelOverlay=document.getElementById('panel-overlay');
if(panelOverlay)panelOverlay.addEventListener('click',function(){closeAllPanels();});

// Header nav buttons
var navKeyboard=document.getElementById('nav-keyboard');
if(navKeyboard)navKeyboard.addEventListener('click',function(){closeAllPanels();restart();});
var logoBtn=document.getElementById('logo-btn');
if(logoBtn)logoBtn.addEventListener('click',function(){closeAllPanels();restart();});
var navLeaderboard=document.getElementById('nav-leaderboard');
if(navLeaderboard)navLeaderboard.addEventListener('click',function(){openLeaderboard();});
var navDaily=document.getElementById('nav-daily');
if(navDaily)navDaily.addEventListener('click',function(){openDailyModal();});
var navSettingsBtn=document.getElementById('nav-settings');
if(navSettingsBtn)navSettingsBtn.addEventListener('click',function(){openSettings();});
var navNotif=document.getElementById('nav-notif');
if(navNotif)navNotif.addEventListener('click',function(){togglePanel('notif-panel');});
var navUser=document.getElementById('nav-user');
if(navUser)navUser.addEventListener('click',function(){openUserPanel();});
var notifClose=document.getElementById('notif-panel-close');
if(notifClose)notifClose.addEventListener('click',function(){closeAllPanels();});

// Auth panel buttons — onclick already set in HTML
// (signup-btn, signin-btn, signout-panel-btn)

/* ═══════════════════════════════════════════════════════════════════════
   LOAD SETTINGS
═══════════════════════════════════════════════════════════════════════ */
function loadSettings(){
  try{
    document.body.className='';
    var savedText=localStorage.getItem('typeradar_custom_text');
    if(savedText){customText=savedText;var ta=document.getElementById('custom-text-input');if(ta)ta.value=customText;}
    var savedColor=localStorage.getItem('typeradar_color_theme');
    if(savedColor){
      colorTheme=savedColor;
      setTimeout(function(){
        document.querySelectorAll('#color-theme-selector .theme-card').forEach(function(x){x.classList.remove('active');});
        document.querySelectorAll('#color-theme-selector .theme-card').forEach(function(c){
          if(c.getAttribute('data-theme')===savedColor)c.classList.add('active');
        });
      },100);
    }
    var savedBg=localStorage.getItem('typeradar_bg_theme_v2');
    if(savedBg&&THEMES[savedBg])currentBgTheme=savedBg;
    applyThemeVars(currentBgTheme);
    var savedFont=localStorage.getItem('typeradar_font');
    if(savedFont){var f=FONTS.find(function(x){return x.name===savedFont;});if(f){loadGoogleFont(f);applyFont(savedFont);}}
    var savedCaret=localStorage.getItem('typeradar_caret');
    if(savedCaret){
      caretStyle=savedCaret;
      setTimeout(function(){
        document.querySelectorAll('.caret-btn').forEach(function(b){b.classList.remove('active');});
        document.querySelectorAll('.caret-btn').forEach(function(b){
          if(b.getAttribute('data-caret')===savedCaret)b.classList.add('active');
        });
      },100);
    }
  }catch(e){applyThemeVars('moon');}
}

/* ═══════════════════════════════════════════════════════════════════════
   SUPABASE AUTH LISTENER
═══════════════════════════════════════════════════════════════════════ */
sb.auth.onAuthStateChange(async function(event, session){
  if(event==='SIGNED_OUT'||!session||!session.user){
    currentUser=null;
    currentProfile=null;
    updateAuthUI();
    return;
  }
  // Tüm oturum olaylarında (yenileme dahil) user ve profil yükle
  if(session&&session.user){
    currentUser=session.user;
    await loadProfile(session.user.id);
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════ */
window.addEventListener('load',function(){
  loadSettings();
  buildDisplay();
  applyStatsLayout();
  updateLineH();
  setTimeout(function(){positionCursor();resetCursorBlink();},120);
  if(!('ontouchstart' in window))setTimeout(function(){hiddenInput.focus();},300);
  window.addEventListener('resize',function(){updateLineH();positionCursor();});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',function(){updateLineH();positionCursor();});
  }
  document.addEventListener('touchmove',function(e){
    if(e.target.closest&&e.target.closest('.typing-container'))e.preventDefault();
  },{passive:false});
});

// Auto-refocus
if(!('ontouchstart' in window)){
  setInterval(function(){
    var testScreen=document.getElementById('test-screen');
    var sm=document.getElementById('settings-modal');
    var lm=document.getElementById('leaderboard-modal');
    var dm=document.getElementById('daily-modal');
    if(!finished&&testScreen&&testScreen.style.display!=='none'
      &&document.activeElement!==hiddenInput
      &&!activePanel
      &&(!sm||sm.style.display!=='flex')
      &&(!lm||lm.style.display!=='flex')
      &&(!dm||dm.style.display!=='flex')){
      hiddenInput.focus();
    }
  },2000);
}

})();
