const sequenceDisplay = document.querySelector('#sequence-display');
const sequenceHint = document.querySelector('#sequence-hint');
const generateButton = document.querySelector('#generate-button');
const lengthInput = document.querySelector('#length-input');
const recallArea = document.querySelector('#recall-area');
const answerInput = document.querySelector('#answer-input');
const checkButton = document.querySelector('#check-button');
const feedback = document.querySelector('#feedback');
const comparison = document.querySelector('#comparison');
const statusLabel = document.querySelector('#status-label');
let currentSequence = '';
let concealed = false;
let verified = false;
let streak = Number(localStorage.getItem('recall-streak') || 0);
let best = Number(localStorage.getItem('recall-best') || 0);

function renderStats() {
  document.querySelector('#streak-value').textContent = streak;
  document.querySelector('#best-value').textContent = best;
}
renderStats();

function safeLength() {
  const value = Number.parseInt(lengthInput.value, 10);
  const clamped = Number.isFinite(value) ? Math.min(12, Math.max(3, value)) : 6;
  lengthInput.value = clamped;
  return clamped;
}

function randomDigits(length) {
  // Rejection sampling avoids modulo bias while keeping this tiny and offline.
  if (globalThis.crypto?.getRandomValues) {
    let digits = '';
    while (digits.length < length) {
      const batch = new Uint8Array((length - digits.length) * 2);
      crypto.getRandomValues(batch);
      for (const byte of batch) if (byte < 250) digits += String(byte % 10);
    }
    return digits.slice(0, length);
  }
  let digits = '';
  for (let i = 0; i < length; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

function setFeedback(message = '', kind = '') {
  feedback.textContent = message;
  feedback.className = `feedback${kind ? ` ${kind}` : ''}`;
}

function generate() {
  currentSequence = randomDigits(safeLength());
  concealed = false;
  verified = false;
  sequenceDisplay.textContent = currentSequence;
  sequenceDisplay.className = 'sequence-placeholder has-sequence';
  sequenceDisplay.setAttribute('aria-label', `Sequence: ${currentSequence.split('').join(' ')}`);
  sequenceHint.textContent = 'Take a moment to memorize it';
  generateButton.querySelector('span').textContent = 'Hide sequence';
  generateButton.setAttribute('aria-label', 'Hide sequence');
  recallArea.hidden = true;
  answerInput.value = '';
  comparison.hidden = true;
  comparison.textContent = '';
  setFeedback();
  statusLabel.textContent = 'MEMORIZE THE SEQUENCE';
}

function hideSequence() {
  if (!currentSequence || concealed) return;
  concealed = true;
  sequenceDisplay.textContent = Array.from(currentSequence, () => '•').join(' ');
  sequenceDisplay.className = 'sequence-placeholder is-hidden';
  sequenceDisplay.setAttribute('aria-label', 'Sequence concealed');
  sequenceHint.textContent = 'Sequence hidden — enter what you remember';
  generateButton.querySelector('span').textContent = 'New sequence';
  generateButton.setAttribute('aria-label', 'Generate a new sequence');
  recallArea.hidden = false;
  statusLabel.textContent = 'NOW RECALL THE DIGITS';
  answerInput.focus({ preventScroll: true });
}

function compareMarkup(expected, actual) {
  const expectedHtml = [...expected].map((digit, i) => digit === actual[i] ? digit : `<span class="diff">${digit}</span>`).join('');
  const actualPadded = actual.padEnd(expected.length, ' ');
  const actualHtml = [...actualPadded].slice(0, expected.length).map((digit, i) => digit === expected[i] ? (digit || '·') : `<span class="diff">${digit || '·'}</span>`).join('');
  return `<div class="compare-row"><span class="compare-label">Correct</span><span class="compare-digits">${expectedHtml}</span></div><div class="compare-row"><span class="compare-label">Your answer</span><span class="compare-digits">${actualHtml}</span></div>`;
}

function verify() {
  if (!currentSequence || !concealed || verified) return;
  const attempt = answerInput.value.replace(/\D/g, '').slice(0, 12);
  answerInput.value = attempt;
  if (!attempt) {
    setFeedback('Enter the digits you remember to check.', 'error');
    answerInput.focus();
    return;
  }
  verified = true;
  if (attempt === currentSequence) {
    streak += 1;
    best = Math.max(best, streak);
    localStorage.setItem('recall-streak', String(streak));
    localStorage.setItem('recall-best', String(best));
    renderStats();
    setFeedback('Perfect match! Your memory is on point.', 'success');
    statusLabel.textContent = 'NAILED IT';
    comparison.hidden = true;
  } else {
    streak = 0;
    localStorage.setItem('recall-streak', '0');
    renderStats();
    setFeedback('Not quite — take a look and try another round.', 'error');
    comparison.innerHTML = compareMarkup(currentSequence, attempt);
    comparison.hidden = false;
    statusLabel.textContent = 'ROUND COMPLETE';
  }
  sequenceHint.textContent = 'Ready for another round whenever you are';
  generateButton.querySelector('span').textContent = 'Generate new sequence';
  generateButton.setAttribute('aria-label', 'Generate a new sequence');
}

generateButton.addEventListener('click', () => {
  if (currentSequence && !concealed && !verified) hideSequence();
  else generate();
});
checkButton.addEventListener('click', verify);
answerInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') verify(); });
lengthInput.addEventListener('change', safeLength);
lengthInput.addEventListener('blur', safeLength);

document.querySelector('#theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  document.querySelector('meta[name="theme-color"]').content = isLight ? '#f3f5ef' : '#101a2d';
  localStorage.setItem('recall-theme', isLight ? 'light' : 'dark');
});
if (localStorage.getItem('recall-theme') === 'light') {
  document.body.classList.add('light');
  document.querySelector('meta[name="theme-color"]').content = '#f3f5ef';
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Offline support could not be enabled:', error)));
}
