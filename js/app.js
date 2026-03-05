(function () {
'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   SUPABASE CONFIG — senin anahtarların
═══════════════════════════════════════════════════════════════════════ */
const SUPABASE_URL  = 'https://diqzysrdzzdinjjydtsk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpcXp5c3JkenpkaW5qanlkdHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjkwNTEsImV4cCI6MjA4ODMwNTA1MX0.t-uJmkQtEwJwuq7SWWCQGp3NbjrI3VJF1f-Qh8nLV9g';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ═══════════════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════════════ */
let words = [], currentWordIndex = 0, currentInput = '';
let totalCorrectChars = 0, totalWrongChars = 0;
let correctWords = 0, wrongWords = 0, totalErrors = 0;
let started = false, finished = false;
let timerInterval = null, timeLeft = 30, totalTime = 30;
let mode = 'time', isZen = false;
let wpmHistory = [], rawHistory = [], wpmTick = 0, wordHistory = [];
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
  l.href=`https://fonts.googleapis.com/css2?family=${f.import}&display=swap`;
  document.head.appendChild(l);
}
function applyFont(name){
  currentFont=name;
  const d=document.getElementById('words-display');
  if(d)d.style.fontFamily=`'${name}',monospace`;
  setTimeout(updateLineH,120);
  try{localStorage.setItem('typeradar_font',name);}catch(e){}
}
window.selectFont=function(name){
  const f=FONTS.find(x=>x.name===name);if(f)loadGoogleFont(f);
  applyFont(name);
  document.querySelectorAll('.font-card').forEach(c=>c.classList.remove('active'));
  const card=document.querySelector(`.font-card[data-font="${name}"]`);if(card)card.classList.add('active');
  setTimeout(positionCursor,200);
};
function buildFontGrid(){
  const g=document.getElementById('font-grid');if(!g)return;
  g.innerHTML=FONTS.map(f=>`<div class="font-card${f.name===currentFont?' active':''}" data-font="${f.name}" onclick="selectFont('${f.name}')" style="font-family:'${f.name}',monospace">${f.name}</div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════════════
   CARET STYLE
═══════════════════════════════════════════════════════════════════════ */
window.setCaretStyle=function(style,el){
  caretStyle=style;
  document.querySelectorAll('.caret-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  const cursor=document.getElementById('cursor');
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
const THEMES = {
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
  const t=THEMES[key];if(!t)return;
  const r=document.documentElement;
  r.style.setProperty('--bg',t[0]);r.style.setProperty('--surface',t[1]);r.style.setProperty('--surface2',t[2]);
  r.style.setProperty('--border',t[3]);r.style.setProperty('--text',t[4]);r.style.setProperty('--muted',t[5]);
  r.style.setProperty('--accent',t[6]);r.style.setProperty('--accent2',t[7]);r.style.setProperty('--correct',t[8]);
  r.style.setProperty('--wrong',t[9]);r.style.setProperty('--cursor',t[10]);
  const hex=t[6].replace('#','');
  const rv=parseInt(hex.substring(0,2),16),gv=parseInt(hex.substring(2,4),16),bv=parseInt(hex.substring(4,6),16);
  r.style.setProperty('--glow',`rgba(${rv},${gv},${bv},0.18)`);
}
applyThemeVars(currentBgTheme);

window.setBgTheme=function(key){
  currentBgTheme=key; document.body.className=''; applyThemeVars(key);
  document.querySelectorAll('#bg-theme-selector .theme-card').forEach(c=>c.classList.remove('active'));
  const card=document.querySelector(`#bg-theme-selector .theme-card[data-theme="${key}"]`);if(card)card.classList.add('active');
  try{localStorage.setItem('typeradar_bg_theme_v2',key);}catch(e){}
  setTimeout(positionCursor,50);
};
function buildBgThemeGrid(){
  const g=document.getElementById('bg-theme-selector');if(!g)return;
  g.innerHTML=Object.keys(THEMES).map(key=>{
    const t=THEMES[key];
    return `<div class="theme-card${key===currentBgTheme?' active':''}" data-theme="${key}" onclick="setBgTheme('${key}')">
      <span class="btp-dot" style="background:${t[0]};border:2px solid ${t[6]};"></span>
      <span class="btp-accent" style="color:${t[6]}">${key}</span>
    </div>`;
  }).join('');
}
window.setColorTheme=function(theme){
  colorTheme=theme;
  document.querySelectorAll('#color-theme-selector .theme-card').forEach(c=>c.classList.remove('active'));
  const c=document.querySelector(`#color-theme-selector .theme-card[data-theme="${theme}"]`);if(c)c.classList.add('active');
  try{localStorage.setItem('typeradar_color_theme',theme);}catch(e){}
  colorLetters();
};

/* ═══════════════════════════════════════════════════════════════════════
   LANG
═══════════════════════════════════════════════════════════════════════ */
const LANGS=[
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
  const list=document.getElementById('lang-list');if(!list)return;
  const items=filter?LANGS.filter(l=>l.name.toLowerCase().includes(filter.toLowerCase())||l.code.includes(filter)):LANGS;
  list.innerHTML=items.map(l=>`<div class="lang-item${l.code===uiLang?' active':''}" onclick="pickLang('${l.code}','${l.name}')"><span class="lang-check">✓</span><span>${l.name}</span></div>`).join('');
}
window.toggleLangDropdown=function(){
  const dd=document.getElementById('lang-dropdown');if(!dd)return;
  if(dd.classList.contains('open')){dd.classList.remove('open');}
  else{dd.classList.add('open');buildLangList('');setTimeout(()=>{const s=document.getElementById('lang-search');if(s)s.focus();},50);}
};
window.filterLangs=function(v){buildLangList(v);};
window.pickLang=function(code,name){
  uiLang=code;
  const ind=document.getElementById('lang-indicator-text');if(ind)ind.textContent=name;
  const dd=document.getElementById('lang-dropdown');if(dd)dd.classList.remove('open');
  const s=document.getElementById('lang-search');if(s)s.value='';
  restart();
};
document.addEventListener('click',function(e){
  const wrap=document.getElementById('lang-dropdown-wrap');
  if(wrap&&!wrap.contains(e.target)){const dd=document.getElementById('lang-dropdown');if(dd)dd.classList.remove('open');}
});

/* ═══════════════════════════════════════════════════════════════════════
   MODE
═══════════════════════════════════════════════════════════════════════ */
function showGroup(id,show){const el=document.getElementById(id);if(el)el.classList.toggle('visible',show);}
window.setMode=function(m,id){
  mode=m; isZen=(m==='zen');
  document.querySelectorAll('#mode-group .config-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const hasTimer=(m==='time'||m==='words');
  const hasPunct=(m==='time'||m==='words'||m==='custom');
  showGroup('time-group',hasTimer);showGroup('time-sep',hasTimer);
  showGroup('extra-group',hasPunct);showGroup('extra-sep',hasPunct);
  showGroup('quote-group',m==='quote');showGroup('quote-sep',m==='quote');
  restart();
};
(function(){showGroup('time-group',true);showGroup('time-sep',true);showGroup('extra-group',true);showGroup('extra-sep',true);})();
window.setQuoteLen=function(len,id){
  quoteLen=len;
  document.querySelectorAll('#quote-group .config-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  restart();
};
window.setTime=function(t,id){
  totalTime=t;timeLeft=t;
  document.querySelectorAll('#time-group .config-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('timer-display').textContent=mode==='time'?t:'0';
  restart();
};
window.toggleSpecialMode=function(el,smode){
  const isActive=el.classList.contains('active');
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
    const ctx=getAudioCtx(),now=ctx.currentTime;
    let osc,gain,buf,src;
    if(type==='click'){
      buf=ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.008));
      src=ctx.createBufferSource();src.buffer=buf;
      const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=1000;
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
      const td=buf.getChannelData(0);
      for(let j=0;j<td.length;j++)td[j]=(Math.random()*2-1)*Math.exp(-j/(ctx.sampleRate*0.005));
      src=ctx.createBufferSource();src.buffer=buf;
      const tf=ctx.createBiquadFilter();tf.type='bandpass';tf.frequency.value=3000;tf.Q.value=0.5;
      src.connect(tf);tf.connect(ctx.destination);src.start();
    }else if(type==='pentatonic'){
      const notes=[261.63,293.66,329.63,392.00,440.00,523.25];
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
  document.querySelectorAll('.sound-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  if(type!=='off')playSound(type);
};

/* ═══════════════════════════════════════════════════════════════════════
   WORD GENERATION
═══════════════════════════════════════════════════════════════════════ */
const PUNCTS=[',','.','!','?',';',':'];
function generateWords(seedWords){
  if(seedWords)return seedWords;
  if(mode==='quote'){
    let pool=QUOTES;
    if(quoteLen==='short')pool=QUOTES.filter(q=>q.split(' ').length<=8);
    if(quoteLen==='medium')pool=QUOTES.filter(q=>{const n=q.split(' ').length;return n>8&&n<=15;});
    if(quoteLen==='long')pool=QUOTES.filter(q=>{const n=q.split(' ').length;return n>15&&n<=25;});
    if(quoteLen==='thicc')pool=QUOTES.filter(q=>q.split(' ').length>25);
    if(!pool||!pool.length)pool=QUOTES;
    return pool[Math.floor(Math.random()*pool.length)].split(' ');
  }
  if(mode==='custom')return customText.trim().split(/\s+/);
  if(mode==='zen')return[];
  const list=WORDS[uiLang]||WORDS.en;
  const count=mode==='words'?30:50;
  return Array.from({length:count},()=>{
    let w=list[Math.floor(Math.random()*list.length)];
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
  const inner=document.getElementById('words-inner');
  inner.style.top='0px';inner.innerHTML='';

  if(mode==='zen'){
    const ew=document.createElement('span');ew.className='word';ew.id='word-0';inner.appendChild(ew);
    currentWordIndex=0;
  }else{
    words.forEach((word,wi)=>{
      const we=document.createElement('span');we.className='word';we.id='word-'+wi;
      word.split('').forEach((ch,ci)=>{
        const le=document.createElement('span');le.className='letter';le.id='l-'+wi+'-'+ci;le.textContent=ch;we.appendChild(le);
      });
      inner.appendChild(we);
    });
  }

  // Cursor
  const cursor=document.createElement('div');
  cursor.className='cursor-line caret-'+caretStyle;
  cursor.id='cursor';inner.appendChild(cursor);

  // Highlight first word
  highlightWord(0);
  updateLineH();
  updateWordProgress();
}

/* ═══════════════════════════════════════════════════════════════════════
   LINE HEIGHT
═══════════════════════════════════════════════════════════════════════ */
function updateLineH(){
  const d=document.getElementById('words-display');if(!d)return;
  const lh=parseFloat(getComputedStyle(d).lineHeight);
  const fs=parseFloat(getComputedStyle(d).fontSize);
  lineH2=isNaN(lh)?fs*2.4:lh;
}

/* ═══════════════════════════════════════════════════════════════════════
   WORD HIGHLIGHT
═══════════════════════════════════════════════════════════════════════ */
function highlightWord(idx){
  document.querySelectorAll('.word').forEach(w=>w.classList.remove('active-word'));
  const w=document.getElementById('word-'+idx);if(w)w.classList.add('active-word');
}

/* ═══════════════════════════════════════════════════════════════════════
   CURSOR POSITION — smooth, baseline aligned
═══════════════════════════════════════════════════════════════════════ */
function positionCursor(){
  const cursor=document.getElementById('cursor');
  const inner=document.getElementById('words-inner');
  const wordEl=document.getElementById('word-'+currentWordIndex);
  if(!wordEl||!inner||!cursor)return;

  updateLineH();
  const display=document.getElementById('words-display');
  const fontSize=display?parseFloat(getComputedStyle(display).fontSize):lineH2/2.4;
  // For underline caret: push to bottom of line; for others: center vertically
  const isUnderline=(caretStyle==='underline');
  const isBlock=(caretStyle==='block');
  // vertical offset to align with text baseline area
  const vOffset=isUnderline?(lineH2-fontSize*0.1)/2:(lineH2-fontSize*1.1)/2;

  const letters=mode==='zen'?wordEl.querySelectorAll('.zen-letter'):wordEl.querySelectorAll('.letter');
  let left,top;

  if(currentInput.length===0){
    if(mode==='zen'){
      if(letters.length>0){
        const zl=letters[letters.length-1];
        left=wordEl.offsetLeft+zl.offsetLeft+zl.offsetWidth;top=wordEl.offsetTop+zl.offsetTop;
      }else if(currentWordIndex>0){
        const pw=document.getElementById('word-'+(currentWordIndex-1));
        if(pw){const pls=pw.querySelectorAll('.zen-letter');if(pls.length>0){const pl=pls[pls.length-1];left=pw.offsetLeft+pl.offsetLeft+pl.offsetWidth+8;top=pw.offsetTop+pl.offsetTop;}else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}}
        else{left=0;top=0;}
      }else{left=0;top=0;}
    }else{
      if(letters.length>0){const fl=letters[0];left=wordEl.offsetLeft+fl.offsetLeft;top=wordEl.offsetTop+fl.offsetTop;}
      else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}
    }
  }else{
    if(letters.length>0){
      const idx=Math.min(currentInput.length-1,letters.length-1);
      const lt=letters[idx];
      left=wordEl.offsetLeft+lt.offsetLeft+lt.offsetWidth;top=wordEl.offsetTop+lt.offsetTop;
    }else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}
  }

  cursor.style.left=left+'px';
  cursor.style.top=(top+vOffset)+'px';

  // Scroll words up when cursor reaches 3rd line
  if(lineH2>0&&top>=lineH2*2.1){
    const currentTop=parseInt(inner.style.top||'0',10);
    inner.style.top=(currentTop-lineH2)+'px';
    cursor.style.top=(top-lineH2+vOffset)+'px';
  }
}

function resetCursorBlink(){
  const cursor=document.getElementById('cursor');if(!cursor)return;
  cursor.style.animation='none';cursor.style.opacity='1';
  void cursor.offsetWidth;
  cursor.style.animation='cursorBlink 1s ease-in-out infinite';
}

/* ═══════════════════════════════════════════════════════════════════════
   LETTER COLORING
═══════════════════════════════════════════════════════════════════════ */
const THEME_CLASSES=['theme-classic','theme-rgb','theme-matrix','theme-neon','theme-fire','theme-ocean','theme-purple','theme-rose','theme-mint','theme-gold'];
function animateLetter(li,type){
  const we=document.getElementById('word-'+currentWordIndex);if(!we)return;
  const letters=we.querySelectorAll('.letter');
  if(li>=0&&li<letters.length){
    const l=letters[li];
    l.classList.remove('correct','wrong','deleting',...THEME_CLASSES);
    if(type==='add'){
      const isCorrect=currentInput[li]===words[currentWordIndex][li];
      l.classList.add(isCorrect?'correct':'wrong','theme-'+colorTheme);
    }else if(type==='delete'){
      l.classList.add('deleting');
      setTimeout(()=>{l.classList.remove('deleting','correct','wrong',...THEME_CLASSES);},100);
    }
  }
}
function colorLetters(){
  const we=document.getElementById('word-'+currentWordIndex);if(!we)return;
  const letters=we.querySelectorAll('.letter');
  const ws=words[currentWordIndex]||'';
  letters.forEach(l=>l.classList.remove('correct','wrong',...THEME_CLASSES));
  for(let i=0;i<currentInput.length&&i<ws.length;i++){
    letters[i].classList.add(currentInput[i]===ws[i]?'correct':'wrong','theme-'+colorTheme);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════════════════════ */
function applyStatsLayout(){
  const sw=document.getElementById('stat-wpm'),sa=document.getElementById('stat-acc');
  const ts=document.getElementById('timer-stat'),sp=document.getElementById('stat-progress');
  const se=document.getElementById('stat-err');
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
function updateWordProgress(){const el=document.getElementById('live-progress');if(el)el.textContent=currentWordIndex+'/'+words.length;}
function updateLiveStats(){
  const elapsed=mode==='time'?(totalTime-timeLeft):wpmTick;
  const wpm=elapsed>0?Math.round((correctWords/elapsed)*60):0;
  const total=totalCorrectChars+totalWrongChars;
  const acc=total>0?Math.round((totalCorrectChars/total)*100):100;
  document.getElementById('live-wpm').textContent=wpm;
  document.getElementById('live-acc').textContent=acc+'%';
  if(mode==='zen'){const el=document.getElementById('live-progress');if(el)el.textContent=correctWords;}
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
  document.getElementById('live-stats').classList.add('visible');
  document.getElementById('click-hint').style.opacity='0.3';
  wpmTick=0;wpmHistory=[];rawHistory=[];
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    if(finished)return;
    if(mode==='time'){
      timeLeft--;
      const td=document.getElementById('timer-display');td.textContent=timeLeft;
      if(timeLeft<=5)td.classList.add('warning');
      if(timeLeft<=0){endTest();return;}
    }else{wpmTick++;document.getElementById('timer-display').textContent=wpmTick;}
    // raw wpm for consistency
    const totalTyped=totalCorrectChars+totalWrongChars;
    const elapsed=mode==='time'?(totalTime-timeLeft):wpmTick;
    const raw=elapsed>0?Math.round((totalTyped/5)/(elapsed/60)):0;
    rawHistory.push(raw);
    updateLiveStats();
  },1000);
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSISTENCY CALCULATION
═══════════════════════════════════════════════════════════════════════ */
function calcConsistency(arr){
  if(!arr||arr.length<2)return 100;
  const mean=arr.reduce((a,b)=>a+b,0)/arr.length;
  const variance=arr.reduce((s,v)=>s+Math.pow(v-mean,2),0)/arr.length;
  const std=Math.sqrt(variance);
  const cv=mean>0?(std/mean)*100:0;
  return Math.max(0,Math.round(100-cv));
}

/* ═══════════════════════════════════════════════════════════════════════
   CONFETTI
═══════════════════════════════════════════════════════════════════════ */
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas');
  canvas.style.display='block';
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const pieces=[];
  const colors=['#7c6af7','#f7c26a','#6af7b2','#f76a8a','#60d0ff','#ff80ab'];
  for(let i=0;i<160;i++){
    pieces.push({
      x:Math.random()*canvas.width,y:-10,
      w:Math.random()*12+4,h:Math.random()*6+3,
      color:colors[Math.floor(Math.random()*colors.length)],
      rot:Math.random()*360,rotSpeed:(Math.random()-0.5)*8,
      vx:(Math.random()-0.5)*6,vy:Math.random()*4+2,
      opacity:1,
    });
  }
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.globalAlpha=p.opacity;ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.rotSpeed;p.vy+=0.07;
      if(frame>80)p.opacity-=0.015;
    });
    frame++;
    if(frame<160&&pieces.some(p=>p.opacity>0))requestAnimationFrame(draw);
    else{canvas.style.display='none';ctx.clearRect(0,0,canvas.width,canvas.height);}
  }
  draw();
}

/* ═══════════════════════════════════════════════════════════════════════
   PERSONAL BEST
═══════════════════════════════════════════════════════════════════════ */
function checkPB(wpm){
  try{
    const key=`typeradar_pb_${mode}_${totalTime}`;
    const prev=parseInt(localStorage.getItem(key)||'0');
    if(wpm>prev){
      localStorage.setItem(key,wpm);
      const badge=document.getElementById('pb-badge');
      if(badge){badge.classList.add('visible');setTimeout(()=>badge.classList.remove('visible'),4000);}
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

  const elapsed=mode==='time'?totalTime:wpmTick;
  const wpm=Math.round((correctWords/Math.max(elapsed,1))*60);
  const rawWpm=Math.round(((totalCorrectChars+totalWrongChars)/5)/(Math.max(elapsed,1)/60));
  const total=totalCorrectChars+totalWrongChars;
  const acc=total>0?Math.round((totalCorrectChars/total)*100):100;
  const consistency=calcConsistency(rawHistory);

  document.getElementById('res-wpm').textContent=wpm;
  document.getElementById('res-acc').textContent=acc+'%';
  document.getElementById('res-raw').textContent=rawWpm;
  document.getElementById('res-chars').textContent=`${totalCorrectChars}/${totalWrongChars}/0/${totalErrors}`;
  document.getElementById('res-consistency').textContent=consistency+'%';
  document.getElementById('res-time').textContent=elapsed+'s';
  document.getElementById('res-type').textContent=`${mode} ${mode==='time'?totalTime+'s':''} `;
  document.getElementById('res-lang').textContent=uiLang;

  drawResultChart();
  document.getElementById('test-screen').style.display='none';
  document.getElementById('result-screen').style.display='flex';

  // PB check
  const isPB=checkPB(wpm);
  if(isPB||wpm>=80)launchConfetti();

  // Save to Supabase
  if(currentUser)saveResult(wpm,acc,rawWpm,consistency);

  // Daily mode save
  if(isDailyMode&&currentUser){
    saveDailyResult(wpm,acc);
    isDailyMode=false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   RESULT CHART
═══════════════════════════════════════════════════════════════════════ */
function drawResultChart(){
  const canvas=document.getElementById('wpm-chart');
  const wrapper=canvas.parentElement;
  const dpr=window.devicePixelRatio||1;
  const W_css=wrapper.offsetWidth||640,H_css=160;
  canvas.style.width=W_css+'px';canvas.style.height=H_css+'px';
  canvas.width=W_css*dpr;canvas.height=H_css*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const W=W_css,H=H_css;
  ctx.clearRect(0,0,W,H);

  const data=wpmHistory.length>0?wpmHistory:[0];
  const rawData=rawHistory.length>0?rawHistory:null;
  const maxV=Math.max(...data.concat(rawData||[]).concat([10]));
  const maxVR=Math.ceil(maxV/10)*10;
  const pad={t:16,b:32,l:40,r:20};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const px=i=>pad.l+(data.length<=1?cW/2:(i/(data.length-1))*cW);
  const py=v=>pad.t+cH-(v/maxVR)*cH;

  // Grid
  ctx.font=`11px 'JetBrains Mono', monospace`;
  ctx.textAlign='right';
  for(let g=0;g<=4;g++){
    const gVal=Math.round((maxVR/4)*g);
    const gY=py(gVal);
    ctx.beginPath();ctx.moveTo(pad.l,gY);ctx.lineTo(W-pad.r,gY);
    ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillText(gVal,pad.l-6,gY+4);
  }
  // X labels
  ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.25)';
  const xCount=Math.min(data.length,8);
  for(let xi=0;xi<xCount;xi++){
    const xIdx=Math.round((xi/Math.max(xCount-1,1))*(data.length-1));
    ctx.fillText(xIdx+'s',px(xIdx),H-8);
  }

  // Raw WPM line (gray)
  if(rawData&&rawData.length>1){
    ctx.beginPath();ctx.moveTo(px(0),py(rawData[0]));
    for(let i=1;i<Math.min(rawData.length,data.length);i++){
      const cpx=px(i-0.5);
      ctx.bezierCurveTo(cpx,py(rawData[i-1]),cpx,py(rawData[i]),px(i),py(rawData[i]));
    }
    ctx.strokeStyle='rgba(180,180,180,0.35)';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }

  // WPM fill gradient
  if(data.length>1){
    const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
    grad.addColorStop(0,'rgba(124,106,247,0.25)');grad.addColorStop(1,'rgba(124,106,247,0.02)');
    ctx.beginPath();ctx.moveTo(px(0),py(data[0]));
    for(let fi=1;fi<data.length;fi++){const cpx=px(fi-0.5);ctx.bezierCurveTo(cpx,py(data[fi-1]),cpx,py(data[fi]),px(fi),py(data[fi]));}
    ctx.lineTo(px(data.length-1),H-pad.b);ctx.lineTo(px(0),H-pad.b);
    ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    // WPM line
    ctx.beginPath();ctx.moveTo(px(0),py(data[0]));
    for(let si=1;si<data.length;si++){const sx=px(si-0.5);ctx.bezierCurveTo(sx,py(data[si-1]),sx,py(data[si]),px(si),py(data[si]));}
    ctx.strokeStyle='rgba(124,106,247,1)';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }
  // Dots
  for(let di=0;di<data.length;di++){
    ctx.beginPath();ctx.arc(px(di),py(data[di]),2.5,0,Math.PI*2);ctx.fillStyle='rgba(124,106,247,1)';ctx.fill();
  }
  // Last dot accent
  ctx.beginPath();ctx.arc(px(data.length-1),py(data[data.length-1]),5,0,Math.PI*2);ctx.fillStyle='rgba(124,106,247,0.3)';ctx.fill();
  ctx.beginPath();ctx.arc(px(data.length-1),py(data[data.length-1]),3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();

  // Error markers
  if(totalErrors>0){
    ctx.fillStyle='rgba(247,106,138,0.8)';
    ctx.font='10px JetBrains Mono,monospace';ctx.textAlign='center';
    ctx.fillText('× '+totalErrors,W-pad.r,pad.t+12);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SHARE
═══════════════════════════════════════════════════════════════════════ */
window.shareResult=function(){
  const wpm=document.getElementById('res-wpm').textContent;
  const acc=document.getElementById('res-acc').textContent;
  const text=`TypeRadar result\n⌨️ ${wpm} wpm  ✓ ${acc}\nmode: ${mode} ${mode==='time'?totalTime+'s':''}\ntyperadar.com`;
  navigator.clipboard.writeText(text).then(showShareToast).catch(()=>{
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showShareToast();
  });
};
function showShareToast(){
  const t=document.getElementById('share-toast');t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2000);
}

/* ═══════════════════════════════════════════════════════════════════════
   RESTART
═══════════════════════════════════════════════════════════════════════ */
window.restart=function(seedWords){
  clearInterval(timerInterval);
  started=false;finished=false;isDailyMode=false;
  currentWordIndex=0;currentInput='';
  totalCorrectChars=0;totalWrongChars=0;correctWords=0;wrongWords=0;totalErrors=0;
  wpmHistory=[];rawHistory=[];wpmTick=0;wordHistory=[];timeLeft=totalTime;lastKeyTime=0;

  document.getElementById('timer-display').textContent=mode==='time'?totalTime:'0';
  document.getElementById('timer-display').classList.remove('warning');
  document.getElementById('live-wpm').textContent='0';
  document.getElementById('live-acc').textContent='100%';
  document.getElementById('live-err').textContent='0';
  document.getElementById('live-stats').classList.remove('visible');
  document.getElementById('click-hint').style.opacity='0.6';
  document.getElementById('result-screen').style.display='none';
  document.getElementById('test-screen').style.display='flex';
  typingContainer.classList.remove('blind-mode');

  buildDisplay(seedWords);
  setTimeout(()=>{positionCursor();resetCursorBlink();hiddenInput.value='';setTimeout(focusInput,100);},60);
};

/* ═══════════════════════════════════════════════════════════════════════
   KEY PROCESSING
═══════════════════════════════════════════════════════════════════════ */
function processKey(key){
  if(finished)return;
  if(!started&&key!=='Backspace'&&key!==' ')startTimer();
  if(key!=='Backspace'&&key!==' ')playSound(soundEffect);

  const wordStr=words[currentWordIndex]||'';

  if(key==='Backspace'){
    if(useConfidence)return;
    if(mode==='zen'){
      if(currentInput.length>0){
        const we=document.getElementById('word-'+currentWordIndex);
        if(we&&we.lastChild&&we.lastChild.classList.contains('zen-letter'))we.removeChild(we.lastChild);
        currentInput=currentInput.slice(0,-1);positionCursor();
      }else if(currentWordIndex>0){
        const inner=document.getElementById('words-inner');
        const ew=document.getElementById('word-'+currentWordIndex);if(ew)inner.removeChild(ew);
        currentWordIndex--;correctWords=Math.max(0,correctWords-1);
        const pw=document.getElementById('word-'+currentWordIndex);
        if(pw)currentInput=Array.from(pw.querySelectorAll('.zen-letter')).map(l=>l.textContent).join('');
        highlightWord(currentWordIndex);positionCursor();
      }
      return;
    }
    if(currentInput.length>0){
      const di=currentInput.length-1;animateLetter(di,'delete');
      setTimeout(()=>{currentInput=currentInput.slice(0,-1);colorLetters();positionCursor();},30);
    }else if(currentWordIndex>0){
      const prev=wordHistory[wordHistory.length-1];
      if(prev&&!prev.locked){
        wordHistory.pop();currentWordIndex--;
        const pws=words[currentWordIndex];const pi=prev.input;
        const len=Math.min(pi.length,pws.length);
        for(let i=0;i<len;i++){if(pi[i]===pws[i])totalCorrectChars--;else totalWrongChars--;}
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
      const inner=document.getElementById('words-inner');
      const nw=document.createElement('span');nw.className='word';nw.id='word-'+currentWordIndex;inner.appendChild(nw);
      highlightWord(currentWordIndex);positionCursor();return;
    }
    if(currentInput.length===0)return;
    const wasCorrect=(currentInput===wordStr);
    wordHistory.push({input:currentInput,wasCorrect,locked:wasCorrect});
    const pwe=document.getElementById('word-'+currentWordIndex);
    if(pwe)pwe.classList.toggle('has-error',!wasCorrect);
    const len=Math.min(currentInput.length,wordStr.length);
    for(let i=0;i<len;i++){if(currentInput[i]===wordStr[i])totalCorrectChars++;else totalWrongChars++;}
    totalWrongChars+=Math.max(0,wordStr.length-currentInput.length);
    if(wasCorrect)correctWords++;else wrongWords++;
    currentInput='';currentWordIndex++;
    if((mode==='words'||mode==='quote'||mode==='custom')&&currentWordIndex>=words.length){endTest();return;}
    highlightWord(currentWordIndex);colorLetters();positionCursor();updateLiveStats();return;
  }

  if(key.length===1){
    if(mode==='zen'){
      const we=document.getElementById('word-'+currentWordIndex);if(!we)return;
      const le=document.createElement('span');le.className='letter zen-letter correct theme-'+colorTheme;le.textContent=key;we.appendChild(le);
      currentInput+=key;positionCursor();return;
    }
    if(currentInput.length>=wordStr.length+5)return;
    const ni=currentInput.length;
    if(ni<wordStr.length&&key!==wordStr[ni]){totalErrors++;document.getElementById('live-err').textContent=totalErrors;}
    currentInput+=key;
    setTimeout(()=>{animateLetter(ni,'add');positionCursor();},10);
    updateLiveStats();
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   FOCUS
═══════════════════════════════════════════════════════════════════════ */
window.focusInput=function(fromClick){
  const isTouch=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
  if(isTouch&&!fromClick)return;
  if(!finished&&document.getElementById('test-screen').style.display!=='none')hiddenInput.focus();
};

/* ═══════════════════════════════════════════════════════════════════════
   SETTINGS MODAL
═══════════════════════════════════════════════════════════════════════ */
window.openSettings=function(){buildFontGrid();buildBgThemeGrid();document.getElementById('settings-modal').style.display='flex';};
window.closeSettings=function(){document.getElementById('settings-modal').style.display='none';setTimeout(()=>{if(!('ontouchstart' in window))hiddenInput.focus();},100);};
window.saveCustomText=function(){
  const ta=document.getElementById('custom-text-input');const text=ta.value.trim();if(!text)return;
  customText=text;try{localStorage.setItem('typeradar_custom_text',customText);}catch(e){}
  closeSettings();if(mode==='custom')restart();
};

/* ═══════════════════════════════════════════════════════════════════════
   AUTH — SUPABASE
═══════════════════════════════════════════════════════════════════════ */
window.openAuth=function(){
  if(currentUser)showProfileInModal();
  else showLoginInModal();
  document.getElementById('auth-modal').style.display='flex';
};
window.closeAuth=function(){document.getElementById('auth-modal').style.display='none';};

function showLoginInModal(){
  document.getElementById('auth-form-area').style.display='block';
  document.getElementById('auth-profile-area').style.display='none';
}
function showProfileInModal(){
  document.getElementById('auth-form-area').style.display='none';
  document.getElementById('auth-profile-area').style.display='block';
  if(currentProfile){
    const av=document.getElementById('profile-avatar');
    if(av)av.textContent=(currentProfile.username||'?')[0].toUpperCase();
    const un=document.getElementById('profile-username');
    if(un)un.textContent=currentProfile.username||currentUser.email;
    const pj=document.getElementById('profile-joined');
    if(pj)pj.textContent='joined '+new Date(currentProfile.created_at||currentUser.created_at).toLocaleDateString();
    loadProfileStats();
  }
}

window.switchAuthTab=function(tab){
  document.getElementById('tab-signin').classList.toggle('active',tab==='signin');
  document.getElementById('tab-signup').classList.toggle('active',tab==='signup');
  document.getElementById('auth-signin-form').style.display=tab==='signin'?'block':'none';
  document.getElementById('auth-signup-form').style.display=tab==='signup'?'block':'none';
  document.getElementById('signin-err').textContent='';
  document.getElementById('signup-err').textContent='';
};

window.doSignIn=async function(){
  const email=document.getElementById('signin-email').value.trim();
  const pass=document.getElementById('signin-pass').value;
  const err=document.getElementById('signin-err');
  if(!email||!pass){err.textContent='Please fill all fields';return;}
  err.textContent='signing in...';
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error){err.textContent=error.message;return;}
    if(data.user){
      currentUser=data.user;
      await loadProfile(data.user.id);
      err.textContent='';
      closeAuth();
    }
  }catch(e){err.textContent='Network error, try again';}
};

window.doSignUp=async function(){
  const username=document.getElementById('signup-username').value.trim();
  const email=document.getElementById('signup-email').value.trim();
  const pass=document.getElementById('signup-pass').value;
  const err=document.getElementById('signup-err');
  if(!username||username.length<3){err.textContent='Username must be at least 3 chars';return;}
  if(!email||!pass||pass.length<6){err.textContent='Fill all fields (password min 6 chars)';return;}
  err.textContent='creating account...';
  try{
    // Step 1: sign up
    const {data,error}=await sb.auth.signUp({email,password:pass});
    if(error){err.textContent=error.message;return;}
    if(!data.user){err.textContent='Signup failed, try again';return;}

    // Step 2: sign in to get valid session
    const {data:sinData,error:sinErr}=await sb.auth.signInWithPassword({email,password:pass});
    if(sinErr||!sinData||!sinData.user){
      err.textContent='Account created! Please sign in.';return;
    }

    // Step 3: insert profile with the authenticated session
    const uid=sinData.user.id;
    const {error:pe}=await sb.from('profiles').insert({id:uid,username});
    if(pe){
      if(pe.message.includes('duplicate')||pe.message.includes('unique')){
        // Profile already exists, just load it
      } else {
        err.textContent='Profile error: '+pe.message;return;
      }
    }

    // Step 4: load and show
    currentUser=sinData.user;
    await loadProfile(uid);
    err.textContent='';
    closeAuth();
  }catch(e){err.textContent='Error: '+e.message;}
};

window.doSignOut=function(){
  // Sadece Supabase session key'lerini sil, diğer ayarları koru
  try{
    Object.keys(localStorage)
      .filter(k=>k.startsWith('sb-')||k.includes('supabase'))
      .forEach(k=>localStorage.removeItem(k));
  }catch(e){}
  try{sb.auth.signOut();}catch(e){}
  window.location.href=window.location.origin+window.location.pathname;
};

async function loadProfile(userId){
  const {data}=await sb.from('profiles').select('*').eq('id',userId).single();
  currentProfile=data;
  updateAuthUI();
}
async function loadProfileStats(){
  if(!currentUser)return;
  const {data}=await sb.from('results').select('wpm,accuracy').eq('user_id',currentUser.id).order('wpm',{ascending:false}).limit(50);
  const ps=document.getElementById('profile-stats');if(!ps)return;
  if(data&&data.length>0){
    const bestWpm=data[0].wpm;
    const avgWpm=Math.round(data.reduce((s,r)=>s+r.wpm,0)/data.length);
    const tests=data.length;
    ps.innerHTML=`
      <div class="ps-item"><div class="ps-label">best wpm</div><div class="ps-val">${bestWpm}</div></div>
      <div class="ps-item"><div class="ps-label">avg wpm</div><div class="ps-val">${avgWpm}</div></div>
      <div class="ps-item"><div class="ps-label">tests</div><div class="ps-val">${tests}</div></div>
      <div class="ps-item"><div class="ps-label">best acc</div><div class="ps-val">${Math.max(...data.map(r=>r.accuracy))}%</div></div>
    `;
  }else{
    ps.innerHTML='<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.78rem;">no tests yet</div>';
  }
}
function updateAuthUI(){
  const btn=document.getElementById('auth-btn');if(!btn)return;
  if(currentUser&&currentProfile){
    btn.textContent=currentProfile.username||currentUser.email.split('@')[0];
    btn.classList.add('user-logged');
  }else{
    btn.textContent='sign in';btn.classList.remove('user-logged');
  }
}

async function saveResult(wpm,acc,raw,consistency){
  if(!currentUser)return;
  try{
    const {error}=await sb.from("results").insert({
      user_id:currentUser.id,wpm:wpm||0,accuracy:acc||0,raw_wpm:raw||0,
      mode:mode||"time",time_seconds:mode==="time"?totalTime:(wpmTick||0),language:uiLang||"en",consistency:consistency||0
    });
    if(error)console.log("saveResult error:",error.message);
  }catch(e){console.log("saveResult exception:",e);}
}

/* ═══════════════════════════════════════════════════════════════════════
   LEADERBOARD
═══════════════════════════════════════════════════════════════════════ */
let lbMode='time',lbTime=30;
window.openLeaderboard=function(){
  document.getElementById('leaderboard-modal').style.display='flex';
  loadLeaderboard('time',30,document.querySelector('.lb-tab'));
};
window.closeLeaderboard=function(){document.getElementById('leaderboard-modal').style.display='none';};
window.loadLeaderboard=async function(m,t,el){
  lbMode=m;lbTime=t;
  document.querySelectorAll('.lb-tab').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  const list=document.getElementById('lb-list');
  list.innerHTML='<div class="lb-loading">loading...</div>';

  const {data,error}=await sb.from('results')
    .select('wpm,accuracy,profiles(username)')
    .eq('mode',m).eq('time_seconds',t)
    .order('wpm',{ascending:false}).limit(50);

  if(error||!data){list.innerHTML='<div class="lb-loading">failed to load</div>';return;}

  // Deduplicate by username — keep best
  const best={};
  data.forEach(r=>{
    const u=r.profiles?.username||'anonymous';
    if(!best[u]||r.wpm>best[u].wpm)best[u]={wpm:r.wpm,accuracy:r.accuracy,username:u};
  });
  const rows=Object.values(best).sort((a,b)=>b.wpm-a.wpm).slice(0,20);

  if(rows.length===0){list.innerHTML='<div class="lb-loading">no results yet — be first!</div>';return;}
  const rankIcons=['🥇','🥈','🥉'];
  list.innerHTML=rows.map((r,i)=>{
    const isMe=currentProfile&&r.username===currentProfile.username;
    const rankDisplay=i<3?`<span class="lb-rank ${['gold','silver','bronze'][i]}">${rankIcons[i]}</span>`:`<span class="lb-rank">${i+1}</span>`;
    return `<div class="lb-row${isMe?' me':''}">
      ${rankDisplay}
      <span class="lb-user">${r.username}</span>
      <span class="lb-wpm">${r.wpm}</span>
      <span class="lb-acc">${r.accuracy}%</span>
    </div>`;
  }).join('');
};

/* ═══════════════════════════════════════════════════════════════════════
   DAILY CHALLENGE
═══════════════════════════════════════════════════════════════════════ */
function getDailyDateStr(){
  const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getDailySeed(){
  // Deterministic daily words from date
  const dateStr=getDailyDateStr();
  let hash=0;for(let i=0;i<dateStr.length;i++)hash=((hash<<5)-hash)+dateStr.charCodeAt(i);
  const rng=(s)=>{s=Math.sin(s)*10000;return s-Math.floor(s);};
  const list=WORDS['en']||[];const count=30;const chosen=[];
  for(let i=0;i<count;i++){
    const idx=Math.floor(rng(hash+i)*list.length);
    chosen.push(list[idx]||'the');
  }
  return chosen;
}

window.openDaily=function(){
  const dateStr=getDailyDateStr();
  const dateBadge=document.getElementById('daily-date');if(dateBadge)dateBadge.textContent=dateStr;
  document.getElementById('daily-modal').style.display='flex';
  loadDailyBoard();
  // Check if user already did today
  const savedKey=`typeradar_daily_${dateStr}`;
  try{
    const saved=localStorage.getItem(savedKey);
    if(saved){
      const result=JSON.parse(saved);
      const mr=document.getElementById('daily-my-result');
      if(mr){mr.style.display='block';mr.innerHTML=`<div style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--correct);margin-bottom:12px;">✓ Today's result: <strong>${result.wpm} wpm</strong> — ${result.accuracy}% acc</div>`;}
      const startBtn=document.getElementById('daily-start-btn');if(startBtn)startBtn.textContent='redo challenge';
    }
  }catch(e){}
};
window.closeDaily=function(){document.getElementById('daily-modal').style.display='none';};

window.startDaily=function(){
  closeDaily();
  isDailyMode=true;
  const seed=getDailySeed();
  // Force time mode 30s
  mode='time';totalTime=30;timeLeft=30;
  document.querySelectorAll('#mode-group .config-btn').forEach(b=>b.classList.remove('active'));
  const mb=document.getElementById('mode-time');if(mb)mb.classList.add('active');
  document.querySelectorAll('#time-group .config-btn').forEach(b=>b.classList.remove('active'));
  const tb=document.getElementById('t-30');if(tb)tb.classList.add('active');
  showGroup('time-group',true);showGroup('time-sep',true);
  showGroup('extra-group',true);showGroup('extra-sep',true);
  restart(seed);
};

async function saveDailyResult(wpm,acc){
  const dateStr=getDailyDateStr();
  const key=`typeradar_daily_${dateStr}`;
  try{localStorage.setItem(key,JSON.stringify({wpm,accuracy:acc}));}catch(e){}
  if(!currentUser||!currentProfile)return;
  // Upsert daily result
  await sb.from('daily_results').upsert({
    user_id:currentUser.id,username:currentProfile.username,
    date:dateStr,wpm,accuracy:acc
  },{onConflict:'user_id,date'});
}

async function loadDailyBoard(){
  const dateStr=getDailyDateStr();
  const board=document.getElementById('daily-board');
  if(!board)return;
  board.innerHTML='<div class="lb-loading">loading...</div>';
  // Try daily_results table (may not exist yet — will fail gracefully)
  const {data,error}=await sb.from('daily_results')
    .select('username,wpm,accuracy').eq('date',dateStr)
    .order('wpm',{ascending:false}).limit(20);
  if(error||!data||data.length===0){
    board.innerHTML='<div class="lb-loading">no entries yet — be first!</div>';return;
  }
  const rankIcons=['🥇','🥈','🥉'];
  board.innerHTML=data.map((r,i)=>{
    const isMe=currentProfile&&r.username===currentProfile.username;
    const rankD=i<3?`<span class="lb-rank ${['gold','silver','bronze'][i]}">${rankIcons[i]}</span>`:`<span class="lb-rank">${i+1}</span>`;
    return `<div class="lb-row${isMe?' me':''}">
      ${rankD}<span class="lb-user">${r.username}</span>
      <span class="lb-wpm">${r.wpm}</span><span class="lb-acc">${r.accuracy}%</span>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════
   KEYBOARD EVENTS
═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown',function(e){
  const capsOn=e.getModifierState&&e.getModifierState('CapsLock');
  const warn=document.getElementById('caps-warning');
  if(warn)warn.classList.toggle('visible',!!capsOn);
});
document.addEventListener('keyup',function(e){
  const capsOn=e.getModifierState&&e.getModifierState('CapsLock');
  const warn=document.getElementById('caps-warning');
  if(warn)warn.classList.toggle('visible',!!capsOn);
});
document.addEventListener('keydown',function(e){
  if(document.getElementById('settings-modal').style.display==='flex'||
     document.getElementById('auth-modal').style.display==='flex'||
     document.getElementById('leaderboard-modal').style.display==='flex'||
     document.getElementById('daily-modal').style.display==='flex'){
    if(e.key==='Escape'){
      closeSettings();closeAuth();closeLeaderboard();closeDaily();e.preventDefault();
    }
    return;
  }
  const key=e.key;
  if(key==='Tab'){e.preventDefault();restart();return;}
  if(key==='Escape'){e.preventDefault();restart();return;}
  if(key==='Enter'&&mode==='zen'&&e.shiftKey){e.preventDefault();if(started)endTest();return;}
  const ignored=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown',
    'Shift','Control','Alt','Meta','CapsLock','Insert','Delete','Enter',
    'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
  if(ignored.includes(key))return;
  if(key==='Backspace'||key===' '){e.preventDefault();if(!finished){lastKeyTime=Date.now();processKey(key);}return;}
  e.preventDefault();if(!finished)processKey(key);
});

hiddenInput.addEventListener('input',function(e){
  if(finished)return;
  if(Date.now()-lastKeyTime<30)return;
  const itype=e.inputType||'';
  if(itype==='deleteContentBackward'||itype==='deleteWordBackward'){
    this.value='';lastKeyTime=Date.now();processKey('Backspace');return;
  }
  const val=this.value;if(!val||val.length===0)return;
  const lastChar=val[val.length-1];this.value='';lastKeyTime=Date.now();
  if(lastChar===' ')processKey(' ');else processKey(lastChar);
});

typingContainer.addEventListener('click',function(e){e.preventDefault();if(!finished)hiddenInput.focus();});
typingContainer.addEventListener('touchend',function(e){e.preventDefault();if(!finished)hiddenInput.focus();});
document.getElementById('settings-modal').addEventListener('click',function(e){if(e.target===this)closeSettings();});
document.getElementById('auth-modal').addEventListener('click',function(e){if(e.target===this)closeAuth();});
document.getElementById('leaderboard-modal').addEventListener('click',function(e){if(e.target===this)closeLeaderboard();});
document.getElementById('daily-modal').addEventListener('click',function(e){if(e.target===this)closeDaily();});

/* ═══════════════════════════════════════════════════════════════════════
   LOAD SETTINGS
═══════════════════════════════════════════════════════════════════════ */
function loadSettings(){
  try{
    document.body.className='';
    const savedText=localStorage.getItem('typeradar_custom_text');
    if(savedText){customText=savedText;const ta=document.getElementById('custom-text-input');if(ta)ta.value=customText;}
    const savedColor=localStorage.getItem('typeradar_color_theme');
    if(savedColor){colorTheme=savedColor;setTimeout(()=>{const c=document.querySelector(`#color-theme-selector .theme-card[data-theme="${savedColor}"]`);if(c){document.querySelectorAll('#color-theme-selector .theme-card').forEach(x=>x.classList.remove('active'));c.classList.add('active');}},100);}
    const savedBg=localStorage.getItem('typeradar_bg_theme_v2');
    if(savedBg&&THEMES[savedBg])currentBgTheme=savedBg;
    applyThemeVars(currentBgTheme);
    const savedFont=localStorage.getItem('typeradar_font');
    if(savedFont){const f=FONTS.find(x=>x.name===savedFont);if(f){loadGoogleFont(f);applyFont(savedFont);}}
    const savedCaret=localStorage.getItem('typeradar_caret');
    if(savedCaret){caretStyle=savedCaret;setTimeout(()=>{const btn=document.querySelector(`.caret-btn[data-caret="${savedCaret}"]`);if(btn){document.querySelectorAll('.caret-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}},100);}
  }catch(e){applyThemeVars('moon');}
}

/* ═══════════════════════════════════════════════════════════════════════
   SUPABASE AUTH LISTENER
═══════════════════════════════════════════════════════════════════════ */
sb.auth.onAuthStateChange(async(event,session)=>{
  if(event==="SIGNED_OUT"){
    currentUser=null;currentProfile=null;updateAuthUI();return;
  }
  if(session&&session.user){
    currentUser=session.user;
    await loadProfile(session.user.id);
  }else{
    currentUser=null;currentProfile=null;updateAuthUI();
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
  setTimeout(()=>{positionCursor();resetCursorBlink();},120);
  if(!('ontouchstart' in window))setTimeout(()=>hiddenInput.focus(),300);
  window.addEventListener('resize',()=>{updateLineH();positionCursor();});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>{updateLineH();positionCursor();});
  }
  document.addEventListener('touchmove',function(e){if(e.target.closest('.typing-container'))e.preventDefault();},{passive:false});
});

// Auto-refocus
if(!('ontouchstart' in window)){
  setInterval(()=>{
    if(!finished&&document.getElementById('test-screen').style.display!=='none'
      &&document.activeElement!==hiddenInput
      &&document.getElementById('settings-modal').style.display!=='flex'
      &&document.getElementById('auth-modal').style.display!=='flex'
      &&document.getElementById('leaderboard-modal').style.display!=='flex'
      &&document.getElementById('daily-modal').style.display!=='flex'){
      hiddenInput.focus();
    }
  },2000);
}

})();
