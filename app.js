const $ = (id) => document.getElementById(id);
const storageKey = 'ielts-quest-progress-v1';
const exercises = window.IELTS_QUESTION_BANK || [];
let exerciseIndex = 0;
let questionIndex = 0;
let responses = {};
let submitted = false;
let secondsLeft = 20 * 60;
let timerInterval = null;
let timerPaused = false;
let enlargedText = false;

function currentExercise() { return exercises[exerciseIndex]; }
function responseKey(question) { return `${currentExercise().id}:${question.id}`; }
function normalizeAnswer(value) { return String(value || '').trim().toLocaleLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' '); }
function selectedResponse(question) { return responses[responseKey(question)]; }
function hasResponse(question) {
  const value = selectedResponse(question);
  return value !== undefined && value !== null && String(value).trim() !== '';
}
function renderExerciseOptions() {
  const select = $('exercise-select');
  exercises.forEach((exercise, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = exercise.title;
    select.append(option);
  });
  select.addEventListener('change', () => {
    exerciseIndex = Number(select.value);
    questionIndex = 0;
    responses = {};
    submitted = false;
    secondsLeft = 20 * 60;
    updateTimer();
    renderQuestion();
    startTimer();
  });
}
function renderPassage(exercise) {
  $('passage-title').textContent = exercise.title;
  $('passage-heading').textContent = exercise.title;
  const passage = $('passage-text');
  passage.replaceChildren();
  exercise.passage.split(/\n\s*\n/).forEach((block) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = block;
    passage.append(paragraph);
  });
  $('source-note').textContent = `Manba: ${exercise.source.description} Ruxsat: ${exercise.source.permission}.`;
}
function renderQuestionNav() {
  const exercise = currentExercise();
  const nav = $('question-nav');
  nav.replaceChildren();
  exercise.questions.forEach((question, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'question-nav-button';
    button.textContent = String(index + 1);
    button.setAttribute('aria-label', `Savol ${index + 1}${hasResponse(question) ? ', javob berilgan' : ', javob berilmagan'}`);
    if (index === questionIndex) button.classList.add('current');
    if (hasResponse(question)) button.classList.add('answered');
    button.disabled = submitted;
    button.addEventListener('click', () => { questionIndex = index; renderQuestion(); });
    nav.append(button);
  });
  const done = exercise.questions.filter(hasResponse).length;
  $('answered-count').textContent = `${done} / ${exercise.questions.length} javob berildi`;
  $('progress-fill').style.width = `${exercise.questions.length ? done / exercise.questions.length * 100 : 0}%`;
}
function setResponse(question, value) {
  responses[responseKey(question)] = value;
  updateQuestionStatus();
  renderQuestionNav();
}
function updateQuestionStatus() {
  const question = currentExercise().questions[questionIndex];
  const value = selectedResponse(question);
  $('question-status').textContent = hasResponse(question) ? (question.acceptedAnswers ? `Javob: ${value}` : `Tanlangan javob: ${String.fromCharCode(65 + value)}`) : 'Javob tanlanmagan';
}
function renderQuestion() {
  const exercise = currentExercise();
  if (!exercise) return;
  const question = exercise.questions[questionIndex];
  renderPassage(exercise);
  renderQuestionNav();
  $('question-count').textContent = `${questionIndex + 1} / ${exercise.questions.length}`;
  $('question-label').textContent = `SAVOL ${questionIndex + 1}`;
  $('question-text').textContent = question.text;
  $('question-instruction').textContent = question.answerFormat ? `Ko‘rsatma: ${question.answerFormat}.` : question.type === 'true-false-not-given' ? 'Quyidagi bayonotlar matndagi ma’lumotga mos keladimi? TRUE, FALSE yoki NOT GIVEN ni tanlang.' : question.type === 'paragraph-matching' ? 'Ma’lumot qaysi paragrafda berilganini tanlang.' : '';
  $('feedback').hidden = true;
  $('answer-list').replaceChildren();
  const currentResponse = selectedResponse(question);
  if (question.acceptedAnswers) {
    const input = document.createElement('input');
    input.className = 'text-answer';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = 'Javobingizni yozing';
    input.value = currentResponse || '';
    input.disabled = submitted;
    input.addEventListener('input', () => setResponse(question, input.value));
    $('answer-list').append(input);
  } else {
    question.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `answer-option${currentResponse === index ? ' selected' : ''}`;
      button.setAttribute('aria-pressed', currentResponse === index ? 'true' : 'false');
      button.disabled = submitted;
      const marker = document.createElement('span');
      marker.className = 'answer-letter';
      marker.textContent = question.type === 'paragraph-matching' ? option : String.fromCharCode(65 + index);
      const label = document.createElement('span');
      label.textContent = option;
      button.append(marker, label);
      button.addEventListener('click', () => setResponse(question, index));
      $('answer-list').append(button);
    });
  }
  $('prev-question').disabled = questionIndex === 0;
  $('next-question').textContent = questionIndex === exercise.questions.length - 1 ? 'Yakunlash →' : 'Keyingi →';
  $('next-question').disabled = submitted;
  $('submit-exam').disabled = submitted;
  updateQuestionStatus();
}
function changeQuestion(direction) {
  const count = currentExercise().questions.length;
  const target = questionIndex + direction;
  if (target >= 0 && target < count) { questionIndex = target; renderQuestion(); }
  else if (target >= count) openSubmitDialog();
}
function openSubmitDialog() {
  const unanswered = currentExercise().questions.filter((question) => !hasResponse(question)).length;
  $('submit-summary').textContent = unanswered ? `${unanswered} ta savolga hali javob berilmagan. Shunga qaramay yakunlaysizmi?` : 'Barcha savollarga javob berildi. Mashqni yakunlashga tayyormisiz?';
  $('submit-dialog').showModal();
}
function submitExercise() {
  if (submitted) return;
  submitted = true;
  clearInterval(timerInterval);
  const exercise = currentExercise();
  let correct = 0;
  let answeredCount = 0;
  exercise.questions.forEach((question) => {
    if (!hasResponse(question)) return;
    answeredCount++;
    const value = selectedResponse(question);
    const isRight = question.acceptedAnswers
      ? question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value))
      : value === question.answer;
    if (isRight) correct++;
  });
  const defaults = { score: 0, correct: 0, today: 0, lastDate: '', streak: 0 };
  let progress;
  try { progress = { ...defaults, ...(JSON.parse(localStorage.getItem(storageKey)) || {}) }; } catch { progress = defaults; }
  const today = new Date().toLocaleDateString('en-CA');
  if (progress.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    progress.streak = progress.lastDate === yesterday ? progress.streak + 1 : 1;
    progress.today = 0;
    progress.lastDate = today;
  }
  progress.score += correct * 10;
  progress.correct += correct;
  progress.today += answeredCount;
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Continue without persistent stats. */ }
  $('results-title').textContent = exercise.title;
  $('result-score').textContent = `${correct} / ${exercise.questions.length}`;
  $('result-message').textContent = `${answeredCount} ta savolga javob berdingiz. Har bir to‘g‘ri javob uchun 10 ball berildi.`;
  const review = $('result-review');
  review.replaceChildren();
  exercise.questions.forEach((question, index) => {
    const row = document.createElement('article');
    row.className = 'review-item';
    const title = document.createElement('strong');
    title.textContent = `${index + 1}. ${question.text}`;
    const userAnswer = document.createElement('p');
    const value = selectedResponse(question);
    const userLabel = question.acceptedAnswers ? (value || 'Javob berilmagan') : (value === undefined ? 'Javob berilmagan' : question.options[value]);
    const right = question.acceptedAnswers ? question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value)) : value === question.answer;
    userAnswer.textContent = `Sizning javobingiz: ${userLabel}`;
    userAnswer.classList.add(right ? 'review-correct' : 'review-wrong');
    const explanation = document.createElement('p');
    const correctLabel = question.acceptedAnswers ? question.acceptedAnswers[0] : question.options[question.answer];
    explanation.textContent = `To‘g‘ri javob: ${correctLabel}. ${question.explain}`;
    row.append(title, userAnswer, explanation);
    review.append(row);
  });
  $('submit-dialog').close();
  $('results-dialog').showModal();
  renderQuestion();
}
function updateTimer() {
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  $('exam-timer').textContent = `${minutes}:${seconds}`;
  $('exam-timer').classList.toggle('timer-warning', secondsLeft <= 60);
}
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timerPaused || submitted) return;
    secondsLeft = Math.max(0, secondsLeft - 1);
    updateTimer();
    if (secondsLeft === 0) openSubmitDialog();
  }, 1000);
}
$('prev-question').addEventListener('click', () => changeQuestion(-1));
$('next-question').addEventListener('click', () => changeQuestion(1));
$('submit-exam').addEventListener('click', openSubmitDialog);
$('confirm-submit').addEventListener('click', (event) => { event.preventDefault(); submitExercise(); });
$('timer-toggle').addEventListener('click', () => {
  timerPaused = !timerPaused;
  $('timer-toggle').textContent = timerPaused ? 'Davom etish' : 'Pauza';
});
$('text-size').addEventListener('click', () => {
  enlargedText = !enlargedText;
  $('passage-text').classList.toggle('large-text', enlargedText);
  $('text-size').textContent = enlargedText ? 'A−' : 'A⁺';
});
$('close-results').addEventListener('click', () => $('results-dialog').close());
$('restart-exercise').addEventListener('click', () => {
  $('results-dialog').close();
  exerciseIndex = Number($('exercise-select').value);
  questionIndex = 0;
  responses = {};
  submitted = false;
  timerPaused = false;
  secondsLeft = 20 * 60;
  $('timer-toggle').textContent = 'Pauza';
  updateTimer();
  renderQuestion();
  startTimer();
});
renderExerciseOptions();
updateTimer();
renderQuestion();
startTimer();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
