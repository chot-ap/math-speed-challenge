// 計算スピードチャレンジ (掛け算 ＆ 素因数分解)

// モード設定
const MODE_CONFIGS = {
  multiplication: {
    id: 'multiplication',
    name: '掛け算 (2桁×2桁)',
    pill: '⚡ 掛け算',
    totalQuestions: 10,
    timeLimitSec: 15,
    timeoutWaitSec: 3,
    badgeText: 'Multiplication Attack',
    titleText: '2桁×2桁<br><span class="highlight-text">掛け算スピードアタック</span>',
    subtitleText: '瞬発力と暗算力を鍛える10問チャレンジ！',
    ruleQTitle: '全10問の出題',
    ruleQDesc: '2桁 × 2桁 (10〜99) の掛け算のみ',
    ruleTimeTitle: '制限時間 1問15秒',
    ruleTimeDesc: 'スピーディなカウントダウンゲージ表示',
    ruleTimeoutDesc: '正解を確認したあと自動で次の問題へ進行',
    inputPlaceholder: '答えを入力... (例: 1520)'
  },
  factorization: {
    id: 'factorization',
    name: '素因数分解 (4桁)',
    pill: '🧩 素因数分解',
    totalQuestions: 5,
    timeLimitSec: 30,
    timeoutWaitSec: 3,
    badgeText: 'Prime Factorization',
    titleText: '4桁の数値を<br><span class="highlight-text">素因数分解チャレンジ</span>',
    subtitleText: '思考力と数のセンスを磨く5問チャレンジ！',
    ruleQTitle: '全5問の出題',
    ruleQDesc: '4桁 (1000〜9999) の数を素数のかけ算に分解',
    ruleTimeTitle: '制限時間 1問30秒',
    ruleTimeDesc: 'じっくり考えて計算できる30秒設定',
    ruleTimeoutDesc: '30秒経過で正解を表示し3秒後に次の問題へ',
    inputPlaceholder: '例: 2^3 * 3^2 * 5 または 2*2*3*5'
  }
};

// Web Audio API によるシンセ音
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, startTime = 0, gainVal = 0.1) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    } catch (e) {}
  }

  correct() {
    this.init();
    this.playTone(659.25, 'triangle', 0.15, 0, 0.15);
    this.playTone(830.61, 'triangle', 0.15, 0.08, 0.15);
    this.playTone(987.77, 'triangle', 0.18, 0.16, 0.15);
    this.playTone(1318.51, 'triangle', 0.35, 0.24, 0.2);
  }

  incorrect() {
    this.init();
    this.playTone(220, 'sawtooth', 0.25, 0, 0.15);
    this.playTone(196, 'sawtooth', 0.4, 0.15, 0.15);
  }

  timeout() {
    this.init();
    this.playTone(350, 'sine', 0.2, 0, 0.2);
    this.playTone(280, 'sine', 0.3, 0.15, 0.2);
  }

  click() {
    this.init();
    this.playTone(800, 'sine', 0.03, 0, 0.02);
  }
}

const sounds = new SoundEffects();

// DOM 要素
const screens = {
  start: document.getElementById('start-screen'),
  quiz: document.getElementById('quiz-screen'),
  result: document.getElementById('result-screen')
};

const elements = {
  tabMulti: document.getElementById('tab-multiplication'),
  tabFactor: document.getElementById('tab-factorization'),
  modeBadge: document.getElementById('mode-badge'),
  mainTitle: document.getElementById('main-title'),
  mainSubtitle: document.getElementById('main-subtitle'),
  ruleQIcon: document.getElementById('rule-q-icon'),
  ruleQTitle: document.getElementById('rule-q-title'),
  ruleQDesc: document.getElementById('rule-q-desc'),
  ruleTimeTitle: document.getElementById('rule-time-title'),
  ruleTimeDesc: document.getElementById('rule-time-desc'),
  ruleTimeoutDesc: document.getElementById('rule-timeout-desc'),
  startBtn: document.getElementById('start-btn'),
  restartBtn: document.getElementById('restart-btn'),
  changeModeBtn: document.getElementById('change-mode-btn'),
  quizModePill: document.getElementById('quiz-mode-pill'),
  currentQ: document.getElementById('current-q'),
  totalQDisplay: document.getElementById('total-q-display'),
  currentScore: document.getElementById('current-score'),
  timerBar: document.getElementById('timer-progress-bar'),
  timerText: document.getElementById('timer-text'),
  formulaDisplay: document.getElementById('formula-display'),
  formulaHint: document.getElementById('formula-hint'),
  answerInput: document.getElementById('answer-input'),
  submitBtn: document.getElementById('submit-btn'),
  multiKeypad: document.getElementById('multiplication-keypad'),
  factorKeypad: document.getElementById('factorization-keypad'),
  feedbackBanner: document.getElementById('feedback-banner'),
  feedbackIcon: document.getElementById('feedback-icon'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackSub: document.getElementById('feedback-sub'),
  resultModeBadge: document.getElementById('result-mode-badge'),
  finalScore: document.getElementById('final-score'),
  finalTotalDisplay: document.getElementById('final-total-display'),
  resultEval: document.getElementById('result-evaluation'),
  accuracyRate: document.getElementById('accuracy-rate'),
  avgTime: document.getElementById('avg-time'),
  historyList: document.getElementById('history-list')
};

// アプリケーション状態
const state = {
  currentMode: 'multiplication', // 'multiplication' or 'factorization'
  questions: [],
  currentIndex: 0,
  score: 0,
  remainingSeconds: 15,
  timerInterval: null,
  isWaitingNext: false,
  questionStartTime: 0,
  history: []
};

// 上付き数字への変換
function toSuperscript(num) {
  const map = { '0':'⁰', '1':'¹', '2':'²', '3':'³', '4':'⁴', '5':'⁵', '6':'⁶', '7':'⁷', '8':'⁸', '9':'⁹' };
  return String(num).split('').map(c => map[c] || c).join('');
}

// 素因数分解の実行（マップを返す: { 2: 3, 3: 2, 5: 1 }）
function getPrimeFactorsMap(n) {
  const factors = {};
  let d = 2;
  let temp = n;
  while (d * d <= temp) {
    while (temp % d === 0) {
      factors[d] = (factors[d] || 0) + 1;
      temp = Math.floor(temp / d);
    }
    d = (d === 2) ? 3 : d + 2;
  }
  if (temp > 1) {
    factors[temp] = (factors[temp] || 0) + 1;
  }
  return factors;
}

// 素因数マップをきれいな指数表記（2³ × 3² × 5）に変換
function formatFactorsPretty(factorsMap) {
  const keys = Object.keys(factorsMap).map(Number).sort((a, b) => a - b);
  return keys.map(k => {
    const exp = factorsMap[k];
    return exp > 1 ? `${k}${toSuperscript(exp)}` : `${k}`;
  }).join(' × ');
}

// 素数判定
function isPrime(num) {
  if (num < 2) return false;
  if (num === 2 || num === 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
}

// ユーザーの素因数分解入力をパース
function parseUserFactorization(inputStr) {
  if (!inputStr || !inputStr.trim()) return null;

  // 正規化: ×, x, X, 空白, コンマ を * に置換
  let cleaned = inputStr.trim()
    .replace(/[×xX,]/g, '*')
    .replace(/\s+/g, '*');

  // 連続した*を1つに縮約
  cleaned = cleaned.replace(/\*+/g, '*');
  if (cleaned.startsWith('*')) cleaned = cleaned.slice(1);
  if (cleaned.endsWith('*')) cleaned = cleaned.slice(0, -1);

  if (!cleaned) return null;

  const parts = cleaned.split('*');
  const userFactors = {};

  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;

    if (p.includes('^')) {
      const [baseStr, expStr] = p.split('^');
      const base = parseInt(baseStr, 10);
      const exp = parseInt(expStr, 10);
      if (isNaN(base) || isNaN(exp) || exp <= 0) return null;
      if (!isPrime(base)) return { error: 'not_prime', base }; // 素数でない基底
      userFactors[base] = (userFactors[base] || 0) + exp;
    } else {
      const base = parseInt(p, 10);
      if (isNaN(base)) return null;
      if (!isPrime(base)) return { error: 'not_prime', base };
      userFactors[base] = (userFactors[base] || 0) + 1;
    }
  }

  return userFactors;
}

// 2つの素因数マップが完全に一致するか検証
function compareFactors(mapA, mapB) {
  if (!mapA || !mapB) return false;
  const keysA = Object.keys(mapA);
  const keysB = Object.keys(mapB);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (mapA[k] !== mapB[k]) return false;
  }
  return true;
}

// 4桁の解きやすい合成数を生成（小さめの素数の組み合わせ）
function generate4DigitComposite() {
  const primePool = [2, 2, 2, 2, 3, 3, 3, 5, 5, 7, 7, 11, 13];
  
  for (let attempt = 0; attempt < 500; attempt++) {
    // 2, 3, 5 を最低限含めたりして1000〜9999を作る
    let val = 1;
    const selected = [];
    
    // ベースとして2または3または5を適当に掛ける
    while (val < 1000) {
      const p = primePool[Math.floor(Math.random() * primePool.length)];
      if (val * p > 9999) break;
      val *= p;
      selected.push(p);
    }

    if (val >= 1000 && val <= 9999) {
      const factorsMap = getPrimeFactorsMap(val);
      // 素因数の種類が1つだけ(例: 2^10 = 1024)や素数そのものは避ける
      const keys = Object.keys(factorsMap);
      if (keys.length >= 2 && keys.length <= 5) {
        return {
          targetNumber: val,
          factorsMap: factorsMap,
          formattedAnswer: formatFactorsPretty(factorsMap)
        };
      }
    }
  }

  // フォールバック: 代表的な綺麗な4桁合成数
  const fallbacks = [1080, 1260, 1440, 1680, 1800, 2100, 2310, 2520, 2700, 3150, 3360, 4200, 5040, 7560];
  const val = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  const factorsMap = getPrimeFactorsMap(val);
  return {
    targetNumber: val,
    factorsMap: factorsMap,
    formattedAnswer: formatFactorsPretty(factorsMap)
  };
}

// 掛け算問題の生成
function generateMultiplicationQuestions(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 90) + 10;
    list.push({
      type: 'multiplication',
      num1: a,
      num2: b,
      displayFormula: `<span id="num1">${a}</span> <span class="operator">×</span> <span id="num2">${b}</span> <span class="equals">=</span> <span class="answer-placeholder">?</span>`,
      hint: '2桁 × 2桁の掛け算',
      answer: a * b,
      correctString: `${a * b}`
    });
  }
  return list;
}

// 素因数分解問題の生成
function generateFactorizationQuestions(count) {
  const list = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let q;
    let tries = 0;
    do {
      q = generate4DigitComposite();
      tries++;
    } while (used.has(q.targetNumber) && tries < 30);
    used.add(q.targetNumber);

    list.push({
      type: 'factorization',
      targetNumber: q.targetNumber,
      displayFormula: `<span>${q.targetNumber}</span> <span class="equals">=</span> <span class="answer-placeholder">?</span>`,
      hint: '素数の積で分解してください (例: 2^2 * 3 * 5)',
      factorsMap: q.factorsMap,
      correctString: q.formattedAnswer
    });
  }
  return list;
}

// 画面切り替え
function switchScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  if (screens[screenName]) {
    screens[screenName].classList.add('active');
  }
}

// モード設定の反映
function setMode(modeId) {
  state.currentMode = modeId;
  const config = MODE_CONFIGS[modeId];

  // タブのアクティブ表示
  elements.tabMulti.classList.toggle('active', modeId === 'multiplication');
  elements.tabMulti.setAttribute('aria-selected', modeId === 'multiplication');
  elements.tabFactor.classList.toggle('active', modeId === 'factorization');
  elements.tabFactor.setAttribute('aria-selected', modeId === 'factorization');

  // スタート画面のテキスト更新
  elements.modeBadge.textContent = config.badgeText;
  elements.mainTitle.innerHTML = config.titleText;
  elements.mainSubtitle.textContent = config.subtitleText;
  elements.ruleQIcon.textContent = modeId === 'multiplication' ? '⚡' : '🧩';
  elements.ruleQTitle.textContent = config.ruleQTitle;
  elements.ruleQDesc.textContent = config.ruleQDesc;
  elements.ruleTimeTitle.textContent = config.ruleTimeTitle;
  elements.ruleTimeDesc.textContent = config.ruleTimeDesc;
  elements.ruleTimeoutDesc.textContent = config.ruleTimeoutDesc;

  // クイズ画面のパーツ切り替え
  elements.quizModePill.textContent = config.pill;
  elements.totalQDisplay.textContent = `/${config.totalQuestions}`;
  elements.answerInput.placeholder = config.inputPlaceholder;

  if (modeId === 'multiplication') {
    elements.multiKeypad.classList.remove('hidden');
    elements.factorKeypad.classList.add('hidden');
  } else {
    elements.multiKeypad.classList.add('hidden');
    elements.factorKeypad.classList.remove('hidden');
  }
}

// ゲーム開始
function startGame() {
  sounds.init();
  const config = MODE_CONFIGS[state.currentMode];

  if (state.currentMode === 'multiplication') {
    state.questions = generateMultiplicationQuestions(config.totalQuestions);
  } else {
    state.questions = generateFactorizationQuestions(config.totalQuestions);
  }

  state.currentIndex = 0;
  state.score = 0;
  state.history = [];
  elements.currentScore.textContent = '0';

  switchScreen('quiz');
  loadQuestion(0);
}

// 問題の読み込み
function loadQuestion(index) {
  const config = MODE_CONFIGS[state.currentMode];
  if (index >= config.totalQuestions) {
    showResult();
    return;
  }

  state.currentIndex = index;
  state.isWaitingNext = false;
  const currentQ = state.questions[index];

  // UI初期化
  elements.currentQ.textContent = index + 1;
  elements.formulaDisplay.innerHTML = currentQ.displayFormula;
  elements.formulaHint.textContent = currentQ.hint;

  elements.answerInput.value = '';
  elements.answerInput.disabled = false;
  elements.submitBtn.disabled = false;
  setAllKeypadsDisabled(false);

  hideFeedback();
  resetTimer(config.timeLimitSec);
  startTimer(config.timeLimitSec);

  elements.answerInput.focus();
  state.questionStartTime = Date.now();
}

// タイマーリセット
function resetTimer(timeLimit) {
  clearInterval(state.timerInterval);
  state.remainingSeconds = timeLimit;
  updateTimerUI(timeLimit, timeLimit);
}

// タイマー更新UI
function updateTimerUI(seconds, totalLimit) {
  const percent = Math.max(0, Math.min(100, (seconds / totalLimit) * 100));
  elements.timerBar.style.width = `${percent}%`;
  elements.timerText.textContent = seconds.toFixed(1);

  // 警告表示 (残り25%以下でdanger、50%以下でwarning)
  const dangerThreshold = totalLimit * 0.25;
  const warningThreshold = totalLimit * 0.5;

  if (seconds <= dangerThreshold) {
    elements.timerBar.className = 'timer-bar danger';
    elements.timerText.className = 'timer-text danger';
  } else if (seconds <= warningThreshold) {
    elements.timerBar.className = 'timer-bar warning';
    elements.timerText.className = 'timer-text';
  } else {
    elements.timerBar.className = 'timer-bar';
    elements.timerText.className = 'timer-text';
  }
}

// タイマー開始
function startTimer(timeLimit) {
  const tickInterval = 100;
  const startTime = Date.now();
  const totalMs = timeLimit * 1000;

  state.timerInterval = setInterval(() => {
    if (state.isWaitingNext) return;

    const elapsed = Date.now() - startTime;
    const remainingMs = Math.max(0, totalMs - elapsed);
    state.remainingSeconds = remainingMs / 1000;

    updateTimerUI(state.remainingSeconds, timeLimit);

    if (remainingMs <= 0) {
      clearInterval(state.timerInterval);
      handleTimeout();
    }
  }, tickInterval);
}

// 時間切れ処理（要件: タイムアップ時は正解を表示して3秒後に次の問題）
function handleTimeout() {
  if (state.isWaitingNext) return;
  state.isWaitingNext = true;
  clearInterval(state.timerInterval);

  sounds.timeout();

  const config = MODE_CONFIGS[state.currentMode];
  const currentQ = state.questions[state.currentIndex];
  const userAns = elements.answerInput.value.trim() || '未回答';
  const timeTaken = config.timeLimitSec;

  const questionLabel = currentQ.type === 'multiplication' 
    ? `${currentQ.num1} × ${currentQ.num2}`
    : `${currentQ.targetNumber}`;

  // 履歴記録
  state.history.push({
    question: questionLabel,
    userAnswer: userAns,
    correctAnswer: currentQ.correctString,
    time: timeTaken,
    status: 'timeout'
  });

  elements.answerInput.disabled = true;
  elements.submitBtn.disabled = true;
  setAllKeypadsDisabled(true);

  // 正解を表示
  showFeedback('timeout', '⌛ 時間切れ！', `正解は 【 ${currentQ.correctString} 】 です (3秒後に次の問題へ)`);

  let countdownSec = config.timeoutWaitSec;
  const waitInterval = setInterval(() => {
    countdownSec--;
    if (countdownSec > 0) {
      elements.feedbackSub.textContent = `正解は 【 ${currentQ.correctString} 】 です (${countdownSec}秒後に次の問題へ)`;
    } else {
      clearInterval(waitInterval);
      loadQuestion(state.currentIndex + 1);
    }
  }, 1000);
}

// 解答送信処理
function handleSubmitAnswer() {
  if (state.isWaitingNext) return;

  const inputVal = elements.answerInput.value.trim();
  if (!inputVal) {
    elements.answerInput.focus();
    return;
  }

  const config = MODE_CONFIGS[state.currentMode];
  const currentQ = state.questions[state.currentIndex];
  const timeTaken = Math.min(config.timeLimitSec, (Date.now() - state.questionStartTime) / 1000);

  let isCorrect = false;
  let invalidMsg = null;

  if (currentQ.type === 'multiplication') {
    const userNum = parseInt(inputVal, 10);
    isCorrect = (userNum === currentQ.answer);
  } else {
    // 素因数分解の判定
    const parsed = parseUserFactorization(inputVal);
    if (!parsed) {
      invalidMsg = '形式を確認してください (例: 2^2 * 3 * 5)';
      showFeedback('incorrect', '❌ 入力形式エラー', invalidMsg);
      return;
    }
    if (parsed.error === 'not_prime') {
      invalidMsg = `「${parsed.base}」は素数ではありません`;
    } else {
      isCorrect = compareFactors(parsed, currentQ.factorsMap);
    }
  }

  state.isWaitingNext = true;
  clearInterval(state.timerInterval);

  elements.answerInput.disabled = true;
  elements.submitBtn.disabled = true;
  setAllKeypadsDisabled(true);

  const questionLabel = currentQ.type === 'multiplication' 
    ? `${currentQ.num1} × ${currentQ.num2}`
    : `${currentQ.targetNumber}`;

  if (isCorrect) {
    state.score++;
    elements.currentScore.textContent = state.score;
    sounds.correct();

    state.history.push({
      question: questionLabel,
      userAnswer: inputVal,
      correctAnswer: currentQ.correctString,
      time: timeTaken,
      status: 'correct'
    });

    showFeedback('correct', '🎉 正解！', `お見事！ (${timeTaken.toFixed(1)}秒)`);

    setTimeout(() => {
      loadQuestion(state.currentIndex + 1);
    }, 1300);
  } else {
    sounds.incorrect();

    state.history.push({
      question: questionLabel,
      userAnswer: inputVal,
      correctAnswer: currentQ.correctString,
      time: timeTaken,
      status: 'incorrect'
    });

    const subText = invalidMsg 
      ? `${invalidMsg} / 正解は 【 ${currentQ.correctString} 】`
      : `正解は 【 ${currentQ.correctString} 】 です`;

    showFeedback('incorrect', '❌ 不正解...', subText);

    setTimeout(() => {
      loadQuestion(state.currentIndex + 1);
    }, 2800);
  }
}

// フィードバックバナー表示
function showFeedback(type, title, subText) {
  elements.feedbackBanner.className = `feedback-banner ${type}`;
  elements.feedbackTitle.textContent = title;
  elements.feedbackSub.textContent = subText;

  if (type === 'correct') {
    elements.feedbackIcon.textContent = '✨';
  } else if (type === 'incorrect') {
    elements.feedbackIcon.textContent = '💡';
  } else {
    elements.feedbackIcon.textContent = '⌛';
  }

  elements.feedbackBanner.classList.remove('hidden');
}

function hideFeedback() {
  elements.feedbackBanner.classList.add('hidden');
}

// 全キーパッドの無効化/有効化
function setAllKeypadsDisabled(disabled) {
  document.querySelectorAll('.keypad-btn, .prime-chip').forEach(btn => {
    btn.disabled = disabled;
  });
}

// 結果画面の表示
function showResult() {
  switchScreen('result');

  const config = MODE_CONFIGS[state.currentMode];
  elements.resultModeBadge.textContent = config.name;
  elements.finalScore.textContent = state.score;
  elements.finalTotalDisplay.textContent = `/ ${config.totalQuestions} 問正解`;

  const accuracy = Math.round((state.score / config.totalQuestions) * 100);
  elements.accuracyRate.textContent = `${accuracy}%`;

  const totalTime = state.history.reduce((sum, item) => sum + item.time, 0);
  const avg = (totalTime / config.totalQuestions).toFixed(1);
  elements.avgTime.textContent = `${avg}s`;

  // 評価メッセージ
  let evalText = '再挑戦してハイスコアを目指そう！';
  if (state.score === config.totalQuestions) {
    evalText = '🏆 パーフェクト！驚異的な計算センスとスピードです！';
  } else if (state.score >= Math.ceil(config.totalQuestions * 0.7)) {
    evalText = '🌟 エクセレント！素晴らしい成果です！';
  } else if (state.score >= Math.ceil(config.totalQuestions * 0.4)) {
    evalText = '👍 グッド！練習を重ねてさらなる高みへ！';
  }
  elements.resultEval.textContent = evalText;

  // 履歴テーブル
  elements.historyList.innerHTML = '';
  state.history.forEach((item, i) => {
    const tr = document.createElement('tr');

    let badgeClass = 'status-badge incorrect';
    let badgeText = '不正解';
    if (item.status === 'correct') {
      badgeClass = 'status-badge correct';
      badgeText = '正解';
    } else if (item.status === 'timeout') {
      badgeClass = 'status-badge timeout';
      badgeText = '時間切れ';
    }

    tr.innerHTML = `
      <td>Q${i + 1}. <strong>${item.question}</strong></td>
      <td>${item.userAnswer}</td>
      <td><strong>${item.correctAnswer}</strong></td>
      <td>${item.time.toFixed(1)}s</td>
      <td><span class="${badgeClass}">${badgeText}</span></td>
    `;
    elements.historyList.appendChild(tr);
  });
}

// キー入力処理
function handleKeypadInput(key) {
  if (state.isWaitingNext || elements.answerInput.disabled) return;
  sounds.click();

  if (key === 'clear') {
    elements.answerInput.value = '';
  } else if (key === 'backspace') {
    elements.answerInput.value = elements.answerInput.value.slice(0, -1);
  } else {
    // 素因数分解または掛け算の入力追加
    elements.answerInput.value += key;
  }
  elements.answerInput.focus();
}

// イベントリスナーの登録
function initEvents() {
  // モードタブ切り替え
  elements.tabMulti.addEventListener('click', () => {
    sounds.click();
    setMode('multiplication');
  });

  elements.tabFactor.addEventListener('click', () => {
    sounds.click();
    setMode('factorization');
  });

  // スタートボタン
  elements.startBtn.addEventListener('click', startGame);

  // 再挑戦ボタン
  elements.restartBtn.addEventListener('click', startGame);

  // モード選択に戻るボタン
  elements.changeModeBtn.addEventListener('click', () => {
    sounds.click();
    switchScreen('start');
  });

  // 解答フォーム送信
  document.getElementById('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmitAnswer();
  });

  // テンキー・素数チップのクリックイベント委譲
  document.querySelectorAll('.keypad-btn, .prime-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (key !== null) {
        handleKeypadInput(key);
      }
    });
  });

  // Enterキーでの送信
  elements.answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitAnswer();
    }
  });

  // キーボード入力サニタイズ（モードによって許可文字を変更）
  elements.answerInput.addEventListener('input', (e) => {
    if (state.currentMode === 'multiplication') {
      elements.answerInput.value = elements.answerInput.value.replace(/[^0-9]/g, '');
    } else {
      // 素因数分解用: 数字、^、*、x、X、×、スペース
      elements.answerInput.value = elements.answerInput.value.replace(/[^0-9\^\*xX×\s]/g, '');
    }
  });
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  setMode('multiplication');
  initEvents();
});
