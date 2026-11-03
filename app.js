const $ = (id) => document.getElementById(id);
const storageKey = 'ielts-quest-progress-v1';
const exercises = window.IELTS_QUESTION_BANK || [];
let progress = loadProgress();
let exerciseIndex = 0;
let questionIndex = 0;
let selectedAnswer = null;
let answered = false;
let exerciseCompleted = false;

function loadProgress() {
  const defaults = { score: 0, correct: 0, today: 0, lastDate: '', streak: 0, completed: [] };
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(storageKey)) || {}) }; }
  catch { return defaults; }
}
function saveProgress() {
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Storage may be unavailable in private browsing. */ }
}
function dayStamp() { return new Date().toLocaleDateString('en-CA'); }
function currentExercise() { return exercises[exerciseIndex]; }
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
  $('streak-count').textContent = `${progress.streak} kun`;
}
function renderExerciseOptions() {
  const select = $('exercise-select');
  select.replaceChildren();
  exercises.forEach((exercise, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = exercise.title;
    select.append(option);
  });
  select.addEventListener('change', () => {
    exerciseIndex = Number(select.value);
    questionIndex = 0;
    renderQuestion();
  });
}
function renderQuestion() {
  const exercise = currentExercise();
  if (!exercise || !exercise.questions.length) return;
  const question = exercise.questions[questionIndex];
  exerciseCompleted = false;
  $('passage-title').textContent = exercise.title;
  $('passage-text').textContent = exercise.passage;
  $('source-note').textContent = `Manba: ${exercise.source.description} Ruxsat: ${exercise.source.permission}.`;
  $('question-count').textContent = `${questionIndex + 1} / ${exercise.questions.length}`;
  $('question-label').textContent = `${question.answerFormat ? `${question.answerFormat} · ` : ''}SAVOL ${questionIndex + 1}`;
  $('question-text').textContent = question.text;
  $('feedback').hidden = true;
  $('feedback').className = 'feedback';
  $('answer-list').replaceChildren();
  selectedAnswer = null;
  answered = false;
  $('check-button').disabled = true;
  $('check-button').innerHTML = 'Javobni tekshirish <span>→</span>';

  if (question.acceptedAnswers) {
    const input = document.createElement('input');
    input.className = 'text-answer';
    input.id = 'text-answer-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Javobingizni yozing');
    input.placeholder = 'Javobingizni yozing…';
    input.addEventListener('input', () => { $('check-button').disabled = !input.value.trim(); });
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && input.value.trim()) checkAnswer(); });
    $('answer-list').append(input);
  } else {
    question.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'answer-option';
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      const letter = document.createElement('span');
      letter.className = 'answer-letter';
      letter.textContent = question.type === 'paragraph-matching' ? option : String.fromCharCode(65 + index);
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
}
function showCompletion() {
  exerciseCompleted = true;
  const exercise = currentExercise();
  $('question-label').textContent = 'MASHQ YAKUNLANDI';
  $('question-text').textContent = `Barakalla! “${exercise.title}” mashqidagi barcha savollarni ishlab chiqdingiz.`;
  $('question-count').textContent = `${exercise.questions.length} / ${exercise.questions.length}`;
  $('answer-list').replaceChildren();
  const summary = document.createElement('p');
  summary.className = 'completion-summary';
  summary.textContent = 'Natijangiz saqlandi. Boshqa Reading mashqini yuqoridagi ro‘yxatdan tanlashingiz yoki qaytadan boshlashingiz mumkin.';
  $('answer-list').append(summary);
  $('feedback').hidden = true;
  $('check-button').disabled = false;
  $('check-button').innerHTML = 'Qayta boshlash <span>↻</span>';
}
function normalizeAnswer(value) {
  return value.trim().toLocaleLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');
}
function checkAnswer() {
  if (exerciseCompleted) {
    questionIndex = 0;
    renderQuestion();
    return;
  }
  const exercise = currentExercise();
  if (answered) {
    if (questionIndex < exercise.questions.length - 1) { questionIndex++; renderQuestion(); }
    else showCompletion();
    return;
  }
  const question = exercise.questions[questionIndex];
  let right;
  if (question.acceptedAnswers) {
    const input = $('text-answer-input');
    if (!input || !input.value.trim()) return;
    right = question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(input.value));
    input.disabled = true;
    input.classList.add(right ? 'correct' : 'incorrect');
  } else {
    if (selectedAnswer === null) return;
    right = selectedAnswer === question.answer;
    document.querySelectorAll('.answer-option').forEach((el, index) => {
      el.disabled = true;
      if (index === question.answer) el.classList.add('correct');
      else if (index === selectedAnswer) el.classList.add('incorrect');
    });
  }
  answered = true;
  const feedback = $('feedback');
  feedback.hidden = false;
  feedback.className = `feedback ${right ? 'good' : 'bad'}`;
  const answerText = question.acceptedAnswers ? ` To‘g‘ri javob: ${question.acceptedAnswers[0]}.` : '';
  feedback.textContent = `${right ? 'To‘g‘ri! ' : 'Hali emas. '}${question.explain}${right ? '' : answerText}`;
  if (right) { progress.score += 10; progress.correct += 1; }
  const today = dayStamp();
  if (progress.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    progress.streak = progress.lastDate === yesterday ? progress.streak + 1 : 1;
    progress.today = 0;
    progress.lastDate = today;
  }
  progress.today += 1;
  saveProgress();
  updateStats();
  $('check-button').innerHTML = questionIndex === exercise.questions.length - 1 ? 'Mashqni yakunlash <span>→</span>' : 'Keyingi savol <span>→</span>';
}

$('check-button').addEventListener('click', checkAnswer);
renderExerciseOptions();
updateStats();
renderQuestion();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
