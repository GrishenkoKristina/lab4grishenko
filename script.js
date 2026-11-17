const ROWS = 4, COLS = 6, MAX_SEATS = 6;
const ROW_PRICE = { 1: 250, 2: 300, 3: 350, 4: 400 };
const SESSIONS = [
  { id: 's1', title: '«Ночной экспресс»', time: 'Сегодня, 18:30', occupied: ['1-2','1-3','2-4','3-1','3-6','4-5'] },
  { id: 's2', title: '«Тихое море»', time: 'Сегодня, 21:00', occupied: ['1-5','2-1','2-2','3-3','4-1','4-2','4-6'] }
];
const seatId = (r, c) => `${r}-${c}`;
const seatLabel = id => { const [r, c] = id.split('-'); return `ряд ${r}, место ${c}`; };
const seatPrice = id => ROW_PRICE[id.split('-')[0]];

const KEY = 'cinema-demo-v1';
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ok: true, data: [] };
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('bad');
    return { ok: true, data: data.filter(b => b && b.id && b.sessionId && Array.isArray(b.seats)) };
  } catch { return { ok: false, data: [], error: 'Сохранённые данные повреждены или недоступны — начинаем с пустого списка.' }; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}
function clear() { try { localStorage.removeItem(KEY); } catch {} }


const $ = id => document.getElementById(id);
const rub = n => `${n} ₽`;
const loaded = load();
const state = {
  sessionId: SESSIONS[0].id, selected: new Set(), maxPrice: 400, row: 'all',
  bookings: loaded.data, busy: false, last: null
};
const allIds = [];
for (let r = 1; r <= ROWS; r++) for (let c = 1; c <= COLS; c++) allIds.push(seatId(r, c));

const session = () => SESSIONS.find(s => s.id === state.sessionId);
const taken = id => session().occupied.includes(id) ||
  state.bookings.some(b => b.sessionId === state.sessionId && b.seats.includes(id));
const visible = id => seatPrice(id) <= state.maxPrice && (state.row === 'all' || id.startsWith(state.row + '-'));
const stateOf = id => taken(id) ? 'taken' : state.selected.has(id) ? 'sel' : 'free';
const MARK = { free: '○', sel: '✓', taken: '✕' };
const WORD = { free: 'свободно', sel: 'выбрано', taken: 'занято' };

function say(text, bad) { const m = $('msg'); m.textContent = text; m.className = 'msg' + (text ? (bad ? ' bad' : ' ok') : ''); }
function persist() { if (!save(state.bookings)) say('Не удалось сохранить: браузер запретил localStorage. Брони живут до закрытия страницы.', true); }

function renderSessions() {
  $('sessions').innerHTML = SESSIONS.map(s =>
    `<button type="button" class="sess" data-s="${s.id}" aria-pressed="${s.id === state.sessionId}"><b>${s.title}</b><br>${s.time}</button>`).join('');
}
function seatBtn(id, region) {
  const st = stateOf(id), hid = !visible(id);
  const label = `${seatLabel(id)}, ${rub(seatPrice(id))}, ${WORD[st]}`;
  return `<button type="button" class="seat ${st}${hid && region === 'scheme' ? ' ghost-seat' : ''}" data-id="${id}" data-region="${region}"
    aria-label="${label}" aria-pressed="${st === 'sel'}" ${st === 'taken' || (hid && region === 'scheme') ? 'disabled' : ''}>
    <span aria-hidden="true">${MARK[st]} ${id.split('-')[1]}</span></button>`;
}
function renderSeats() {
  $('scheme').innerHTML = allIds.map(id => seatBtn(id, 'scheme')).join('');
  const vis = allIds.filter(visible);
  $('list').innerHTML = vis.map(id => {
    const st = stateOf(id);
    return `<li>${seatBtn(id, 'list').replace('</button>', '')}<span class="ltxt"> ${seatLabel(id)} — ${rub(seatPrice(id))} — ${WORD[st]}</span></button></li>`;
  }).join('');
  $('empty').hidden = vis.length > 0;
}
function total() { return [...state.selected].reduce((s, id) => s + seatPrice(id), 0); }
const ROW_INFO = {
  1: 'Первый ряд: ближе всего к экрану, самые доступные места.',
  2: 'Второй ряд: близко к экрану, комфортный наклон головы.',
  3: 'Третий ряд: удобный обзор и хороший звук.',
  4: 'Последний ряд: лучший обзор всего экрана, самые дорогие места.'
};
function seatInfo() {
  const id = state.last;
  if (!id) return '<p class="hint">Нажмите на место, чтобы открыть его карточку.</p>';
  const [r, c] = id.split('-'), st = stateOf(id);
  return `<div class="seatcard"><h3>Место ${c}, ряд ${r}</h3><p>${ROW_INFO[r]}</p>
    <p>Цена: <b>${rub(seatPrice(id))}</b> · Статус: <b>${WORD[st]}</b></p></div>`;
}
function renderCard() {
  const s = session(), ids = [...state.selected].sort();
  $('card').innerHTML = seatInfo() + `<p><b>${s.title}</b>, ${s.time}</p>` + (ids.length
    ? `<ul class="chosen">${ids.map(i => `<li>${seatLabel(i)} — ${rub(seatPrice(i))}</li>`).join('')}</ul>`
    : '<p class="hint">Места не выбраны. Нажмите на место на плане или в списке.</p>');
  $('total').textContent = rub(total());
}
function renderBookings() {
  const b = state.bookings;
  $('bookings').innerHTML = b.length ? b.map(x => {
    const s = SESSIONS.find(s => s.id === x.sessionId);
    return `<article class="ticket"><b>Билет № ${x.id}</b> (учебный)<br>${s.title}, ${s.time}<br>
      ${x.name}: ${x.seats.map(seatLabel).join('; ')}<br>Сумма: <b>${rub(x.total)}</b><br>
      <button type="button" data-cancel="${x.id}">Отменить бронь</button></article>`;
  }).join('') : '<p class="hint">Пока нет броней.</p>';
}
function render() {
  renderSessions(); renderSeats(); renderCard(); renderBookings();
  $('priceOut').textContent = state.maxPrice;
  $('bar').hidden = state.selected.size === 0;
  $('barTxt').textContent = `Выбрано мест: ${state.selected.size} · ${rub(total())}`;
}
function toggle(id, region) {
  if (taken(id)) return say('Это место занято.', true);
  if (state.selected.has(id)) state.selected.delete(id);
  else if (state.selected.size >= MAX_SEATS) return say(`Не больше ${MAX_SEATS} мест на один билет.`, true);
  else state.selected.add(id);
  state.last = id; say(''); $('formErr').textContent = '';
  render();
  document.querySelector(`[data-region="${region}"][data-id="${id}"]`)?.focus();
}
function dropHidden() {
  const gone = [...state.selected].filter(id => !visible(id));
  gone.forEach(id => state.selected.delete(id));
  if (gone.length) say('Фильтр скрыл выбранные места — выбор для них сброшен.', true);
}

document.addEventListener('click', e => {
  const seat = e.target.closest('.seat'); if (seat) return toggle(seat.dataset.id, seat.dataset.region);
  const s = e.target.closest('[data-s]');
  if (s) { state.sessionId = s.dataset.s; state.selected.clear(); state.last = null; say('Сеанс изменён, выбор мест сброшен.'); render(); return; }
  const c = e.target.closest('[data-cancel]');
  if (c) {
    state.bookings = state.bookings.filter(b => b.id !== c.dataset.cancel);
    persist(); say('Бронь отменена, места свободны.'); render();
  }
});
$('maxPrice').addEventListener('input', e => { state.maxPrice = +e.target.value; dropHidden(); render(); });
$('rowFilter').addEventListener('change', e => { state.row = e.target.value; dropHidden(); render(); });
$('resetFilters').addEventListener('click', () => {
  state.maxPrice = 400; state.row = 'all'; $('maxPrice').value = 400; $('rowFilter').value = 'all'; say(''); render();
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  if (state.busy) return;
  const name = $('name').value.trim();
  $('nameErr').textContent = name.length < 2 ? 'Введите имя (минимум 2 символа).' : '';
  $('formErr').textContent = state.selected.size === 0 ? 'Выберите хотя бы одно место.' : '';
  if ($('nameErr').textContent || $('formErr').textContent) {
    say('Бронь не создана: ' + ($('formErr').textContent || $('nameErr').textContent), true);
    if ($('nameErr').textContent && !$('formErr').textContent) $('name').focus();
    return;
  }
  if ([...state.selected].some(taken)) { $('formErr').textContent = 'Одно из мест уже занято.'; return; }
  state.busy = true;
  const num = state.bookings.reduce((m, b) => Math.max(m, +b.id), 1000) + 1;
  state.bookings.push({ id: String(num), sessionId: state.sessionId, name, seats: [...state.selected].sort(), total: total() });
  state.selected.clear(); persist();
  say(`Готово! Учебный билет № ${num} оформлен — он в разделе «Мои брони».`); render();
  $('bookings').scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => { state.busy = false; }, 400);
});
$('resetDemo').addEventListener('click', () => {
  if (!confirm('Удалить все брони из этого браузера?')) return;
  state.bookings = []; state.selected.clear(); clear(); say('Демо сброшено.'); render();
});

$('barBtn').addEventListener('click', () => { $('cardPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('name').focus({ preventScroll: true }); });
if (!loaded.ok) say(loaded.error, true);
render();
