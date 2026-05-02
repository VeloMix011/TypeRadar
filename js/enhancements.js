/* ═══════════════════════════════════════════════════════════════════════
   DEVELOPER MODE & ADVANCED ANALYTICS ENHANCEMENTS
═══════════════════════════════════════════════════════════════════════ */

// Global variables for new features
let currentMode = 'normal'; // 'normal' or 'code'
let currentCodeLanguage = 'javascript';
let keyTimestamps = []; // Track keystroke timing for latency analysis
let charAnalytics = {}; // Per-character performance data
let userLevel = 1;
let userXP = 0;
let userStats = { totalTests: 0, totalChars: 0, totalTime: 0 };

// Initialize analytics
function initializeAnalytics() {
  charAnalytics = {};
  keyTimestamps = [];
  // Initialize character latency tracking
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789.,;:!?\'"- ';
  alphabet.split('').forEach(char => {
    charAnalytics[char] = { count: 0, totalLatency: 0, avgLatency: 0, errors: 0 };
  });
}

// Track keystroke timing
function recordKeystroke(char) {
  const now = performance.now();
  keyTimestamps.push({ char, time: now });
  
  if (keyTimestamps.length > 1) {
    const latency = now - keyTimestamps[keyTimestamps.length - 2].time;
    const lowerChar = char.toLowerCase();
    
    if (charAnalytics[lowerChar]) {
      charAnalytics[lowerChar].count++;
      charAnalytics[lowerChar].totalLatency += latency;
      charAnalytics[lowerChar].avgLatency = charAnalytics[lowerChar].totalLatency / charAnalytics[lowerChar].count;
    }
  }
}

// Calculate per-character error rate
function recordCharError(char) {
  const lowerChar = char.toLowerCase();
  if (charAnalytics[lowerChar]) {
    charAnalytics[lowerChar].errors++;
  }
}

// Generate analytics report after test
function generateAnalyticsReport() {
  const report = {
    timestamp: new Date().toISOString(),
    mode: currentMode,
    language: currentCodeLanguage,
    totalChars: totalCorrectChars + totalWrongChars,
    accuracy: totalCorrectChars / (totalCorrectChars + totalWrongChars) * 100,
    wpm: Math.round((totalCorrectChars / 5) / (totalTime / 60)),
    charAnalytics: charAnalytics,
    slowestChars: getSlowestCharacters(5),
    mostErrorProne: getMostErrorProneCharacters(5)
  };
  return report;
}

// Get slowest characters
function getSlowestCharacters(limit) {
  return Object.entries(charAnalytics)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].avgLatency - a[1].avgLatency)
    .slice(0, limit)
    .map(([char, data]) => ({ char, avgLatency: Math.round(data.avgLatency) }));
}

// Get most error-prone characters
function getMostErrorProneCharacters(limit) {
  return Object.entries(charAnalytics)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => (b[1].errors / b[1].count) - (a[1].errors / a[1].count))
    .slice(0, limit)
    .map(([char, data]) => ({ 
      char, 
      errorRate: Math.round((data.errors / data.count) * 100) 
    }));
}

// Load Developer Mode words
function loadDeveloperMode(language) {
  if (!CODE_SNIPPETS[language]) return false;
  
  currentMode = 'code';
  currentCodeLanguage = language;
  words = CODE_SNIPPETS[language].slice();
  
  // Shuffle words
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  
  return true;
}

// Calculate user level based on XP
function calculateLevel(xp) {
  return 1 + Math.floor(Math.sqrt(xp / 100));
}

// Award XP based on test performance
function awardXP(wpm, accuracy) {
  const prevLevel = userLevel;
  const baseXP = Math.round(wpm * accuracy / 100);
  const bonus = accuracy > 95 ? Math.round(baseXP * 0.2) : 0;
  const totalXP = baseXP + bonus;
  
  userXP += totalXP;
  userLevel = calculateLevel(userXP);
  
  try {
    localStorage.setItem('typeradar_user_xp', userXP);
    localStorage.setItem('typeradar_user_level', userLevel);
  } catch (e) {}
  
  return { totalXP, bonus, newLevel: userLevel, leveledUp: userLevel > prevLevel };
}

// Load user stats from localStorage
function loadUserStats() {
  try {
    userXP = parseInt(localStorage.getItem('typeradar_user_xp') || '0');
    userLevel = parseInt(localStorage.getItem('typeradar_user_level') || '1');
    userStats = JSON.parse(localStorage.getItem('typeradar_user_stats') || '{"totalTests":0,"totalChars":0,"totalTime":0}');
  } catch (e) {}
}

// Save user stats to localStorage
function saveUserStats() {
  try {
    localStorage.setItem('typeradar_user_xp', userXP);
    localStorage.setItem('typeradar_user_level', userLevel);
    localStorage.setItem('typeradar_user_stats', JSON.stringify(userStats));
  } catch (e) {}
}

// Update user stats after test
function updateUserStats(testWPM, testAccuracy, testDuration) {
  userStats.totalTests++;
  userStats.totalChars += totalCorrectChars + totalWrongChars;
  userStats.totalTime += testDuration;
  saveUserStats();
}

// Initialize on page load
loadUserStats();
initializeAnalytics();


// ═══════════════════════════════════════════════════════════════════════
// UI UPDATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// Update level and XP display in profile panel
function updateLevelDisplay() {
  const levelBadge = document.getElementById('user-level-badge');
  const xpText = document.getElementById('user-xp-text');
  const xpFill = document.getElementById('user-xp-fill');
  
  if (levelBadge) levelBadge.textContent = 'Lv. ' + userLevel;
  if (xpText) xpText.textContent = userXP + ' XP';
  
  // Calculate XP for next level
  const currentLevelXP = Math.pow(userLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(userLevel, 2) * 100;
  const xpInLevel = userXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const fillPercent = Math.min(100, (xpInLevel / xpNeeded) * 100);
  
  if (xpFill) xpFill.style.width = fillPercent + '%';
}

// Display analytics report after test
function displayAnalyticsReport(report) {
  const analyticsSection = document.getElementById('result-analytics');
  const slowestCharsDiv = document.getElementById('slowest-chars');
  const errorProneDiv = document.getElementById('error-prone-chars');
  
  if (!analyticsSection) return;
  
  // Format slowest characters
  const slowestText = report.slowestChars
    .map(item => item.char + ' (' + item.avgLatency + 'ms)')
    .join(', ') || '—';
  
  if (slowestCharsDiv) slowestCharsDiv.textContent = slowestText;
  
  // Format error-prone characters
  const errorText = report.mostErrorProne
    .map(item => item.char + ' (' + item.errorRate + '%)')
    .join(', ') || '—';
  
  if (errorProneDiv) errorProneDiv.textContent = errorText;
  
  // Always show analytics section (handled by app.js endTest)
  // analyticsSection visibility is controlled from app.js
}

// Display XP reward after test
function displayXPReward(xpReward) {
  var xpRewardDisplay = document.getElementById('xp-reward-display');
  var xpEarnedAmount = document.getElementById('xp-earned-amount');
  var levelUpMessage = document.getElementById('level-up-message');
  
  if (!xpRewardDisplay) return;
  
  xpRewardDisplay.style.display = 'block';
  if (xpEarnedAmount) xpEarnedAmount.textContent = '+' + xpReward.totalXP;
  
  // Show level up message if a level up occurred
  if (levelUpMessage) {
    if (xpReward.leveledUp) {
      levelUpMessage.textContent = '🎉 Level Up! Now Lv. ' + xpReward.newLevel;
      levelUpMessage.style.display = 'block';
      setTimeout(function() {
        levelUpMessage.style.display = 'none';
      }, 4000);
    } else {
      levelUpMessage.style.display = 'none';
    }
  }
  
  updateLevelDisplay();
}

// Select Developer Mode language
window.selectDeveloperMode = function(language) {
  if (loadDeveloperMode(language)) {
    // Update UI to show selected language
    document.querySelectorAll('#developer-mode-selector .mode-card').forEach(card => {
      card.classList.remove('active');
    });
    const selectedCard = document.querySelector('[data-lang="' + language + '"]');
    if (selectedCard) selectedCard.classList.add('active');
    
    // Restart test with new mode
    restart();
  }
};

// Initialize UI on page load
window.addEventListener('load', function() {
  updateLevelDisplay();
  
  // Add event listener to update level display when user logs in
  const originalLoadProfile = window.loadProfile;
  if (originalLoadProfile) {
    window.loadProfile = function(userId) {
      updateLevelDisplay();
      return originalLoadProfile.call(this, userId);
    };
  }
});
