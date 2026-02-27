// script.js
// Anti-debugging
(function() {
  console.clear();
  console.log('%c🔒 Protected Content', 'color: red; font-size: 16px;');
  
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) {
      e.preventDefault();
    }
  });
  document.addEventListener('copy', e => e.preventDefault());
  document.addEventListener('cut', e => e.preventDefault());
  document.addEventListener('paste', e => e.preventDefault());
})();

(function() {
  // ─── STATE ────────────────────────────────────────────────────────────────────
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
  
  // UI Language
  let uiLang = 'en';
  
  // Color Theme
  let colorTheme = 'classic';
  
  // Custom words storage
  let customWords = [];
  
  const hiddenInput = document.getElementById('hidden-input');
  const typingContainer = document.getElementById('typing-container');

  // Default word lists
  const WORDS = {
    en: ["the","be","to","of","and","a","in","that","have","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us","great","between","need","large","often","hand","high","place","hold","turn","help","start","never","talk","last","long","show","keep","life","move","live","feel","ask","child","again","point","light","open","seem","next","white","begin","walk","example","paper","always","music","mark","letter","until","mile","river","car","feet","care","second","book","carry","took","science","eat","room","friend","began","idea","fish","mountain","stop","once","hear","horse","cut","sure","watch","color","face","wood","main","enough","plain","girl","usual","young","ready","above","ever","red","list","thought","city","play","small","number","off","move","try","kind","hand","picture","change","spell","air","away","animal","house","page","letter","mother","answer","found","study","still","learn","should","world","every","near","add","food","between","own","below","country","plant","last","school","father","keep","tree","never","start","city","earth","eye","light","thought","head","under","story","saw","left","dont","few","while","along","might","close","something","seem","next","hard","open","example","begin","life","always","those","both","paper","together","got","group","often","run","important","until","children","side","feet","car","mile","night","walk","white","sea","began","grow","took","river","four","carry","state","once","book","hear","stop","without","second","later","miss","idea","eat","face","watch","far","indian","real","almost","let","above","girl","sometimes","mountain","cut","young","talk","soon","list","song","being","leave","family","body","music","color","stand","sun","questions","fish","area","mark","dog","horse","birds","problem","complete","room","knew","since","ever","piece","told","usually","didnt","friends","easy","heard","order","red","door","sure","become","top","ship","across","today","during","short","better","best","however","low","hours","black","products","happened","whole","measure","remember","early","waves","reached","listen","wind","rock","space","covered","fast","several","hold","himself","toward","five","step","morning","passed","vowel","true","hundred","against","pattern","numeral","table","north","slowly","money","map","farm","pulled","draw","voice","power","town","fine","drive","meant","done","paint","language","among","grand","ball","yet","warm","common","bring","explain","dry","though","language","shape","deep","thousands","yes","clear","equation","yet","government","filled","heat","full","hot","check","object","am","rule","among","noun","power","cannot","able","six","size","dark","ball","material","special","heavy","fine","pair","circle","include","built","cant","mass","half","maybe","surprise","plain","gold","milk","quiet","natural","lot","stone","act","build","middle","speed","count","consonant","someone","sail","rolled","bear","wonder","smiled","angle","fraction","africa","killed","melody","bottom","trip","hole","poor","fight","surprise","french","died","beat","exactly","remain","dress","iron","otherwise","agree","compare","crowd","poem","enjoy","elements","indicate","except","expect","flat","seven","interesting","sense","string","blow","famous","value","wings","movement","pair","finally","town","note","found","let","ring","free","green","sleep","three","made","through","hold","point","come","while","place","made","white"],
    tr: ["bir","ve","bu","ile","için","ben","sen","biz","onlar","var","çok","daha","gibi","olarak","ki","de","ne","ama","veya","her","hiç","nasıl","neden","zaman","iyi","kötü","büyük","küçük","yeni","eski","gün","yıl","insan","dünya","hayat","zor","kolay","hızlı","yavaş","güzel","doğru","yanlış","ilk","son","başka","önemli","bilgi","sevgi","yol","ev","şehir","para","iş","su","renk","ses","göz","el","baş","yer","gece","sabah","hava","ışık","kapı","masa","kitap","söz","düşünce","gün","gelmek","gitmek","görmek","bilmek","istemek","sevmek","olmak","yapmak","söylemek","bulmak","almak","vermek","bakmak","çalışmak","düşünmek","konuşmak","anlamak","okumak","yazmak","öğrenmek","beklemek","görüşmek","dönmek","getirmek","götürmek","koşmak","oturmak","kalkmak","girmek","çıkmak","açmak","kapamak","tutmak","bırakmak","başlamak","bitmek","seçmek","sormak","cevap","saat","dakika","hafta","ay","yüz","bin","araba","uçak","gemi","telefon","bilgisayar","internet","müzik","film","okul","hastane","market","restoran","park","sokak","cadde","bina","köprü","deniz","göl","nehir","dağ","orman","çiçek","ağaç","taş","toprak","ateş","kar","yağmur","güneş","gökyüzü","bulut","sabah","öğle","akşam","gece","bugün","yarın","dün","hafta","ay","yıl","şimdi","sonra","önce","hep","artık","henüz","sadece","bile","zaten","belki","evet","hayır","tamam","lütfen","teşekkür","merhaba","günaydın","iyi","kötü","büyük","küçük","uzun","kısa","yeni","eski","sıcak","soğuk","hızlı","yavaş","kolay","zor","güzel","çirkin","temiz","kirli","açık","kapalı","dolu","boş","ağır","hafif","sert","yumuşak","doğru","yanlış","gerçek","yalan","önemli","anlam","durum","sorun","çözüm","fikir","plan","sonuç","başarı","hata","kural","örnek","sistem","bilim","sanat","spor","tarih","doğa","toplum","aile","çocuk","anne","baba","kardeş","arkadaş","komşu","öğretmen","doktor","mühendis","yazar","gazeteci","avukat","hemşire","polis","asker","çiftçi","öğrenci","patron","işçi","müdür","başkan","kral","kraliçe","kahraman","düşman","misafir","yolcu"],
    es: ["el","la","de","que","y","a","en","un","ser","se","no","haber","por","con","su","para","como","estar","tener","le","lo","lo","todo","pero","más","hacer","o","poder","decir","este","ir","otro","ese","si","me","ya","ver","porque","dar","cuando","él","muy","sin","vez","mucho","saber","qué","sobre","mi","alguno","mismo","yo","también","hasta","año","dos","querer","entre","así","primero","desde","grande","eso","ni","nos","llegar","pasar","tiempo","ella","sí","día","uno","bien","poco","deber","entonces","poner","cosa","tanto","hombre","parecer","nuestro","tan","donde","ahora","parte","después","vida","quedar","siempre","creer","hablar","llevar","dejar","nada","cada","seguir","menos","posible","verdad","aquí","tener","tiempo","forma","contra","partir","orden","muerte","noche","nunca","agua","aire","lugar","ayuda","voz","mundo","tierra","madre","padre","hijo","hermano","casa","calle","puerta","mesa","silla","libro","agua","fuego","mar","cielo","sol","luna","estrella","flor","árbol","animal","perro","gato","pájaro","pez","rojo","azul","verde","amarillo","negro","blanco","grande","pequeño","alto","bajo","bueno","malo","bonito","feo","caliente","frío","rápido","lento","duro","blando","feliz","triste","cansado","enfermo","contento","enfadado","amor","odio","paz","guerra","vida","muerte","sueño","realidad","cierto","falso","libre","atrapado","fácil","difícil","nuevo","viejo","joven","mayor","mejor","peor","lejos","cerca","dentro","fuera","arriba","abajo","delante","detrás","antes","después","ayer","hoy","mañana","siempre","nunca","pronto","tarde","temprano","ahora","entonces","mientras","durante","hasta","desde","entre","según","contra","hacia","para","por","sin","sobre","tras","mediante","excepto","incluso","además","tampoco","también","sí","no","quizás","tal","vez","como","cuando","donde","quien","cual","cuyo","cuan","cuanto","que","quienes","cuales","cuyos","cuyas"],
    az: ["və","bu","ilə","üçün","mən","sən","biz","onlar","var","çox","daha","kimi","olar","ki","de","nə","amma","və ya","hər","heç","necə","niyə","zaman","yaxşı","pis","böyük","kiçik","yeni","köhnə","gün","il","insan","dünya","həyat","çətin","asan","sürətli","yavaş","gözəl","doğru","yanlış","ilk","son","başqa","vacib","bilgi","sevgi","yol","ev","şəhər","pul","iş","su","rəng","səs","göz","əl","baş","yer","gecə","səhər","hava","işıq","qapı","masa","kitab","söz","düşüncə","gəlmək","getmək","görmək","bilmək","istəmək","sevmək","olmaq","etmək","demək","tapmaq","almaq","vermək","baxmaq","çalışmaq","düşünmək","danışmaq","anlamaq","oxumaq","yazmaq","öyrənmək","gözləmək","görüşmək","dönmək","gətirmək","aparmaq","qaçmaq","oturmaq","qalxmaq","girmək","çıxmaq","açmaq","bağlamaq","tutmaq","buraxmaq","başlamaq","bitmək","seçmək","soruşmaq","cavab","saat","dəqiqə","həftə","ay","yüz","min","maşın","təyyarə","gəmi","telefon","kompüter","internet","musiqi","film","məktəb","xəstəxana","bazar","restoran","park","küçə","prospekt","bina","körpü","dəniz","göl","çay","dağ","meşə","çiçək","ağac","daş","torpaq","od","qar","yağış","günəş","səma","bulud","səhər","günorta","axşam","gecə","bu gün","sabah","dünən","həftə","ay","il","indi","sonra","əvvəl","həmişə","artıq","hələ","təkcə","hətta","onsuzda","bəlkə","bəli","yox","tamam","zəhmət olmasa","təşəkkür","salam","günaydın","yaxşı","pis","böyük","kiçik","uzun","qısa","yeni","köhnə","isti","soyuq","sürətli","yavaş","asan","çətin","gözəl","çirkin","təmiz","çirkli","açıq","bağlı","dolu","boş","ağır","yüngül","sərt","yumşaq","doğru","yanlış","gerçək","yalan","vacib","məna","vəziyyət","problem","həll","fikir","plan","nəticə","uğur","səhv","qayda","nümunə","sistem","elm","sənət","idman","tarix","təbiət","cəmiyyət","ailə","uşaq","ana","ata","qardaş","bacı","dost","qonşu","müəllim","həkim","mühəndis","yazar","jurnalist","vəkil","tibb bacısı","polis","əsgər","çiftçi","tələbə","patron","işçi","direktor","prezident","kral","kraliçə","qəhrəman","düşmən","qonaq","sərnişin"]
  };

  const QUOTES = [
    "The only way to do great work is to love what you do.",
    "In the middle of every difficulty lies opportunity.",
    "Life is what happens when you are busy making other plans.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "It does not matter how slowly you go as long as you do not stop.",
    "Success is not final failure is not fatal it is the courage to continue that counts.",
    "The only impossible journey is the one you never begin.",
    "Your time is limited so dont waste it living someone else life."
  ];

  // ─── THEME ────────────────────────────────────────────────────────────────────
  window.setTheme = function(el) {
    document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
    document.body.className = el.dataset.theme;
    setTimeout(positionCursor, 50);
  };

  // ─── COLOR THEME ─────────────────────────────────────────────────────────────
  window.setColorTheme = function(theme) {
    colorTheme = theme;
    
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
    const activeCard = Array.from(document.querySelectorAll('.theme-card')).find(
      card => card.querySelector('.name').textContent.toLowerCase().includes(theme)
    );
    if (activeCard) activeCard.classList.add('active');
    
    localStorage.setItem('typeradar_color_theme', theme);
    colorLetters();
  };

  // ─── CONFIG ───────────────────────────────────────────────────────────────────
  window.setMode = function(m, id) {
    mode = m;
    document.querySelectorAll('#mode-group .config-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const timeGroup = document.getElementById('time-group');
    if (timeGroup) timeGroup.style.display = (m === 'quote' || m === 'custom') ? 'none' : 'flex';
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
  
  // UI Language
  window.setUILang = function(lang, el) {
    uiLang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    updateUILanguage();
    restart(); // Kelimeleri yenile
  };
  
  function updateUILanguage() {
    const translations = {
      en: {
        time: 'time',
        words: 'words',
        quote: 'quote',
        custom: 'custom',
        wpm: 'wpm',
        accuracy: 'accuracy',
        clickHint: '👆 click or press any key to start typing',
        restart: 'restart',
        raw: 'raw wpm',
        correct: 'correct words',
        wrong: 'wrong words',
        total: 'total time',
        settings: 'Settings',
        language: 'Language',
        customWords: 'Custom Words (comma separated)',
        placeholder: 'e.g. hello,world,typing'
      },
      tr: {
        time: 'zaman',
        words: 'kelime',
        quote: 'alıntı',
        custom: 'özel',
        wpm: 'wpm',
        accuracy: 'doğruluk',
        clickHint: '👆 yazmaya başlamak için tıkla',
        restart: 'yeniden başlat',
        raw: 'ham wpm',
        correct: 'doğru kelime',
        wrong: 'yanlış kelime',
        total: 'toplam süre',
        settings: 'Ayarlar',
        language: 'Dil',
        customWords: 'Özel Kelimeler (virgülle ayırın)',
        placeholder: 'örn: merhaba,dünya,yazma'
      },
      es: {
        time: 'tiempo',
        words: 'palabras',
        quote: 'cita',
        custom: 'personalizado',
        wpm: 'wpm',
        accuracy: 'precisión',
        clickHint: '👆 haz clic para empezar',
        restart: 'reiniciar',
        raw: 'wpm bruto',
        correct: 'correctas',
        wrong: 'incorrectas',
        total: 'tiempo total',
        settings: 'Ajustes',
        language: 'Idioma',
        customWords: 'Palabras personalizadas (separadas por comas)',
        placeholder: 'ej: hola,mundo,teclear'
      },
      az: {
        time: 'vaxt',
        words: 'sözlər',
        quote: 'sitat',
        custom: 'xüsusi',
        wpm: 'wpm',
        accuracy: 'dəqiqlik',
        clickHint: '👆 yazmağa başlamaq üçün tıkla',
        restart: 'yenidən başla',
        raw: 'xam wpm',
        correct: 'doğru sözlər',
        wrong: 'yanlış sözlər',
        total: 'ümumi vaxt',
        settings: 'Ayarlar',
        language: 'Dil',
        customWords: 'Xüsusi Sözlər (vergüllə ayırın)',
        placeholder: 'məs: salam,dünya,yazma'
      }
    };
    
    const t = translations[uiLang] || translations.en;
    
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
  window.addCustomWords = function() {
    const input = document.getElementById('custom-words-input');
    const text = input.value.trim();
    if (!text) return;
    
    const words = text.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
    customWords = [...new Set([...customWords, ...words])];
    
    localStorage.setItem('typeradar_custom_words', JSON.stringify(customWords));
    
    updateCustomWordsList();
    input.value = '';
  };
  
  window.removeCustomWord = function(word) {
    customWords = customWords.filter(w => w !== word);
    localStorage.setItem('typeradar_custom_words', JSON.stringify(customWords));
    updateCustomWordsList();
  };
  
  function updateCustomWordsList() {
    const list = document.getElementById('custom-words-list');
    list.innerHTML = '';
    
    customWords.forEach(word => {
      const item = document.createElement('div');
      item.className = 'custom-item';
      item.innerHTML = `
        <span>${word}</span>
        <button onclick="removeCustomWord('${word}')">✕</button>
      `;
      list.appendChild(item);
    });
  }
  
  // Load saved settings
  try {
    const savedWords = localStorage.getItem('typeradar_custom_words');
    if (savedWords) customWords = JSON.parse(savedWords);
    
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
  } catch(e) {}

  // ─── WORD GENERATION ──────────────────────────────────────────────────────────
  function generateWords() {
    if (mode === 'quote') return QUOTES[Math.floor(Math.random() * QUOTES.length)].split(' ');
    if (mode === 'custom' && customWords.length > 0) {
      return Array.from({length: 30}, () => customWords[Math.floor(Math.random() * customWords.length)]);
    }
    const list = WORDS[uiLang] || WORDS.en;
    const count = mode === 'words' ? 30 : 50;
    return Array.from({length: count}, () => list[Math.floor(Math.random() * list.length)]);
  }

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

  function animateLetter(letterIndex, type) {
    const wordEl = document.getElementById('word-' + currentWordIndex);
    if (!wordEl) return;
    
    const letters = wordEl.querySelectorAll('.letter');
    if (letterIndex >= 0 && letterIndex < letters.length) {
      const letter = letters[letterIndex];
      letter.classList.remove('correct', 'wrong', 'deleting');
      
      if (type === 'add') {
        letter.classList.add(currentInput[letterIndex] === words[currentWordIndex][letterIndex] ? 'correct' : 'wrong');
        if (letter.classList.contains('correct')) {
          letter.classList.add(`theme-${colorTheme}`);
        }
        if (letter.classList.contains('wrong')) {
          letter.classList.add(`theme-${colorTheme}`);
        }
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
    
    letters.forEach(l => {
      l.classList.remove('correct', 'wrong', `theme-${colorTheme}`);
    });
    
    for (let i = 0; i < currentInput.length && i < wordStr.length; i++) {
      const letter = letters[i];
      letter.classList.add(currentInput[i] === wordStr[i] ? 'correct' : 'wrong');
      letter.classList.add(`theme-${colorTheme}`);
    }
  }

  function updateLiveStats() {
    const elapsed = mode === 'time' ? (totalTime - timeLeft) : wpmTick;
    const wpm = elapsed > 0 ? Math.round((correctWords / elapsed) * 60) : 0;
    const total = totalCorrectChars + totalWrongChars;
    const acc = total > 0 ? Math.round((totalCorrectChars / total) * 100) : 100;
    document.getElementById('live-wpm').textContent = wpm;
    document.getElementById('live-acc').textContent = acc + '%';
    
    if (started && !finished && elapsed > 0) {
      if (wpmHistory.length === 0 || wpmHistory[wpmHistory.length-1] !== wpm) {
        wpmHistory.push(wpm);
      }
    }
  }

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

  window.restart = function() {
    clearInterval(timerInterval);
    started = false; finished = false;
    currentWordIndex = 0; currentInput = '';
    totalCorrectChars = 0; totalWrongChars = 0;
    correctWords = 0; wrongWords = 0;
    wpmHistory = []; wpmTick = 0; 
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
      }
      return true;
    }

    if (key === ' ') {
      if (currentInput.length === 0) return true;

      const len = Math.min(currentInput.length, wordStr.length);
      for (let i = 0; i < len; i++) {
        if (currentInput[i] === wordStr[i]) totalCorrectChars++;
        else totalWrongChars++;
      }
      totalWrongChars += Math.max(0, wordStr.length - currentInput.length);

      if (currentInput === wordStr) correctWords++;
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

  window.focusInput = function() {
    if (!finished && document.getElementById('test-screen').style.display !== 'none') {
      hiddenInput.focus();
      hiddenInput.click();
    }
  };

  window.openSettings = function() {
    document.getElementById('settings-modal').style.display = 'flex';
    updateCustomWordsList();
  };
  
  window.closeSettings = function() {
    document.getElementById('settings-modal').style.display = 'none';
    setTimeout(focusInput, 100);
  };

  document.addEventListener('keydown', e => {
    const key = e.key;
    
    if (key === 'Tab') { e.preventDefault(); restart(); return; }
    if (key === 'Escape') { 
      e.preventDefault(); 
      if (document.getElementById('settings-modal').style.display === 'flex') closeSettings();
      else restart(); 
      return; 
    }
    
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Shift','Control','Alt','Meta','CapsLock','Insert','Delete','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'].includes(key)) return;
    
    e.preventDefault();
    processKey(key);
  });

  hiddenInput.addEventListener('input', function(e) {
    const val = this.value;
    if (val.length === 0) return;
    const lastChar = val[val.length - 1];
    this.value = '';
    if (!finished) processKey(lastChar);
  });

  hiddenInput.addEventListener('keydown', function(e) {
    const key = e.key;
    if (key === 'Backspace' || key === ' ') {
      e.preventDefault();
      processKey(key);
    }
  });

  typingContainer.addEventListener('click', e => { e.preventDefault(); focusInput(); });
  typingContainer.addEventListener('touchstart', e => { e.preventDefault(); focusInput(); });

  document.getElementById('settings-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSettings();
  });

  window.addEventListener('load', function() {
    buildDisplay();
    updateUILanguage();
    updateCustomWordsList();
    setTimeout(() => { positionCursor(); focusInput(); }, 300);
    document.addEventListener('touchmove', e => { if (e.target.closest('.typing-container')) e.preventDefault(); }, { passive: false });
  });

  setInterval(() => {
    if (!finished && document.getElementById('test-screen').style.display !== 'none' && document.activeElement !== hiddenInput) {
      if (!document.activeElement || document.activeElement.tagName !== 'INPUT') focusInput();
    }
  }, 1000);

  setTimeout(focusInput, 500);
})();
