'use strict';

const DAYS_JA = ['月', '火', '水', '木', '金', '土', '日'];
const STORAGE_KEY = 'weekly-tracker-v1';
const BANNER_KEY  = 'ios-banner-dismissed';

const COLORS = {
  indigo: { main: '#6366f1', light: '#e0e7ff' },
  blue:   { main: '#3b82f6', light: '#dbeafe' },
  cyan:   { main: '#06b6d4', light: '#cffafe' },
  green:  { main: '#22c55e', light: '#dcfce7' },
  orange: { main: '#f97316', light: '#ffedd5' },
  pink:   { main: '#ec4899', light: '#fce7f3' },
  purple: { main: '#a855f7', light: '#f3e8ff' },
  red:    { main: '#ef4444', light: '#fee2e2' },
};
const DEFAULT_COLOR = 'indigo';

function habitColor(habit) {
  return COLORS[habit.color] ?? COLORS[DEFAULT_COLOR];
}

function habitGoal(habit) {
  return habit.weeklyGoal ?? 7;
}

let state = { habits: [], completions: {} };
let weekOffset = 0;

// ── Utilities ──────────────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
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
  state.habits.push({ id: uid(), name, color: DEFAULT_COLOR, weeklyGoal: 7 });
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

  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  document.getElementById('week-label').textContent =
    `${dates[0].getFullYear()}年 ${fmt(dates[0])} – ${fmt(dates[6])}`;
  document.getElementById('today-btn').disabled = weekOffset === 0;

  // Rebuild thead day columns
  const theadRow = document.getElementById('thead-row');
  while (theadRow.children.length > 1) theadRow.removeChild(theadRow.lastChild);

  dates.forEach((d, i) => {
    const th = document.createElement('th');
    th.className = 'day-col' + (toDateStr(d) === todayStr ? ' today' : '');
    const isSat = i === 5, isSun = i === 6;
    th.innerHTML =
      `<span class="dn${isSat ? ' sat' : isSun ? ' sun' : ''}">${DAYS_JA[i]}</span>` +
      `<span class="dd">${d.getMonth() + 1}/${d.getDate()}</span>`;
    theadRow.appendChild(th);
  });

  const progTh = document.createElement('th');
  progTh.className = 'prog-col';
  progTh.textContent = '達成';
  theadRow.appendChild(progTh);

  // Body
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
    const { main: hcMain, light: hcLight } = habitColor(habit);
    const goal = habitGoal(habit);

    const tr = document.createElement('tr');
    tr.dataset.habit = habit.id;
    tr.style.setProperty('--hc', hcMain);
    tr.style.setProperty('--hc-light', hcLight);

    // Habit cell: drag handle + color dot + name + edit btn + delete btn
    const habitTd = document.createElement('td');
    habitTd.className = 'habit-cell';
    habitTd.innerHTML =
      `<button class="drag-handle" aria-label="ドラッグして並び替え">` +
        `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">` +
          `<circle cx="3" cy="2.5" r="1.5"/><circle cx="7" cy="2.5" r="1.5"/>` +
          `<circle cx="3" cy="8"   r="1.5"/><circle cx="7" cy="8"   r="1.5"/>` +
          `<circle cx="3" cy="13.5" r="1.5"/><circle cx="7" cy="13.5" r="1.5"/>` +
        `</svg>` +
      `</button>` +
      `<span class="color-dot" style="background:${hcMain}"></span>` +
      `<span class="habit-name" title="${esc(habit.name)}">${esc(habit.name)}</span>` +
      `<button class="edit-btn" data-id="${habit.id}" aria-label="${esc(habit.name)}を編集">` +
        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
          `<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>` +
          `<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>` +
        `</svg>` +
      `</button>` +
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
    const pct = Math.min(Math.round((done / goal) * 100), 100);
    const progTd = document.createElement('td');
    progTd.className = 'prog-cell';
    progTd.dataset.habit = habit.id;
    progTd.innerHTML =
      `<span class="prog-count">${done}<span class="prog-total">/${goal}</span></span>` +
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
  const habit = state.habits.find(h => h.id === habitId);
  const goal = habitGoal(habit);
  const pct = Math.min(Math.round((done / goal) * 100), 100);
  const cell = document.querySelector(`.prog-cell[data-habit="${habitId}"]`);
  if (!cell) return;
  cell.querySelector('.prog-count').firstChild.textContent = done;
  cell.querySelector('.prog-total').textContent = `/${goal}`;
  cell.querySelector('.prog-fill').style.width = `${pct}%`;
}

// ── Event listeners (tracker) ──────────────────────────────────────────────

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

  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) {
    openEditModal(editBtn.dataset.id);
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

document.getElementById('prev-week').addEventListener('click', () => { weekOffset--; render(); });
document.getElementById('next-week').addEventListener('click', () => { weekOffset++; render(); });
document.getElementById('today-btn').addEventListener('click', () => { weekOffset = 0; render(); });

// ── Drag-and-drop (PointerEvents — works on both desktop and iOS) ──────────

let drag = null;

document.getElementById('tracker-body').addEventListener('pointerdown', e => {
  const handle = e.target.closest('.drag-handle');
  if (!handle) return;
  const tr = handle.closest('tr');
  if (!tr) return;
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  tr.classList.add('is-dragging');
  drag = { tr };
});

document.addEventListener('pointermove', e => {
  if (!drag) return;
  const tbody = document.getElementById('tracker-body');
  const others = [...tbody.querySelectorAll('tr:not(.is-dragging)')];
  const after = others.find(r => e.clientY < r.getBoundingClientRect().top + r.getBoundingClientRect().height / 2);
  if (after) tbody.insertBefore(drag.tr, after);
  else tbody.appendChild(drag.tr);
});

function endDrag() {
  if (!drag) return;
  drag.tr.classList.remove('is-dragging');
  const tbody = document.getElementById('tracker-body');
  const newOrder = [...tbody.querySelectorAll('tr')].map(r => r.dataset.habit);
  state.habits = newOrder.map(id => state.habits.find(h => h.id === id)).filter(Boolean);
  save();
  drag = null;
}

document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

// ── Edit modal ─────────────────────────────────────────────────────────────

let editState = { habitId: null, goal: 7, color: DEFAULT_COLOR };

function openEditModal(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;
  editState = { habitId, goal: habitGoal(habit), color: habit.color || DEFAULT_COLOR };
  document.getElementById('edit-name').value = habit.name;
  document.getElementById('goal-display').textContent = editState.goal;
  updateStepBtns();
  renderColorSwatches();
  document.getElementById('edit-modal').hidden = false;
  requestAnimationFrame(() => document.getElementById('edit-name').focus());
}

function closeEditModal() {
  document.getElementById('edit-modal').hidden = true;
  editState.habitId = null;
}

function saveEdit() {
  if (!editState.habitId) return;
  const name = document.getElementById('edit-name').value.trim();
  if (!name) { document.getElementById('edit-name').focus(); return; }
  const habit = state.habits.find(h => h.id === editState.habitId);
  if (habit) {
    habit.name = name;
    habit.color = editState.color;
    habit.weeklyGoal = editState.goal;
    save();
    render();
    if (currentView === 'stats') renderStats();
  }
  closeEditModal();
}

function renderColorSwatches() {
  const container = document.getElementById('color-swatches');
  container.innerHTML = '';
  for (const [id, { main }] of Object.entries(COLORS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch' + (id === editState.color ? ' selected' : '');
    btn.style.background = main;
    btn.style.color = main; // used for outline currentColor when selected
    btn.dataset.color = id;
    btn.setAttribute('aria-label', id);
    btn.setAttribute('aria-pressed', String(id === editState.color));
    btn.addEventListener('click', () => {
      editState.color = id;
      container.querySelectorAll('.color-swatch').forEach(b => {
        const sel = b.dataset.color === editState.color;
        b.classList.toggle('selected', sel);
        b.setAttribute('aria-pressed', String(sel));
      });
    });
    container.appendChild(btn);
  }
}

function updateStepBtns() {
  document.getElementById('goal-dec').disabled = editState.goal <= 1;
  document.getElementById('goal-inc').disabled = editState.goal >= 7;
}

document.getElementById('goal-dec').addEventListener('click', () => {
  if (editState.goal > 1) { editState.goal--; document.getElementById('goal-display').textContent = editState.goal; }
  updateStepBtns();
});

document.getElementById('goal-inc').addEventListener('click', () => {
  if (editState.goal < 7) { editState.goal++; document.getElementById('goal-display').textContent = editState.goal; }
  updateStepBtns();
});

document.getElementById('modal-save').addEventListener('click', saveEdit);
document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
document.getElementById('modal-close').addEventListener('click', closeEditModal);

document.getElementById('edit-modal').addEventListener('click', e => {
  if (e.target.id === 'edit-modal') closeEditModal();
});

document.getElementById('edit-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
  if (e.key === 'Escape') closeEditModal();
});

// ── View switching ────────────────────────────────────────────────────────

let currentView = 'tracker';

function switchView(view) {
  currentView = view;
  const isTracker = view === 'tracker';
  document.getElementById('tracker-view').hidden = !isTracker;
  document.getElementById('stats-view').hidden = isTracker;
  document.getElementById('week-nav').hidden = !isTracker;
  document.getElementById('tab-tracker').classList.toggle('is-active', isTracker);
  document.getElementById('tab-stats').classList.toggle('is-active', !isTracker);
  document.getElementById('tab-tracker').setAttribute('aria-selected', String(isTracker));
  document.getElementById('tab-stats').setAttribute('aria-selected', String(!isTracker));
  if (!isTracker) renderStats();
}

document.getElementById('tab-tracker').addEventListener('click', () => switchView('tracker'));
document.getElementById('tab-stats').addEventListener('click', () => switchView('stats'));

// ── Stats rendering ───────────────────────────────────────────────────────

function getStreak(habitId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = 0;
  const d = new Date(today);
  while (state.completions[`${habitId}_${toDateStr(d)}`]) {
    current++;
    d.setDate(d.getDate() - 1);
  }
  const dates = Object.keys(state.completions)
    .filter(k => k.startsWith(habitId + '_'))
    .map(k => k.slice(habitId.length + 1))
    .sort();
  let best = current;
  if (dates.length > 0) {
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      prev.setDate(prev.getDate() + 1);
      if (toDateStr(prev) === dates[i]) run++;
      else { best = Math.max(best, run); run = 1; }
    }
    best = Math.max(best, run);
  }
  return { current, best };
}

function renderStats() {
  const view = document.getElementById('stats-view');
  view.innerHTML = '';

  if (state.habits.length === 0) {
    view.innerHTML =
      `<div class="empty-state">` +
        `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">` +
          `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>` +
        `</svg>` +
        `<p>統計を表示するには習慣を追加してください</p>` +
      `</div>`;
    return;
  }

  const weekDates = getWeekDates(0);
  let weeklyDone = 0;
  let weeklyGoalSum = 0;
  const habitWeekCounts = state.habits.map(h => {
    const goal = habitGoal(h);
    let done = 0;
    for (const d of weekDates) if (state.completions[`${h.id}_${toDateStr(d)}`]) done++;
    weeklyDone += done;
    weeklyGoalSum += goal;
    return { done, goal };
  });

  const weekPct = weeklyGoalSum > 0 ? Math.min(Math.round((weeklyDone / weeklyGoalSum) * 100), 100) : 0;
  const habitsAchieved = habitWeekCounts.filter(({ done, goal }) => done >= goal).length;

  const summary = document.createElement('div');
  summary.className = 'stats-summary';
  summary.innerHTML =
    `<div class="stat-sum-item">` +
      `<div class="stat-sum-num">${habitsAchieved}<span class="stat-sum-den">/${state.habits.length}</span></div>` +
      `<div class="stat-sum-label">今週目標達成の習慣</div>` +
    `</div>` +
    `<div class="stat-sum-divider"></div>` +
    `<div class="stat-sum-item">` +
      `<div class="stat-sum-num">${weekPct}<span class="stat-sum-den">%</span></div>` +
      `<div class="stat-sum-label">今週の全体達成率</div>` +
    `</div>`;
  view.appendChild(summary);

  for (const habit of state.habits) {
    view.appendChild(createStatCard(habit, 8));
  }
}

function createStatCard(habit, numWeeks) {
  const { current: streakCur, best: streakBest } = getStreak(habit.id);
  const totalDays = Object.keys(state.completions)
    .filter(k => k.startsWith(habit.id + '_')).length;
  const goal = habitGoal(habit);
  const { main: hcMain } = habitColor(habit);

  const barsHTML = Array.from({ length: numWeeks }, (_, i) => {
    const offset = -(numWeeks - 1 - i);
    const dates = getWeekDates(offset);
    let count = 0;
    for (const d of dates) if (state.completions[`${habit.id}_${toDateStr(d)}`]) count++;
    const pct = Math.min(Math.round((count / goal) * 100), 100);
    const isThisWeek = offset === 0;
    const label = isThisWeek
      ? '今'
      : `${dates[0].getMonth() + 1}/${dates[0].getDate()}`;
    return `<div class="chart-col${isThisWeek ? ' this-week' : ''}">` +
      `<div class="chart-track"><div class="chart-fill" style="height:${pct}%"></div></div>` +
      `<span class="chart-label">${label}</span>` +
    `</div>`;
  }).join('');

  const card = document.createElement('div');
  card.className = 'stat-card';
  card.style.setProperty('--hc', hcMain);
  card.innerHTML =
    `<span class="stat-habit-name" title="${esc(habit.name)}">${esc(habit.name)}</span>` +
    `<div class="stat-chips">` +
      `<span class="chip">合計 <strong>${totalDays}</strong>日</span>` +
      `<span class="chip chip-streak">🔥 <strong>${streakCur}</strong>日</span>` +
      `<span class="chip">最長 <strong>${streakBest}</strong>日</span>` +
      (goal < 7 ? `<span class="chip">目標 <strong>${goal}</strong>日/週</span>` : '') +
    `</div>` +
    `<div class="chart-bars">${barsHTML}</div>`;
  return card;
}

// ── Export / Import ────────────────────────────────────────────────────────

document.getElementById('export-btn').addEventListener('click', () => {
  const payload = JSON.stringify(
    { habits: state.habits, completions: state.completions, exportedAt: new Date().toISOString() },
    null, 2
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weekly-tracker-${toDateStr(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data.habits) || typeof data.completions !== 'object') throw new Error();
      if (confirm(`${data.habits.length} 件の習慣データをインポートしますか？\n（現在のデータは上書きされます）`)) {
        state = { habits: data.habits, completions: data.completions };
        save();
        render();
      }
    } catch {
      alert('インポートに失敗しました。ファイルの形式を確認してください。');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ── iOS install banner ─────────────────────────────────────────────────────

function initIOSBanner() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const isStandalone = window.navigator.standalone === true;
  if (isIOS && isSafari && !isStandalone && !localStorage.getItem(BANNER_KEY)) {
    setTimeout(() => { document.getElementById('ios-banner').hidden = false; }, 1500);
  }
}

document.getElementById('ios-banner-close').addEventListener('click', () => {
  document.getElementById('ios-banner').hidden = true;
  localStorage.setItem(BANNER_KEY, '1');
});

// ── Service Worker ─────────────────────────────────────────────────────────

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

load();
render();
initIOSBanner();
initServiceWorker();
