'use strict';

const DAYS_JA = ['月', '火', '水', '木', '金', '土', '日'];
const STORAGE_KEY = 'weekly-tracker-v1';

let state = { habits: [], completions: {} };
let weekOffset = 0;

// ── Utilities ──────────────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDates(offset) {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Storage ────────────────────────────────────────────────────────────────

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        habits: Array.isArray(parsed.habits) ? parsed.habits : [],
        completions: parsed.completions && typeof parsed.completions === 'object'
          ? parsed.completions : {},
      };
    }
  } catch {
    state = { habits: [], completions: {} };
  }
}

// ── State mutations ────────────────────────────────────────────────────────

function addHabit(name) {
  state.habits.push({ id: uid(), name });
  save();
}

function removeHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  for (const key of Object.keys(state.completions)) {
    if (key.startsWith(id + '_')) delete state.completions[key];
  }
  save();
}

function toggleDay(habitId, dateStr) {
  const key = `${habitId}_${dateStr}`;
  if (state.completions[key]) delete state.completions[key];
  else state.completions[key] = true;
  save();
}

// ── Rendering ──────────────────────────────────────────────────────────────

function render() {
  const dates = getWeekDates(weekOffset);
  const todayStr = toDateStr(new Date());

  // Week label
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  document.getElementById('week-label').textContent =
    `${dates[0].getFullYear()}年 ${fmt(dates[0])} – ${fmt(dates[6])}`;

  document.getElementById('today-btn').disabled = weekOffset === 0;

  // Table header — rebuild day columns
  const theadRow = document.getElementById('thead-row');
  while (theadRow.children.length > 1) theadRow.removeChild(theadRow.lastChild);

  dates.forEach((d, i) => {
    const th = document.createElement('th');
    th.className = 'day-col' + (toDateStr(d) === todayStr ? ' today' : '');
    const isSat = i === 5;
    const isSun = i === 6;
    th.innerHTML =
      `<span class="dn${isSat ? ' sat' : isSun ? ' sun' : ''}">${DAYS_JA[i]}</span>` +
      `<span class="dd">${d.getMonth() + 1}/${d.getDate()}</span>`;
    theadRow.appendChild(th);
  });

  const progTh = document.createElement('th');
  progTh.className = 'prog-col';
  progTh.textContent = '達成';
  theadRow.appendChild(progTh);

  // Table body
  const tbody = document.getElementById('tracker-body');
  tbody.innerHTML = '';

  const table = document.getElementById('tracker-table');
  const emptyState = document.getElementById('empty-state');

  if (state.habits.length === 0) {
    table.hidden = true;
    emptyState.hidden = false;
    return;
  }

  table.hidden = false;
  emptyState.hidden = true;

  for (const habit of state.habits) {
    const tr = document.createElement('tr');

    // Habit name + delete
    const habitTd = document.createElement('td');
    habitTd.className = 'habit-cell';
    habitTd.innerHTML =
      `<span class="habit-name" title="${esc(habit.name)}">${esc(habit.name)}</span>` +
      `<button class="del-btn" data-id="${habit.id}" aria-label="${esc(habit.name)}を削除">` +
        `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">` +
          `<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
        `</svg>` +
      `</button>`;
    tr.appendChild(habitTd);

    let done = 0;

    for (const [i, d] of dates.entries()) {
      const ds = toDateStr(d);
      const checked = !!state.completions[`${habit.id}_${ds}`];
      if (checked) done++;

      const td = document.createElement('td');
      td.className = 'check-cell' + (ds === todayStr ? ' today' : '');

      const btn = document.createElement('button');
      btn.className = 'check-btn' + (checked ? ' done' : '');
      btn.dataset.habit = habit.id;
      btn.dataset.date = ds;
      btn.setAttribute('aria-label', `${habit.name} ${DAYS_JA[i]}`);
      btn.setAttribute('aria-pressed', String(checked));
      if (checked) btn.innerHTML = checkmarkSVG();

      td.appendChild(btn);
      tr.appendChild(td);
    }

    // Progress
    const progTd = document.createElement('td');
    progTd.className = 'prog-cell';
    progTd.dataset.habit = habit.id;
    const pct = Math.round((done / 7) * 100);
    progTd.innerHTML =
      `<span class="prog-count">${done}<span class="prog-total">/7</span></span>` +
      `<div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>`;
    tr.appendChild(progTd);

    tbody.appendChild(tr);
  }
}

function checkmarkSVG() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">` +
    `<path d="M2.5 8L6.5 12L13.5 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
}

function updateProgress(habitId) {
  const dates = getWeekDates(weekOffset);
  let done = 0;
  for (const d of dates) {
    if (state.completions[`${habitId}_${toDateStr(d)}`]) done++;
  }
  const cell = document.querySelector(`.prog-cell[data-habit="${habitId}"]`);
  if (!cell) return;
  // prog-count's first child is the text node containing the count
  cell.querySelector('.prog-count').firstChild.textContent = done;
  cell.querySelector('.prog-fill').style.width = `${Math.round((done / 7) * 100)}%`;
}

// ── Event listeners ────────────────────────────────────────────────────────

document.getElementById('add-form').addEventListener('submit', e => {
  e.preventDefault();
  const inp = document.getElementById('habit-input');
  const name = inp.value.trim();
  if (!name) return;
  addHabit(name);
  inp.value = '';
  inp.focus();
  render();
});

// Delegate clicks inside tbody for both check and delete
document.getElementById('tracker-body').addEventListener('click', e => {
  const checkBtn = e.target.closest('.check-btn');
  if (checkBtn) {
    const { habit, date } = checkBtn.dataset;
    toggleDay(habit, date);
    const checked = !!state.completions[`${habit}_${date}`];
    checkBtn.className = 'check-btn' + (checked ? ' done' : '');
    checkBtn.setAttribute('aria-pressed', String(checked));
    checkBtn.innerHTML = checked ? checkmarkSVG() : '';
    updateProgress(habit);
    return;
  }

  const delBtn = e.target.closest('.del-btn');
  if (delBtn) {
    if (confirm('この習慣を削除しますか？')) {
      removeHabit(delBtn.dataset.id);
      render();
    }
  }
});

document.getElementById('prev-week').addEventListener('click', () => {
  weekOffset--;
  render();
});

document.getElementById('next-week').addEventListener('click', () => {
  weekOffset++;
  render();
});

document.getElementById('today-btn').addEventListener('click', () => {
  weekOffset = 0;
  render();
});

// ── Init ───────────────────────────────────────────────────────────────────

load();
render();
