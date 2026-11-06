// Landing page: show the stored progress and turn "Start" into "Continue" once a learner has begun.

import { Progress } from './progress.js';

const { done, total, current, started } = new Progress().summary();

if (started) {
  const btn = document.getElementById('startBtn');
  btn.textContent = 'Continue where you left off';
  if (current) btn.href = '/course/#' + current;

  if (total) {
    document.getElementById('plansum').innerHTML = `Plan: <b class="add">${total - done}</b> to learn, <b class="chg">${done}</b> learned, 0 to destroy.`;
    document.getElementById('planbar').style.width = Math.round(done / total * 100) + '%';
  }
}
