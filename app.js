const exercises = [{
  title: 'Community Centre Notice',
  passage: 'RIVERSIDE COMMUNITY CENTRE — WEEKEND WORKSHOPS\n\nThe centre is running a series of Saturday workshops throughout June. The photography workshop takes place from 10:00 a.m. to 12:30 p.m. and is suitable for beginners. Participants should bring their own camera; a limited number of cameras can be borrowed if requested when booking.\n\nThe cooking class runs from 1:30 p.m. to 4:00 p.m. Ingredients are provided, but please tell us about any food allergies at least three days before the class. Both workshops cost £18. Members receive a 20% discount. To reserve a place, email bookings@riversidecentre.example or visit the reception desk. Cancellations made less than 24 hours before a workshop are not refundable.',
  source: 'Material: original practice text written for IELTS Quest. It is not taken from a past IELTS test. Permission status: original.',
  questions: [
    { text: 'What should someone do if they need to borrow a camera?', options: ['Pay an additional camera fee', 'Ask for one when making the booking', 'Arrive before 9:00 a.m.', 'Contact the cooking instructor'], answer: 1, explain: 'Matnda kamera kerak bo‘lsa, uni bron qilish paytida so‘rash kerakligi aytilgan.' },
    { text: 'When should participants report a food allergy?', options: ['On the day of the class', 'At least three days in advance', 'When paying for the workshop', 'Within 24 hours of booking'], answer: 1, explain: 'Matnda allergiyalar haqida mashg‘ulotdan kamida uch kun oldin xabar berish so‘raladi.' },
    { text: 'How much does a centre member pay for one workshop?', options: ['£3.60', '£14.40', '£18.00', '£20.00'], answer: 1, explain: '£18 narxdan 20% chegirma — £3.60. To‘lanadigan summa £14.40.' },
    { text: 'Which statement is true about the workshops?', options: ['Both workshops are held in the morning.', 'The centre supplies ingredients for the cooking class.', 'Only members may book a place.', 'Late cancellations receive a full refund.'], answer: 1, explain: 'Matnda cooking class uchun masalliqlar berilishi yozilgan.' },
    { text: 'How can a participant reserve a place?', options: ['By calling the instructor', 'By sending an email or visiting reception', 'By completing an online form only', 'By paying at the workshop'], answer: 1, explain: 'Joyni email yuborib yoki qabulxonaga borib band qilish mumkin.' }
  ]
}];

const $ = (id) => document.getElementById(id);
const storageKey = 'ielts-quest-progress-v1';
let progress = loadProgress();
let questionIndex = 0;
let selectedAnswer = null;
let answered = false;

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || { score: 0, correct: 0, today: 0, lastDate: '', streak: 0, completed: [] }; }
  catch { return { score: 0, correct: 0, today: 0, lastDate: '', streak: 0, completed: [] }; }
}
function saveProgress() { localStorage.setItem(storageKey, JSON.stringify(progress)); }
function dayStamp() { return new Date().toLocaleDateString('en-CA'); }
function updateStats() {
  const today = dayStamp();
  if (progress.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    progress.streak = progress.lastDate === yesterday ? progress.streak : 0;
    progress.today = 0;
    progress.lastDate = today;
    saveProgress();
  }
  $('total-score').textContent = progress.score;
  $('correct-total').textContent = progress.correct;
  $('today-progress').textContent = `${Math.min(progress.today, 5)} / 5`;
  $('streak-count').textContent = `${progress.streak} ${progress.streak === 1 ? 'kun' : 'kun'}`;
}
function renderQuestion() {
  const exercise = exercises[0];
  const question = exercise.questions[questionIndex];
  $('passage-title').textContent = exercise.title;
  $('passage-text').textContent = exercise.passage;
  $('source-note').textContent = exercise.source;
  $('question-count').textContent = `${questionIndex + 1} / ${exercise.questions.length}`;
  $('question-label').textContent = `SAVOL ${questionIndex + 1}`;
  $('question-text').textContent = question.text;
  $('feedback').hidden = true;
  $('feedback').className = 'feedback';
  $('answer-list').replaceChildren();
  selectedAnswer = null;
  answered = false;
  $('check-button').disabled = true;
  $('check-button').innerHTML = 'Javobni tekshirish <span>→</span>';
  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'answer-option';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    const letter = document.createElement('span');
    letter.className = 'answer-letter';
    letter.textContent = String.fromCharCode(65 + index);
    const text = document.createElement('span');
    text.textContent = option;
    button.append(letter, text);
    button.addEventListener('click', () => {
      if (answered) return;
      selectedAnswer = index;
      document.querySelectorAll('.answer-option').forEach((el) => { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false'); });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      $('check-button').disabled = false;
    });
    $('answer-list').append(button);
  });
}
function checkAnswer() {
  if (answered) {
    if (questionIndex < exercises[0].questions.length - 1) { questionIndex++; renderQuestion(); }
    else { questionIndex = 0; renderQuestion(); }
    return;
  }
  if (selectedAnswer === null) return;
  answered = true;
  const q = exercises[0].questions[questionIndex];
  const right = selectedAnswer === q.answer;
  document.querySelectorAll('.answer-option').forEach((el, index) => {
    el.disabled = true;
    if (index === q.answer) el.classList.add('correct');
    else if (index === selectedAnswer) el.classList.add('incorrect');
  });
  const feedback = $('feedback');
  feedback.hidden = false;
  feedback.className = `feedback ${right ? 'good' : 'bad'}`;
  feedback.textContent = `${right ? 'To‘g‘ri! ' : 'Hali emas. '} ${q.explain}`;
  if (right) { progress.score += 10; progress.correct += 1; }
  const today = dayStamp();
  if (progress.lastDate !== today) { progress.today = 0; progress.streak += 1; progress.lastDate = today; }
  progress.today += 1;
  saveProgress();
  updateStats();
  $('check-button').innerHTML = questionIndex === exercises[0].questions.length - 1 ? 'Boshidan boshlash <span>↻</span>' : 'Keyingi savol <span>→</span>';
}
$('check-button').addEventListener('click', checkAnswer);
updateStats();
renderQuestion();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
