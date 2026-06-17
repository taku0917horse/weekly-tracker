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
  return habit.weeklyGoal ?? (habit.days ? habit.days.length : 7);
}

// 実施曜日 (0=月…6=日)。未設定なら全曜日
function habitDays(habit) {
  return habit.days ?? [0, 1, 2, 3, 4, 5, 6];
}

// 今日の曜日インデックス (0=月…6=日)
function todayDayIndex() {
  return (new Date().getDay() + 6) % 7;
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

function addHabit(name, days) {
  const d = days ?? [0, 1, 2, 3, 4, 5, 6];
  state.habits.push({ id: uid(), name, color: DEFAULT_COLOR, weeklyGoal: d.length, days: d });
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

// ── Rendering helpers ──────────────────────────────────────────────────────

function checkmarkSVG() {
  return `<svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">` +
    `<path d="M2.5 8L6.5 12L13.5 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
}

// ── 今日ビュー ─────────────────────────────────────────────────────────────

function renderToday() {
  const todayIdx  = todayDayIndex();
  const todayStr  = toDateStr(new Date());
  const todayHabits = state.habits.filter(h => habitDays(h).includes(todayIdx));

  const view = document.getElementById('today-view');
  view.innerHTML = '';

  // 日付ヘッダー
  const now = new Date();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const header = document.createElement('div');
  header.className = 'today-date-header';
  header.textContent = `今日: ${now.getMonth() + 1}/${now.getDate()}(${dayNames[now.getDay()]})`;
  view.appendChild(header);

  if (state.habits.length === 0) {
    view.appendChild(makeTodayEmpty('習慣を追加してトラッキングを始めましょう'));
    return;
  }

  if (todayHabits.length === 0) {
    view.appendChild(makeTodayEmpty('今日は実施する習慣がありません'));
    return;
  }

  const list = document.createElement('div');
  list.id = 'today-list';
  list.className = 'today-list';
  for (const habit of todayHabits) {
    list.appendChild(createTodayCard(habit, todayStr));
  }
  view.appendChild(list);

  const doneCount = todayHabits.filter(h => state.completions[`${h.id}_${todayStr}`]).length;
  const summary = document.createElement('div');
  summary.id = 'today-summary';
  summary.className = 'today-summary';
  summary.textContent = `${doneCount} / ${todayHabits.length} 完了`;
  view.appendChild(summary);
}

function makeTodayEmpty(msg) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML =
    `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">` +
      `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>` +
    `</svg>` +
    `<p>${msg}</p>`;
  return el;
}

function createTodayCard(habit, todayStr) {
  const { main: hcMain, light: hcLight } = habitColor(habit);
  const checked = !!state.completions[`${habit.id}_${todayStr}`];

  const card = document.createElement('div');
  card.className = 'today-habit-card' + (checked ? ' done' : '');
  card.dataset.habit = habit.id;
  card.style.setProperty('--hc', hcMain);
  card.style.setProperty('--hc-light', hcLight);

  const dot = document.createElement('span');
  dot.className = 'color-dot';
  dot.style.background = hcMain;

  const name = document.createElement('span');
  name.className = 'habit-name';
  name.textContent = habit.name;

  const btn = document.createElement('button');
  btn.className = 'check-btn today-check' + (checked ? ' done' : '');
  btn.dataset.habit = habit.id;
  btn.dataset.date = todayStr;
  btn.setAttribute('aria-label', `${habit.name} 今日`);
  btn.setAttribute('aria-pressed', String(checked));
  if (checked) btn.innerHTML = checkmarkSVG();

  card.appendChild(dot);
  card.appendChild(name);
  card.appendChild(btn);
  return card;
}

function updateTodaySummary() {
  const todayIdx  = todayDayIndex();
  const todayStr  = toDateStr(new Date());
  const todayHabits = state.habits.filter(h => habitDays(h).includes(todayIdx));
  const doneCount = todayHabits.filter(h => state.completions[`${h.id}_${todayStr}`]).length;
  const el = document.getElementById('today-summary');
  if (el) el.textContent = `${doneCount} / ${todayHabits.length} 完了`;
}

// ── トラッカービュー ───────────────────────────────────────────────────────

function render() {
  const dates = getWeekDates(weekOffset);
  const todayStr = toDateStr(new Date());

  // 週ラベル: "6/16(月)〜6/22(日)"
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  document.getElementById('week-label').textContent =
    `${fmt(dates[0])}(${dayNames[dates[0].getDay()]})〜${fmt(dates[6])}(${dayNames[dates[6].getDay()]})`;
  document.getElementById('today-btn').disabled = weekOffset === 0;

  const list = document.getElementById('habits-list');
  const emptyState = document.getElementById('empty-state');

  list.innerHTML = '';

  if (state.habits.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  for (const habit of state.habits) {
    list.appendChild(createHabitCard(habit, dates, todayStr));
  }
}

function createHabitCard(habit, dates, todayStr) {
  const { main: hcMain, light: hcLight } = habitColor(habit);
  const goal = habitGoal(habit);
  const days = habitDays(habit);

  const card = document.createElement('div');
  card.className = 'habit-card';
  card.dataset.habit = habit.id;
  card.style.setProperty('--hc', hcMain);
  card.style.setProperty('--hc-light', hcLight);

  // ── ヘッダー ──
  const header = document.createElement('div');
  header.className = 'card-header';
  header.innerHTML =
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
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
        `<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>` +
        `<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>` +
      `</svg>` +
    `</button>` +
    `<button class="del-btn" data-id="${habit.id}" aria-label="${esc(habit.name)}を削除">` +
      `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">` +
        `<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
      `</svg>` +
    `</button>`;

  // ── 曜日グリッド ──
  const daysDiv = document.createElement('div');
  daysDiv.className = 'card-days';

  let done = 0;
  for (const [i, d] of dates.entries()) {
    const ds = toDateStr(d);
    const checked = !!state.completions[`${habit.id}_${ds}`];
    if (checked) done++;

    const isSat = i === 5, isSun = i === 6;
    const isToday = ds === todayStr;
    const isScheduled = days.includes(i);

    const dayDiv = document.createElement('div');
    dayDiv.className = 'card-day' +
      (isToday ? ' today' : '') +
      (isScheduled ? '' : ' not-scheduled');

    const dayName = document.createElement('span');
    dayName.className = 'day-name' + (isSat ? ' sat' : isSun ? ' sun' : '');
    dayName.textContent = DAYS_JA[i];

    const btn = document.createElement('button');
    btn.className = 'check-btn' + (checked ? ' done' : '');
    btn.dataset.habit = habit.id;
    btn.dataset.date = ds;
    btn.setAttribute('aria-label', `${habit.name} ${DAYS_JA[i]}`);
    btn.setAttribute('aria-pressed', String(checked));
    if (checked) btn.innerHTML = checkmarkSVG();

    const dayDate = document.createElement('span');
    dayDate.className = 'day-date';
    dayDate.textContent = `${d.getMonth() + 1}/${d.getDate()}`;

    dayDiv.appendChild(dayName);
    dayDiv.appendChild(btn);
    dayDiv.appendChild(dayDate);
    daysDiv.appendChild(dayDiv);
  }

  // ── 進捗 ──
  const pct = Math.min(Math.round((done / goal) * 100), 100);
  const progressDiv = document.createElement('div');
  progressDiv.className = 'card-progress';
  progressDiv.dataset.habit = habit.id;
  progressDiv.innerHTML =
    `<span class="prog-count">${done}<span class="prog-total">/${goal}</span></span>` +
    `<div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>`;

  card.appendChild(header);
  card.appendChild(daysDiv);
  card.appendChild(progressDiv);
  return card;
}

function updateProgress(habitId) {
  const dates = getWeekDates(weekOffset);
  let done = 0;
  for (const d of dates) {
    if (state.completions[`${habitId}_${toDateStr(d)}`]) done++;
  }
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;
  const goal = habitGoal(habit);
  const pct = Math.min(Math.round((done / goal) * 100), 100);
  const progressDiv = document.querySelector(`.card-progress[data-habit="${habitId}"]`);
  if (!progressDiv) return;
  progressDiv.querySelector('.prog-count').firstChild.textContent = done;
  progressDiv.querySelector('.prog-total').textContent = `/${goal}`;
  progressDiv.querySelector('.prog-fill').style.width = `${pct}%`;
}

// ── イベント: 今日ビュー ───────────────────────────────────────────────────

document.getElementById('today-view').addEventListener('click', e => {
  const btn = e.target.closest('.check-btn');
  if (!btn) return;
  const { habit, date } = btn.dataset;
  toggleDay(habit, date);
  const checked = !!state.completions[`${habit}_${date}`];
  btn.className = 'check-btn today-check' + (checked ? ' done' : '');
  btn.setAttribute('aria-pressed', String(checked));
  btn.innerHTML = checked ? checkmarkSVG() : '';
  btn.closest('.today-habit-card')?.classList.toggle('done', checked);
  updateTodaySummary();
  updateProgress(habit); // トラッカーが表示中なら更新
});

// ── イベント: トラッカービュー ────────────────────────────────────────────

document.getElementById('add-form').addEventListener('submit', e => {
  e.preventDefault();
  const inp = document.getElementById('habit-input');
  const name = inp.value.trim();
  if (!name) return;

  const selectedDays = [...document.querySelectorAll('#add-days .day-sel-btn.is-active')]
    .map(b => parseInt(b.dataset.day));
  addHabit(name, selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6]);

  inp.value = '';
  inp.focus();

  // 曜日セレクターを全選択にリセット
  document.querySelectorAll('#add-days .day-sel-btn').forEach(b => {
    b.classList.add('is-active');
    b.setAttribute('aria-pressed', 'true');
  });

  if (currentView === 'tracker') render();
  if (currentView === 'today') renderToday();
});

document.getElementById('add-days').addEventListener('click', e => {
  const btn = e.target.closest('.day-sel-btn');
  if (!btn) return;
  const isActive = btn.classList.contains('is-active');
  if (isActive) {
    const activeCount = document.querySelectorAll('#add-days .day-sel-btn.is-active').length;
    if (activeCount <= 1) return;
    btn.classList.remove('is-active');
    btn.setAttribute('aria-pressed', 'false');
  } else {
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
  }
});

document.getElementById('habits-list').addEventListener('click', e => {
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
  if (editBtn) { openEditModal(editBtn.dataset.id); return; }

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

// ── スワイプジェスチャー ────────────────────────────────────────────────────

let swipeStartX = 0;
let swipeStartY = 0;

document.getElementById('tracker-view').addEventListener('touchstart', e => {
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
}, { passive: true });

document.getElementById('tracker-view').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
    if (dx < 0) { weekOffset++; render(); }
    else { weekOffset--; render(); }
  }
}, { passive: true });

// ── ドラッグ＆ドロップ ─────────────────────────────────────────────────────

let drag = null;

document.getElementById('habits-list').addEventListener('pointerdown', e => {
  const handle = e.target.closest('.drag-handle');
  if (!handle) return;
  const card = handle.closest('.habit-card');
  if (!card) return;
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  card.classList.add('is-dragging');
  drag = { el: card };
});

document.addEventListener('pointermove', e => {
  if (!drag) return;
  const list = document.getElementById('habits-list');
  const others = [...list.querySelectorAll('.habit-card:not(.is-dragging)')];
  const after = others.find(c => e.clientY < c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2);
  if (after) list.insertBefore(drag.el, after);
  else list.appendChild(drag.el);
});

function endDrag() {
  if (!drag) return;
  drag.el.classList.remove('is-dragging');
  const list = document.getElementById('habits-list');
  const newOrder = [...list.querySelectorAll('.habit-card')].map(c => c.dataset.habit);
  state.habits = newOrder.map(id => state.habits.find(h => h.id === id)).filter(Boolean);
  save();
  drag = null;
}

document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

// ── 編集モーダル ────────────────────────────────────────────────────────────

let editState = { habitId: null, goal: 7, color: DEFAULT_COLOR, days: [0,1,2,3,4,5,6] };

function openEditModal(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;
  editState = {
    habitId,
    goal: habitGoal(habit),
    color: habit.color || DEFAULT_COLOR,
    days: [...habitDays(habit)],
  };
  document.getElementById('edit-name').value = habit.name;
  document.getElementById('goal-display').textContent = editState.goal;
  updateStepBtns();
  renderColorSwatches();
  renderEditDays();
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
    habit.days = editState.days;
    save();
    if (currentView === 'tracker') render();
    else if (currentView === 'today') renderToday();
    else if (currentView === 'stats') renderStats();
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
    btn.style.color = main;
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

function renderEditDays() {
  const container = document.getElementById('edit-days');
  container.innerHTML = '';
  DAYS_JA.forEach((name, i) => {
    const isSat = i === 5, isSun = i === 6;
    const active = editState.days.includes(i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day-sel-btn' +
      (active ? ' is-active' : '') +
      (isSat ? ' sat' : isSun ? ' sun' : '');
    btn.textContent = name;
    btn.dataset.day = i;
    btn.setAttribute('aria-pressed', String(active));
    btn.addEventListener('click', () => {
      const idx = editState.days.indexOf(i);
      if (idx >= 0) {
        if (editState.days.length <= 1) return;
        editState.days.splice(idx, 1);
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
      } else {
        editState.days.push(i);
        editState.days.sort((a, b) => a - b);
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      }
    });
    container.appendChild(btn);
  });
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

// ── ビュー切り替え ────────────────────────────────────────────────────────

let currentView = 'today';

function switchView(view) {
  currentView = view;
  document.getElementById('today-view').hidden   = view !== 'today';
  document.getElementById('tracker-view').hidden = view !== 'tracker';
  document.getElementById('stats-view').hidden   = view !== 'stats';
  document.getElementById('week-nav').hidden      = view !== 'tracker';

  ['today', 'tracker', 'stats'].forEach(v => {
    const tab = document.getElementById(`tab-${v}`);
    if (!tab) return;
    tab.classList.toggle('is-active', v === view);
    tab.setAttribute('aria-selected', String(v === view));
  });

  if (view === 'tracker') render();
  if (view === 'today')   renderToday();
  if (view === 'stats')   renderStats();
}

document.getElementById('tab-today').addEventListener('click', () => switchView('today'));
document.getElementById('tab-tracker').addEventListener('click', () => switchView('tracker'));
document.getElementById('tab-stats').addEventListener('click', () => switchView('stats'));

// ── 統計レンダリング ──────────────────────────────────────────────────────

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

// ── エクスポート / インポート ───────────────────────────────────────────────

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
        if (currentView === 'tracker') render();
        else if (currentView === 'today') renderToday();
        else if (currentView === 'stats') renderStats();
      }
    } catch {
      alert('インポートに失敗しました。ファイルの形式を確認してください。');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ── iOS インストールバナー ──────────────────────────────────────────────────

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

// ── 初期化 ────────────────────────────────────────────────────────────────

load();
renderToday();
initIOSBanner();
initServiceWorker();
