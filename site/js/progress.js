// Course progress, kept in this browser's localStorage under one key.
// Shape: { done: {pageId: true}, quiz: {quizId: {questionIndex: chosenKey}}, current: pageId|null, total: number|null }
// Every read and write is wrapped: storage can be blocked (private windows, cleared site data) and the course must still work.

export const STORAGE_KEY = 'tf004-course-v1';

function empty() {
  return { done: {}, quiz: {}, current: null, total: null };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw);
    return { done: p.done || {}, quiz: p.quiz || {}, current: p.current || null, total: p.total || null };
  } catch (e) {
    return empty();
  }
}

export class Progress {
  constructor() {
    this.state = load();
  }

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch (e) { /* storage unavailable: progress lasts for this visit only */ }
  }

  isDone(id) { return !!this.state.done[id]; }

  markDone(id) { this.state.done[id] = true; this.save(); }

  setCurrent(id) { this.state.current = id; this.save(); }

  // The reader knows how many pages exist; the landing page reads it back to show a percentage.
  setTotal(n) {
    if (this.state.total !== n) { this.state.total = n; this.save(); }
  }

  answers(quizId) { return this.state.quiz[quizId] || {}; }

  // First answer wins: a question can't be re-answered until the quiz is retaken.
  answer(quizId, index, key) {
    const q = this.state.quiz[quizId] || (this.state.quiz[quizId] = {});
    if (q[index]) return false;
    q[index] = key;
    this.save();
    return true;
  }

  retake(quizId) {
    delete this.state.quiz[quizId];
    delete this.state.done[quizId];
    this.save();
  }

  reset() {
    this.state = empty();
    this.save();
  }

  summary() {
    const done = Object.keys(this.state.done).length;
    const total = this.state.total;
    return { done, total, current: this.state.current, started: done > 0 || !!this.state.current };
  }
}

// Score a quiz from the stored answers and the correct keys, in question order.
export function score(answers, correctKeys) {
  let answered = 0, right = 0;
  correctKeys.forEach((k, i) => {
    if (answers[i]) { answered++; if (answers[i] === k) right++; }
  });
  return { answered, right, total: correctKeys.length };
}
