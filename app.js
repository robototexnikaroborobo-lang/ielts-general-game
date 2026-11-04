const $ = (id) => document.getElementById(id);
const storageKey = 'ielts-quest-progress-v1';
const exercises = window.IELTS_QUESTION_BANK || [];
const FULL_MOCK = 'all';
let exerciseIndex = 0;
let fullMock = true;
let responses = {};
let submitted = false;
let secondsLeft = 60 * 60;
let timerInterval = null;
let timerPaused = false;
let enlargedText = false;

function activeExercises() { return fullMock ? exercises : [exercises[exerciseIndex]]; }
function allQuestions() {
  return activeExercises().flatMap((exercise) => exercise.questions.map((question) => ({ exercise, question })));
}
function responseKey(exercise, question) { return `${exercise.id}:${question.id}`; }
function normalizeAnswer(value) { return String(value || '').trim().toLocaleLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' '); }
function selectedResponse(exercise, question) { return responses[responseKey(exercise, question)]; }
function hasResponse(exercise, question) {
  const value = selectedResponse(exercise, question);
  return value !== undefined && value !== null && String(value).trim() !== '';
}
function resetAttempt() {
  responses = {};
  submitted = false;
  timerPaused = false;
  secondsLeft = fullMock ? 60 * 60 : 20 * 60;
  $('timer-toggle').textContent = 'Pauza';
  updateTimer();
  renderMock();
  startTimer();
}
function renderExerciseOptions() {
  const select = $('exercise-select');
  const full = document.createElement('option');
  full.value = FULL_MOCK;
  full.textContent = `To‘liq Reading mock · barcha ${exercises.length} ta matn`;
  select.append(full);
  exercises.forEach((exercise, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `Alohida mashq · ${exercise.title}`;
    select.append(option);
  });
  select.value = FULL_MOCK;
  select.addEventListener('change', () => {
    if (Object.keys(responses).length && !submitted && !window.confirm('Javoblaringiz o‘chadi. Boshqa mock turiga o‘tasizmi?')) {
      select.value = fullMock ? FULL_MOCK : String(exerciseIndex);
      return;
    }
    fullMock = select.value === FULL_MOCK;
    if (!fullMock) exerciseIndex = Number(select.value);
    resetAttempt();
  });
}
function renderPassages() {
  const groups = activeExercises();
  $('passage-title').textContent = fullMock ? `Full Reading Mock · ${groups.length} ta matn` : groups[0].title;
  $('passage-heading').textContent = fullMock ? 'Barcha matnlar' : groups[0].title;
  const passage = $('passage-text');
  passage.replaceChildren();
  groups.forEach((exercise, exerciseIndexInMock) => {
    const section = document.createElement('section');
    section.className = 'mock-passage';
    const heading = document.createElement('h3');
    heading.className = 'mock-passage-title';
    heading.textContent = fullMock ? `PASSAGE ${exerciseIndexInMock + 1} · ${exercise.title}` : exercise.title;
    section.append(heading);
    exercise.passage.split(/\n\s*\n/).forEach((block) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = block;
      section.append(paragraph);
    });
    passage.append(section);
  });
  const sources = groups.map((exercise) => `${exercise.title}: ${exercise.source.description} Ruxsat: ${exercise.source.permission}.`);
  $('source-note').textContent = sources.join(' ');
  passage.classList.toggle('large-text', enlargedText);
  $('text-size').textContent = enlargedText ? 'A−' : 'A⁺';
}
function updateProgress() {
  const questions = allQuestions();
  const done = questions.filter(({ exercise, question }) => hasResponse(exercise, question)).length;
  $('answered-count').textContent = `${done} / ${questions.length} javob berildi`;
  $('progress-fill').style.width = `${questions.length ? done / questions.length * 100 : 0}%`;
}
function makeQuestionCard(exercise, question, index) {
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
  const saved = selectedResponse(exercise, question);
  if (question.acceptedAnswers) {
    const input = document.createElement('input');
    input.className = 'text-answer';
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = 'Javobingizni yozing';
    input.setAttribute('aria-label', `Savol ${index + 1} javobi`);
    input.value = saved || '';
    input.disabled = submitted;
    input.addEventListener('input', () => {
      responses[responseKey(exercise, question)] = input.value;
      updateNavButton(index, exercise, question);
      updateProgress();
    });
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
        choices.querySelectorAll('.answer-option').forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        if (wasSelected) delete responses[responseKey(exercise, question)];
        else {
          responses[responseKey(exercise, question)] = optionIndex;
          button.classList.add('selected');
          button.setAttribute('aria-pressed', 'true');
        }
        updateNavButton(index, exercise, question);
        updateProgress();
      });
      choices.append(button);
    });
  }
  card.append(choices);
  return card;
}
function updateNavButton(index, exercise, question) {
  const button = $('question-nav').children[index];
  if (!button) return;
  const answered = hasResponse(exercise, question);
  button.classList.toggle('answered', answered);
  button.setAttribute('aria-label', `Savol ${index + 1}${answered ? ', javob berilgan' : ', javob berilmagan'}`);
}
function renderMock() {
  const questions = allQuestions();
  if (!questions.length) return;
  renderPassages();
  const nav = $('question-nav');
  nav.replaceChildren();
  const container = $('all-questions');
  container.replaceChildren();
  let previousExercise = null;
  questions.forEach(({ exercise, question }, index) => {
    if (fullMock && exercise !== previousExercise) {
      const heading = document.createElement('h2');
      heading.className = 'question-passage-heading';
      heading.textContent = `PASSAGE ${activeExercises().indexOf(exercise) + 1} · ${exercise.title}`;
      container.append(heading);
      previousExercise = exercise;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `question-nav-button${hasResponse(exercise, question) ? ' answered' : ''}`;
    button.textContent = String(index + 1);
    button.setAttribute('aria-label', `Savol ${index + 1}${hasResponse(exercise, question) ? ', javob berilgan' : ', javob berilmagan'}`);
    button.disabled = submitted;
    button.addEventListener('click', () => document.getElementById(`question-${index + 1}`).scrollIntoView({ behavior: 'smooth', block: 'center' }));
    nav.append(button);
    container.append(makeQuestionCard(exercise, question, index));
  });
  $('question-count').textContent = `${questions.length} ta savol`;
  $('submit-exam').disabled = submitted;
  updateProgress();
}
function openSubmitDialog() {
  if (submitted || $('submit-dialog').open) return;
  const unanswered = allQuestions().filter(({ exercise, question }) => !hasResponse(exercise, question)).length;
  $('submit-summary').textContent = unanswered ? `${unanswered} ta savol javobsiz qolgan. Shunga qaramay mashqni yakunlaysizmi?` : 'Barcha savollarga javob berdingiz. Mashqni yakunlashga tayyormisiz?';
  $('submit-dialog').showModal();
}
function submitExercise() {
  if (submitted) return;
  submitted = true;
  clearInterval(timerInterval);
  const questions = allQuestions();
  let correct = 0;
  let answeredCount = 0;
  questions.forEach(({ exercise, question }) => {
    if (!hasResponse(exercise, question)) return;
    answeredCount++;
    const value = selectedResponse(exercise, question);
    const right = question.acceptedAnswers
      ? question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value))
      : value === question.answer;
    if (right) correct++;
  });
  const storageDefaults = { score: 0, correct: 0, today: 0, lastDate: '', streak: 0 };
  let progress;
  try { progress = { ...storageDefaults, ...(JSON.parse(localStorage.getItem(storageKey)) || {}) }; }
  catch { progress = storageDefaults; }
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

  const title = fullMock ? 'Full Reading Mock' : currentExerciseTitle();
  $('results-title').textContent = title;
  $('result-score').textContent = `${correct} / ${questions.length}`;
  $('result-message').textContent = `${answeredCount} ta savolga javob berdingiz. Har bir to‘g‘ri javob uchun 10 ball berildi.`;
  const review = $('result-review');
  review.replaceChildren();
  questions.forEach(({ exercise, question }, index) => {
    const row = document.createElement('article');
    row.className = 'review-item';
    const title = document.createElement('strong');
    title.textContent = `${index + 1}. ${fullMock ? `${exercise.title} — ` : ''}${question.text}`;
    const value = selectedResponse(exercise, question);
    const right = question.acceptedAnswers
      ? question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value))
      : value === question.answer;
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
function currentExerciseTitle() { return activeExercises()[0]?.title || 'Reading mashqi'; }
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
    if (secondsLeft === 0) submitExercise();
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
  resetAttempt();
});
renderExerciseOptions();
updateTimer();
renderMock();
startTimer();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
