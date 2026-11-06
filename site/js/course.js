// Course reader: one page at a time, contents rail, checkpoint quizzes, plan-style progress counter.
// All persistence goes through Progress (localStorage).

import { Progress, score } from './progress.js';

const progress = new Progress();

const units = [...document.querySelectorAll('#pages > section')];
const pages = [];
units.forEach(u => {
  u.querySelectorAll('article.page').forEach(a => {
    a.dataset.unit = u.dataset.unit;
    a.dataset.obj = u.dataset.obj || '';
    pages.push(a);
  });
});
progress.setTotal(pages.length);

const unitPages = name => pages.filter(p => p.dataset.unit === name);
const correctKeys = a => [...a.querySelectorAll('.q')].map(q => q.dataset.answer);

// Breadcrumbs
pages.forEach(a => {
  const isQ = a.classList.contains('quiz');
  const siblings = unitPages(a.dataset.unit);
  const c = document.createElement('div');
  c.className = 'crumb';
  c.innerHTML = `<span class="kind">${isQ ? 'Checkpoint' : 'Lesson'}</span><span>${a.dataset.unit}</span>` +
    (a.dataset.obj && a.dataset.obj !== 'all' ? `<span>Obj ${a.dataset.obj}</span>` : '') +
    `<span>${siblings.indexOf(a) + 1} / ${siblings.length}</span>`;
  a.insertBefore(c, a.firstChild);
});

// Quizzes
function renderQuizResult(a) {
  const s = score(progress.answers(a.id), correctKeys(a));
  let box = a.querySelector('.qresult');
  if (!box) {
    box = document.createElement('div');
    box.className = 'qresult';
    a.querySelector('.qs').appendChild(box);
  }
  if (s.answered < s.total) { box.hidden = true; return; }
  const verdict = s.right === s.total ? '. All correct.' : (s.right / s.total >= .8 ? '. Good, review the ones you missed.' : '. Worth another pass through this unit.');
  box.innerHTML = `Score: ${s.right} / ${s.total}${verdict}<button class="retry" type="button">Retake</button>`;
  box.hidden = false;
  box.querySelector('.retry').onclick = () => { progress.retake(a.id); resetQuiz(a); renderToc(); renderPlan(); };
  if (!progress.isDone(a.id)) progress.markDone(a.id);
}

function paintQ(q, chosen) {
  const ans = q.dataset.answer;
  q.querySelectorAll('.opts button').forEach(b => {
    b.disabled = true;
    if (b.dataset.k === ans) b.classList.add('right');
    if (b.dataset.k === chosen && chosen !== ans) b.classList.add('wrong');
  });
  const why = q.querySelector('.why');
  const ok = chosen === ans;
  if (!why.dataset.orig) why.dataset.orig = why.innerHTML;
  why.innerHTML = `<b>${ok ? 'Correct' : 'Not quite'}</b><br>${why.dataset.orig}`;
  why.className = 'why ' + (ok ? 'ok' : 'no');
  why.hidden = false;
}

function resetQuiz(a) {
  a.querySelectorAll('.q').forEach(q => {
    q.querySelectorAll('.opts button').forEach(b => { b.disabled = false; b.classList.remove('right', 'wrong'); });
    q.querySelector('.why').hidden = true;
  });
  const box = a.querySelector('.qresult');
  if (box) box.hidden = true;
}

document.querySelectorAll('article.quiz').forEach(a => {
  const saved = progress.answers(a.id);
  a.querySelectorAll('.q').forEach((q, i) => {
    q.querySelector('.stem').insertAdjacentHTML('afterbegin', `<span class="n">Q${i + 1}</span>`);
    q.querySelectorAll('.opts button').forEach(b => {
      b.type = 'button';
      b.addEventListener('click', () => {
        if (!progress.answer(a.id, i, b.dataset.k)) return;
        paintQ(q, b.dataset.k);
        renderQuizResult(a);
        renderToc();
        renderPlan();
      });
    });
    if (saved[i]) paintQ(q, saved[i]);
  });
  renderQuizResult(a);
});

// Contents rail
const toc = document.getElementById('toc');
let current = 0;

function quizScore(a) {
  const s = score(progress.answers(a.id), correctKeys(a));
  return s.answered ? `${s.right}/${s.total}` : '';
}

function renderToc() {
  let html = '';
  units.forEach(u => {
    const up = unitPages(u.dataset.unit);
    const learned = up.filter(p => progress.isDone(p.id)).length;
    html += `<div class="unit-h"><span>${u.dataset.unit}</span><small>${learned}/${up.length}</small></div><ol>`;
    up.forEach(p => {
      const i = pages.indexOf(p);
      const isQ = p.classList.contains('quiz');
      const d = progress.isDone(p.id);
      const mk = d ? '✓' : (isQ ? '?' : '+');
      html += `<li class="${d ? 'is-done ' : ''}${isQ ? 'is-quiz' : ''}"><button type="button" data-i="${i}"${i === current ? ' aria-current="page"' : ''}>` +
        `<span class="mk">${mk}</span><span>${p.dataset.title}</span><span class="score">${isQ ? quizScore(p) : ''}</span></button></li>`;
    });
    html += '</ol>';
  });
  toc.innerHTML = html;
  toc.querySelectorAll('button[data-i]').forEach(b => {
    b.onclick = () => { go(+b.dataset.i); if (window.innerWidth <= 860) setRail(false); };
  });
}

function renderPlan() {
  const total = pages.length;
  const done = pages.filter(p => progress.isDone(p.id)).length;
  document.getElementById('plansum').innerHTML = `Plan: <b class="add">${total - done}</b> to learn, <b class="chg">${done}</b> learned, 0 to destroy.`;
  document.getElementById('planbar').style.width = Math.round(done / total * 100) + '%';
}

// Paging
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

function go(i, fromHash) {
  if (i < 0 || i >= pages.length) return;
  current = i;
  pages.forEach((p, j) => { p.hidden = j !== i; });
  const a = pages[i];
  progress.setCurrent(a.id);
  if (!fromHash) { try { history.replaceState(null, '', '#' + a.id); } catch (e) { /* ignore */ } }
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === pages.length - 1;
  document.getElementById('prevT').textContent = i > 0 ? pages[i - 1].dataset.title : '';
  document.getElementById('nextT').textContent = i < pages.length - 1 ? pages[i + 1].dataset.title : 'End of course';
  document.getElementById('railNow').textContent = a.dataset.title;
  renderToc();
  renderPlan();
  const stage = document.querySelector('.stage');
  if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ block: 'start' });
}

prevBtn.onclick = () => go(current - 1);
nextBtn.onclick = () => {
  // A lesson counts as learned once you move past it; quizzes count when every question is answered.
  const a = pages[current];
  if (a.classList.contains('lesson')) progress.markDone(a.id);
  go(current + 1);
};

// Phone drawer
const rail = document.getElementById('rail');
const railToggle = document.getElementById('railToggle');
function setRail(open) {
  rail.classList.toggle('closed', !open);
  railToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}
railToggle.onclick = () => setRail(rail.classList.contains('closed'));

// Reset, with an in-page second click to confirm
const resetBtn = document.getElementById('resetBtn');
let armed = false, disarm;
resetBtn.onclick = () => {
  if (!armed) {
    armed = true;
    resetBtn.textContent = 'Click again to clear all progress';
    resetBtn.classList.add('confirm');
    disarm = setTimeout(() => { armed = false; resetBtn.textContent = 'Reset progress'; resetBtn.classList.remove('confirm'); }, 4000);
    return;
  }
  clearTimeout(disarm);
  progress.reset();
  progress.setTotal(pages.length);
  document.querySelectorAll('article.quiz').forEach(resetQuiz);
  armed = false;
  resetBtn.textContent = 'Reset progress';
  resetBtn.classList.remove('confirm');
  go(0);
};

// Start on the hash, else where you left off, else the first page
const idxOf = id => pages.findIndex(p => p.id === id);
let start = idxOf(location.hash.slice(1));
if (start < 0) start = idxOf(progress.summary().current);
if (start < 0) start = 0;
go(start, true);
window.addEventListener('hashchange', () => {
  const k = idxOf(location.hash.slice(1));
  if (k >= 0 && k !== current) go(k, true);
});
