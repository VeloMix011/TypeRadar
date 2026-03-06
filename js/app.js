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
    storageKey: 'typeradar_auth',
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
let timerStartTime = 0;
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
let audioCtx = null, lineH2 = 0;
let _endTestCalled = false;

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
  const f=FONTS.find(x=>x.name===name);if(f)loadGoogleFont(f);
  applyFont(name);
  document.querySelectorAll('.font-card').forEach(c=>c.classList.remove('active'));
  const card=document.querySelector('.font-card[data-font="'+name+'"]');if(card)card.classList.add('active');
  setTimeout(positionCursor,200);
};
function buildFontGrid(){
  const g=document.getElementById('font-grid');if(!g)return;
  g.innerHTML=FONTS.map(f=>'<div class="font-card'+(f.name===currentFont?' active':'')+'" data-font="'+f.name+'" onclick="selectFont(\''+f.name+'\')" style="font-family:\''+f.name+'\',monospace">'+f.name+'</div>').join('');
}

/* ═══════════════════════════════════════════════════════════════════════
   CARET STYLE
═══════════════════════════════════════════════════════════════════════ */
window.setCaretStyle=function(style,el){
  caretStyle=style;
  document.querySelectorAll('.caret-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  const cursor=document.getElementById('cursor');
  if(cursor){cursor.classList.remove('caret-line','caret-block','caret-underline');cursor.classList.add('caret-'+style);}
  try{localStorage.setItem('typeradar_caret',style);}catch(e){}
  positionCursor();
};

/* ═══════════════════════════════════════════════════════════════════════
   THEMES
═══════════════════════════════════════════════════════════════════════ */
const THEMES = {
  'moon':          ['#0d0d0f','#141417','#1c1c21','#2a2a32','#e8e8f0','#555566','#7c6af7','#f7c26a','#6af7b2','#f76a8a','#7c6af7'],
  'forest':        ['#0c110e','#131a15','#1a241d','#243028','#d4e8d8','#4a6152','#5ebb7a','#b5e87d','#7de8b5','#e87d7d','#5ebb7a'],
  'ember':         ['#0f0c0a','#181310','#221a16','#342520','#f0ddd4','#6b4c40','#f77b4a','#f7c26a','#f7c26a','#f75a6a','#f77b4a'],
  'arctic':        ['#f5f7fb','#eef1f7','#e4e8f2','#d0d5e8','#1a1d2e','#9099bb','#4a6cf7','#f7884a','#2ab87a','#e83d5a','#4a6cf7'],
  'dark':          ['#323437','#2c2e31','#3a3c40','#4a4c50','#d1d0c5','#646669','#e2b714','#ca4754','#e2b714','#ca4754','#e2b714'],
  'nord':          ['#2e3440','#3b4252','#434c5e','#4c566a','#eceff4','#8892a0','#88c0d0','#81a1c1','#a3be8c','#bf616a','#88c0d0'],
  'catppuccin':    ['#1e1e2e','#181825','#313244','#45475a','#cdd6f4','#6c7086','#cba6f7','#f38ba8','#a6e3a1','#f38ba8','#cba6f7'],
  'dracula':       ['#282a36','#1e1f29','#343746','#44475a','#f8f8f2','#6272a4','#bd93f9','#ff79c6','#50fa7b','#ff5555','#bd93f9'],
  'gruvbox dark':  ['#282828','#1d2021','#3c3836','#504945','#ebdbb2','#928374','#d79921','#fb4934','#b8bb26','#fb4934','#d79921'],
  'monokai':       ['#272822','#1e1f1c','#2f3120','#3e4034','#f8f8f2','#75715e','#a6e22e','#f92672','#a6e22e','#f92672','#a6e22e'],
  'rose pine':     ['#191724','#1f1d2e','#26233a','#403d52','#e0def4','#6e6a86','#ebbcba','#eb6f92','#9ccfd8','#eb6f92','#ebbcba'],
  'solarized dark':['#002b36','#073642','#0d3d4a','#1a5060','#839496','#586e75','#268bd2','#cb4b16','#859900','#dc322f','#268bd2'],
  'onedark':       ['#282c34','#21252b','#2c3038','#3a3f48','#abb2bf','#5c6370','#61afef','#e06c75','#98c379','#e06c75','#61afef'],
  'github':        ['#0d1117','#161b22','#21262d','#30363d','#c9d1d9','#8b949e','#58a6ff','#f78166','#56d364','#f85149','#58a6ff'],
  'vscode':        ['#1e1e1e','#252526','#2d2d30','#3e3e42','#d4d4d4','#808080','#569cd6','#ce9178','#4ec9b0','#f44747','#569cd6'],
  'terminal':      ['#0a0e0a','#0f1a0f','#182818','#203020','#00ff41','#1a4a1a','#00ff41','#00cc33','#00ff41','#ff4444','#00ff41'],
  'midnight':      ['#0a0e1a','#0e1426','#141c38','#1c2648','#c8d0f0','#3a4880','#4860d8','#8048c8','#40c8a0','#e04860','#4860d8'],
  'sunset':        ['#2a1a0e','#382516','#483020','#583c2a','#f0d8c0','#9a7060','#f0a050','#e87040','#f0c850','#e05030','#f0a050'],
  'ocean':         ['#06111e','#091826','#0c2030','#102840','#80d8ff','#2060a0','#00bcd4','#80d8ff','#00e5ff','#ff5252','#00bcd4'],
  'copper':        ['#1a1408','#20180e','#2a2014','#34281c','#e8d8c0','#8a7858','#d89858','#c87040','#a0c858','#e06040','#d89858'],
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
  r.style.setProperty('--glow','rgba('+rv+','+gv+','+bv+',0.18)');
}
applyThemeVars(currentBgTheme);

window.setBgTheme=function(key){
  currentBgTheme=key;document.body.className='';applyThemeVars(key);
  document.querySelectorAll('#bg-theme-selector .theme-card').forEach(c=>c.classList.remove('active'));
  const card=document.querySelector('#bg-theme-selector .theme-card[data-theme="'+key+'"]');if(card)card.classList.add('active');
  try{localStorage.setItem('typeradar_bg_theme_v2',key);}catch(e){}
  setTimeout(positionCursor,50);
};
function buildBgThemeGrid(){
  const g=document.getElementById('bg-theme-selector');if(!g)return;
  g.innerHTML=Object.keys(THEMES).map(key=>{
    const t=THEMES[key];
    return '<div class="theme-card'+(key===currentBgTheme?' active':'')+'" data-theme="'+key+'" onclick="setBgTheme(\''+key+'\')">'
      +'<span class="btp-dot" style="background:'+t[0]+';border:2px solid '+t[6]+';"></span>'
      +'<span class="btp-accent" style="color:'+t[6]+'">'+key+'</span></div>';
  }).join('');
}
window.setColorTheme=function(theme){
  colorTheme=theme;
  document.querySelectorAll('#color-theme-selector .theme-card').forEach(c=>c.classList.remove('active'));
  const c=document.querySelector('#color-theme-selector .theme-card[data-theme="'+theme+'"]');if(c)c.classList.add('active');
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
  const items=filter?LANGS.filter(l=>l.name.toLowerCase().includes(filter.toLowerCase())||l.code.includes(filter.toLowerCase())):LANGS;
  list.innerHTML=items.map(l=>'<div class="lang-item'+(l.code===uiLang?' active':'')+'" onclick="pickLang(\''+l.code+'\',\''+l.name+'\')">'+'<span class="lang-check">✓</span><span>'+l.name+'</span></div>').join('');
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
function closeLangDropdown(e){
  const wrap=document.getElementById('lang-dropdown-wrap');
  if(wrap&&!wrap.contains(e.target)){const dd=document.getElementById('lang-dropdown');if(dd)dd.classList.remove('open');}
}
document.addEventListener('click',closeLangDropdown);
document.addEventListener('touchstart',closeLangDropdown,{passive:true});

/* ═══════════════════════════════════════════════════════════════════════
   MODE
═══════════════════════════════════════════════════════════════════════ */
function showGroup(id,show){const el=document.getElementById(id);if(el)el.classList.toggle('visible',show);}
window.setMode=function(m,id){
  mode=m;isZen=(m==='zen');
  document.querySelectorAll('#mode-group .config-btn').forEach(b=>b.classList.remove('active'));
  const modeBtn=document.getElementById(id);if(modeBtn)modeBtn.classList.add('active');
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
  const btn=document.getElementById(id);if(btn)btn.classList.add('active');
  restart();
};
window.setTime=function(t,id){
  totalTime=t;timeLeft=t;
  document.querySelectorAll('#time-group .config-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById(id);if(btn)btn.classList.add('active');
  const td=document.getElementById('timer-display');if(td)td.textContent=mode==='time'?t:'0';
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
      osc.type='sine';osc.frequency.value=600;
      gain.gain.setValueAtTime(0.1,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.07);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+0.07);
    }
  }catch(e){}
}
window.setSound=function(type,el){
  soundEffect=type;
  document.querySelectorAll('.sound-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  if(type!=='off')playSound(type);
};

/* ═══════════════════════════════════════════════════════════════════════
   WORD GENERATION
═══════════════════════════════════════════════════════════════════════ */
const PUNCTS=[',','.','!','?',';',':'];
function generateWords(seedWords){
  if(seedWords&&seedWords.length>0)return seedWords;
  if(mode==='quote'){
    let pool=QUOTES;
    if(quoteLen==='short')pool=QUOTES.filter(q=>q.split(' ').length<=8);
    else if(quoteLen==='medium')pool=QUOTES.filter(q=>{const n=q.split(' ').length;return n>8&&n<=15;});
    else if(quoteLen==='long')pool=QUOTES.filter(q=>{const n=q.split(' ').length;return n>15&&n<=25;});
    else if(quoteLen==='thicc')pool=QUOTES.filter(q=>q.split(' ').length>25);
    if(!pool||!pool.length)pool=QUOTES;
    return pool[Math.floor(Math.random()*pool.length)].split(' ');
  }
  if(mode==='custom'){
    const t=customText.trim();
    return t.length>0?t.split(/\s+/):['type','your','custom','text','in','settings'];
  }
  if(mode==='zen')return[];
  const list=(WORDS&&WORDS[uiLang])||WORDS.en||[];
  if(list.length===0)return['the','quick','brown','fox'];
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
  const inner=document.getElementById('words-inner');if(!inner)return;
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
  const cursor=document.createElement('div');
  cursor.className='cursor-line caret-'+caretStyle;cursor.id='cursor';
  inner.appendChild(cursor);
  highlightWord(0);updateLineH();updateWordProgress();
}

/* ═══════════════════════════════════════════════════════════════════════
   LINE HEIGHT
═══════════════════════════════════════════════════════════════════════ */
function updateLineH(){
  const d=document.getElementById('words-display');if(!d)return;
  const lh=parseFloat(getComputedStyle(d).lineHeight);
  const fs=parseFloat(getComputedStyle(d).fontSize)||16;
  lineH2=(!isNaN(lh)&&lh>0)?lh:fs*2.4;
}

/* ═══════════════════════════════════════════════════════════════════════
   WORD HIGHLIGHT
═══════════════════════════════════════════════════════════════════════ */
function highlightWord(idx){
  document.querySelectorAll('.word').forEach(w=>w.classList.remove('active-word'));
  const w=document.getElementById('word-'+idx);if(w)w.classList.add('active-word');
}

/* ═══════════════════════════════════════════════════════════════════════
   CURSOR POSITION
═══════════════════════════════════════════════════════════════════════ */
function positionCursor(){
  const cursor=document.getElementById('cursor');
  const inner=document.getElementById('words-inner');
  const wordEl=document.getElementById('word-'+currentWordIndex);
  if(!wordEl||!inner||!cursor)return;
  updateLineH();
  const display=document.getElementById('words-display');
  const fontSize=display?parseFloat(getComputedStyle(display).fontSize)||16:16;
  const isUnderline=(caretStyle==='underline');
  const vOffset=isUnderline?(lineH2-fontSize*0.1)/2:(lineH2-fontSize*1.1)/2;
  const letters=mode==='zen'?wordEl.querySelectorAll('.zen-letter'):wordEl.querySelectorAll('.letter');
  let left=0,top=0;
  if(currentInput.length===0){
    if(mode==='zen'){
      if(letters.length>0){const zl=letters[letters.length-1];left=wordEl.offsetLeft+zl.offsetLeft+zl.offsetWidth;top=wordEl.offsetTop+zl.offsetTop;}
      else if(currentWordIndex>0){
        const pw=document.getElementById('word-'+(currentWordIndex-1));
        if(pw){const pls=pw.querySelectorAll('.zen-letter');if(pls.length>0){const pl=pls[pls.length-1];left=pw.offsetLeft+pl.offsetLeft+pl.offsetWidth+8;top=pw.offsetTop+pl.offsetTop;}else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}}
      }
    }else{
      if(letters.length>0){left=wordEl.offsetLeft+letters[0].offsetLeft;top=wordEl.offsetTop+letters[0].offsetTop;}
      else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}
    }
  }else{
    if(letters.length>0){
      const idx=Math.min(currentInput.length-1,letters.length-1);
      left=wordEl.offsetLeft+letters[idx].offsetLeft+letters[idx].offsetWidth;
      top=wordEl.offsetTop+letters[idx].offsetTop;
    }else{left=wordEl.offsetLeft;top=wordEl.offsetTop;}
  }
  cursor.style.left=left+'px';cursor.style.top=(top+vOffset)+'px';
  if(lineH2>0&&top>=lineH2*2.1){
    const ct=parseInt(inner.style.top||'0',10);
    inner.style.top=(ct-lineH2)+'px';
    cursor.style.top=(top-lineH2+vOffset)+'px';
  }
}
function resetCursorBlink(){
  const cursor=document.getElementById('cursor');if(!cursor)return;
  cursor.style.animation='none';cursor.style.opacity='1';void cursor.offsetWidth;
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
    if(type==='add'){l.classList.add(currentInput[li]===words[currentWordIndex][li]?'correct':'wrong','theme-'+colorTheme);}
    else if(type==='delete'){l.classList.add('deleting');setTimeout(()=>{l.classList.remove('deleting','correct','wrong',...THEME_CLASSES);},100);}
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
  const showTimer=mode==='time';
  const showProgress=!showTimer;
  const ts=document.getElementById('timer-stat');if(ts)ts.style.display=showTimer?'block':'none';
  const sp=document.getElementById('stat-progress');if(sp)sp.style.display=showProgress?'block':'none';
  const sw=document.getElementById('stat-wpm');if(sw)sw.style.display='none';
  const sa=document.getElementById('stat-acc');if(sa)sa.style.display='none';
  const se=document.getElementById('stat-err');if(se)se.style.display='none';
}
function updateWordProgress(){
  const el=document.getElementById('live-progress');if(!el)return;
  el.textContent=mode==='zen'?correctWords:(currentWordIndex+'/'+words.length);
}
function updateLiveStats(){
  const elapsed=mode==='time'?(totalTime-timeLeft):wpmTick;
  const wpm=elapsed>0?Math.round((correctWords/elapsed)*60):0;
  const total=totalCorrectChars+totalWrongChars;
  const acc=total>0?Math.round((totalCorrectChars/total)*100):100;
  const wpmEl=document.getElementById('live-wpm');if(wpmEl)wpmEl.textContent=wpm;
  const accEl=document.getElementById('live-acc');if(accEl)accEl.textContent=acc+'%';
  updateWordProgress();
}

/* ═══════════════════════════════════════════════════════════════════════
   TIMER — accurate using Date.now()
═══════════════════════════════════════════════════════════════════════ */
function startTimer(){
  if(started)return;
  started=true;_endTestCalled=false;
  timerStartTime=Date.now();
  applyStatsLayout();
  if(useBlind)typingContainer.classList.add('blind-mode');
  const ls=document.getElementById('live-stats');if(ls)ls.classList.add('visible');
  const ch=document.getElementById('click-hint');if(ch)ch.style.opacity='0.3';
  wpmTick=0;wpmHistory=[];rawHistory=[];
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    if(finished)return;
    const elapsed=Math.round((Date.now()-timerStartTime)/1000);
    if(mode==='time'){
      timeLeft=Math.max(0,totalTime-elapsed);
      const td=document.getElementById('timer-display');
      if(td){td.textContent=timeLeft;if(timeLeft<=5)td.classList.add('warning');}
      if(timeLeft<=0){endTest();return;}
    }else{
      wpmTick=elapsed;
      const td=document.getElementById('timer-display');if(td)td.textContent=wpmTick;
    }
    const e=mode==='time'?(totalTime-timeLeft):wpmTick;
    if(e>0){
      wpmHistory.push(Math.round((correctWords/e)*60));
      rawHistory.push(Math.round(((totalCorrectChars+totalWrongChars)/5)/(e/60)));
    }
    updateLiveStats();
  },1000);
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSISTENCY
═══════════════════════════════════════════════════════════════════════ */
function calcConsistency(arr){
  if(!arr||arr.length<2)return 100;
  const mean=arr.reduce((a,b)=>a+b,0)/arr.length;
  if(mean===0)return 100;
  const variance=arr.reduce((s,v)=>s+Math.pow(v-mean,2),0)/arr.length;
  return Math.max(0,Math.round(100-(Math.sqrt(variance)/mean)*100));
}

/* ═══════════════════════════════════════════════════════════════════════
   CONFETTI
═══════════════════════════════════════════════════════════════════════ */
let _confettiRaf=null;
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas');if(!canvas)return;
  if(_confettiRaf){cancelAnimationFrame(_confettiRaf);_confettiRaf=null;}
  canvas.style.display='block';canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  const colors=['#7c6af7','#f7c26a','#6af7b2','#f76a8a','#60d0ff','#ff80ab'];
  const pieces=Array.from({length:160},()=>({
    x:Math.random()*canvas.width,y:-10,w:Math.random()*12+4,h:Math.random()*6+3,
    color:colors[Math.floor(Math.random()*colors.length)],
    rot:Math.random()*360,rotSpeed:(Math.random()-0.5)*8,
    vx:(Math.random()-0.5)*6,vy:Math.random()*4+2,opacity:1
  }));
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=false;
    pieces.forEach(p=>{
      if(p.opacity<=0)return;alive=true;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.globalAlpha=Math.max(0,p.opacity);ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.rotSpeed;p.vy+=0.07;if(frame>80)p.opacity-=0.018;
    });
    frame++;
    if(alive&&frame<220){_confettiRaf=requestAnimationFrame(draw);}
    else{ctx.clearRect(0,0,canvas.width,canvas.height);canvas.style.display='none';_confettiRaf=null;}
  }
  draw();
}

/* ═══════════════════════════════════════════════════════════════════════
   PERSONAL BEST
═══════════════════════════════════════════════════════════════════════ */
function checkPB(wpm){
  try{
    const key='typeradar_pb_'+mode+'_'+totalTime;
    const prev=parseInt(localStorage.getItem(key)||'0',10);
    if(wpm>prev){
      localStorage.setItem(key,String(wpm));
      const badge=document.getElementById('pb-badge');
      if(badge){badge.classList.add('visible');setTimeout(()=>badge.classList.remove('visible'),4000);}
      return true;
    }
  }catch(e){}
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════
   END TEST — guard against double call
═══════════════════════════════════════════════════════════════════════ */
function endTest(){
  if(finished||_endTestCalled)return;
  _endTestCalled=true;
  clearInterval(timerInterval);timerInterval=null;
  finished=true;started=false;
  hiddenInput.blur();
  const elapsed=mode==='time'?totalTime:Math.max(wpmTick,1);
  const wpm=Math.round((correctWords/elapsed)*60);
  const rawWpm=Math.round(((totalCorrectChars+totalWrongChars)/5)/(elapsed/60));
  const total=totalCorrectChars+totalWrongChars;
  const acc=total>0?Math.round((totalCorrectChars/total)*100):100;
  const consistency=calcConsistency(rawHistory);
  function set(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
  set('res-wpm',wpm);set('res-acc',acc+'%');set('res-raw',rawWpm);
  set('res-chars',totalCorrectChars+'/'+totalWrongChars+'/0/'+totalErrors);
  set('res-consistency',consistency+'%');set('res-time',elapsed+'s');
  set('res-type',mode+(mode==='time'?' '+totalTime+'s':''));set('res-lang',uiLang);
  drawResultChart();
  const ts=document.getElementById('test-screen');if(ts)ts.style.display='none';
  const rs=document.getElementById('result-screen');if(rs)rs.style.display='flex';
  const isPB=checkPB(wpm);if(isPB||wpm>=80)launchConfetti();
  if(currentUser)saveResult(wpm,acc,rawWpm,consistency);
  if(isDailyMode&&currentUser){saveDailyResult(wpm,acc);isDailyMode=false;}
}

/* ═══════════════════════════════════════════════════════════════════════
   RESULT CHART
═══════════════════════════════════════════════════════════════════════ */
function drawResultChart(){
  const canvas=document.getElementById('wpm-chart');if(!canvas)return;
  const wrapper=canvas.parentElement;if(!wrapper)return;
  const dpr=window.devicePixelRatio||1;
  const W_css=Math.max(wrapper.offsetWidth||300,200),H_css=160;
  canvas.style.width=W_css+'px';canvas.style.height=H_css+'px';
  canvas.width=W_css*dpr;canvas.height=H_css*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const W=W_css,H=H_css;ctx.clearRect(0,0,W,H);
  const data=wpmHistory.length>0?[...wpmHistory]:[0];
  const rawData=rawHistory.length>0?[...rawHistory]:null;
  const maxV=Math.max(...data,...(rawData||[]),10);
  const maxVR=Math.ceil(maxV/10)*10||10;
  const pad={t:16,b:32,l:40,r:20};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const px=i=>pad.l+(data.length<=1?cW/2:(i/(data.length-1))*cW);
  const py=v=>pad.t+cH-(v/maxVR)*cH;
  ctx.font="11px 'JetBrains Mono',monospace";
  for(let g=0;g<=4;g++){
    const gVal=Math.round((maxVR/4)*g),gY=py(gVal);
    ctx.beginPath();ctx.moveTo(pad.l,gY);ctx.lineTo(W-pad.r,gY);
    ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.stroke();
    ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillText(gVal,pad.l-6,gY+4);
  }
  ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,0.25)';
  const xCount=Math.min(data.length,8);
  for(let xi=0;xi<xCount;xi++){
    const xIdx=Math.round((xi/Math.max(xCount-1,1))*(data.length-1));
    ctx.fillText(xIdx+'s',px(xIdx),H-8);
  }
  if(rawData&&rawData.length>1){
    ctx.beginPath();ctx.moveTo(px(0),py(rawData[0]));
    for(let i=1;i<Math.min(rawData.length,data.length);i++){const cpx=px(i-0.5);ctx.bezierCurveTo(cpx,py(rawData[i-1]),cpx,py(rawData[i]),px(i),py(rawData[i]));}
    ctx.strokeStyle='rgba(180,180,180,0.35)';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }
  if(data.length>1){
    const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
    grad.addColorStop(0,'rgba(124,106,247,0.25)');grad.addColorStop(1,'rgba(124,106,247,0.02)');
    ctx.beginPath();ctx.moveTo(px(0),py(data[0]));
    for(let fi=1;fi<data.length;fi++){const cpx=px(fi-0.5);ctx.bezierCurveTo(cpx,py(data[fi-1]),cpx,py(data[fi]),px(fi),py(data[fi]));}
    ctx.lineTo(px(data.length-1),H-pad.b);ctx.lineTo(px(0),H-pad.b);
    ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();ctx.moveTo(px(0),py(data[0]));
    for(let si=1;si<data.length;si++){const sx=px(si-0.5);ctx.bezierCurveTo(sx,py(data[si-1]),sx,py(data[si]),px(si),py(data[si]));}
    ctx.strokeStyle='rgba(124,106,247,1)';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  }
  for(let di=0;di<data.length;di++){ctx.beginPath();ctx.arc(px(di),py(data[di]),2.5,0,Math.PI*2);ctx.fillStyle='rgba(124,106,247,1)';ctx.fill();}
  if(data.length>0){
    ctx.beginPath();ctx.arc(px(data.length-1),py(data[data.length-1]),5,0,Math.PI*2);ctx.fillStyle='rgba(124,106,247,0.3)';ctx.fill();
    ctx.beginPath();ctx.arc(px(data.length-1),py(data[data.length-1]),3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  }
  if(totalErrors>0){
    ctx.textAlign='right';ctx.fillStyle='rgba(247,106,138,0.8)';
    ctx.font='10px JetBrains Mono,monospace';ctx.fillText('× '+totalErrors,W-pad.r,pad.t+12);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SHARE
═══════════════════════════════════════════════════════════════════════ */
window.shareResult=function(){
  const wpmEl=document.getElementById('res-wpm'),accEl=document.getElementById('res-acc');
  const wpm=wpmEl?wpmEl.textContent:'0',acc=accEl?accEl.textContent:'0%';
  const text='TypeRadar result\n⌨️ '+wpm+' wpm  ✓ '+acc+'\nmode: '+mode+(mode==='time'?' '+totalTime+'s':'')+'\ntyperadar.com';
  navigator.clipboard.writeText(text).then(showShareToast).catch(()=>{
    try{const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showShareToast();}catch(e){}
  });
};
function showShareToast(){const t=document.getElementById('share-toast');if(!t)return;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2000);}

/* ═══════════════════════════════════════════════════════════════════════
   RESTART — full clean state
═══════════════════════════════════════════════════════════════════════ */
window.restart=function(seedWords){
  clearInterval(timerInterval);timerInterval=null;
  started=false;finished=false;isDailyMode=false;_endTestCalled=false;
  currentWordIndex=0;currentInput='';
  totalCorrectChars=0;totalWrongChars=0;correctWords=0;wrongWords=0;totalErrors=0;
  wpmHistory=[];rawHistory=[];wpmTick=0;wordHistory=[];
  timeLeft=totalTime;lastKeyTime=0;timerStartTime=0;

  function set(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
  set('timer-display',mode==='time'?totalTime:'0');
  set('live-wpm','0');set('live-acc','100%');set('live-err','0');

  const td=document.getElementById('timer-display');if(td)td.classList.remove('warning');
  const ls=document.getElementById('live-stats');if(ls)ls.classList.remove('visible');
  const ch=document.getElementById('click-hint');if(ch)ch.style.opacity='0.6';
  const rs=document.getElementById('result-screen');if(rs)rs.style.display='none';
  const ts=document.getElementById('test-screen');if(ts)ts.style.display='flex';
  typingContainer.classList.remove('blind-mode');
  const cw=document.getElementById('caps-warning');if(cw)cw.classList.remove('visible');

  buildDisplay(seedWords);
  setTimeout(()=>{positionCursor();resetCursorBlink();hiddenInput.value='';setTimeout(focusInput,80);},60);
};

/* ═══════════════════════════════════════════════════════════════════════
   KEY PROCESSING
═══════════════════════════════════════════════════════════════════════ */
function processKey(key){
  if(finished||_endTestCalled)return;
  if(!started&&key!=='Backspace'&&key!==' ')startTimer();
  if(key!=='Backspace'&&key!==' ')playSound(soundEffect);
  const wordStr=words[currentWordIndex]||'';

  if(key==='Backspace'){
    if(useConfidence)return;
    if(mode==='zen'){
      if(currentInput.length>0){
        const we=document.getElementById('word-'+currentWordIndex);
        if(we){const zls=we.querySelectorAll('.zen-letter');if(zls.length>0)we.removeChild(zls[zls.length-1]);}
        currentInput=currentInput.slice(0,-1);positionCursor();
      }else if(currentWordIndex>0){
        const inner=document.getElementById('words-inner');
        const ew=document.getElementById('word-'+currentWordIndex);if(ew&&inner)inner.removeChild(ew);
        currentWordIndex--;correctWords=Math.max(0,correctWords-1);
        const pw=document.getElementById('word-'+currentWordIndex);
        currentInput=pw?Array.from(pw.querySelectorAll('.zen-letter')).map(l=>l.textContent).join(''):'';
        highlightWord(currentWordIndex);positionCursor();
      }
      return;
    }
    if(currentInput.length>0){
      const di=currentInput.length-1;animateLetter(di,'delete');
      setTimeout(()=>{currentInput=currentInput.slice(0,-1);colorLetters();positionCursor();},30);
    }else if(currentWordIndex>0){
      const prev=wordHistory[wordHistory.length-1];
      if(prev){
        wordHistory.pop();currentWordIndex--;
        const pws=words[currentWordIndex]||'',pi=prev.input||'';
        const len=Math.min(pi.length,pws.length);
        for(let i=0;i<len;i++){if(pi[i]===pws[i])totalCorrectChars=Math.max(0,totalCorrectChars-1);else totalWrongChars=Math.max(0,totalWrongChars-1);}
        totalWrongChars=Math.max(0,totalWrongChars-Math.max(0,pws.length-pi.length));
        if(prev.wasCorrect)correctWords=Math.max(0,correctWords-1);else wrongWords=Math.max(0,wrongWords-1);
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
      const nw=document.createElement('span');nw.className='word';nw.id='word-'+currentWordIndex;if(inner)inner.appendChild(nw);
      highlightWord(currentWordIndex);positionCursor();return;
    }
    if(currentInput.length===0)return;
    const wasCorrect=(currentInput===wordStr);
    wordHistory.push({input:currentInput,wasCorrect});
    const pwe=document.getElementById('word-'+currentWordIndex);if(pwe)pwe.classList.toggle('has-error',!wasCorrect);
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
      const le=document.createElement('span');le.className='letter zen-letter correct theme-'+colorTheme;le.textContent=key;
      we.appendChild(le);currentInput+=key;positionCursor();return;
    }
    if(currentInput.length>=wordStr.length+5)return;
    const ni=currentInput.length;
    if(ni<wordStr.length&&key!==wordStr[ni]){totalErrors++;const errEl=document.getElementById('live-err');if(errEl)errEl.textContent=totalErrors;}
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
  const ts=document.getElementById('test-screen');
  if(!finished&&ts&&ts.style.display!=='none')hiddenInput.focus();
};

/* ═══════════════════════════════════════════════════════════════════════
   SETTINGS MODAL
═══════════════════════════════════════════════════════════════════════ */
window.openSettings=function(){buildFontGrid();buildBgThemeGrid();document.getElementById('settings-modal').style.display='flex';};
window.closeSettings=function(){
  document.getElementById('settings-modal').style.display='none';
  setTimeout(()=>{if(!('ontouchstart' in window))hiddenInput.focus();},100);
};
window.saveCustomText=function(){
  const ta=document.getElementById('custom-text-input');if(!ta)return;
  const text=ta.value.trim();
  if(!text||text.length<3){ta.style.borderColor='var(--wrong)';setTimeout(()=>{ta.style.borderColor='';},1200);return;}
  customText=text;try{localStorage.setItem('typeradar_custom_text',customText);}catch(e){}
  closeSettings();if(mode==='custom')restart();
};

/* ═══════════════════════════════════════════════════════════════════════
   AUTH — ALL BUGS FIXED
═══════════════════════════════════════════════════════════════════════ */
// Helper: show auth message with correct color
function setAuthMsg(el,msg,type){
  if(!el)return;
  el.textContent=msg;
  el.style.color=type==='info'?'var(--muted)':'var(--wrong)';
}

window.openAuth=function(){
  if(currentUser&&currentProfile){showProfileInModal();}
  else{currentUser=null;currentProfile=null;updateAuthUI();showLoginInModal();}
  document.getElementById('auth-modal').style.display='flex';
};
window.closeAuth=function(){const m=document.getElementById('auth-modal');if(m)m.style.display='none';};

function showLoginInModal(){
  const fa=document.getElementById('auth-form-area');if(fa)fa.style.display='block';
  const pa=document.getElementById('auth-profile-area');if(pa)pa.style.display='none';
  ['signin-email','signin-pass','signup-username','signup-email','signup-pass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['signin-err','signup-err'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.textContent='';el.style.color='var(--wrong)';}
  });
}
function showProfileInModal(){
  const fa=document.getElementById('auth-form-area');if(fa)fa.style.display='none';
  const pa=document.getElementById('auth-profile-area');if(pa)pa.style.display='block';
  if(currentProfile&&currentUser){
    const av=document.getElementById('profile-avatar');
    if(av)av.textContent=(currentProfile.username||currentUser.email||'?')[0].toUpperCase();
    const un=document.getElementById('profile-username');
    if(un)un.textContent=currentProfile.username||currentUser.email||'—';
    const pj=document.getElementById('profile-joined');
    if(pj){const d=currentProfile.created_at||currentUser.created_at;pj.textContent=d?'joined '+new Date(d).toLocaleDateString():'';}
    loadProfileStats();
  }
}
window.switchAuthTab=function(tab){
  document.getElementById('tab-signin').classList.toggle('active',tab==='signin');
  document.getElementById('tab-signup').classList.toggle('active',tab==='signup');
  document.getElementById('auth-signin-form').style.display=tab==='signin'?'block':'none';
  document.getElementById('auth-signup-form').style.display=tab==='signup'?'block':'none';
  document.getElementById('signin-err').textContent='';document.getElementById('signup-err').textContent='';
};

window.doSignIn=async function(){
  const email=document.getElementById('signin-email').value.trim();
  const pass=document.getElementById('signin-pass').value;
  const err=document.getElementById('signin-err');
  if(!email||!pass){setAuthMsg(err,'Please fill all fields','error');return;}
  setAuthMsg(err,'signing in...','info');
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error){setAuthMsg(err,error.message,'error');return;}
    if(!data||!data.user){setAuthMsg(err,'Sign in failed, try again','error');return;}
    currentUser=data.user;
    await loadProfile(data.user.id);
    // FIX: even if profile load fails, still sign in the user
    if(!currentProfile){
      // Create a minimal profile fallback so user isn't stuck
      currentProfile={username:email.split('@')[0],created_at:new Date().toISOString()};
      updateAuthUI();
    }
    err.textContent='';closeAuth();
  }catch(e){setAuthMsg(err,'Network error, try again','error');currentUser=null;currentProfile=null;updateAuthUI();}
};

window.doSignUp=async function(){
  const username=document.getElementById('signup-username').value.trim();
  const email=document.getElementById('signup-email').value.trim();
  const pass=document.getElementById('signup-pass').value;
  const err=document.getElementById('signup-err');
  if(!username||username.length<3){setAuthMsg(err,'Username must be at least 3 characters','error');return;}
  if(!/^[a-zA-Z0-9_-]+$/.test(username)){setAuthMsg(err,'Only letters, numbers, _ and - allowed','error');return;}
  if(!email||!pass||pass.length<6){setAuthMsg(err,'Fill all fields (password min 6 chars)','error');return;}
  setAuthMsg(err,'creating account...','info');
  try{
    const {data,error}=await sb.auth.signUp({email,password:pass});
    if(error){setAuthMsg(err,error.message,'error');return;}
    if(!data||!data.user){setAuthMsg(err,'Signup failed, try again','error');return;}
    const {data:sinData,error:sinErr}=await sb.auth.signInWithPassword({email,password:pass});
    if(sinErr||!sinData||!sinData.user){setAuthMsg(err,'Account created! Please sign in.','info');return;}
    const uid=sinData.user.id;
    const {error:pe}=await sb.from('profiles').insert({id:uid,username});
    if(pe&&!pe.message.includes('duplicate')&&!pe.message.includes('unique')){
      setAuthMsg(err,'Profile error: '+pe.message,'error');await sb.auth.signOut();return;
    }
    currentUser=sinData.user;
    await loadProfile(uid);
    // FIX: fallback if RLS blocks immediate read
    if(!currentProfile){
      currentProfile={username,created_at:new Date().toISOString()};
      updateAuthUI();
    }
    err.textContent='';closeAuth();
  }catch(e){setAuthMsg(err,'Error: '+e.message,'error');currentUser=null;currentProfile=null;updateAuthUI();}
};

window.doSignOut=async function(){
  currentUser=null;currentProfile=null;
  updateAuthUI();closeAuth();
  try{await sb.auth.signOut();}catch(e){}
  setTimeout(()=>window.location.reload(),150);
};

async function loadProfile(userId){
  if(!userId){currentProfile=null;updateAuthUI();return;}
  try{
    const {data,error}=await sb.from('profiles').select('*').eq('id',userId).single();
    currentProfile=(error||!data)?null:data;
  }catch(e){currentProfile=null;}
  updateAuthUI();
}
async function loadProfileStats(){
  if(!currentUser)return;
  const ps=document.getElementById('profile-stats');if(!ps)return;
  try{
    const {data}=await sb.from('results').select('wpm,accuracy').eq('user_id',currentUser.id).order('wpm',{ascending:false}).limit(50);
    if(data&&data.length>0){
      ps.innerHTML='<div class="ps-item"><div class="ps-label">best wpm</div><div class="ps-val">'+data[0].wpm+'</div></div>'
        +'<div class="ps-item"><div class="ps-label">avg wpm</div><div class="ps-val">'+Math.round(data.reduce((s,r)=>s+r.wpm,0)/data.length)+'</div></div>'
        +'<div class="ps-item"><div class="ps-label">tests</div><div class="ps-val">'+data.length+'</div></div>'
        +'<div class="ps-item"><div class="ps-label">best acc</div><div class="ps-val">'+Math.max(...data.map(r=>r.accuracy))+'%</div></div>';
    }else{
      ps.innerHTML='<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.78rem;">no tests yet</div>';
    }
  }catch(e){ps.innerHTML='<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.78rem;">could not load stats</div>';}
}
function updateAuthUI(){
  const btn=document.getElementById('auth-btn');if(!btn)return;
  if(currentUser&&currentProfile){btn.textContent=currentProfile.username||currentUser.email.split('@')[0];btn.classList.add('user-logged');}
  else{btn.textContent='sign in';btn.classList.remove('user-logged');}
}
async function saveResult(wpm,acc,raw,consistency){
  if(!currentUser)return;
  try{await sb.from('results').insert({user_id:currentUser.id,wpm:wpm||0,accuracy:acc||0,raw_wpm:raw||0,mode:mode||'time',time_seconds:mode==='time'?totalTime:(wpmTick||0),language:uiLang||'en',consistency:consistency||0});}catch(e){}
}

/* ═══════════════════════════════════════════════════════════════════════
   LEADERBOARD
═══════════════════════════════════════════════════════════════════════ */
window.openLeaderboard=function(){document.getElementById('leaderboard-modal').style.display='flex';loadLeaderboard('time',30,document.querySelector('.lb-tab'));};
window.closeLeaderboard=function(){document.getElementById('leaderboard-modal').style.display='none';};
window.loadLeaderboard=async function(m,t,el){
  document.querySelectorAll('.lb-tab').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');
  const list=document.getElementById('lb-list');if(!list)return;
  list.innerHTML='<div class="lb-loading">loading...</div>';
  try{
    const {data,error}=await sb.from('results').select('wpm,accuracy,profiles(username)').eq('mode',m).eq('time_seconds',t).order('wpm',{ascending:false}).limit(50);
    if(error||!data){list.innerHTML='<div class="lb-loading">failed to load</div>';return;}
    const best={};
    data.forEach(r=>{const u=r.profiles?.username||'anonymous';if(!best[u]||r.wpm>best[u].wpm)best[u]={wpm:r.wpm,accuracy:r.accuracy,username:u};});
    const rows=Object.values(best).sort((a,b)=>b.wpm-a.wpm).slice(0,20);
    if(rows.length===0){list.innerHTML='<div class="lb-loading">no results yet — be first!</div>';return;}
    const rankIcons=['🥇','🥈','🥉'];
    list.innerHTML=rows.map((r,i)=>{
      const isMe=currentProfile&&r.username===currentProfile.username;
      const rankDisplay=i<3?'<span class="lb-rank '+['gold','silver','bronze'][i]+'">'+rankIcons[i]+'</span>':'<span class="lb-rank">'+(i+1)+'</span>';
      return '<div class="lb-row'+(isMe?' me':'')+'">'+rankDisplay+'<span class="lb-user">'+r.username+'</span><span class="lb-wpm">'+r.wpm+'</span><span class="lb-acc">'+r.accuracy+'%</span></div>';
    }).join('');
  }catch(e){list.innerHTML='<div class="lb-loading">failed to load</div>';}
};

/* ═══════════════════════════════════════════════════════════════════════
   DAILY CHALLENGE — improved seed (no repeated words)
═══════════════════════════════════════════════════════════════════════ */
function getDailyDateStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function getDailySeed(){
  const dateStr=getDailyDateStr();
  let hash=5381;for(let i=0;i<dateStr.length;i++)hash=((hash<<5)+hash)+dateStr.charCodeAt(i);
  const list=(WORDS&&WORDS['en'])||[];if(list.length===0)return['the','quick','brown','fox','jumps','over','the','lazy','dog'];
  const count=30;const chosen=[];const used=new Set();
  let seed=Math.abs(hash);
  for(let i=0;chosen.length<count&&i<count*5;i++){seed=(seed*1664525+1013904223)&0xffffffff;const idx=Math.abs(seed)%list.length;if(!used.has(idx)){used.add(idx);chosen.push(list[idx]);}}
  while(chosen.length<count){seed=(seed*1664525+1013904223)&0xffffffff;chosen.push(list[Math.abs(seed)%list.length]);}
  return chosen;
}
window.openDaily=function(){
  const dateStr=getDailyDateStr();
  const dateBadge=document.getElementById('daily-date');if(dateBadge)dateBadge.textContent=dateStr;
  const mr=document.getElementById('daily-my-result');if(mr)mr.style.display='none';
  const startBtn=document.getElementById('daily-start-btn');if(startBtn)startBtn.textContent='start challenge';
  document.getElementById('daily-modal').style.display='flex';
  loadDailyBoard();
  try{
    const saved=localStorage.getItem('typeradar_daily_'+dateStr);
    if(saved){
      const result=JSON.parse(saved);
      if(mr){mr.style.display='block';mr.innerHTML='<div style="font-family:\'JetBrains Mono\',monospace;font-size:0.8rem;color:var(--correct);margin-bottom:12px;">✓ Today: <strong>'+result.wpm+' wpm</strong> — '+result.accuracy+'% acc</div>';}
      if(startBtn)startBtn.textContent='redo challenge';
    }
  }catch(e){}
};
window.closeDaily=function(){document.getElementById('daily-modal').style.display='none';};
window.startDaily=function(){
  closeDaily();isDailyMode=true;const seed=getDailySeed();
  mode='time';totalTime=30;timeLeft=30;
  document.querySelectorAll('#mode-group .config-btn').forEach(b=>b.classList.remove('active'));
  const mb=document.getElementById('mode-time');if(mb)mb.classList.add('active');
  document.querySelectorAll('#time-group .config-btn').forEach(b=>b.classList.remove('active'));
  const tb=document.getElementById('t-30');if(tb)tb.classList.add('active');
  showGroup('time-group',true);showGroup('time-sep',true);showGroup('extra-group',true);showGroup('extra-sep',true);
  showGroup('quote-group',false);showGroup('quote-sep',false);
  restart(seed);
};
async function saveDailyResult(wpm,acc){
  const dateStr=getDailyDateStr();
  try{localStorage.setItem('typeradar_daily_'+dateStr,JSON.stringify({wpm,accuracy:acc}));}catch(e){}
  if(!currentUser||!currentProfile)return;
  try{await sb.from('daily_results').upsert({user_id:currentUser.id,username:currentProfile.username,date:dateStr,wpm,accuracy:acc},{onConflict:'user_id,date'});}catch(e){}
}
async function loadDailyBoard(){
  const dateStr=getDailyDateStr();
  const board=document.getElementById('daily-board');if(!board)return;
  board.innerHTML='<div class="lb-loading">loading...</div>';
  try{
    const {data,error}=await sb.from('daily_results').select('username,wpm,accuracy').eq('date',dateStr).order('wpm',{ascending:false}).limit(20);
    if(error||!data||data.length===0){board.innerHTML='<div class="lb-loading">no entries yet — be first!</div>';return;}
    const rankIcons=['🥇','🥈','🥉'];
    board.innerHTML=data.map((r,i)=>{
      const isMe=currentProfile&&r.username===currentProfile.username;
      const rankD=i<3?'<span class="lb-rank '+['gold','silver','bronze'][i]+'">'+rankIcons[i]+'</span>':'<span class="lb-rank">'+(i+1)+'</span>';
      return '<div class="lb-row'+(isMe?' me':'')+'">'+rankD+'<span class="lb-user">'+r.username+'</span><span class="lb-wpm">'+r.wpm+'</span><span class="lb-acc">'+r.accuracy+'%</span></div>';
    }).join('');
  }catch(e){board.innerHTML='<div class="lb-loading">no entries yet — be first!</div>';}
}

/* ═══════════════════════════════════════════════════════════════════════
   KEYBOARD EVENTS
═══════════════════════════════════════════════════════════════════════ */
function isAnyModalOpen(){
  return document.getElementById('settings-modal').style.display==='flex'||
    document.getElementById('auth-modal').style.display==='flex'||
    document.getElementById('leaderboard-modal').style.display==='flex'||
    document.getElementById('daily-modal').style.display==='flex';
}
document.addEventListener('keydown',function(e){
  if(e.getModifierState){
    const capsOn=e.getModifierState('CapsLock');
    const warn=document.getElementById('caps-warning');if(warn)warn.classList.toggle('visible',capsOn);
  }
  if(isAnyModalOpen()){
    if(e.key==='Escape'){e.preventDefault();closeSettings();closeAuth();closeLeaderboard();closeDaily();}
    return;
  }
  const key=e.key;
  if(key==='Tab'){e.preventDefault();restart();return;}
  if(key==='Escape'){e.preventDefault();restart();return;}
  if(key==='Enter'&&mode==='zen'&&e.shiftKey){e.preventDefault();if(started&&!finished)endTest();return;}
  const ignored=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Shift','Control','Alt','Meta','CapsLock','Insert','Delete','Enter','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
  if(ignored.includes(key))return;
  if(key==='Backspace'||key===' '){e.preventDefault();if(!finished){lastKeyTime=Date.now();processKey(key);}return;}
  e.preventDefault();if(!finished)processKey(key);
});
document.addEventListener('keyup',function(e){
  if(e.getModifierState){
    const capsOn=e.getModifierState('CapsLock');
    const warn=document.getElementById('caps-warning');if(warn)warn.classList.toggle('visible',capsOn);
  }
});
hiddenInput.addEventListener('input',function(e){
  if(finished)return;if(Date.now()-lastKeyTime<30)return;
  const itype=e.inputType||'';
  if(itype==='deleteContentBackward'||itype==='deleteWordBackward'){this.value='';lastKeyTime=Date.now();processKey('Backspace');return;}
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
    if(savedText&&savedText.trim().length>2){customText=savedText;const ta=document.getElementById('custom-text-input');if(ta)ta.value=customText;}
    const savedColor=localStorage.getItem('typeradar_color_theme');
    if(savedColor){colorTheme=savedColor;setTimeout(()=>{const c=document.querySelector('#color-theme-selector .theme-card[data-theme="'+savedColor+'"]');if(c){document.querySelectorAll('#color-theme-selector .theme-card').forEach(x=>x.classList.remove('active'));c.classList.add('active');}},100);}
    const savedBg=localStorage.getItem('typeradar_bg_theme_v2');
    if(savedBg&&THEMES[savedBg])currentBgTheme=savedBg;
    applyThemeVars(currentBgTheme);
    const savedFont=localStorage.getItem('typeradar_font');
    if(savedFont){const f=FONTS.find(x=>x.name===savedFont);if(f){loadGoogleFont(f);applyFont(savedFont);}}
    const savedCaret=localStorage.getItem('typeradar_caret');
    if(savedCaret){caretStyle=savedCaret;setTimeout(()=>{const btn=document.querySelector('.caret-btn[data-caret="'+savedCaret+'"]');if(btn){document.querySelectorAll('.caret-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}},100);}
  }catch(e){applyThemeVars('moon');}
}

/* ═══════════════════════════════════════════════════════════════════════
   AUTH STATE LISTENER — handles all events, always clears on logout
═══════════════════════════════════════════════════════════════════════ */
sb.auth.onAuthStateChange(async(event,session)=>{
  if(event==='SIGNED_OUT'||!session||!session.user){
    currentUser=null;currentProfile=null;updateAuthUI();return;
  }
  if(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED'){
    if(session&&session.user){currentUser=session.user;await loadProfile(session.user.id);}
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════ */
window.addEventListener('load',function(){
  loadSettings();buildDisplay();applyStatsLayout();updateLineH();
  setTimeout(()=>{positionCursor();resetCursorBlink();},120);
  if(!('ontouchstart' in window))setTimeout(()=>hiddenInput.focus(),300);
  window.addEventListener('resize',()=>{updateLineH();positionCursor();});
  if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>{updateLineH();positionCursor();});}
  document.addEventListener('touchmove',function(e){if(e.target.closest('.typing-container'))e.preventDefault();},{passive:false});
});

/* auto-refocus */
if(!('ontouchstart' in window)){
  setInterval(()=>{
    const ts=document.getElementById('test-screen');
    if(!finished&&ts&&ts.style.display!=='none'&&!isAnyModalOpen()&&document.activeElement!==hiddenInput){
      hiddenInput.focus();
    }
  },2000);
}

})();
