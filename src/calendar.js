// 日历窗口：周视图 / 月视图。待办按截止日放进对应的格子；拖一下就能改日期。
const $ = id => document.getElementById(id);
const sv = (p, w = 14, sw = 2) => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  plus: sv('<path d="M12 5v14M5 12h14"/>', 14, 2.2),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 9, 3.4),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>', 14, 1.9),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>', 12, 2.2)
};
const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const W = TAURI ? TAURI.window.getCurrentWindow() : null;

// 日历自己的设置也存在数据里（下次打开还是上次的视图）
const C = () => (S.cal = Object.assign({ view: 'week', showDone: true, imp: false, urg: false, lunar: true }, S.cal || {}));
let anchor = new Date(); anchor.setHours(0, 0, 0, 0);   // 当前看的是哪一周 / 哪个月
let drawer = null;          // 'plan' | 'late' | null
let popTask = null;         // 正在编辑的待办 id
let quickDay = null;        // 正在快速添加的日期
let dragId = null, dragFrom = null;   // dragFrom：从哪一天拖出来的（拖动时整段日期一起挪）

const parse = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
const todayIso = () => isoOf(new Date());
// 四象限同一套颜色
const color = t => t.imp && t.urg ? '#C2410C' : t.imp ? 'var(--accent)' : t.urg ? '#CA8A04' : '#8A9496';

function visible(t) {
  const c = C();
  if (t.done && !c.showDone) return false;
  if (c.imp && !t.imp) return false;
  if (c.urg && !t.urg) return false;
  return true;
}
// 哪些待办出现在某一天：
//  · 从开始到截止的每一天都显示（只有截止日期的，就只在截止那天）
//  · 今天这一格还会放「已经逾期、还没做完」的待办（带「逾期」标记，原来那天也还在）
//  · 完全没定日期的不进日历，在「待安排」侧栏里
const timeOf = (t, iso) => (t.start === iso && t.startTime) || (t.due === iso && t.dueTime) || t.remind || '99';
function tasksOn(iso) {
  const tIso = todayIso();
  const late = t => !t.done && spanOf(t) && spanOf(t).to < tIso;
  return S.tasks.filter(t => visible(t) && (coversDay(t, iso) || (iso === tIso && late(t))))
    .sort((a, b) => (a.done - b.done) || ((iso === tIso ? late(b) - late(a) : 0)) || (timeOf(a, iso) < timeOf(b, iso) ? -1 : timeOf(a, iso) > timeOf(b, iso) ? 1 : 0) || (b.imp - a.imp) || (a.id - b.id));
}
// 每一格里的小标记：逾期 / 开始 / 截止 / 时间
function tag(t, iso, short) {
  const sp = spanOf(t), tIso = todayIso(), out = [];
  if (!t.done && sp && sp.to < tIso && iso === tIso) {
    const d = -daysLeft(sp.to);
    return `<span class="tg late" title="逾期 ${d} 天">${short ? '逾' : '逾期' + d + '天'}</span>`;
  }
  const multi = sp && sp.from !== sp.to;
  if (multi && iso === sp.from) out.push(`<span class="tg st" title="开始${t.startTime ? ' ' + t.startTime : ''}">${short ? '始' : '开始' + (t.startTime ? ' ' + esc(t.startTime) : '')}</span>`);
  else if (multi && iso === sp.to) out.push(`<span class="tg due" title="截止${t.dueTime ? ' ' + t.dueTime : ''}">${short ? '止' : '截止' + (t.dueTime ? ' ' + esc(t.dueTime) : '')}</span>`);
  else if (multi) out.push(`<span class="tg mid" title="进行中：${+sp.from.slice(5, 7)}/${+sp.from.slice(8)} → ${+sp.to.slice(5, 7)}/${+sp.to.slice(8)}">${short ? '…' : '进行中'}</span>`);
  else if (!short && (t.startTime || t.dueTime)) out.push(`<span class="tm">${esc(t.startTime && t.dueTime ? t.startTime + '–' + t.dueTime : t.dueTime || t.startTime)}</span>`);
  return out.join('');
}
const evHtml = (t, iso, showTime = true) => `<div class="ev ${t.done ? 'done' : ''} ${popTask === t.id ? 'sel' : ''}" draggable="true" data-ev="${t.id}" data-from="${iso || ''}" title="${esc(t.title)}${t.remind ? '  提醒 ' + t.remind : ''}">
  <button class="ck" data-ck="${t.id}" aria-label="${t.done ? '恢复' : '完成'}：${esc(t.title)}">${t.done ? I.check : ''}</button>
  <span class="dt" style="--c:${color(t)}"></span><span class="tt">${esc(t.title)}</span>${tag(t, iso, !showTime)}${t.repeat ? '<span class="rp" title="' + esc(repeatLabel(t)) + '重复">↻</span>' : ''}${showTime && t.remind && !t.dueTime && !t.startTime ? `<span class="tm">${esc(t.remind)}</span>` : ''}</div>`;
function dayHead(d) {
  const iso = isoOf(d), L = C().lunar && window.Lunar ? Lunar.label(d.getFullYear(), d.getMonth() + 1, d.getDate()) : null;
  return `<div class="dhead"><span class="dnum">${d.getDate()}</span>${L ? `<span class="lun ${L.fest ? 'fest' : L.term ? 'term' : ''}">${esc(L.text)}</span>` : ''}<button class="dadd" data-qadd="${iso}" aria-label="在 ${d.getMonth() + 1}月${d.getDate()}日 添加待办">${I.plus}</button></div>`;
}
const quickInput = iso => quickDay === iso ? `<input class="qadd" data-qinput="${iso}" placeholder="写完按回车" autocomplete="off">` : '';

function render() {
  const c = C(), tIso = todayIso();
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === c.view));
  document.querySelectorAll('[data-f]').forEach(i => i.checked = !!c[i.dataset.f]);
  $('filterBtn').classList.toggle('on', !c.showDone || c.imp || c.urg);

  const open = S.tasks.filter(t => !t.done);
  const plan = open.filter(t => !spanOf(t)), late = open.filter(t => spanOf(t) && spanOf(t).to < tIso);
  $('statPlan').innerHTML = `待安排<b>${plan.length}</b>`;
  $('statLate').innerHTML = `逾期<b>${late.length}</b>`;
  $('statLate').classList.toggle('warn', late.length > 0);
  $('statPlan').classList.toggle('on', drawer === 'plan');
  $('statLate').classList.toggle('on', drawer === 'late');

  let h = '';
  if (c.view === 'week') {
    const m0 = mondayOf(anchor), m6 = addDays(m0, 6);
    $('range').textContent = `${m0.getFullYear()}/${pad2(m0.getMonth() + 1)}/${pad2(m0.getDate())} — ${m0.getFullYear() !== m6.getFullYear() ? m6.getFullYear() + '/' : ''}${pad2(m6.getMonth() + 1)}/${pad2(m6.getDate())}`;
    h = `<div class="wk-head">${WEEK.map(w => `<div>${w}</div>`).join('')}</div><div class="wk-body">`;
    for (let i = 0; i < 7; i++) {
      const d = addDays(m0, i), iso = isoOf(d), list = tasksOn(iso);
      h += `<div class="col ${iso === tIso ? 'today' : ''}" data-day="${iso}">${dayHead(d)}<div class="dlist">${quickInput(iso)}${list.map(t => evHtml(t, iso)).join('') || (quickDay === iso ? '' : '<div class="dempty">暂无待办</div>')}</div></div>`;
    }
    h += '</div>';
  } else {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1), start = mondayOf(first);
    $('range').textContent = `${first.getFullYear()} 年 ${first.getMonth() + 1} 月`;
    // 每个格子最多显示几条：按窗口高度估算
    const rowH = Math.max(60, (window.innerHeight - 100) / 6), room = rowH - 30, fitAll = Math.max(1, Math.floor(room / 20)), fitMore = Math.max(1, Math.floor((room - 16) / 20));
    h = `<div class="wk-head">${WEEK.map(w => `<div>${w}</div>`).join('')}</div><div class="mo-body">`;
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i), iso = isoOf(d), list = tasksOn(iso);
      const shown = quickDay === iso ? list.slice(0, Math.max(0, fitMore - 1)) : list.length > fitAll ? list.slice(0, fitMore) : list;
      const rest = list.length - shown.length;
      h += `<div class="cell ${d.getMonth() !== first.getMonth() ? 'other' : ''} ${iso === tIso ? 'today' : ''}" data-day="${iso}">${dayHead(d)}<div class="dlist">${quickInput(iso)}${shown.map(t => evHtml(t, iso, false)).join('')}${rest > 0 ? `<button class="more-ev" data-week="${iso}">还有 ${rest} 件 →</button>` : ''}</div></div>`;
    }
    h += '</div>';
  }
  $('grid').innerHTML = h;
  renderDrawer(plan, late);
  renderPop();
  const q = document.querySelector('[data-qinput]'); if (q) q.focus();
}

function renderDrawer(plan, late) {
  const d = $('drawer');
  d.hidden = !drawer;
  if (!drawer) return;
  const list = drawer === 'plan' ? plan : late;
  d.innerHTML = drawer === 'plan'
    ? `<h2><span>待安排（没有截止日）</span><span>${list.length}</span></h2><p class="tip">把它们拖到右边的某一天，就排好日期了。</p>${list.map(t => evHtml(t, '')).join('') || '<div class="dempty">都安排好了</div>'}`
    : `<h2><span>逾期还没做完</span><span>${list.length}</span></h2><p class="tip">拖到新的一天重新安排，或者直接勾掉。</p>${list.map(t => evHtml(t, '').replace('<span class="tt">', `<span class="tm">${+spanOf(t).to.slice(5, 7)}/${+spanOf(t).to.slice(8)}</span><span class="tt">`)).join('') || '<div class="dempty">没有逾期，很棒</div>'}`;
}

/* ───── 编辑弹窗 ───── */
function renderPop() {
  const p = $('pop'), t = S.tasks.find(x => x.id === popTask);
  if (!t) { p.hidden = true; popTask = null; return; }
  const keep = document.activeElement && p.contains(document.activeElement) ? document.activeElement.dataset.p : null;
  p.hidden = false;
  p.innerHTML = `<input type="text" data-p="title" value="${esc(t.title)}" aria-label="待办内容">
    <div class="row"><span class="ed-lab">开始</span><label class="ed-date"><input type="date" data-p="start" value="${t.start || ''}" aria-label="开始日期"></label><label class="ed-date"><input type="time" data-p="startTime" value="${t.startTime || ''}" aria-label="开始时间"></label></div>
    <div class="row"><span class="ed-lab">截止</span><label class="ed-date"><input type="date" data-p="due" value="${t.due || ''}" aria-label="截止日期"></label><label class="ed-date"><input type="time" data-p="dueTime" value="${t.dueTime || ''}" aria-label="截止时间"></label></div>
    <div class="row"><span class="ed-lab">提醒</span><label class="ed-date"><input type="time" data-p="remind" value="${t.remind || ''}" aria-label="提醒时间"></label></div>
    <div class="row"><button class="pill ${t.imp ? 'on' : ''}" data-p-imp aria-pressed="${t.imp}">重要</button><button class="pill ${t.urg ? 'on' : ''}" data-ed-urg data-p-urg aria-pressed="${t.urg}">紧急</button>
      <button class="pill ${t.done ? 'on' : ''}" data-p-done aria-pressed="${t.done}">${t.done ? '已完成' : '标记完成'}</button></div>
    <div class="row"><span class="ed-lab">重复</span><span class="seg2">${[['', '不重复'], ...Object.entries(REPEAT)].map(([k, n]) => `<button data-p-repeat="${k}" class="${(t.repeat || '') === k ? 'on' : ''}">${n}</button>`).join('')}</span></div>
    ${t.repeat === 'weekdays' ? `<div class="row"><span class="ed-lab"></span><span class="wdays">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button data-p-wd="${d}" class="${(t.repeatDays || []).includes(d) ? 'on' : ''}">${WD[d]}</button>`).join('')}</span></div>` : ''}
    ${t.subs.length ? `<div class="subinfo">子任务 ${t.subs.filter(s => s.done).length}/${t.subs.length}（在边栏里编辑）</div>` : ''}
    <div class="foot2"><button class="ed-del" data-p-del>${I.trash}删除</button><button class="ed-ok" data-p-ok>好</button></div>`;
  if (keep) { const el = p.querySelector(`[data-p="${keep}"]`); if (el) el.focus(); }
}
function openPop(id, r) {
  popTask = id; quickDay = null; render();
  const p = $('pop'), pw = 280, ph = p.offsetHeight;
  let x = r.right + 8; if (x + pw > innerWidth - 8) x = r.left - pw - 8; if (x < 8) x = Math.min(innerWidth - pw - 8, Math.max(8, r.left));
  let y = Math.min(r.top - 10, innerHeight - ph - 8); y = Math.max(8, y);
  p.style.left = x + 'px'; p.style.top = y + 'px';
  const ti = p.querySelector('[data-p=title]'); ti.focus(); ti.select();
}
function closePop() {
  const t = S.tasks.find(x => x.id === popTask);
  if (t && !t.title.trim()) t.title = '（未命名）';
  popTask = null; save(); render();
}

/* ───── 撤销提示 ───── */
let undoFn = null, toastTimer = null;
function toast(msg, fn) {
  undoFn = fn;
  const el = $('toast');
  el.innerHTML = `<span>${esc(msg)}</span>${fn ? '<button data-undo>撤销</button>' : ''}`;
  el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove('show'); undoFn = null; }, 6000);
}

/* ───── 点击 ───── */
document.addEventListener('click', e => {
  const b = e.target.closest('button,[data-ev]');
  const evRect = b && b.dataset.ev ? b.getBoundingClientRect() : null;   // 先记下位置，下面重画后元素就换了
  // 点弹窗和筛选菜单以外的地方：收起它们
  if (popTask !== null && !e.target.closest('#pop') && !e.target.closest('[data-ev]')) closePop();
  if (!e.target.closest('.fwrap')) $('fmenu').hidden = true;
  if (quickDay && !e.target.closest('[data-qinput],[data-qadd]')) { quickDay = null; render(); }
  if (!b) return;
  const d = b.dataset, c = C();
  if (d.ck) { const t = S.tasks.find(x => x.id === +d.ck); const n = setDone(t, !t.done); save(); render(); if (n) toast(`下一次已排到 ${+n.due.slice(5, 7)}月${+n.due.slice(8)}日`); return; }
  if (d.ev) { if (popTask === +d.ev) return closePop(); return openPop(+d.ev, evRect); }
  if (d.nav) {
    const n = +d.nav;
    anchor = c.view === 'week' ? addDays(anchor, 7 * n) : new Date(anchor.getFullYear(), anchor.getMonth() + n, 1);
    return render();
  }
  if ('today' in d) { anchor = new Date(); anchor.setHours(0, 0, 0, 0); return render(); }
  if (d.view) { c.view = d.view; save(); return render(); }
  if (d.week) { anchor = parse(d.week); c.view = 'week'; save(); return render(); }
  if (d.drawer) { drawer = drawer === d.drawer ? null : d.drawer; return render(); }
  if ('filter' in d) { $('fmenu').hidden = !$('fmenu').hidden; return; }
  if (d.qadd) { quickDay = d.qadd; popTask = null; return render(); }
  if ('undo' in d) { if (undoFn) undoFn(); $('toast').classList.remove('show'); undoFn = null; return; }
  const t = S.tasks.find(x => x.id === popTask); if (!t) return;
  if ('pImp' in d) t.imp = !t.imp;
  else if ('pUrg' in d) t.urg = !t.urg;
  else if ('pDone' in d) setDone(t, !t.done);
  else if (d.pRepeat !== undefined) {
    t.repeat = d.pRepeat || null; if (t.repeat && !t.due) t.due = todayIso();
    if (t.repeat === 'weekdays' && !(t.repeatDays && t.repeatDays.length)) t.repeatDays = [parse(t.due).getDay()];
    if (t.repeat !== 'weekdays') delete t.repeatDays;
  }
  else if (d.pWd !== undefined) { const n = +d.pWd, set = new Set(t.repeatDays || []); if (set.has(n)) { if (set.size > 1) set.delete(n); } else set.add(n); t.repeatDays = [...set]; }
  else if ('pOk' in d) return closePop();
  else if ('pDel' in d) {
    const before = S.tasks.slice();
    S.tasks = S.tasks.filter(x => x !== t); popTask = null; save(); render();
    return toast(`已删除「${t.title}」`, () => { S.tasks = before; save(); render(); });
  }
  else return;
  save(); render();
});

document.addEventListener('change', e => {
  const d = e.target.dataset;
  if (d.f) { C()[d.f] = e.target.checked; save(); return render(); }
  const t = S.tasks.find(x => x.id === popTask); if (!t) return;
  const v = e.target.value || null;
  if (d.p === 'due') { t.due = v; if (v && t.start && t.start > v) t.start = v; t.notified = null; if (v) anchor = parse(v); }
  else if (d.p === 'start') { t.start = v; if (v && (!t.due || t.due < v)) t.due = v; t.notified = null; }
  else if (d.p === 'dueTime') { t.dueTime = v; if (v && !t.due) t.due = todayIso(); }
  else if (d.p === 'startTime') { t.startTime = v; if (v && !t.start) t.start = t.due || todayIso(); }
  else if (d.p === 'remind') { t.remind = e.target.value || null; if (t.remind && !t.due) t.due = todayIso(); t.notified = null; }
  else return;
  save(); render();
});
document.addEventListener('input', e => {
  if (e.target.dataset.p === 'title') { const t = S.tasks.find(x => x.id === popTask); if (t) { t.title = e.target.value; save(); } }
});
document.addEventListener('keydown', e => {
  const d = e.target.dataset || {};
  if (e.key === 'Enter' && !e.isComposing) {
    if (d.qinput) {
      const v = e.target.value.trim();
      if (v) { S.tasks.push({ id: uid(), title: v, due: d.qinput, created: todayIso(), imp: false, urg: false, done: false, subs: [] }); save(); }
      quickDay = v ? d.qinput : null; render();   // 连续添加：回车后输入框还在
      return;
    }
    if (d.p === 'title') return closePop();
  }
  if (e.key === 'Escape') {
    if (popTask !== null) return closePop();
    if (quickDay) { quickDay = null; return render(); }
    if (!$('fmenu').hidden) { $('fmenu').hidden = true; return; }
    if (drawer) { drawer = null; return render(); }
  }
  if (e.target.matches('input')) return;
  if (e.key === 'ArrowLeft') document.querySelector('[data-nav="-1"]').click();
  if (e.key === 'ArrowRight') document.querySelector('[data-nav="1"]').click();
  if (e.key === 't' || e.key === 'T') document.querySelector('[data-today]').click();
});

/* ───── 拖动改日期 ───── */
document.addEventListener('dragstart', e => {
  const ev = e.target.closest && e.target.closest('[data-ev]'); if (!ev) return;
  dragId = +ev.dataset.ev; dragFrom = ev.dataset.from || null; ev.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragId));
});
document.addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.dragging,.drop').forEach(x => x.classList.remove('dragging', 'drop')); });
document.addEventListener('dragover', e => {
  const day = e.target.closest && e.target.closest('[data-day]'); if (!day || dragId === null) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.drop').forEach(x => x !== day && x.classList.remove('drop'));
  day.classList.add('drop');
});
document.addEventListener('drop', e => {
  const day = e.target.closest && e.target.closest('[data-day]'); if (!day || dragId === null) return;
  e.preventDefault();
  const t = S.tasks.find(x => x.id === dragId); if (!t) return;
  const iso = day.dataset.day, old = { due: t.due, start: t.start }, sp = spanOf(t);
  if (!sp) t.due = iso;                                                     // 待安排 → 放到这一天
  else {
    // 逾期的从「今天」那格拖走，按截止日算；其他按拖出来的那天算
    const fromDay = dragFrom && coversDay(t, dragFrom) ? dragFrom : sp.to, n = dayDiff(fromDay, iso);
    if (!n) return;
    if (t.due) t.due = shiftIso(t.due, n);
    if (t.start) t.start = shiftIso(t.start, n);
  }
  t.notified = null; save(); render();
  const sp2 = spanOf(t);
  toast(`「${t.title.slice(0, 14)}」改到 ${sp2.from !== sp2.to ? `${+sp2.from.slice(5, 7)}/${+sp2.from.slice(8)}–` : ''}${+sp2.to.slice(5, 7)}月${+sp2.to.slice(8)}日`, () => { t.due = old.due; t.start = old.start; save(); render(); });
});

if (TAURI) document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (C().view === 'month') render(); }, 120); });
// 过了零点刷新“今天”
let dayNow = todayIso(); setInterval(() => { if (todayIso() !== dayNow) { dayNow = todayIso(); render(); } }, 60000);

// 别的窗口改了数据：弹窗里正在打字就先不重画
let pending = false;
function onExternal() {
  const a = document.activeElement;
  if (a && a.matches('input') && (a.closest('#pop') || a.dataset.qinput)) { pending = true; return; }
  render();
}
document.addEventListener('focusout', () => setTimeout(() => { if (pending && !(document.activeElement && document.activeElement.matches('input'))) { pending = false; render(); } }, 0));

(async function start() {
  await openStore(onExternal);
  render();
})();
