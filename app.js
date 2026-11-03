const $ = (id) => document.getElementById(id);
const storageKey = 'ielts-quest-progress-v1';
const exercises = window.IELTS_QUESTION_BANK || [];
let exerciseIndex = 0;
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
    responses = {};
    submitted = false;
    timerPaused = false;
    secondsLeft = 20 * 60;
    $('timer-toggle').textContent = 'Pauza';
    updateTimer();
    renderMock();
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
  passage.classList.toggle('large-text', enlargedText);
  $('text-size').textContent = enlargedText ? 'A−' : 'A⁺';
}
function renderQuestionNav() {
  const exercise = currentExercise();
  const nav = $('question-nav');
  nav.replaceChildren();
  exercise.questions.forEach((question, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `question-nav-button${hasResponse(question) ? ' answered' : ''}`;
    button.textContent = String(index + 1);
    button.setAttribute('aria-label', `Savol ${index + 1}${hasResponse(question) ? ', javob berilgan' : ', javob berilmagan'}`);
    button.disabled = submitted;
    button.addEventListener('click', () => document.getElementById(`question-${index + 1}`).scrollIntoView({ behavior: 'smooth', block: 'center' }));
    nav.append(button);
  });
  const done = exercise.questions.filter(hasResponse).length;
  $('answered-count').textContent = `${done} / ${exercise.questions.length} javob berildi`;
  $('progress-fill').style.width = `${exercise.questions.length ? done / exercise.questions.length * 100 : 0}%`;
}
function updateQuestionNavStatus(question) {
  const index = currentExercise().questions.indexOf(question);
  const button = $('question-nav').children[index];
  if (!button) return;
  button.classList.toggle('answered', hasResponse(question));
  button.setAttribute('aria-label', `Savol ${index + 1}${hasResponse(question) ? ', javob berilgan' : ', javob berilmagan'}`);
  const done = currentExercise().questions.filter(hasResponse).length;
  $('answered-count').textContent = `${done} / ${currentExercise().questions.length} javob berildi`;
  $('progress-fill').style.width = `${done / currentExercise().questions.length * 100}%`;
}
function makeQuestionCard(question, index) {
  const card = document.createElement('article');
  card.className = 'mock-question';
  card.id = `question-${index + 1}`;
  const top = document.createElement('div');
  top.className = 'mock-question-top';
  const number = document.createElement('span');
  number.className = 'mock-question-number';
  number.textContent = String(index + 1);
  const prompt = document.createElement('div');
  prompt.className = 'mock-question-prompt';
  const instruction = document.createElement('p');
  instruction.className = 'question-instruction';
  instruction.textContent = question.answerFormat ? `Ko‘rsatma: ${question.answerFormat}.` : question.type === 'true-false-not-given' ? 'TRUE, FALSE yoki NOT GIVEN ni tanlang.' : question.type === 'paragraph-matching' ? 'Mos keladigan paragraf harfini tanlang.' : '';
  const title = document.createElement('h3');
  title.textContent = question.text;
  prompt.append(instruction, title);
  top.append(number, prompt);
  card.append(top);
  const choices = document.createElement('div');
  choices.className = question.acceptedAnswers ? 'mock-answer-area text-answer-area' : 'mock-answer-area';
  const saved = selectedResponse(question);
  if (question.acceptedAnswers) {
    const input = document.createElement('input');
    input.className = 'text-answer';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = 'Javobingizni yozing';
    input.setAttribute('aria-label', `Savol ${index + 1} javobi`);
    input.value = saved || '';
    input.disabled = submitted;
    input.addEventListener('input', () => { responses[responseKey(question)] = input.value; updateQuestionNavStatus(question); });
    choices.append(input);
  } else {
    question.options.forEach((option, optionIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `answer-option${saved === optionIndex ? ' selected' : ''}`;
      button.setAttribute('aria-pressed', saved === optionIndex ? 'true' : 'false');
      button.disabled = submitted;
      const marker = document.createElement('span');
      marker.className = 'answer-letter';
      marker.textContent = question.type === 'paragraph-matching' ? option : String.fromCharCode(65 + optionIndex);
      const label = document.createElement('span');
      label.textContent = question.type === 'paragraph-matching' ? `Paragraph ${option}` : option;
      button.append(marker, label);
      button.addEventListener('click', () => {
        if (submitted) return;
        const wasSelected = button.classList.contains('selected');
        choices.querySelectorAll('.answer-option').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-pressed', 'false'); });
        if (wasSelected) delete responses[responseKey(question)];
        else {
          responses[responseKey(question)] = optionIndex;
          button.classList.add('selected');
          button.setAttribute('aria-pressed', 'true');
        }
        updateQuestionNavStatus(question);
      });
      choices.append(button);
    });
  }
  card.append(choices);
  return card;
}
function renderMock() {
  const exercise = currentExercise();
  if (!exercise) return;
  renderPassage(exercise);
  renderQuestionNav();
  $('question-count').textContent = `${exercise.questions.length} ta savol`;
  const container = $('all-questions');
  container.replaceChildren();
  exercise.questions.forEach((question, index) => container.append(makeQuestionCard(question, index)));
  $('submit-exam').disabled = submitted;
}
function openSubmitDialog() {
  if (submitted || $('submit-dialog').open) return;
  const unanswered = currentExercise().questions.filter((question) => !hasResponse(question)).length;
  $('submit-summary').textContent = unanswered ? `${unanswered} ta savol javobsiz qolgan. Shunga qaramay mashqni yakunlaysizmi?` : 'Barcha savollarga javob berdingiz. Mashqni yakunlashga tayyormisiz?';
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
    const isRight = question.acceptedAnswers ? question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value)) : value === question.answer;
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
    const value = selectedResponse(question);
    const right = question.acceptedAnswers ? question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value)) : value === question.answer;
    const userAnswer = document.createElement('p');
    const userLabel = question.acceptedAnswers ? (value || 'Javob berilmagan') : (value === undefined ? 'Javob berilmagan' : question.options[value]);
    userAnswer.textContent = `Sizning javobingiz: ${userLabel}`;
    userAnswer.classList.add(right ? 'review-correct' : 'review-wrong');
    const explanation = document.createElement('p');
    const correctLabel = question.acceptedAnswers ? question.acceptedAnswers[0] : question.options[question.answer];
    explanation.textContent = `To‘g‘ri javob: ${correctLabel}. ${question.explain}`;
    row.append(title, userAnswer, explanation);
    review.append(row);
  });
  $('submit-dialog').close();
  renderMock();
  $('results-dialog').showModal();
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
  responses = {};
  submitted = false;
  timerPaused = false;
  secondsLeft = 20 * 60;
  $('timer-toggle').textContent = 'Pauza';
  updateTimer();
  renderMock();
  startTimer();
});
renderExerciseOptions();
updateTimer();
renderMock();
startTimer();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
