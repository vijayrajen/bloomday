'use strict';

const STORAGE_KEY = 'bloomday.personal.v1';
const TODAY = localDateKey(new Date());
const DEFAULT_TASKS = [
  ['Wake up', '6:00 AM', '🌅'],
  ['Stretching', '6:05 AM', '🧘'],
  ['Hair massage', '6:10 AM', '💆'],
  ['Face massage', '6:20 AM', '🌸'],
  ['Warm water', '6:30 AM', '💧'],
  ['Gratitude', '6:35 AM', '💗'],
  ['Meditation', '6:40 AM', '🪷'],
  ['Book reading', '7:00 AM', '📖'],
  ['Kid & cooking', '7:15 AM', '🍳'],
  ['Gym', '7:30–8:45 AM', '🏋️'],
  ['Diet breakfast', '9:00–9:15 AM', '🍳'],
  ['Study', '9:30–10:30 AM', '📚'],
  ['Mid-morning snack', '10:30 AM', '🍎'],
  ['Cooking', '10:30–11:30 AM', '🥗'],
  ['Morning skincare', '11:20 AM', '🧴'],
  ['Getting ready for office', '11:30 AM–12:15 PM', '👗'],
  ['Reach office', '12:45 PM', '🏢'],
  ['Diet lunch', '1:30 PM', '🥙'],
  ['5 vocabulary words (office)', 'During office', '📝'],
  ['One story writing', 'During office', '✍️'],
  ['Read tense forms (office)', 'During office', '📘'],
  ['Evening snack', '4:30 PM', '☕'],
  ['Diet dinner', '7:30 PM', '🍽️'],
  ['Work until 10 PM', 'Until 10:00 PM', '💻'],
  ['Reach home', '10:45 PM', '🏡'],
  ['Night skincare', '10:50 PM', '🌙'],
  ['Friends – one episode', '11:00 PM', '📺']
].map(([title, time, icon], index) => ({ id: `task-${index + 1}`, title, time, icon, enabled: true }));
const DEFAULT_SLOTS = [
  { id: 'breakfast', name: 'Breakfast', icon: '🍳', time: '9:00 AM' },
  { id: 'midmorning', name: 'Mid-morning snack', icon: '🍎', time: '10:30 AM' },
  { id: 'lunch', name: 'Lunch', icon: '🥗', time: '1:30 PM' },
  { id: 'evening', name: 'Evening snack', icon: '☕', time: '4:30 PM' },
  { id: 'dinner', name: 'Dinner', icon: '🍲', time: '7:30 PM' }
];
const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', 'cup', 'piece', 'tbsp', 'tsp', 'serving', 'handful'];
const PERIODS = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };

function localDateKey(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
function dateFromKey(key) {
  const [y, m, d] = String(key || TODAY).split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, 12, 0, 0);
}
function addDays(key, offset) {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + offset);
  return localDateKey(d);
}
function fmtDate(key, options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  return dateFromKey(key).toLocaleDateString(undefined, options);
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function makeId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function freshState() {
  return {
    version: 1,
    screen: 'home',
    selectedDate: TODAY,
    profile: { name: '', age: '', height: '150', weight: '', targetWeight: '60', calorieGoal: '1500', setupComplete: false },
    tasks: DEFAULT_TASKS.map(t => ({ ...t })),
    mealSlots: DEFAULT_SLOTS.map(s => ({ ...s })),
    records: {},
    routinePeriod: 'week',
    dietPeriod: 'week',
    dashboardTab: 'routine',
    activeSlotId: 'breakfast',
    modal: null,
    toastTimer: null
  };
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return freshState();
    const defaults = freshState();
    const result = { ...defaults, ...saved };
    result.profile = { ...defaults.profile, ...(saved.profile || {}) };
    result.tasks = Array.isArray(saved.tasks) ? saved.tasks : defaults.tasks;
    result.mealSlots = Array.isArray(saved.mealSlots) ? saved.mealSlots : defaults.mealSlots;
    result.records = saved.records && typeof saved.records === 'object' ? saved.records : {};
    if (!result.selectedDate) result.selectedDate = TODAY;
    return result;
  } catch (error) {
    console.warn('BloomDay data could not be loaded. Starting fresh.', error);
    return freshState();
  }
}
let state = loadState();
let toastTimeout = null;
const appShell = document.querySelector('.app-shell');
const main = document.getElementById('mainContent');
const modalRoot = document.getElementById('modalRoot');
const toastEl = document.getElementById('toast');

// Google Drive uses a browser-only OAuth access token. The token is deliberately
// kept in memory only; it is never saved to localStorage or exported in backups.
const GOOGLE_CLIENT_ID = String(window.BLOOMDAY_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_DRIVE_SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.file';
const DRIVE_BACKUP_NAME = 'BloomDay-backup.json';
const DRIVE_FOLDER_NAME = 'BloomDay';
let googleIdentityScriptPromise = null;
let googleTokenClient = null;
let driveAccessToken = null;
let driveTokenExpiresAt = 0;
let driveSessionAccount = null;
let pendingDriveAction = null;
let dailyDriveBackupRunning = false;

function persist() {
  try {
    const safeState = { ...state, modal: null, toastTimer: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  } catch (error) {
    showToast('Could not save. Please export a backup and free some browser storage.');
    console.error('BloomDay save error', error);
  }
}
function getRecord(date = state.selectedDate) {
  if (!state.records[date]) state.records[date] = { tasks: {}, meals: {}, weight: '' };
  const record = state.records[date];
  if (!record.tasks || typeof record.tasks !== 'object') record.tasks = {};
  if (!record.meals || typeof record.meals !== 'object') record.meals = {};
  return record;
}
function getMeal(date, slotId) {
  const record = getRecord(date);
  if (!record.meals[slotId]) record.meals[slotId] = { items: [], totalCalories: '' };
  const meal = record.meals[slotId];
  if (!Array.isArray(meal.items)) meal.items = [];
  if (meal.totalCalories === undefined || meal.totalCalories === null) meal.totalCalories = '';
  return meal;
}
function enabledTasks() { return state.tasks.filter(task => task.enabled !== false); }
function isTaskDone(date, taskId) { return Boolean((state.records[date]?.tasks || {})[taskId]); }
function taskProgress(date = state.selectedDate) {
  const tasks = enabledTasks();
  const done = tasks.filter(task => isTaskDone(date, task.id)).length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
}
function mealCalories(date, slotId) {
  const meal = state.records[date]?.meals?.[slotId];
  if (!meal) return 0;
  if (meal.totalCalories !== '' && meal.totalCalories !== null && meal.totalCalories !== undefined && Number.isFinite(Number(meal.totalCalories))) return Math.max(0, Number(meal.totalCalories));
  return (meal.items || []).reduce((sum, item) => sum + Math.max(0, Number(item.calories) || 0), 0);
}
function dayCalories(date) {
  return state.mealSlots.reduce((sum, slot) => sum + mealCalories(date, slot.id), 0);
}
function hasDietLog(date) {
  return state.mealSlots.some(slot => {
    const meal = state.records[date]?.meals?.[slot.id];
    return meal && ((meal.items || []).length > 0 || (meal.totalCalories !== '' && meal.totalCalories !== null && meal.totalCalories !== undefined));
  });
}
function periodDates(date, period) {
  const selected = dateFromKey(date);
  let start, end;
  if (period === 'day') return [date];
  if (period === 'week') {
    const weekday = (selected.getDay() + 6) % 7;
    start = new Date(selected); start.setDate(selected.getDate() - weekday);
    end = new Date(start); end.setDate(start.getDate() + 6);
  } else if (period === 'month') {
    start = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
    end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 12);
  } else {
    start = new Date(selected.getFullYear(), 0, 1, 12);
    end = new Date(selected.getFullYear(), 11, 31, 12);
  }
  const now = dateFromKey(TODAY);
  const sameCurrentPeriod = (period === 'month' && selected.getFullYear() === now.getFullYear() && selected.getMonth() === now.getMonth()) ||
    (period === 'year' && selected.getFullYear() === now.getFullYear());
  if ((period === 'month' || period === 'year') && sameCurrentPeriod && selected > now) end = now;
  // For the currently selected monthly/yearly view, don't count dates after the selected day.
  if ((period === 'month' || period === 'year') && selected.getFullYear() === now.getFullYear() && selected <= now) end = selected;
  const dates = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) dates.push(localDateKey(cursor));
  return dates.length ? dates : [date];
}
function weightEntries() {
  return Object.keys(state.records).filter(date => state.records[date] && state.records[date].weight !== '' && state.records[date].weight !== null && Number(state.records[date].weight) > 0)
    .sort((a, b) => a.localeCompare(b)).map(date => ({ date, weight: Number(state.records[date].weight) }));
}
function latestWeight() {
  const entries = weightEntries();
  if (entries.length) return entries[entries.length - 1].weight;
  return Number(state.profile.weight) || 0;
}
function firstWeight() {
  const entries = weightEntries();
  if (entries.length) return entries[0].weight;
  return Number(state.profile.weight) || 0;
}
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2600);
}
function switchScreen(screen) {
  state.screen = screen;
  if (screen === 'dashboard' && !['routine', 'diet', 'weight'].includes(state.dashboardTab)) state.dashboardTab = 'routine';
  state.modal = null;
  persist();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function currentSlot() { return state.mealSlots.find(slot => slot.id === state.activeSlotId) || state.mealSlots[0]; }
function totalLabel(value) { return `${Math.round(value || 0).toLocaleString()} kcal`; }
function dateControl() {
  return `<div class="date-control">
    <label><span>📅</span><strong>${escapeHTML(fmtDate(state.selectedDate))}</strong></label>
    <div class="inline-actions"><button class="ghost-button" data-action="previous-date" aria-label="Previous day">‹</button><input type="date" aria-label="Choose date" data-date-input value="${escapeHTML(state.selectedDate)}"><button class="ghost-button" data-action="next-date" aria-label="Next day">›</button></div>
  </div>`;
}
function progressBar(pct, variant = '') { return `<div class="progress-track"><div class="progress-fill ${variant}" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`; }
function periodSwitcher(kind, active) {
  return `<div class="segmented">${Object.entries(PERIODS).map(([key, label]) => `<button data-action="set-period" data-kind="${kind}" data-period="${key}" class="${key === active ? 'active' : ''}">${label}</button>`).join('')}</div>`;
}
function navIcon(key) { return ({ home: '⌂', routine: '✓', diet: '♡', dashboard: '▥', profile: '☻' })[key] || '•'; }
function render() {
  appShell.classList.toggle('setup-mode', !state.profile.setupComplete);
  document.getElementById('todayLabel').textContent = fmtDate(TODAY, { day: 'numeric', month: 'short' });
  document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('active', button.dataset.nav === state.screen || (state.screen === 'meal' && button.dataset.nav === 'diet')));
  if (!state.profile.setupComplete) main.innerHTML = renderSetup();
  else {
    const views = { home: renderHome, routine: renderRoutine, diet: renderDiet, meal: renderMealDetail, dashboard: renderDashboard, profile: renderProfile };
    main.innerHTML = (views[state.screen] || renderHome)();
  }
  renderModal();
}
function renderSetup() {
  return `<section class="setup-wrap">
    <div class="setup-brand"><img src="./assets/icon-192-v2.png" alt="BloomDay icon"><div><h1>BloomDay</h1><p>Healthy habits, happier you 🌸</p></div></div>
    <div class="eyebrow">A little space for you</div>
    <h2 style="font-size:25px;margin:8px 0 7px">Let's make today a good day</h2>
    <p class="small-muted" style="font-size:13px;margin-bottom:22px">Add your details to personalize your routine, food and weight progress. You can edit these any time.</p>
    <form data-form="setup">
      <div class="form-grid">
        <div class="field full"><label for="profileName">Your name</label><input id="profileName" name="name" autocomplete="name" placeholder="Enter your name" required maxlength="70"></div>
        <div class="field"><label for="profileAge">Age</label><input id="profileAge" name="age" type="number" min="1" max="120" placeholder="e.g. 35" required></div>
        <div class="field"><label for="profileHeight">Height (cm)</label><input id="profileHeight" name="height" type="number" min="50" max="250" step="0.1" placeholder="150" required value="150"></div>
        <div class="field"><label for="profileWeight">Current weight (kg)</label><input id="profileWeight" name="weight" type="number" min="20" max="400" step="0.1" placeholder="e.g. 66" required></div>
        <div class="field"><label for="targetWeight">Target weight (kg)</label><input id="targetWeight" name="targetWeight" type="number" min="20" max="400" step="0.1" value="60"></div>
        <div class="field full"><label for="calorieGoal">Daily calorie goal (kcal)</label><input id="calorieGoal" name="calorieGoal" type="number" min="500" max="10000" step="50" value="1500" required><span class="hint">Starting default is 1,500 kcal. Adjust to your personal plan.</span></div>
      </div>
      <div class="info-banner" style="margin:18px 0">🔒 Your entries stay in this browser on this device. Export a backup occasionally so you can restore them if browser data is cleared.</div>
      <button class="primary-button full" type="submit">Start my BloomDay journey <span>→</span></button>
    </form>
  </section>`;
}
function renderHome() {
  const progress = taskProgress();
  const calories = dayCalories(state.selectedDate);
  const goal = Number(state.profile.calorieGoal) || 1500;
  const weight = state.records[state.selectedDate]?.weight || '';
  const name = state.profile.name || 'there';
  return `<section class="hero">
      <div><div class="eyebrow">${escapeHTML(fmtDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }))}</div><h1>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${escapeHTML(name)} 🌷</h1><p>Small steps count. Take care of yourself today, and let consistency do the rest.</p><div style="margin-top:18px"><button class="primary-button" data-nav="routine">Continue today's routine <span>→</span></button></div></div>
      <div class="hero-illustration" aria-hidden="true">🌷💗</div>
    </section>
    ${dateControl()}
    <section class="hero-stats">
      <article class="stat-card"><div class="stat-head"><span>Routine completed</span><span class="stat-icon">✓</span></div><div class="stat-value">${progress.done}<span style="font-size:14px;color:var(--muted)"> / ${progress.total}</span></div><div class="stat-sub">tasks finished today</div>${progressBar(progress.pct)}</article>
      <article class="stat-card"><div class="stat-head"><span>Calories logged</span><span class="stat-icon">🥗</span></div><div class="stat-value">${Math.round(calories).toLocaleString()}</div><div class="stat-sub">of ${Math.round(goal).toLocaleString()} kcal goal</div>${progressBar(goal ? Math.min(100, calories / goal * 100) : 0, 'gold')}</article>
      <article class="stat-card"><div class="stat-head"><span>Weight entry</span><span class="stat-icon">⚖️</span></div><div class="stat-value">${weight ? `${escapeHTML(weight)}<span style="font-size:14px"> kg</span>` : '—'}</div><div class="stat-sub">${weight ? 'saved for this date' : 'not logged for this date'}</div><div style="margin-top:10px"><button class="ghost-button" data-action="open-weight-form" style="padding:7px 10px;font-size:11px">${weight ? 'Update weight' : 'Log weight'} +</button></div></article>
    </section>
    <div class="section-heading"><div><h2>Your daily space</h2><p>Choose what you want to track.</p></div></div>
    <section class="card-grid">
      <button class="action-card" data-nav="routine"><span class="large-icon">✓</span><strong>Daily Routine</strong><small>${progress.done} of ${progress.total} tasks completed · Build gentle consistency.</small><span class="arrow">›</span></button>
      <button class="action-card" data-nav="diet"><span class="large-icon">🥗</span><strong>Diet Tracker</strong><small>${totalLabel(calories)} logged · Add meals, snacks and water-side extras.</small><span class="arrow">›</span></button>
      <button class="action-card" data-nav="dashboard"><span class="large-icon">📊</span><strong>Dashboard</strong><small>See daily, weekly, monthly and yearly progress.</small><span class="arrow">›</span></button>
    </section>
    <div class="section-heading"><div><h2>A little encouragement</h2><p>Progress is built one small choice at a time.</p></div></div>
    <div class="info-banner">💗 You don't have to do everything perfectly. Just return to your habits, one day at a time.</div>`;
}
function renderRoutine() {
  const tasks = enabledTasks();
  const progress = taskProgress();
  return `<div class="page-title"><div><div class="eyebrow">Daily habits</div><h2>Daily Routine</h2><p>Check off each task as you go.</p></div><button class="primary-button" data-action="open-task-form">＋ Add task</button></div>
    ${dateControl()}
    <section class="routine-summary"><div class="ring" style="--pct:${progress.pct}"><strong>${progress.pct}%</strong></div><div class="summary-copy"><strong>${progress.done} of ${progress.total} tasks completed</strong><span>${progress.done === progress.total && progress.total ? 'Lovely work — you completed everything on this list!' : 'Every little check mark is progress.'}</span>${progressBar(progress.pct)}</div></section>
    ${tasks.length ? `<div class="task-list">${tasks.map(task => {
      const done = isTaskDone(state.selectedDate, task.id);
      return `<article class="task-row ${done ? 'is-done' : ''}"><button class="check-button ${done ? 'checked' : ''}" data-action="toggle-task" data-id="${escapeHTML(task.id)}" aria-label="${done ? 'Mark incomplete' : 'Mark complete'}">${done ? '✓' : ''}</button><span class="task-emoji">${escapeHTML(task.icon || '🌸')}</span><div class="task-main"><span class="task-title">${escapeHTML(task.title)}</span><span class="task-time">${escapeHTML(task.time || 'Time not set')}</span></div><button class="row-menu" data-action="edit-task" data-id="${escapeHTML(task.id)}" aria-label="Edit ${escapeHTML(task.title)}">⋯</button></article>`;
    }).join('')}</div>` : `<div class="empty-state"><strong>No routine tasks yet</strong>Add a task to start your list.</div>`}
    <div class="small-muted" style="margin-top:14px">Tasks are saved by date. You can edit, disable or add tasks using the menu or the Add task button.</div>`;
}
function renderDiet() {
  const calories = dayCalories(state.selectedDate);
  const goal = Number(state.profile.calorieGoal) || 1500;
  const loggedSlots = state.mealSlots.filter(slot => {
    const meal = state.records[state.selectedDate]?.meals?.[slot.id];
    return meal && ((meal.items || []).length > 0 || meal.totalCalories !== '');
  }).length;
  const weight = state.records[state.selectedDate]?.weight || '';
  return `<div class="page-title"><div><div class="eyebrow">Nourish your body</div><h2>Diet Tracker</h2><p>Log what you eat and build awareness without judgement.</p></div><button class="primary-button" data-action="open-slot-form">＋ Add slot</button></div>
    ${dateControl()}
    <div class="diet-summary-strip"><article class="stat-card"><div class="stat-head"><span>Total calories</span><span class="stat-icon">🔥</span></div><div class="stat-value">${Math.round(calories).toLocaleString()}</div><div class="stat-sub">of ${Math.round(goal).toLocaleString()} kcal goal</div>${progressBar(goal ? Math.min(100, calories / goal * 100) : 0, 'gold')}</article><article class="stat-card"><div class="stat-head"><span>Meals logged</span><span class="stat-icon">🍽️</span></div><div class="stat-value">${loggedSlots}<span style="font-size:14px;color:var(--muted)"> / ${state.mealSlots.length}</span></div><div class="stat-sub">meal or snack categories</div>${progressBar(state.mealSlots.length ? loggedSlots / state.mealSlots.length * 100 : 0, 'green')}</article></div>
    <div class="section-heading" style="margin-top:20px"><div><h2>Today's meals</h2><p>Open a category to add items and calories.</p></div><button class="ghost-button" data-action="open-weight-form">⚖️ ${weight ? 'Weight: ' + escapeHTML(weight) + ' kg' : 'Log weight'}</button></div>
    ${state.mealSlots.length ? state.mealSlots.map(slot => {
      const meal = state.records[state.selectedDate]?.meals?.[slot.id] || { items: [], totalCalories: '' };
      const kcal = mealCalories(state.selectedDate, slot.id);
      const count = (meal.items || []).length;
      return `<article class="meal-card"><div class="meal-card-head"><span class="meal-emoji">${escapeHTML(slot.icon || '🍽️')}</span><div class="meal-heading"><strong>${escapeHTML(slot.name)}</strong><small>${escapeHTML(slot.time || 'Time not set')} · ${count} ${count === 1 ? 'item' : 'items'}</small></div><div class="meal-cal">${Math.round(kcal).toLocaleString()} kcal<small>${meal.totalCalories !== '' ? 'meal total' : 'from items'}</small></div><div class="meal-actions"><button class="small-icon-button" data-action="open-meal" data-slotid="${escapeHTML(slot.id)}" aria-label="Open ${escapeHTML(slot.name)}">›</button><button class="small-icon-button" data-action="edit-slot" data-id="${escapeHTML(slot.id)}" aria-label="Edit meal slot">⋯</button></div></div></article>`;
    }).join('') : `<div class="empty-state"><strong>No meal slots yet</strong>Add Breakfast, Lunch or another custom slot to get started.</div>`}
    <div class="weight-entry-card"><span class="weight-icon">⚖️</span><div class="weight-copy"><strong>Daily weight</strong><small>${weight ? `Logged ${escapeHTML(weight)} kg on ${escapeHTML(fmtDate(state.selectedDate))}` : 'Keep a dated record of your progress.'}</small></div><button class="primary-button" data-action="open-weight-form">${weight ? 'Edit' : 'Add'} weight</button></div>
    <div class="info-banner">Tip: When a meal's overall calorie number is entered, it will be used for the dashboard instead of adding up its individual items.</div>`;
}
function renderMealDetail() {
  const slot = currentSlot();
  if (!slot) { state.screen = 'diet'; return renderDiet(); }
  const meal = getMeal(state.selectedDate, slot.id);
  const sumItems = meal.items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  return `<div class="page-title"><div><div class="eyebrow">${escapeHTML(fmtDate(state.selectedDate))}</div><h2>${escapeHTML(slot.icon || '🍽️')} ${escapeHTML(slot.name)}</h2><p>Record the food, quantity and calories.</p></div><button class="ghost-button" data-action="back-to-diet">← Meals</button></div>
    <div class="routine-summary"><span class="meal-emoji" style="width:55px;height:55px;font-size:27px">${escapeHTML(slot.icon || '🍽️')}</span><div class="summary-copy"><strong>${Math.round(mealCalories(state.selectedDate, slot.id)).toLocaleString()} kcal</strong><span>${meal.items.length} food items · ${meal.totalCalories !== '' ? 'using manual meal total' : 'sum of item calories'}</span></div></div>
    <section class="dash-card" style="margin-bottom:14px"><div class="section-heading" style="margin:0 0 12px"><div><h3>Meal calorie total</h3><p>Optional — overrides item calories when filled.</p></div></div><form data-form="meal-total" data-slotid="${escapeHTML(slot.id)}"><div class="form-grid"><div class="field full"><label for="totalCalories">Overall calories for ${escapeHTML(slot.name)} (kcal)</label><input id="totalCalories" name="totalCalories" type="number" min="0" max="20000" step="1" value="${escapeHTML(meal.totalCalories)}" placeholder="Leave blank to add the item calories"></div></div><div class="form-actions"><button class="secondary-button" type="button" data-action="clear-meal-total" data-slotid="${escapeHTML(slot.id)}">Clear total</button><button class="primary-button" type="submit">Save meal total</button></div></form></section>
    <div class="section-heading"><div><h2>Food items</h2><p>${meal.items.length ? `Item calories currently add up to ${Math.round(sumItems)} kcal.` : 'Add foods one at a time. You can add multiple foods.'}</p></div><button class="primary-button" data-action="open-food-form" data-slotid="${escapeHTML(slot.id)}">＋ Add item</button></div>
    ${meal.items.length ? `<div class="task-list">${meal.items.map(item => `<article class="task-row"><span class="task-emoji">🥣</span><div class="task-main"><span class="task-title">${escapeHTML(item.name)}</span><span class="task-time">${escapeHTML(item.quantity)} ${escapeHTML(item.unit)}${item.calories !== '' ? ` · ${item.calorieSource === 'estimated' ? '≈ ' : ''}${Math.round(Number(item.calories) || 0)} kcal${item.calorieSource === 'estimated' ? ' estimate' : ''}` : ' · calories not entered'}</span></div><button class="row-menu" data-action="edit-food" data-slotid="${escapeHTML(slot.id)}" data-id="${escapeHTML(item.id)}" aria-label="Edit food item">✎</button><button class="row-menu" data-action="delete-food" data-slotid="${escapeHTML(slot.id)}" data-id="${escapeHTML(item.id)}" aria-label="Delete food item">×</button></article>`).join('')}</div>` : `<div class="empty-state"><strong>No items added yet</strong>Tap Add item to enter what you ate.</div>`}
    <div class="section-heading"><div><h2>What's next?</h2><p>Keep your log honest and flexible.</p></div></div>
    <div class="inline-actions"><button class="secondary-button" data-action="edit-slot" data-id="${escapeHTML(slot.id)}">Edit category name / time</button><button class="secondary-button" data-action="back-to-diet">Back to all meals</button></div>`;
}
function renderDashboard() {
  const tab = state.dashboardTab || 'routine';
  return `<div class="page-title"><div><div class="eyebrow">Your progress, at a glance</div><h2>Dashboard</h2><p>Notice patterns, celebrate consistency.</p></div></div>
    ${dateControl()}
    <div class="dash-switch"><button data-action="set-dashboard-tab" data-tab="routine" class="${tab === 'routine' ? 'active' : ''}">✓ Routine</button><button data-action="set-dashboard-tab" data-tab="diet" class="${tab === 'diet' ? 'active' : ''}">🥗 Diet</button><button data-action="set-dashboard-tab" data-tab="weight" class="${tab === 'weight' ? 'active' : ''}">⚖️ Weight</button></div>
    ${tab === 'routine' ? renderRoutineDashboard() : tab === 'diet' ? renderDietDashboard() : renderWeightDashboard()}`;
}
function renderRoutineDashboard() {
  const period = state.routinePeriod || 'week';
  const dates = periodDates(state.selectedDate, period);
  let totalDone = 0, totalPossible = 0, activeTasks = enabledTasks();
  dates.forEach(date => { totalDone += taskProgress(date).done; totalPossible += taskProgress(date).total; });
  const pct = totalPossible ? Math.round(totalDone / totalPossible * 100) : 0;
  const dailyBars = period === 'day' ? dates : period === 'week' ? dates : dates.slice(-7);
  const taskStats = activeTasks.map(task => ({ ...task, done: dates.filter(date => isTaskDone(date, task.id)).length, denom: period === 'week' ? 7 : dates.length }));
  const periodLabel = period === 'week' ? `Week of ${fmtDate(dates[0], { day: 'numeric', month: 'short' })}` : period === 'month' ? fmtDate(state.selectedDate, { month: 'long', year: 'numeric' }) : period === 'year' ? dateFromKey(state.selectedDate).getFullYear() : fmtDate(state.selectedDate);
  return `<div style="margin-bottom:14px">${periodSwitcher('routine', period)}</div>
    <div class="dash-grid">
      <article class="dash-card"><span class="card-label">${PERIODS[period]} completion</span><div class="big-number">${pct}%</div><div class="helper">${totalDone} of ${totalPossible} possible task check-ins in ${escapeHTML(periodLabel.toLowerCase())}.</div>${progressBar(pct)}</article>
      <article class="dash-card"><span class="card-label">Days with a completed task</span><div class="big-number">${dates.filter(date => taskProgress(date).done > 0).length}<span style="font-size:13px;color:var(--muted)"> / ${dates.length}</span></div><div class="helper">A day counts when at least one task is checked.</div>${progressBar(dates.length ? dates.filter(date => taskProgress(date).done > 0).length / dates.length * 100 : 0, 'green')}</article>
      <article class="dash-card wide"><div class="section-heading" style="margin:0"><div><h3>Task completion</h3><p>${escapeHTML(periodLabel)}</p></div><span class="chart-legend"><span class="legend-dot"></span> Completed</span></div><div class="bar-chart">${dailyBars.map(date => {
        const prog = taskProgress(date); const label = period === 'day' ? 'Today' : fmtDate(date, { weekday: 'short' });
        return `<div class="bar-column"><span class="bar-value">${prog.pct}%</span><div class="bar" style="height:${Math.max(3, prog.pct)}%" title="${escapeHTML(fmtDate(date))}: ${prog.pct}%"></div><span class="bar-label">${escapeHTML(label)}</span></div>`;
      }).join('')}</div></article>
      <article class="dash-card wide"><div class="section-heading" style="margin:0"><div><h3>Task-wise consistency</h3><p>How many days each task was completed.</p></div></div>
        <div class="task-stat-list">${taskStats.sort((a,b) => (b.done / Math.max(b.denom,1)) - (a.done / Math.max(a.denom,1))).map(task => { const p = Math.round(task.done / Math.max(task.denom,1) * 100); return `<div class="task-stat"><span class="label">${escapeHTML(task.icon || '🌸')} ${escapeHTML(task.title)}</span><div class="mini-track"><div class="mini-fill" style="width:${p}%"></div></div><strong>${task.done} / ${task.denom} days</strong></div>`; }).join('')}</div></article>
    </div>`;
}
function renderDietDashboard() {
  const period = state.dietPeriod || 'week';
  const dates = periodDates(state.selectedDate, period);
  const loggedDates = dates.filter(hasDietLog);
  const dailyValues = loggedDates.map(date => dayCalories(date));
  const average = dailyValues.length ? dailyValues.reduce((a,b) => a + b, 0) / dailyValues.length : 0;
  const goal = Number(state.profile.calorieGoal) || 1500;
  const goalDays = loggedDates.filter(date => dayCalories(date) > 0 && dayCalories(date) <= goal).length;
  const consistency = dates.length ? Math.round(loggedDates.length / dates.length * 100) : 0;
  const daysForChart = period === 'day' ? dates : period === 'week' ? dates : dates.slice(-7);
  const periodLabel = period === 'week' ? `Week of ${fmtDate(dates[0], { day: 'numeric', month: 'short' })}` : period === 'month' ? fmtDate(state.selectedDate, { month: 'long', year: 'numeric' }) : period === 'year' ? String(dateFromKey(state.selectedDate).getFullYear()) : fmtDate(state.selectedDate);
  return `<div style="margin-bottom:14px">${periodSwitcher('diet', period)}</div>
    <div class="dash-grid">
      <article class="dash-card"><span class="card-label">Average calories</span><div class="big-number">${Math.round(average).toLocaleString()}</div><div class="helper">kcal per logged day · goal ${Math.round(goal).toLocaleString()}</div></article>
      <article class="dash-card"><span class="card-label">Diet log consistency</span><div class="big-number">${consistency}%</div><div class="helper">${loggedDates.length} of ${dates.length} days have a food log.</div>${progressBar(consistency, 'green')}</article>
      <article class="dash-card"><span class="card-label">Days within calorie goal</span><div class="big-number">${goalDays}<span style="font-size:13px;color:var(--muted)"> / ${loggedDates.length}</span></div><div class="helper">Logged days between 1 kcal and your target.</div>${progressBar(loggedDates.length ? goalDays / loggedDates.length * 100 : 0, 'gold')}</article>
      <article class="dash-card"><span class="card-label">Meals / snack slots logged</span><div class="big-number">${dates.reduce((sum, date) => sum + state.mealSlots.filter(slot => { const m = state.records[date]?.meals?.[slot.id]; return m && ((m.items || []).length || m.totalCalories !== ''); }).length, 0)}</div><div class="helper">Number of category entries logged in this period.</div></article>
      <article class="dash-card wide"><div class="section-heading" style="margin:0"><div><h3>Calories by day</h3><p>${escapeHTML(periodLabel)} · blank days are shown as zero, not included in average.</p></div><span class="chart-legend"><span class="legend-dot"></span> kcal</span></div><div class="bar-chart">${daysForChart.map(date => { const kcal = dayCalories(date); const height = Math.min(100, kcal / Math.max(goal * 1.25, 1) * 100); const label = period === 'day' ? 'Today' : fmtDate(date, { weekday: 'short' }); return `<div class="bar-column"><span class="bar-value">${kcal ? Math.round(kcal) : '—'}</span><div class="bar" style="height:${Math.max(kcal ? 3 : 1, height)}%;opacity:${kcal ? 1 : .18}" title="${escapeHTML(fmtDate(date))}: ${Math.round(kcal)} kcal"></div><span class="bar-label">${escapeHTML(label)}</span></div>`; }).join('')}</div><p class="small-muted" style="margin:10px 0 0">Your average is calculated from dates with at least one meal or snack entry.</p></article>
      <article class="dash-card wide"><div class="section-heading" style="margin:0"><div><h3>Meal consistency</h3><p>How often each meal slot was logged.</p></div></div><div class="task-stat-list">${state.mealSlots.map(slot => { const count = dates.filter(date => { const m = state.records[date]?.meals?.[slot.id]; return m && ((m.items || []).length || m.totalCalories !== ''); }).length; const p = dates.length ? Math.round(count / dates.length * 100) : 0; return `<div class="task-stat"><span class="label">${escapeHTML(slot.icon || '🍽️')} ${escapeHTML(slot.name)}</span><div class="mini-track"><div class="mini-fill" style="width:${p}%"></div></div><strong>${count} / ${dates.length} days</strong></div>`; }).join('')}</div></article>
    </div>`;
}
function renderWeightDashboard() {
  const entries = weightEntries();
  const current = latestWeight();
  const start = firstWeight();
  const change = current && start ? current - start : 0;
  const target = Number(state.profile.targetWeight) || 0;
  return `<div class="dash-grid">
    <article class="dash-card"><span class="card-label">Latest weight</span><div class="big-number">${current ? current.toFixed(1) : '—'}<span style="font-size:13px;color:var(--muted)"> kg</span></div><div class="helper">${entries.length ? escapeHTML(fmtDate(entries[entries.length - 1].date)) : 'No weight entries yet'}</div></article>
    <article class="dash-card"><span class="card-label">Change since first log</span><div class="big-number" style="color:${change < 0 ? 'var(--green)' : change > 0 ? 'var(--pink-dark)' : 'var(--plum)'}">${change > 0 ? '+' : ''}${current && start ? change.toFixed(1) : '—'}<span style="font-size:13px"> kg</span></div><div class="helper">${start ? `First recorded weight: ${start.toFixed(1)} kg` : 'Add a dated weight entry to begin.'}</div></article>
    <article class="dash-card wide"><div class="section-heading" style="margin:0"><div><h3>Weight progress</h3><p>All dated weight entries saved in BloomDay.</p></div><button class="primary-button" data-action="open-weight-form">＋ Add weight</button></div>${renderWeightChart(entries)}<div class="kpi-inline"><span>🎯 Target: <strong>${target ? target.toFixed(1) + ' kg' : 'not set'}</strong></span><span>🗓️ Entries: <strong>${entries.length}</strong></span></div></article>
    <article class="dash-card wide"><div class="section-heading" style="margin:0"><div><h3>Weight history</h3><p>Newest records appear first.</p></div></div>${entries.length ? `<div class="weight-history">${entries.slice().reverse().map(entry => `<div class="history-row"><span>${escapeHTML(fmtDate(entry.date))}</span><strong>${entry.weight.toFixed(1)} kg</strong><button data-action="edit-weight-date" data-date="${escapeHTML(entry.date)}" title="Edit entry">✎</button></div>`).join('')}</div>` : `<div class="empty-state" style="margin-top:14px"><strong>No weight history yet</strong>Tap Add weight to record the first entry.</div>`}</article>
    </div>`;
}
function renderWeightChart(entries) {
  if (!entries.length) return `<div class="empty-state" style="margin-top:13px"><strong>Your progress graph starts here</strong>Add your weight on the Diet screen to see changes over time.</div>`;
  const data = entries.slice(-14);
  const values = data.map(e => e.weight);
  let min = Math.min(...values), max = Math.max(...values);
  if (max - min < 1) { min -= .5; max += .5; }
  const W = 640, H = 210, left = 42, right = 15, top = 20, bottom = 33;
  const x = i => left + (data.length === 1 ? (W-left-right)/2 : i * (W-left-right) / (data.length-1));
  const y = val => top + (max-val) / (max-min) * (H-top-bottom);
  const path = data.map((e,i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(e.weight).toFixed(1)}`).join(' ');
  const yTicks = [min, (min+max)/2, max].map(v => `<g><line x1="${left}" y1="${y(v)}" x2="${W-right}" y2="${y(v)}" stroke="#f4dce6" stroke-dasharray="4 5"/><text x="${left-8}" y="${y(v)+4}" text-anchor="end" fill="#9d7890" font-size="10">${v.toFixed(1)}</text></g>`).join('');
  const points = data.map((e,i) => `<circle cx="${x(i)}" cy="${y(e.weight)}" r="4" fill="#ef4f86" stroke="white" stroke-width="2"><title>${escapeHTML(e.date)} · ${e.weight.toFixed(1)} kg</title></circle>`).join('');
  const labels = data.map((e,i) => i === 0 || i === data.length-1 || i === Math.floor(data.length/2) ? `<text x="${x(i)}" y="${H-8}" text-anchor="middle" fill="#9d7890" font-size="10">${escapeHTML(fmtDate(e.date, { day: 'numeric', month: 'short' }))}</text>` : '').join('');
  return `<svg class="weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight progress graph">${yTicks}<path d="${path}" fill="none" stroke="#ef4f86" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points}${labels}</svg>`;
}
function renderProfile() {
  const current = latestWeight();
  return `<div class="page-title"><div><div class="eyebrow">Your personal space</div><h2>Profile & Settings</h2><p>Update goals and protect your data.</p></div></div>
    <div class="profile-summary"><div class="profile-avatar">🌷</div><div class="details"><strong>${escapeHTML(state.profile.name || 'BloomDay user')}</strong><span>${escapeHTML(state.profile.age || '—')} years · ${escapeHTML(state.profile.height || '—')} cm · ${current ? current.toFixed(1) + ' kg' : 'weight not logged'}</span></div><button class="secondary-button" data-action="edit-profile">Edit</button></div>
    <form class="dash-card" data-form="profile" style="margin-bottom:13px"><h3>Profile details</h3><div class="form-grid">
      <div class="field full"><label>Name</label><input name="name" required maxlength="70" value="${escapeHTML(state.profile.name)}"></div>
      <div class="field"><label>Age</label><input name="age" type="number" min="1" max="120" required value="${escapeHTML(state.profile.age)}"></div>
      <div class="field"><label>Height (cm)</label><input name="height" type="number" min="50" max="250" step="0.1" required value="${escapeHTML(state.profile.height)}"></div>
      <div class="field"><label>Target weight (kg)</label><input name="targetWeight" type="number" min="20" max="400" step="0.1" value="${escapeHTML(state.profile.targetWeight)}"></div>
      <div class="field"><label>Daily calorie goal (kcal)</label><input name="calorieGoal" type="number" min="500" max="10000" step="50" required value="${escapeHTML(state.profile.calorieGoal)}"></div>
    </div><div class="form-actions"><button class="primary-button" type="submit">Save profile</button></div></form>
    <section class="dash-card" style="margin-bottom:13px"><h3>Manage routine</h3><p class="small-muted">Edit your full checklist, adjust times, hide tasks you no longer need or add new ones.</p><button class="secondary-button" data-action="manage-tasks">Edit routine tasks (${state.tasks.length})</button></section>
    <section class="dash-card" style="margin-bottom:13px"><h3>Backup & restore</h3><p class="small-muted">Export your profile, tasks, food entries, daily completions and weight history as a JSON file. Keep it somewhere safe.</p><div class="inline-actions"><button class="primary-button" data-action="export-backup">↓ Export backup</button><button class="secondary-button" data-action="import-backup">↑ Restore backup</button></div></section>
    <section class="dash-card" style="margin-bottom:13px"><h3>Google sign-in & Drive backup</h3><p class="small-muted">Connect your Google account to save one BloomDay backup file in your Google Drive. Use Save and Restore when you want to move your data between devices.</p>${googleDriveStatusHTML()}<div class="inline-actions" style="margin-top:12px"><button class="secondary-button" data-action="google-connect">${driveSessionAccount ? 'Reconnect Google' : 'Sign in with Google'}</button><button class="primary-button" data-action="drive-save">Save to Google Drive</button><button class="secondary-button" data-action="drive-restore">Restore from Drive</button></div><p class="hint" style="margin-top:10px">Google Drive is optional. BloomDay continues saving locally. After you sign in to Google, BloomDay automatically saves at most one backup per local calendar day while this page session's authorization remains valid. After reopening the app, sign in again to enable that day's automatic backup. Your access token is kept in memory only.</p></section>
    <section class="dash-card" style="margin-bottom:13px"><h3>Privacy & storage</h3><div class="info-banner">Your diet, routine and weight entries stay in this browser until you choose to export them or save a backup to Google Drive. Drive access is limited to files BloomDay creates or files you explicitly open with it; it does not request access to all Drive files.</div><p class="small-muted" style="margin:10px 0 0">This static app uses Google directly from your browser; it has no BloomDay server or database receiving your health, diet or routine records.</p></section>
    <section class="dash-card"><h3>Reset this app</h3><p class="small-muted">This permanently clears the BloomDay data saved in this browser. Export a backup first if needed.</p><button class="danger-button" data-action="reset-data">Reset all local data</button></section>`;
}
function renderModal() {
  if (!state.modal) { modalRoot.innerHTML = ''; return; }
  const modal = state.modal;
  let content = '';
  if (modal.type === 'task') content = renderTaskModal(modal);
  else if (modal.type === 'food') content = renderFoodModal(modal);
  else if (modal.type === 'slot') content = renderSlotModal(modal);
  else if (modal.type === 'weight') content = renderWeightModal(modal);
  else if (modal.type === 'tasks') content = renderManageTasksModal();
  else if (modal.type === 'backup') content = renderBackupModal();
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal-panel" role="dialog" aria-modal="true" aria-label="${escapeHTML(modal.title || 'BloomDay form')}"><div class="modal-head"><div><div class="eyebrow">BloomDay</div><h2>${escapeHTML(modal.title || 'Edit details')}</h2></div><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div>${content}</section></div>`;
}
function renderTaskModal(modal) {
  const task = modal.id ? state.tasks.find(item => item.id === modal.id) : null;
  return `<form data-form="task" data-id="${escapeHTML(task?.id || '')}"><div class="form-grid">
    <div class="field full"><label>Task name</label><input name="title" value="${escapeHTML(task?.title || '')}" placeholder="e.g. Drink water" required maxlength="100"></div>
    <div class="field"><label>Time or time range</label><input name="time" value="${escapeHTML(task?.time || '')}" placeholder="e.g. 6:30 AM"></div>
    <div class="field"><label>Emoji / icon</label><input name="icon" value="${escapeHTML(task?.icon || '🌸')}" maxlength="8" placeholder="🌸"></div>
    <div class="field full"><label>Show this task in your daily list</label><select name="enabled"><option value="true" ${task?.enabled !== false ? 'selected' : ''}>Yes, show task</option><option value="false" ${task?.enabled === false ? 'selected' : ''}>No, hide task</option></select></div>
  </div><div class="form-actions">${task ? `<button class="danger-button" type="button" data-action="delete-task" data-id="${escapeHTML(task.id)}">Delete task</button>` : ''}<button class="secondary-button" type="button" data-action="close-modal">Cancel</button><button class="primary-button" type="submit">Save task</button></div></form>`;
}
function renderFoodModal(modal) {
  const slot = state.mealSlots.find(item => item.id === modal.slotId) || currentSlot();
  const meal = slot ? getMeal(state.selectedDate, slot.id) : { items: [] };
  const item = modal.id ? meal.items.find(food => food.id === modal.id) : null;
  const itemId = item?.id || '';
  const lookup = window.BLOOMDAY_FOOD_LOOKUP;
  const initialEstimate = item && lookup ? lookup.estimate(item.name, item.quantity, item.unit) : null;
  const manualCalories = item ? item.calorieSource !== 'estimated' : false;
  const estimateMessage = initialEstimate
    ? `Typical estimate for ${escapeHTML(initialEstimate.food.name)}: about ${initialEstimate.calories} kcal for this quantity. Recipes and oil/ghee can change the actual value.${manualCalories ? ' The saved calorie value is manual.' : ''} <button class="text-link-button" type="button" data-action="use-food-estimate">Use estimate</button>`
    : 'Start typing an Indian food or drink and choose a suggestion to estimate calories. You can always enter calories manually.';
  const options = lookup ? lookup.names.map(name => `<option value="${escapeHTML(name)}"></option>`).join('') : '';
  return `<form data-form="food" data-slotid="${escapeHTML(slot?.id || modal.slotId || '')}" data-id="${escapeHTML(itemId)}" data-last-matched="${escapeHTML(lookup?.find(item?.name)?.name || '')}"><div class="form-grid">
    <div class="field full"><label>Food / drink item</label><input name="name" list="indianFoodSuggestions" autocomplete="off" value="${escapeHTML(item?.name || '')}" placeholder="Try idli, dosa, rice, sambar, chicken curry…" required maxlength="100"><datalist id="indianFoodSuggestions">${options}</datalist><span class="hint">Includes common South Indian and Indian foods; choose a suggestion for an estimate.</span></div>
    <div class="field"><label>Quantity</label><input name="quantity" type="number" min="0" step="any" value="${escapeHTML(item?.quantity ?? '1')}" required></div>
    <div class="field"><label>Unit</label><select name="unit">${UNIT_OPTIONS.map(unit => `<option value="${unit}" ${(item?.unit || 'g') === unit ? 'selected' : ''}>${unit}</option>`).join('')}</select></div>
    <div class="field full"><label>Calories (kcal) <span style="font-weight:400;color:var(--muted)">— estimated automatically, editable</span></label><input name="calories" data-manual="${manualCalories ? 'true' : 'false'}" type="number" min="0" max="20000" step="1" value="${escapeHTML(item?.calories ?? '')}" placeholder="Choose a food to estimate"><span class="hint">The estimate updates when the food, quantity or unit changes. Edit the number if needed.</span></div>
  </div><div class="food-calorie-estimate" data-food-estimate role="status">${estimateMessage}</div><p class="small-muted" style="margin:10px 0 0">Meal: <strong>${escapeHTML(slot?.name || '')}</strong> · ${escapeHTML(fmtDate(state.selectedDate))}. Estimates are approximate, not exact nutrition analysis. For packaged foods, prefer the nutrition label. <a href="https://www.nin.res.in/ebooks/IFCT2017_16122024.pdf" target="_blank" rel="noreferrer">ICMR-NIN Indian Food Composition Tables</a> provides reference data for ingredients; prepared-dish estimates here are typical approximations.</p><div class="form-actions"><button class="secondary-button" type="button" data-action="close-modal">Cancel</button><button class="primary-button" type="submit">${item ? 'Save changes' : 'Add food item'}</button></div></form>`;
}
function renderSlotModal(modal) {
  const slot = modal.id ? state.mealSlots.find(item => item.id === modal.id) : null;
  return `<form data-form="slot" data-id="${escapeHTML(slot?.id || '')}"><div class="form-grid">
    <div class="field full"><label>Meal / snack category name</label><input name="name" value="${escapeHTML(slot?.name || '')}" placeholder="e.g. Tea, pre-workout snack" required maxlength="70"></div>
    <div class="field"><label>Emoji / icon</label><input name="icon" value="${escapeHTML(slot?.icon || '🍽️')}" maxlength="8" placeholder="🍽️"></div>
    <div class="field"><label>Usual time (optional)</label><input name="time" value="${escapeHTML(slot?.time || '')}" placeholder="e.g. 5:00 PM"></div>
  </div><p class="small-muted" style="margin-top:12px">Your entries for previous dates remain saved if you rename a category.</p><div class="form-actions">${slot ? `<button class="danger-button" type="button" data-action="delete-slot" data-id="${escapeHTML(slot.id)}">Delete slot</button>` : ''}<button class="secondary-button" type="button" data-action="close-modal">Cancel</button><button class="primary-button" type="submit">Save slot</button></div></form>`;
}
function renderWeightModal(modal) {
  const date = modal.date || state.selectedDate;
  const weight = state.records[date]?.weight || '';
  return `<form data-form="weight" data-date="${escapeHTML(date)}"><div class="form-grid">
    <div class="field full"><label>Date</label><input name="date" type="date" value="${escapeHTML(date)}" required></div>
    <div class="field full"><label>Weight (kg)</label><input name="weight" type="number" min="20" max="400" step="0.1" value="${escapeHTML(weight)}" placeholder="e.g. 66.2" required></div>
  </div><p class="small-muted" style="margin-top:12px">Use one entry per date. Saving a weight for a date will update that day's record.</p><div class="form-actions">${weight !== '' ? `<button class="danger-button" type="button" data-action="delete-weight" data-date="${escapeHTML(date)}">Delete entry</button>` : ''}<button class="secondary-button" type="button" data-action="close-modal">Cancel</button><button class="primary-button" type="submit">Save weight</button></div></form>`;
}
function renderManageTasksModal() {
  return `<p class="small-muted" style="margin-top:-5px">Edit a task, hide one from the daily list, or add another.</p><div class="task-list">${state.tasks.map(task => `<article class="task-row"><span class="task-emoji">${escapeHTML(task.icon || '🌸')}</span><div class="task-main"><span class="task-title">${escapeHTML(task.title)}</span><span class="task-time">${escapeHTML(task.time || 'Time not set')}${task.enabled === false ? ' · hidden' : ''}</span></div><button class="row-menu" data-action="edit-task" data-id="${escapeHTML(task.id)}">✎</button></article>`).join('')}</div><div class="form-actions"><button class="secondary-button" type="button" data-action="close-modal">Close</button><button class="primary-button" type="button" data-action="open-task-form">＋ Add task</button></div>`;
}
function googleDriveConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PASTE_YOUR_'));
}
function googleDriveStatusHTML() {
  if (!googleDriveConfigured()) return `<div class="info-banner">One-time setup required: add your Google OAuth Web Client ID to <code>google-config.js</code>, then upload that file to GitHub. Read the included GOOGLE-DRIVE-SETUP.md first.</div>`;
  if (driveSessionAccount) return `<div class="info-banner">✅ Connected for this session as <strong>${escapeHTML(driveSessionAccount.email || driveSessionAccount.name || 'Google account')}</strong>. Google authorization may need to be renewed after this page is reloaded.</div>`;
  return `<div class="info-banner">Google Drive is not connected for this page session. Select Sign in with Google, or choose Save / Restore to authorize Drive access when needed.</div>`;
}
function renderBackupModal() {
  return `<div class="info-banner">Your backup includes profile details, routine tasks, food entries, daily completion states and weight history. Restoring replaces the data currently stored in this browser.</div>
    <div style="height:12px"></div><div class="inline-actions"><button class="primary-button" data-action="export-backup">↓ Export JSON</button><button class="secondary-button" data-action="import-backup">↑ Restore JSON</button></div>
    <section class="dash-card" style="margin-top:16px"><h3>Google Drive</h3><p class="small-muted">Save or restore a single <strong>BloomDay-backup.json</strong> file in your Drive's BloomDay folder.</p>${googleDriveStatusHTML()}<div class="inline-actions" style="margin-top:12px"><button class="secondary-button" data-action="google-connect">${driveSessionAccount ? 'Reconnect Google' : 'Sign in with Google'}</button><button class="primary-button" data-action="drive-save">Save to Drive</button><button class="secondary-button" data-action="drive-restore">Restore from Drive</button></div></section>
    <p class="small-muted" style="margin-top:15px">Google Drive is optional. Keep using local storage or JSON export if you prefer. Tokens are not stored on this device.</p><div class="form-actions"><button class="secondary-button" data-action="close-modal">Done</button></div>`;
}
function closeModal() { state.modal = null; renderModal(); }
function openModal(type, properties = {}) { state.modal = { type, ...properties }; renderModal(); }
function makeBackupPayload() {
  return { app: 'BloomDay', exportedAt: new Date().toISOString(), version: 1, data: { ...state, modal: null, toastTimer: null } };
}
function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;
  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.accounts?.oauth2 ? resolve() : reject(new Error('Google identity services did not initialize.'));
    script.onerror = () => reject(new Error('Could not load Google sign-in. Check your internet connection.'));
    document.head.appendChild(script);
  });
  return googleIdentityScriptPromise;
}
function requestGoogleDriveAccess(action) {
  if (!googleDriveConfigured()) {
    showToast('Add your Google OAuth Client ID to google-config.js first.');
    return;
  }
  if (driveAccessToken && Date.now() < driveTokenExpiresAt - 30000) {
    if (action === 'connect') { showToast(`Google connected: ${driveSessionAccount?.email || 'account ready'}`); render(); if (state.modal) renderModal(); }
    else runDriveAction(action).catch(error => { console.error(error); showToast(error.message || 'Google Drive action failed.'); });
    return;
  }
  // requestAccessToken must be called directly from a user gesture. If the Google
  // library did not load (e.g. slow connection), load it and ask the user to tap again.
  if (!window.google?.accounts?.oauth2) {
    loadGoogleIdentityServices().then(() => showToast('Google sign-in is ready. Tap the action again.')).catch(error => { console.error(error); showToast(error.message || 'Unable to load Google sign-in.'); });
    return;
  }
  pendingDriveAction = action;
  googleTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: handleGoogleTokenResponse,
    error_callback: error => { pendingDriveAction = null; showToast(error?.message || 'Google sign-in was cancelled or failed.'); }
  });
  googleTokenClient.requestAccessToken({ prompt: driveSessionAccount ? '' : 'select_account' });
}
async function handleGoogleTokenResponse(response) {
  if (!response || response.error || !response.access_token) {
    pendingDriveAction = null;
    showToast(response?.error_description || response?.error || 'Google did not grant Drive access.');
    return;
  }
  driveAccessToken = response.access_token;
  driveTokenExpiresAt = Date.now() + (Number(response.expires_in) || 3600) * 1000;
  try {
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${driveAccessToken}` } });
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      driveSessionAccount = { name: profile.name || '', email: profile.email || '' };
    } else driveSessionAccount = { name: '', email: '' };
  } catch (_) { driveSessionAccount = { name: '', email: '' }; }
  const action = pendingDriveAction; pendingDriveAction = null;
  render(); if (state.modal) renderModal();
  if (action === 'connect') {
    showToast(`Google connected${driveSessionAccount.email ? `: ${driveSessionAccount.email}` : ''}.`);
    await maybeAutoSaveDailyDriveBackup();
  } else if (action) await runDriveAction(action);
}
async function driveFetch(url, options = {}) {
  if (!driveAccessToken || Date.now() >= driveTokenExpiresAt - 10000) throw new Error('Google Drive access expired. Please connect again.');
  const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${driveAccessToken}` } });
  if (!response.ok) {
    let detail = '';
    try { const json = await response.json(); detail = json.error?.message || json.error_description || ''; } catch (_) {}
    if (response.status === 401) { driveAccessToken = null; driveTokenExpiresAt = 0; }
    throw new Error(detail ? `Google Drive: ${detail}` : `Google Drive request failed (${response.status}).`);
  }
  return response;
}
async function listDriveFiles(query) {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('spaces', 'drive');
  url.searchParams.set('pageSize', '100');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,parents)');
  const response = await driveFetch(url.toString());
  const payload = await response.json();
  return Array.isArray(payload.files) ? payload.files : [];
}
async function ensureDriveFolder() {
  const safeFolderName = DRIVE_FOLDER_NAME.replace(/'/g, "\'");
  const existing = await listDriveFiles(`name = '${safeFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  if (existing.length) return existing[0].id;
  const response = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
  });
  const folder = await response.json();
  if (!folder.id) throw new Error('Google Drive did not return a folder ID.');
  return folder.id;
}
async function saveDriveBackup() {
  const folderId = await ensureDriveFolder();
  const safeBackupName = DRIVE_BACKUP_NAME.replace(/'/g, "\'");
  const existing = await listDriveFiles(`name = '${safeBackupName}' and '${folderId}' in parents and trashed = false`);
  const content = JSON.stringify(makeBackupPayload(), null, 2);
  if (existing.length) {
    await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing[0].id)}?uploadType=media`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: content
    });
  } else {
    const boundary = `bloomday_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const metadata = { name: DRIVE_BACKUP_NAME, mimeType: 'application/json', parents: [folderId] };
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
    await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime', {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart
    });
  }
  localStorage.setItem('bloomday.lastDriveBackupAt', new Date().toISOString());
  showToast('BloomDay backup saved to Google Drive.');
  render(); if (state.modal) renderModal();
}
async function restoreDriveBackup() {
  const safeBackupName = DRIVE_BACKUP_NAME.replace(/'/g, "\'");
  const folders = await listDriveFiles(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  if (!folders.length) { showToast('No BloomDay folder found in this Google Drive yet.'); return; }
  const files = await listDriveFiles(`name = '${safeBackupName}' and '${folders[0].id}' in parents and trashed = false`);
  if (!files.length) { showToast('No BloomDay backup was found in this Google Drive.'); return; }
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(files[0].id)}?alt=media`);
  const payload = await response.json();
  restoreBackupPayload(payload, 'Google Drive');
}
async function runDriveAction(action) {
  if (!driveAccessToken || Date.now() >= driveTokenExpiresAt - 10000) {
    requestGoogleDriveAccess(action); return;
  }
  try {
    if (action === 'save') await saveDriveBackup();
    else if (action === 'restore') await restoreDriveBackup();
  } catch (error) {
    console.error('BloomDay Drive error:', error);
    if (/expired|401/i.test(error.message)) { driveAccessToken = null; driveTokenExpiresAt = 0; }
    showToast(error.message || 'Google Drive action failed.');
  }
}

// Save at most one Drive backup per local calendar day, but only when the user
// has already authorized Google in this page session. Never open an auth popup
// automatically: browsers require a user gesture for OAuth authorization.
async function maybeAutoSaveDailyDriveBackup() {
  if (!state.profile.setupComplete || dailyDriveBackupRunning) return;
  if (!driveAccessToken || Date.now() >= driveTokenExpiresAt - 30000) return;

  const lastBackupAt = localStorage.getItem('bloomday.lastDriveBackupAt');
  if (lastBackupAt) {
    const lastDate = localDateKey(new Date(lastBackupAt));
    if (lastDate === localDateKey(new Date())) return;
  }

  dailyDriveBackupRunning = true;
  try {
    await saveDriveBackup();
  } catch (error) {
    console.error('BloomDay automatic Drive backup failed:', error);
    showToast('Automatic backup failed. Open Profile and reconnect to Google, then try Save to Drive.');
  } finally {
    dailyDriveBackupRunning = false;
  }
}
function restoreBackupPayload(payload, sourceLabel = 'backup file') {
  try {
    const incoming = payload.data || payload;
    if (!incoming.profile || !Array.isArray(incoming.tasks) || !Array.isArray(incoming.mealSlots) || !incoming.records || typeof incoming.records !== 'object') throw new Error('This does not look like a BloomDay backup.');
    if (!window.confirm(`Restore this ${sourceLabel}? Current BloomDay data in this browser will be replaced.`)) return false;
    const defaults = freshState();
    state = { ...defaults, ...incoming, modal: null, toastTimer: null };
    state.profile = { ...defaults.profile, ...(incoming.profile || {}) };
    persist(); modalRoot.innerHTML = ''; render(); showToast(`${sourceLabel === 'Google Drive' ? 'Google Drive backup' : 'Backup'} restored successfully.`); return true;
  } catch (error) { alert(`Could not restore ${sourceLabel}: ${error.message}`); return false; }
}
function exportBackup() {
  const payload = makeBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `BloomDay-backup-${TODAY}.json`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  showToast('Backup exported. Keep the JSON file somewhere safe.');
}
function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      restoreBackupPayload(payload, 'backup file');
    } catch (error) { alert(`Could not restore this file: ${error.message}`); }
  };
  reader.onerror = () => alert('Could not read that backup file.');
  reader.readAsText(file);
}

function updateFoodEstimate(form, options = {}) {
  if (!form || !window.BLOOMDAY_FOOD_LOOKUP) return;
  const nameInput = form.elements.name;
  const quantityInput = form.elements.quantity;
  const unitInput = form.elements.unit;
  const caloriesInput = form.elements.calories;
  const note = form.querySelector('[data-food-estimate]');
  if (!nameInput || !quantityInput || !unitInput || !caloriesInput) return;
  const food = window.BLOOMDAY_FOOD_LOOKUP.find(nameInput.value);
  if (options.nameChanged) {
    const previous = form.dataset.lastMatched || '';
    if (food && food.name !== previous && !form.dataset.id) {
      quantityInput.value = String(food.defaultQuantity || 1);
      unitInput.value = food.defaultUnit || 'g';
    }
    caloriesInput.dataset.manual = 'false';
    if (!food) caloriesInput.value = '';
    form.dataset.lastMatched = food?.name || '';
  }
  const result = food ? window.BLOOMDAY_FOOD_LOOKUP.estimate(nameInput.value, quantityInput.value, unitInput.value) : null;
  if (result && caloriesInput.dataset.manual !== 'true') {
    caloriesInput.value = String(result.calories);
  }
  if (note) {
    if (result) {
      const manualText = caloriesInput.dataset.manual === 'true' ? ' Your current calorie field is manually entered.' : ' This estimate is filled into the calorie field.';
      note.innerHTML = `Approximate estimate for <strong>${escapeHTML(result.food.name)}</strong>: <strong>${result.calories} kcal</strong> for ${escapeHTML(quantityInput.value)} ${escapeHTML(unitInput.value)} (about ${Math.round(result.grams)} g edible portion).${manualText} <button class="text-link-button" type="button" data-action="use-food-estimate">Use estimate</button>`;
    } else {
      note.textContent = nameInput.value.trim()
        ? 'No exact match found in the built-in Indian food list. You can enter calories manually, or try a shorter/common food name.'
        : 'Start typing an Indian food or drink and choose a suggestion to estimate calories. You can always enter calories manually.';
    }
  }
}

// Update Indian-food estimates as users enter a food name, quantity or unit.
document.addEventListener('input', event => {
  const control = event.target;
  const form = control.closest('form[data-form="food"]');
  if (!form) return;
  if (control.name === 'calories') {
    control.dataset.manual = 'true';
    updateFoodEstimate(form);
    return;
  }
  if (control.name === 'name') updateFoodEstimate(form, { nameChanged: true });
  else if (['quantity', 'unit'].includes(control.name)) updateFoodEstimate(form);
});
document.addEventListener('change', event => {
  const control = event.target;
  const form = control.closest('form[data-form="food"]');
  if (form && ['name', 'quantity', 'unit'].includes(control.name)) {
    updateFoodEstimate(form, { nameChanged: control.name === 'name' });
    return;
  }
});

// Click handling is delegated so the UI can be refreshed from saved state.
document.addEventListener('click', event => {
  const navButton = event.target.closest('[data-nav]');
  if (navButton) { switchScreen(navButton.dataset.nav); return; }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const { action, id, slotid, period, kind, tab, date } = actionButton.dataset;
  switch (action) {
    case 'go-home': switchScreen('home'); break;
    case 'close-modal': closeModal(); break;
    case 'backdrop-close': if (event.target === actionButton) closeModal(); break;
    case 'toggle-task': {
      const record = getRecord();
      record.tasks[id] = !record.tasks[id];
      persist(); render();
      break;
    }
    case 'open-task-form': state.modal = null; openModal('task', { title: id ? 'Edit task' : 'Add a routine task', id: '' }); break;
    case 'edit-task': openModal('task', { title: 'Edit routine task', id }); break;
    case 'delete-task': {
      if (!confirm('Delete this task from your routine? Past completion records will remain in saved data, but the task will no longer be shown.')) break;
      state.tasks = state.tasks.filter(task => task.id !== id); persist(); closeModal(); render(); showToast('Task deleted.'); break;
    }
    case 'manage-tasks': openModal('tasks', { title: 'Manage routine tasks' }); break;
    case 'open-meal': state.activeSlotId = slotid; state.screen = 'meal'; state.modal = null; persist(); render(); break;
    case 'back-to-diet': switchScreen('diet'); break;
    case 'open-food-form': openModal('food', { title: 'Add a food item', slotId: slotid || state.activeSlotId, id: '' }); break;
    case 'edit-food': openModal('food', { title: 'Edit food item', slotId: slotid || state.activeSlotId, id }); break;
    case 'use-food-estimate': {
      const form = actionButton.closest('form[data-form="food"]');
      if (!form || !window.BLOOMDAY_FOOD_LOOKUP) break;
      const estimation = window.BLOOMDAY_FOOD_LOOKUP.estimate(form.elements.name.value, form.elements.quantity.value, form.elements.unit.value);
      if (!estimation) { showToast('Choose a food from the suggestions first.'); break; }
      form.elements.calories.value = String(estimation.calories);
      form.elements.calories.dataset.manual = 'false';
      updateFoodEstimate(form);
      showToast(`Estimate applied: ${estimation.calories} kcal.`);
      break;
    }
    case 'delete-food': {
      const meal = getMeal(state.selectedDate, slotid || state.activeSlotId);
      const food = meal.items.find(item => item.id === id);
      if (!food || !confirm(`Delete ${food.name} from this meal?`)) break;
      meal.items = meal.items.filter(item => item.id !== id); persist(); render(); showToast('Food item removed.'); break;
    }
    case 'open-slot-form': openModal('slot', { title: 'Add meal / snack slot', id: '' }); break;
    case 'edit-slot': openModal('slot', { title: 'Edit meal / snack slot', id }); break;
    case 'delete-slot': {
      const slot = state.mealSlots.find(item => item.id === id);
      if (!slot || !confirm(`Delete the “${slot.name}” slot? Food history associated with that slot will no longer appear.`)) break;
      state.mealSlots = state.mealSlots.filter(item => item.id !== id);
      if (state.activeSlotId === id) state.activeSlotId = state.mealSlots[0]?.id || '';
      state.screen = 'diet'; persist(); closeModal(); render(); showToast('Meal slot deleted.'); break;
    }
    case 'set-period':
      if (kind === 'routine') state.routinePeriod = period; else state.dietPeriod = period;
      persist(); render(); break;
    case 'set-dashboard-tab': state.dashboardTab = tab; persist(); render(); break;
    case 'open-weight-form': openModal('weight', { title: 'Log daily weight', date: state.selectedDate }); break;
    case 'edit-weight-date': openModal('weight', { title: 'Edit weight entry', date }); break;
    case 'delete-weight': {
      if (!confirm(`Delete weight entry for ${fmtDate(date)}?`)) break;
      if (state.records[date]) state.records[date].weight = '';
      persist(); closeModal(); render(); showToast('Weight entry deleted.'); break;
    }
    case 'previous-date': state.selectedDate = addDays(state.selectedDate, -1); persist(); render(); break;
    case 'next-date': state.selectedDate = addDays(state.selectedDate, 1); persist(); render(); break;
    case 'edit-profile': document.querySelector('#mainContent form[data-form="profile"] input[name="name"]')?.focus(); break;
    case 'open-backup': openModal('backup', { title: 'Backup & restore' }); break;
    case 'google-connect': requestGoogleDriveAccess('connect'); break;
    case 'drive-save': requestGoogleDriveAccess('save'); break;
    case 'drive-restore': requestGoogleDriveAccess('restore'); break;
    case 'export-backup': exportBackup(); break;
    case 'import-backup': document.getElementById('backupImport').click(); break;
    case 'reset-data':
      if (confirm('Reset all BloomDay data saved in this browser? This cannot be undone. Export a backup first if needed.')) {
        localStorage.removeItem(STORAGE_KEY); state = freshState(); modalRoot.innerHTML = ''; render(); showToast('BloomDay has been reset.');
      }
      break;
    case 'clear-meal-total': {
      const meal = getMeal(state.selectedDate, slotid || state.activeSlotId); meal.totalCalories = ''; persist(); render(); showToast('Meal total cleared; item calories will be used.'); break;
    }
  }
});

document.addEventListener('change', event => {
  const input = event.target;
  if (input.matches('[data-date-input]')) {
    if (input.value) { state.selectedDate = input.value; persist(); render(); }
  }
});

document.addEventListener('submit', event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const values = new FormData(form);
  const type = form.dataset.form;
  if (type === 'setup' || type === 'profile') {
    const nextProfile = {
      ...state.profile,
      name: String(values.get('name') || '').trim(),
      age: String(values.get('age') || '').trim(),
      height: String(values.get('height') || '').trim(),
      targetWeight: String(values.get('targetWeight') || '').trim(),
      calorieGoal: String(values.get('calorieGoal') || '1500').trim(),
      setupComplete: true
    };
    if (!nextProfile.name || !Number(nextProfile.age) || !Number(nextProfile.height) || !Number(nextProfile.calorieGoal)) { showToast('Please fill in the required details.'); return; }
    state.profile = nextProfile;
    if (type === 'setup') {
      const weight = String(values.get('weight') || '').trim();
      state.profile.weight = weight;
      if (weight && !state.records[TODAY]?.weight) getRecord(TODAY).weight = weight;
      state.selectedDate = TODAY;
      state.screen = 'home';
    }
    persist(); render(); showToast(type === 'setup' ? 'Welcome to BloomDay 🌸' : 'Profile updated.');
  } else if (type === 'task') {
    const id = form.dataset.id;
    const taskData = { title: String(values.get('title') || '').trim(), time: String(values.get('time') || '').trim(), icon: String(values.get('icon') || '🌸').trim() || '🌸', enabled: values.get('enabled') !== 'false' };
    if (!taskData.title) return;
    if (id) {
      const task = state.tasks.find(item => item.id === id);
      if (task) Object.assign(task, taskData);
    } else state.tasks.push({ id: makeId('task'), ...taskData });
    persist(); state.modal = null; render(); showToast(id ? 'Task updated.' : 'Task added.');
  } else if (type === 'food') {
    const slotId = form.dataset.slotid;
    const meal = getMeal(state.selectedDate, slotId);
    const id = form.dataset.id;
    const food = {
      id: id || makeId('food'), name: String(values.get('name') || '').trim(),
      quantity: String(values.get('quantity') || '1'), unit: String(values.get('unit') || 'g'),
      calories: String(values.get('calories') || '').trim(),
      calorieSource: form.elements.calories?.dataset.manual === 'true' ? 'manual' : (window.BLOOMDAY_FOOD_LOOKUP?.find(String(values.get('name') || '')) && String(values.get('calories') || '').trim() !== '' ? 'estimated' : (String(values.get('calories') || '').trim() !== '' ? 'manual' : ''))
    };
    if (!food.name || !food.quantity || Number(food.quantity) < 0) { showToast('Enter a food name and valid quantity.'); return; }
    const index = meal.items.findIndex(item => item.id === id);
    if (index >= 0) meal.items[index] = food; else meal.items.push(food);
    state.activeSlotId = slotId;
    persist(); state.modal = null; render(); showToast(index >= 0 ? 'Food item updated.' : 'Food item added.');
  } else if (type === 'slot') {
    const id = form.dataset.id;
    const slotData = { name: String(values.get('name') || '').trim(), icon: String(values.get('icon') || '🍽️').trim() || '🍽️', time: String(values.get('time') || '').trim() };
    if (!slotData.name) return;
    if (id) {
      const slot = state.mealSlots.find(item => item.id === id);
      if (slot) Object.assign(slot, slotData);
    } else {
      const newSlot = { id: makeId('meal'), ...slotData };
      state.mealSlots.push(newSlot); state.activeSlotId = newSlot.id;
    }
    persist(); state.modal = null; render(); showToast(id ? 'Meal slot updated.' : 'Meal slot added.');
  } else if (type === 'weight') {
    const date = String(values.get('date') || state.selectedDate);
    const weight = Number(values.get('weight'));
    if (!date || !Number.isFinite(weight) || weight < 20 || weight > 400) { showToast('Enter a valid weight between 20 and 400 kg.'); return; }
    getRecord(date).weight = String(weight);
    state.profile.weight = String(weight);
    state.selectedDate = date;
    persist(); state.modal = null; render(); showToast('Weight saved.');
  } else if (type === 'meal-total') {
    const slotId = form.dataset.slotid;
    const meal = getMeal(state.selectedDate, slotId);
    const raw = String(values.get('totalCalories') || '').trim();
    if (raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0 || Number(raw) > 20000)) { showToast('Enter a valid calorie total or leave it blank.'); return; }
    meal.totalCalories = raw;
    persist(); render(); showToast(raw ? 'Meal calorie total saved.' : 'Meal total cleared.');
  }
});

document.getElementById('backupImport').addEventListener('change', event => {
  importBackupFile(event.target.files?.[0]);
  event.target.value = '';
});

// Register the offline app shell only when served over HTTPS or localhost.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline caching could not be enabled.', error)));
}

// Warm the Google Identity Services library. Google features remain optional and the app
// still works locally if the script cannot be loaded.
if (googleDriveConfigured() && !window.google?.accounts?.oauth2) loadGoogleIdentityServices().catch(() => {});

// Keep a record container available for the current day after setup.
if (state.profile.setupComplete) getRecord(state.selectedDate);
render();

// If BloomDay stays open across a day boundary, back up when the page becomes visible
// again, provided Google authorization in this session is still valid.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') maybeAutoSaveDailyDriveBackup();
});
