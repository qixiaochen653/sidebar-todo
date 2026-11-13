// 边栏待办 · 前端逻辑
// 这一份既能在 Tauri 窗口里跑，也能直接双击 index.html 在浏览器里看效果（那时不会动窗口）。

// 数据、保存、多窗口同步、开窗口的函数都在 shared.js 里（index.html 里先加载它）

/* ───────────── 小工具 ───────────── */
const $ = id => document.getElementById(id);
const sv = (p, w = 18, sw = 1.8) => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  swap: sv('<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>'),
  r: sv('<path d="M9 6l6 6-6 6"/>'), l: sv('<path d="M15 6l-6 6 6 6"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 18, 2.2),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 13, 3),
  mini: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 10, 3.4),
  clock: sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 2h6"/>', 14, 2),
  today: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 16),
  quad: sv('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>', 16),
  edit: sv('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/>', 14, 2),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>', 15, 1.9),
  bell: sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', 11, 2.2),
  grow: sv('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>', 17),
  shrink: sv('<path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7"/>', 17),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>', 13, 2.2),
  note: sv('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>', 16),
  cal: sv('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', 17),
  folder: sv('<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>', 15),
  folderPlus: sv('<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>', 15),
  doc: sv('<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5z"/><path d="M9 12h6M9 15.5h4"/>', 14),
  search: sv('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', 14, 2),
  back: sv('<path d="M15 6l-6 6 6 6"/>', 15, 2),
  repeat: sv('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>', 11, 2.2),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 13, 1.8),
  pop: sv('<rect x="4" y="8" width="12" height="12" rx="2"/><path d="M10 4h10v10M20 4l-8 8"/>', 16)
};
const due = iso => { const d = daysLeft(iso); return d === null ? null : d < 0 ? ['d0', '逾期 ' + (-d) + ' 天'] : d === 0 ? ['d1', '今天截止'] : d === 1 ? ['d2', '明天'] : d <= 3 ? ['d2', d + ' 天后'] : ['d3', d + ' 天后']; };
const dueRank = t => { const d = daysLeft(t.due); return d === null ? 1e6 : d; };
const fmt = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const week = d => '周' + '日一二三四五六'[d.getDay()];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const frame = () => new Promise(r => requestAnimationFrame(() => r()));

/* ───────────── 窗口（只有在 Tauri 里才生效） ───────────── */
const win = TAURI ? TAURI.window.getCurrentWindow() : null;
if (TAURI) document.body.classList.add('in-tauri');

// 这些数字和 styles.css 里的 --strip-top / --pad / --panel-w / --tab-w 保持一致（单位：逻辑像素）
const PAD = 12, PANEL_W = 352, WIDE_W = 600, TAB_W = 46;
let screenH = 900;                          // 当前屏幕工作区高度（逻辑像素），拖页签时用来限制范围
const stripTop = () => Math.max(PAD, Math.min(S.stripTop ?? 132, screenH - $('strip').offsetHeight - PAD));
// 面板宽度：普通 352，放大后 600（屏幕太窄时自动缩小）
let screenW = 1600;
const panelW = () => S.wide ? Math.max(PANEL_W, Math.min(WIDE_W, screenW - TAB_W - 80)) : PANEL_W;
const fullW = () => panelW() + TAB_W + PAD + 8;   // 展开：面板 + 页签 + 留给阴影的空间
const COMPACT_W = TAB_W + PAD + 4;          // 收起：只比页签宽一点（留给阴影和悬停动画）
const ANIM = 400;                           // 和 CSS 的 .38s 动画对齐

// ── 显示器 ──
// S.monitor 记住贴在哪块屏幕（按显示器名字）；屏幕被拔掉时退回主屏。
async function getMonitor() {
  const W = TAURI.window;
  const list = (await W.availableMonitors()) || [];
  let m = list.find(x => x.name === S.monitor);
  if (!m) { m = (await W.currentMonitor()) || (await W.primaryMonitor()) || list[0]; if (m) { S.monitor = m.name; save(); } }
  return { m, list };
}
async function getArea() {
  const { m } = await getMonitor();
  const wa = m.workArea || { position: m.position, size: m.size }; // 工作区 = 去掉任务栏后的区域
  screenH = wa.size.height / m.scaleFactor; screenW = wa.size.width / m.scaleFactor;
  return { x: wa.position.x, y: wa.position.y, w: wa.size.width, h: wa.size.height, s: m.scaleFactor };
}

// mode: 'full' 展开时的大窗口；'compact' 收起时只包住页签的小窗口。全部用物理像素计算，125%/150% 缩放也准。
let mode = null, lastRect = '', winGeo = null;
async function computeRect(m) {
  const a = await getArea();
  let w, h, y;
  if (m === 'full') {
    w = Math.round(fullW() * a.s); h = a.h; y = a.y;
  } else {
    const stripH = $('strip').offsetHeight;
    w = Math.round(COMPACT_W * a.s); h = Math.round((stripH + PAD * 2) * a.s); y = a.y + Math.round((stripTop() - PAD) * a.s);
  }
  const x = S.side === 'right' ? a.x + a.w - w : a.x;
  return [x, y, w, h];
}
async function placeWindow(m) {
  if (!win) return;
  mode = m;
  const [x, y, w, h] = await computeRect(m);
  const { PhysicalSize, PhysicalPosition } = TAURI.dpi;
  lastRect = [x, y, w, h].join(); winGeo = { x, y, s: (await getArea()).s };
  // 先挪位置再改大小：贴右边时窗口是“向左长”的，这个顺序跳动最小
  await win.setPosition(new PhysicalPosition(x, y));
  await win.setSize(new PhysicalSize(w, h));
}

// 收起时窗口设成“点了也不激活”，点页签展开不会把你正在打字的窗口焦点抢走；
// 展开后再允许激活，这样点进输入框时才能打字。
async function setFocusable(v) { try { await win.setFocusable(v); } catch (e) {} }

// 分辨率、缩放比例、任务栏位置变了，或者屏幕被拔掉：自动重新贴边
async function keepDocked() {
  if (!win || !mode || busy) return;
  try { if ((await computeRect(mode)).join() !== lastRect) await placeWindow(mode); } catch (e) {}
}

// 多块屏幕时，在几块屏之间轮换
async function nextMonitor() {
  const { m, list } = await getMonitor();
  if (list.length < 2) return;
  const i = list.findIndex(x => x.name === m.name);
  S.monitor = list[(i + 1) % list.length].name; save();
  await placeWindow(mode || (S.open ? 'full' : 'compact'));
}
async function updateMonitorButton() {
  if (!win) return;
  try { const { list } = await getMonitor(); $('screenBtn').hidden = list.length < 2; } catch (e) {}
}

let seq = 0, busy = false; // seq：连续快速点击时只让最后一次生效；busy：动画进行中别自动归位
async function setOpen(open) {
  const my = ++seq;
  busy = true;
  try { await doSetOpen(open, my); } finally { if (my === seq) busy = false; }
}
async function doSetOpen(open, my) {
  const app = $('app');
  if (open) {
    S.open = true; save();
    if (win && app.classList.contains('compact')) {
      app.classList.remove('compact');        // 面板先以“藏在屏幕外”的状态出现
      await placeWindow('full');
      await frame(); await frame();
      if (my !== seq) return;
    } else app.classList.remove('compact');
    render();                                   // 加上 .open，CSS 负责滑进来
    if (win) setFocusable(true);
  } else {
    S.open = false; save();
    render();                                   // 去掉 .open，CSS 负责滑出去
    if (!win) return;
    await sleep(ANIM);
    if (my !== seq || S.open) return;
    app.classList.add('compact');
    await placeWindow('compact');
    setFocusable(false);
  }
}

/* ───────────── 界面 ───────────── */
const FOCUS = 1500; let focusLeft = FOCUS, running = false, popId = null, lastTab = null;
let editing = null;        // 正在编辑的待办 id
let editingCourse = false; // 是否在编辑课程卡片

function render() {
  const app = $('app');
  const R = S.side === 'right';
  const now = new Date();
  const open = S.tasks.filter(t => !t.done).sort((a, b) => (b.imp - a.imp) || (dueRank(a) - dueRank(b)) || (a.id - b.id));
  const fin = S.tasks.filter(t => t.done);
  const pct = S.tasks.length ? fin.length / S.tasks.length : 0;
  const C = 2 * Math.PI * 20;

  app.classList.toggle('right', R);
  app.classList.toggle('left', !R);
  app.classList.toggle('open', S.open);
  app.classList.toggle('wide', !!S.wide);
  app.style.setProperty('--panel-w', panelW() + 'px');
  app.style.setProperty('--strip-top', stripTop() + 'px');

  $('strip').innerHTML = [['today', '今日'], ['quad', '四象限'], ['note', '便签']].map(([id, n]) =>
    `<button class="tab ${S.open && S.tab === id ? 'on' : ''}" data-tab="${id}" aria-label="打开${n}" aria-pressed="${S.open && S.tab === id}">${ICON[id]}<span class="vt">${[...n].map(c => `<i>${c}</i>`).join('')}</span></button>`).join('')
    + `<button class="tab timer" id="stripTimer" data-focus hidden aria-label="专注计时，点击暂停或继续">${ICON.clock}<b></b></button>`;

  $('ring').innerHTML = `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="24" cy="24" r="20" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="transition:stroke-dashoffset .5s ease"/></svg><b>${Math.round(pct * 100)}%</b>`;
  $('ring').setAttribute('aria-label', `已完成 ${fin.length} / ${S.tasks.length}`);
  $('date').textContent = `${now.getMonth() + 1}月${now.getDate()}日`;
  $('clearDone').hidden = !fin.length;
  $('clearDone').textContent = `清除已完成（${fin.length}）`;
  $('subline').textContent = open.length ? `${week(now)} · 还剩 ${open.length} 件` : `${week(now)} · 今天清空了`;
  $('swapBtn').innerHTML = ICON.swap;
  $('wideBtn').innerHTML = S.wide ? ICON.shrink : ICON.grow;
  $('wideBtn').title = S.wide ? '恢复正常宽度' : '放大面板，打字更舒服';
  $('wideBtn').setAttribute('aria-label', $('wideBtn').title);
  $('closeBtn').innerHTML = R ? ICON.r : ICON.l;
  $('sideLabel').textContent = R ? '贴在右侧' : '贴在左侧';
  renderFocus();
  renderCourse();

  const dt = (kind, label, dv, tv) => `<div class="ed-row">
        <span class="ed-lab">${label}</span>
        <label class="ed-date"><input type="date" data-ed-${kind} value="${dv || ''}" aria-label="${label}日期"></label>
        <label class="ed-date ed-tm"><input type="time" data-ed-${kind}-time value="${tv || ''}" aria-label="${label}时间"></label>
        ${dv || tv ? `<button class="ed-clear" data-ed-clear="${kind}" aria-label="清除${label}">${ICON.x}</button>` : ''}
      </div>`;
  const editor = t => `<div class="editor" data-editor="${t.id}">
      <input class="ed-title" data-ed-title value="${esc(t.title)}" placeholder="待办内容" aria-label="待办内容">
      ${dt('start', '开始', t.start, t.startTime)}
      ${dt('due', '截止', t.due, t.dueTime)}
      <div class="ed-row"><span class="ed-lab"></span><span class="ed-quick left">${[['今天', 0], ['明天', 1], ['下周', 7]].map(([n, k]) => `<button data-ed-quick="${k}">截止${n}</button>`).join('')}</span></div>
      <div class="ed-row">
        <span class="ed-lab">重复</span>
        <span class="seg2 ed-rep">${[['', '不重复'], ...Object.entries(REPEAT)].map(([k, n]) => `<button data-ed-repeat="${k}" class="${(t.repeat || '') === k ? 'on' : ''}">${n}</button>`).join('')}</span>
      </div>
      ${t.repeat === 'weekdays' ? `<div class="ed-row"><span class="ed-lab"></span><span class="wdays">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button data-ed-wd="${d}" class="${(t.repeatDays || []).includes(d) ? 'on' : ''}" aria-pressed="${(t.repeatDays || []).includes(d)}">${WD[d]}</button>`).join('')}</span></div>` : ''}
      <div class="ed-row">
        <span class="ed-lab">标记</span>
        <button class="pill ${t.imp ? 'on' : ''}" data-ed-imp aria-pressed="${t.imp}">重要</button>
        <button class="pill ${t.urg ? 'on' : ''}" data-ed-urg aria-pressed="${t.urg}">紧急</button>
        <label class="ed-date ed-time" title="到点弹出系统通知"><span>提醒</span><input type="time" data-ed-remind value="${t.remind || ''}" aria-label="提醒时间"></label>
        ${t.remind ? '<button class="ed-clear" data-ed-noremind aria-label="取消提醒">' + ICON.x + '</button>' : ''}
      </div>
      <div class="ed-subs">
        ${t.subs.map((s, i) => `<div class="ed-sub"><span class="box ${s.done ? 'on' : ''}">${s.done ? ICON.mini : ''}</span><input data-ed-sub="${i}" value="${esc(s.t)}" aria-label="子任务 ${i + 1}"><button class="ed-x" data-ed-subdel="${i}" aria-label="删除子任务">${ICON.x}</button></div>`).join('')}
        <input class="ed-subnew" data-ed-subnew placeholder="＋ 添加子任务，回车确认" aria-label="添加子任务">
      </div>
      <div class="ed-foot"><button class="ed-del" data-ed-del>${ICON.trash}删除</button><button class="ed-ok" data-ed-ok>完成</button></div>
    </div>`;

  const item = t => {
    if (editing === t.id) return editor(t);
    let dd = due(t.due); const sd = t.subs.filter(s => s.done).length;
    // 已经开始、还没到截止日：显示「进行中」
    if (dd && t.start && daysLeft(t.start) <= 0 && daysLeft(t.due) > 0) dd = ['d2', `进行中 · ${daysLeft(t.due) === 1 ? '明天' : daysLeft(t.due) + ' 天后'}截止`];
    const ds = t.start ? daysLeft(t.start) : null;
    const startChip = ds !== null && ds > 0 ? `<span class="chip d3">${ds === 1 ? '明天开始' : ds + ' 天后开始'}${t.startTime ? ' ' + esc(t.startTime) : ''}</span>` : '';
    const timeChip = t.dueTime && (!dd || daysLeft(t.due) <= 1) ? `<span class="rem">${ICON.clock}${esc(t.dueTime)}</span>` : '';
    return `<div class="item">
      <button class="chk" data-toggle="${t.id}" aria-label="完成：${esc(t.title)}"></button>
      <div style="flex:1;min-width:0">
        <div class="title editable" data-edit="${t.id}" title="点一下编辑">${esc(t.title)}<span class="pen">${ICON.edit}</span></div>
        <div class="meta">${startChip}${dd ? `<span class="chip ${dd[0]}">${dd[1]}</span>` : ''}${timeChip}${t.imp ? '<span class="imp">重要</span>' : ''}${t.urg ? '<span class="urg">紧急</span>' : ''}${t.remind ? `<span class="rem">${ICON.bell}${esc(t.remind)}</span>` : ''}${t.repeat ? `<span class="rem">${ICON.repeat}${esc(repeatLabel(t))}</span>` : ''}${t.subs.length ? `<span class="cnt">子任务 ${sd}/${t.subs.length}</span>` : ''}</div>
        ${t.subs.length ? `<div class="subs">${t.subs.map((s, i) => `<button data-sub="${t.id}:${i}"><span class="box ${s.done ? 'on' : ''}">${s.done ? ICON.mini : ''}</span><span class="${s.done ? 'struck' : ''}">${esc(s.t)}</span></button>`).join('')}</div>` : ''}
      </div></div>`;
  };

  let body = '';
  if (settingsOpen) body = renderSettings();
  else if (S.tab === 'today') {
    const scopeAll = S.scope === 'all';
    const isToday = isTodayTask;
    const later = open.filter(t => !isToday(t)).length;
    const list = scopeAll ? open : open.filter(isToday);
    body = `<div class="add"><label class="sr" for="nt">新待办</label><input id="nt" placeholder="想到什么，先记下来…" autocomplete="off"><button data-add aria-label="添加待办">${ICON.plus}</button></div>
      <div class="label scope"><span class="seg2"><button data-scope="today" class="${scopeAll ? '' : 'on'}">今天 ${open.length - later}</button><button data-scope="all" class="${scopeAll ? 'on' : ''}">全部 ${open.length}</button></span><span class="hint">点标题可以编辑</span></div>
      ${list.length ? list.map(item).join('') : `<div class="empty">${!S.tasks.length ? '还没有待办，在上面输入框里记下第一件事吧。' : scopeAll ? '没有待办，轻松一下。' : '今天的事都做完了。'}</div>`}
      ${!scopeAll && later ? `<button class="more" data-scope="all">以后还有 ${later} 件 →</button>` : ''}
      ${fin.length ? `<p class="label" style="margin-top:18px"><span>已完成</span><span>${fin.length}</span></p>` + fin.map(t => `<div class="item" style="align-items:center"><button class="chk done ${popId === t.id ? 'pop' : ''}" data-toggle="${t.id}" aria-label="恢复：${esc(t.title)}">${ICON.check}</button><span class="title struck" style="flex:1">${esc(t.title)}</span><button class="ed-x ghost" data-del="${t.id}" aria-label="删除：${esc(t.title)}">${ICON.trash}</button></div>`).join('') : ''}`;
  } else if (S.tab === 'quad') {
    const qs = [['重要且紧急', 1, 1, '#C2410C', 'rgba(234,88,12,.10)'], ['重要不紧急', 1, 0, 'var(--accent)', 'var(--accent-soft)'], ['紧急不重要', 0, 1, '#A16207', 'rgba(202,138,4,.10)'], ['都不急', 0, 0, '#7A8486', 'transparent']];
    body = `<p class="label" style="margin-bottom:12px"><span>按「重要 / 紧急」自动分好了</span></p><div class="quad">${qs.map(([n, i, u, c, tint]) => {
      const its = open.filter(t => +t.imp === i && +t.urg === u);
      return `<div class="q" style="--c:${c};--tint:${tint}"><h3><span class="dot"></span>${n}</h3>${its.length ? its.map(t => `<p>${esc(t.title)}</p>`).join('') : '<p class="none">暂时没有</p>'}</div>`;
    }).join('')}</div>`;
  } else {
    body = renderNotes();
  }
  // 只有切换页签时才播放淡入动画，勾选待办时不让整个列表闪一下
  const bodyEl = $('body');
  const scroll = bodyEl.scrollTop;
  const viewKey = settingsOpen ? 'settings' : S.tab;
  bodyEl.innerHTML = `<div class="view ${lastTab !== viewKey ? 'enter' : ''}">${body}</div>`;
  if (lastTab === viewKey) bodyEl.scrollTop = scroll; else bodyEl.scrollTop = 0;
  lastTab = viewKey;
  $('setBtn').classList.toggle('on', settingsOpen);
  applyAlpha();
  if (settingsOpen && backups === null) loadBackups();
  popId = null;

  const nt = $('nt');
  if (nt) nt.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) addTask(); });
  if (editing !== null) {
    const ed = document.querySelector('[data-editor]');
    if (ed) ed.scrollIntoView({ block: 'nearest' });
  }
  const note = $('note');
  if (note) note.addEventListener('input', e => { const n = curNote(); if (!n) return; n.body = e.target.value; n.updated = Date.now(); $('nl').textContent = n.body.length + ' 字 · 自动保存'; save(); });
  const nq = $('nq');
  if (nq && nqFocus) { nq.focus(); const k = nq.value.length; nq.setSelectionRange(k, k); nqFocus = false; }
}

/* ───────────── 数据与外观 ───────────── */
let settingsOpen = false, backups = null, restoreAsk = null;
const stamp = () => isoOf(new Date());
async function loadBackups() { backups = []; try { backups = await listBackups(); } catch (e) {} if (settingsOpen) render(); }
function renderSettings() {
  const a = Math.round((S.alpha ?? 0.94) * 100);
  const cnt = st => `${(st.tasks || []).filter(t => !t.done).length} 件待办 · ${(st.notes || []).length} 张便签`;
  const wd = iso => '周' + '日一二三四五六'[parseIso(iso).getDay()];
  return `<div class="n-head"><button class="n-back" data-set-close>${ICON.back}返回</button><b class="set-t">数据与外观</b><span></span></div>
    <p class="label">外观</p>
    <div class="set-card"><div class="set-row"><span>面板不透明度</span><b id="alphaV">${a}%</b></div>
      <input type="range" class="range" min="70" max="100" step="1" value="${a}" data-alpha aria-label="面板不透明度">
      <p class="set-tip">壁纸比较花、字看不清时调高一点；调到 100% 就完全不透明。</p></div>
    <p class="label" style="margin-top:14px"><span>自动备份</span><span>每天一份，留 7 天</span></p>
    <div class="set-card">${backups === null || !backups.length ? `<p class="set-tip">${backups === null ? '读取中…' : '还没有备份，明天打开时会自动备一份。'}</p>` :
      backups.map(b => `<div class="set-row bk"><span><b>${+b.day.slice(5, 7)}月${+b.day.slice(8)}日</b> ${wd(b.day)}${b.day === stamp() ? '（今天）' : ''}<br><small>${cnt(b.state)}</small></span>
        <button class="${restoreAsk === b.day ? 'ed-ok sm' : 'nbtn'}" data-restore="${b.day}">${restoreAsk === b.day ? '确定恢复' : '恢复到这天'}</button></div>`).join('')}</div>
    <p class="label" style="margin-top:14px">导出 / 导入</p>
    <div class="set-card"><div class="set-row" style="gap:8px;justify-content:flex-start"><button class="nbtn" data-export>导出全部数据</button><button class="nbtn" data-import>从文件导入</button></div>
      <p class="set-tip">导出的文件会存到「下载」文件夹，换电脑时拿去导入就行。导入会替换现在的全部数据（6 秒内可以撤销）。</p></div>
    <p class="set-tip" style="margin:12px 2px 0">数据文件位置：%APPDATA%\\com.haovu.sidebartodo\\data.json</p>`;
}
function replaceAll(next, msg) {
  const before = JSON.parse(JSON.stringify(S));
  const keep = { open: S.open, tab: S.tab, side: S.side, wide: S.wide, stripTop: S.stripTop, monitor: S.monitor };   // 窗口位置不跟着变
  S = upgrade(Object.assign(JSON.parse(JSON.stringify(next)), keep));
  editing = null; noteEdit = null; save(); render();
  showUndo(msg, () => { S = upgrade(before); save(); render(); });
}
function restoreBackup(day) {
  if (restoreAsk !== day) { restoreAsk = day; return render(); }   // 点两次才真的恢复
  restoreAsk = null;
  const b = (backups || []).find(x => x.day === day); if (!b) return;
  replaceAll(b.state, `已恢复到 ${+day.slice(5, 7)}月${+day.slice(8)}日 的数据`);
}
function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'sidebar-todo', version: 1, exported: new Date().toISOString(), state: S }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `sidebar-todo-data-${stamp()}.json`;   // 用英文文件名：中文名在部分 WebView 里会变成 download
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toastInfo(`已导出到「下载」文件夹：sidebar-todo-data-${stamp()}.json`);
}
$('importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text()), st = j.state || j;
    if (!Array.isArray(st.tasks)) throw new Error('不是边栏待办的数据文件');
    replaceAll(st, `已导入「${f.name}」`);
  } catch (err) { toastInfo('导入失败：' + (err.message || '文件格式不对')); }
});
function toastInfo(msg) {
  undoFn = null;
  const el = $('toast');
  el.innerHTML = `<span>${esc(msg)}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 4000);
}

/* ───────────── 便签库 ───────────── */
let noteEdit = null;        // 正在编辑的便签 id
let noteGroup = null;       // 正在看的分组 id（null = 首页）
let noteQuery = '', nqFocus = false;
const noteSel = new Set();  // 勾选的便签
const curNote = () => S.notes.find(n => n.id === noteEdit);
const groupName = id => (S.groups.find(g => g.id === id) || {}).name || '';
const firstLines = b => esc((b || '').split('\n').filter(x => x.trim()).slice(0, 2).join('\n'));
function renderNotes() {
  const n = curNote();
  if (n) {
    return `<div class="n-head"><button class="n-back" data-n-back>${ICON.back}便签库</button>
      <span class="n-acts"><label class="n-sel-g" title="放进分组">${ICON.folder}<select data-n-group aria-label="所在分组"><option value="">未分组</option>${S.groups.map(g => `<option value="${g.id}" ${n.group === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
      <button class="icon sm ${n.win ? 'on' : ''}" data-n-win="${n.id}" title="${n.win ? '收回桌面小窗口' : '在桌面上单独显示（可置顶）'}" aria-pressed="${!!n.win}">${ICON.pop}</button>
      <button class="icon sm" data-n-del="${n.id}" title="删除这张便签" aria-label="删除这张便签">${ICON.trash}</button></span></div>
      <input class="n-title" data-n-title value="${esc(n.title)}" placeholder="便签标题" aria-label="便签标题">
      <label class="sr" for="note">便签内容</label><div class="paper"><textarea id="note" placeholder="不用急着整理，先写在这里">${esc(n.body)}</textarea><div class="n" id="nl">${n.body.length} 字 · 自动保存</div></div>`;
  }
  if (noteGroup !== null && !S.groups.some(g => g.id === noteGroup)) noteGroup = null;
  const q = noteQuery.trim().toLowerCase();
  const hit = x => !q || (x.title + '\n' + x.body + '\n' + groupName(x.group)).toLowerCase().includes(q);
  const notes = S.notes.filter(x => (q ? true : noteGroup === null ? x.group == null : x.group === noteGroup) && hit(x))
    .sort((a, b) => (b.updated || 0) - (a.updated || 0));
  [...noteSel].forEach(id => { if (!S.notes.some(x => x.id === id)) noteSel.delete(id); });
  const allOn = notes.length && notes.every(x => noteSel.has(x.id));
  const card = x => `<div class="ncard ${noteSel.has(x.id) ? 'picked' : ''}" data-n-open="${x.id}" tabindex="0" role="button" aria-label="打开便签 ${esc(x.title)}">
      <div class="nc-top"><button class="box ${noteSel.has(x.id) ? 'on' : ''}" data-n-pick="${x.id}" aria-label="选择">${noteSel.has(x.id) ? ICON.mini : ''}</button>
      ${q && x.group != null ? `<span class="nc-g">${esc(groupName(x.group))}</span>` : ''}
      <button class="sw ${x.win ? 'on' : ''}" data-n-win="${x.id}" title="${x.win ? '收回桌面小窗口' : '在桌面上单独显示'}" aria-pressed="${!!x.win}"><i></i></button></div>
      <div class="nc-title">${ICON.doc}<span>${esc(x.title || '（无标题）')}</span></div>
      <div class="nc-prev">${firstLines(x.body) || '<span class="nc-empty">空白便签</span>'}</div></div>`;
  const groupCard = g => { const c = S.notes.filter(x => x.group === g.id).length;
    return `<div class="ncard g" data-n-opengroup="${g.id}" tabindex="0" role="button" aria-label="打开分组 ${esc(g.name)}"><div class="nc-top"><span class="nc-c">${c}</span></div><div class="nc-title">${ICON.folder}<span>${esc(g.name)}</span></div></div>`; };
  let h = `<div class="n-tools"><button class="nbtn" data-n-newgroup>${ICON.folderPlus}新建分组</button><button class="nbtn" data-n-new>${ICON.plus}新建便签</button><span class="n-count">${S.notes.length} 张便签</span></div>
    <div class="n-search">${ICON.search}<input id="nq" data-n-q value="${esc(noteQuery)}" placeholder="搜索分组、便签名称或内容" autocomplete="off" aria-label="搜索便签">${noteQuery ? `<button class="ed-clear" data-n-qclear aria-label="清空搜索">${ICON.x}</button>` : ''}</div>`;
  if (noteGroup !== null && !q) h += `<div class="n-crumb"><button class="n-back" data-n-up>${ICON.back}</button>${ICON.folder}<input data-n-gname value="${esc(groupName(noteGroup))}" aria-label="分组名称（可直接修改）" title="点这里改分组名"><button class="n-link danger" data-n-delgroup>删除分组</button></div>`;
  h += `<div class="n-selbar"><button class="n-all" data-n-all ${notes.length ? '' : 'disabled'}><span class="box ${allOn ? 'on' : ''}">${allOn ? ICON.mini : ''}</span>全选</button>
    ${noteSel.size ? `<span class="n-selacts">已选 ${noteSel.size}<label class="n-sel-g">${ICON.folder}<select data-n-move aria-label="移到分组"><option value="">移到…</option><option value="none">未分组</option>${S.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label><button class="n-link danger" data-n-delsel>删除</button></span>` : ''}</div>`;
  if (noteGroup === null && !q && S.groups.length) h += `<p class="label">分组</p><div class="ngrid">${S.groups.map(groupCard).join('')}</div>`;
  h += `<p class="label" style="margin-top:14px"><span>${q ? '搜索结果' : noteGroup === null ? (S.groups.length ? '未分组便签' : '全部便签') : '这个分组里的便签'}</span><span>${notes.length}</span></p>`;
  h += notes.length ? `<div class="ngrid">${notes.map(card).join('')}</div>` : `<div class="empty">${q ? '没找到相关便签。' : '这里还没有便签，点上面「新建便签」。'}</div>`;
  return h;
}
function newNote() {
  const n = { id: uid(), title: '', body: '', group: noteQuery ? null : noteGroup, win: false, top: true, updated: Date.now() };
  S.notes.push(n); noteEdit = n.id; save(); render();
  const t = document.querySelector('[data-n-title]'); if (t) t.focus();
}
function newGroup() {
  let k = 1; while (S.groups.some(g => g.name === '新分组' + (k > 1 ? ' ' + k : ''))) k++;
  const g = { id: uid(), name: '新分组' + (k > 1 ? ' ' + k : '') };
  S.groups.push(g); noteGroup = g.id; noteQuery = ''; noteSel.clear(); save(); render();
  const i = document.querySelector('[data-n-gname]'); if (i) { i.focus(); i.select(); }
}
function removeNotes(list, msg) {
  if (!list.length) return;
  const before = S.notes.slice();
  list.forEach(n => { if (n.win) closeNoteWindow(n.id); noteSel.delete(n.id); });
  S.notes = S.notes.filter(n => !list.includes(n));
  if (list.some(n => n.id === noteEdit)) noteEdit = null;
  save(); render();
  showUndo(msg, () => { S.notes = before; save(); render(); list.forEach(n => { if (n.win) openNoteWindow(n); }); });
}
function toggleNoteWin(n) {
  n.win = !n.win; save(); render();
  if (n.win) openNoteWindow(n); else closeNoteWindow(n.id);
}
function closeNoteEditor() {
  const n = curNote();
  if (n && !n.title.trim() && !n.body.trim()) { S.notes = S.notes.filter(x => x !== n); }   // 什么都没写的空便签直接丢掉
  else if (n && !n.title.trim()) n.title = n.body.trim().split('\n')[0].slice(0, 16) || '（无标题）';
  noteEdit = null; save(); render();
}

// 删除不再弹确认框，而是在底部出一条“撤销”提示，6 秒内可以反悔
let undoFn = null, toastTimer = null;
function removeTasks(list, msg) {
  if (!list.length) return;
  const before = S.tasks.slice();
  S.tasks = S.tasks.filter(t => !list.includes(t));
  editing = null; save(); render();
  showUndo(msg, () => { S.tasks = before; save(); render(); });
}
function showUndo(msg, fn) {
  undoFn = fn;
  const el = $('toast');
  el.innerHTML = `<span>${esc(msg.length > 22 ? msg.slice(0, 21) + '…」' : msg)}</span><button data-undo>撤销</button>`;
  el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 6000);
}
function hideToast() { $('toast').classList.remove('show'); undoFn = null; }

function renderFocus() {
  // 专注计时进行中时，页签下面也显示剩余时间，收起面板也看得到
  const st = $('stripTimer');
  if (st) { st.hidden = !(running || focusLeft < FOCUS); st.querySelector('b').textContent = fmt(focusLeft); st.classList.toggle('paused', !running); }
  const b = $('focusBtn');
  b.classList.toggle('run', running);
  b.setAttribute('aria-label', running ? '暂停专注计时' : '开始 25 分钟专注');
  b.innerHTML = `${ICON.clock}<span id="ft">${(running || focusLeft < FOCUS ? '' : '专注 ') + fmt(focusLeft)}</span>`;
  $('fb').style.width = (1 - focusLeft / FOCUS) * 100 + '%';
}

function renderCourse() {
  const c = S.course, box = $('course');
  if (editingCourse) {
    box.innerHTML = `<div class="k">下节课</div>
      <div class="course-ed">
        <input data-c="time" value="${esc(c.time)}" placeholder="14:30" aria-label="上课时间" style="width:58px">
        <input data-c="name" value="${esc(c.name)}" placeholder="课程名" aria-label="课程名" style="flex:1;min-width:0">
      </div>
      <div class="course-ed"><input data-c="place" value="${esc(c.place)}" placeholder="教室" aria-label="教室" style="flex:1;min-width:0"><button class="ed-ok sm" data-course-ok>好</button></div>`;
  } else {
    box.innerHTML = c.name || c.time ? `<button class="course-btn" data-course-edit title="点一下修改">
      <div class="k">下节课 ${esc(c.time)}<span class="pen">${ICON.edit}</span></div><div class="v">${esc(c.name)}${c.place ? '　' + esc(c.place) : ''}</div></button>`
      : `<button class="course-btn" data-course-edit title="点一下填写"><div class="k">下节课<span class="pen">${ICON.edit}</span></div><div class="v muted">点这里填写</div></button>`;
  }
}

function addTask() {
  const nt = $('nt'); const v = nt.value.trim(); if (!v) return;
  S.tasks.push({ id: uid(), title: v, due: isoIn(0), created: isoIn(0), imp: false, urg: false, done: false, subs: [] });   // 随手记的默认就是今天
  save(); render(); $('nt').focus();
}

/* ───────────── 交互 ───────────── */
const curTask = () => S.tasks.find(x => x.id === editing);
function focusEditor(sel = '[data-ed-title]') { const el = document.querySelector(sel); if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n); } }
function closeEditor() {
  const t = curTask();
  if (t) fixSpan(t, 'due');
  if (t && !t.title.trim()) t.title = '（未命名）';
  editing = null; save(); render();
}

document.addEventListener('click', async e => {
  if (suppressClick) { suppressClick = false; return; }   // 刚拖完页签，这次松手不算点击
  if (noteClick(e)) return;
  const ed = e.target.closest('[data-edit]');
  if (ed) { editing = +ed.dataset.edit; render(); return focusEditor(); }
  // 点编辑框以外的地方，自动收起编辑框
  if (editing !== null && !e.target.closest('[data-editor]') && !e.target.closest('[data-tab]')) closeEditor();
  if (editingCourse && !e.target.closest('#course')) { editingCourse = false; save(); renderCourse(); }
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  const t = curTask();
  if ('edImp' in d) { t.imp = !t.imp; save(); render(); return; }
  if (d.edRepeat !== undefined) {
    t.repeat = d.edRepeat || null; if (t.repeat && !t.due) t.due = isoIn(0);
    if (t.repeat === 'weekdays' && !(t.repeatDays && t.repeatDays.length)) t.repeatDays = [parseIso(t.due).getDay()];
    if (t.repeat !== 'weekdays') delete t.repeatDays;
    save(); render(); return;
  }
  if (d.edWd !== undefined) {
    const n = +d.edWd, set = new Set(t.repeatDays || []);
    if (set.has(n)) { if (set.size > 1) set.delete(n); } else set.add(n);   // 至少留一天
    t.repeatDays = [...set]; save(); render(); return;
  }
  if (d.edClear) {
    if (d.edClear === 'start') { t.start = null; t.startTime = null; }
    else { t.due = null; t.dueTime = null; t.remind = null; t.notified = null; }
    save(); render(); return;
  }
  if ('edUrg' in d) { t.urg = !t.urg; save(); render(); return; }
  if ('edNodue' in d) { t.due = null; t.remind = null; t.notified = null; save(); render(); return; }
  if ('edNoremind' in d) { t.remind = null; t.notified = null; save(); render(); return; }
  if (d.edQuick !== undefined) { t.due = isoIn(+d.edQuick); if (t.start && t.start > t.due) t.start = t.due; t.notified = null; save(); render(); return; }
  if (d.edSubdel !== undefined) { t.subs.splice(+d.edSubdel, 1); save(); render(); return focusEditor('[data-ed-subnew]'); }
  if ('edDel' in d) return removeTasks([t], `已删除「${t.title}」`);
  if ('edOk' in d) return closeEditor();
  if (d.del) { const x = S.tasks.find(x => x.id == d.del); return removeTasks([x], `已删除「${x.title}」`); }
  if ('clearDone' in d) { const done = S.tasks.filter(x => x.done); return removeTasks(done, `清除了 ${done.length} 件已完成`); }
  if ('undo' in d) { if (undoFn) undoFn(); return hideToast(); }
  if ('courseEdit' in d) { editingCourse = true; renderCourse(); const i = document.querySelector('[data-c=name]'); i.focus(); i.select(); return; }
  if ('courseOk' in d) { editingCourse = false; save(); renderCourse(); return; }
  if (d.tab) {
    if (settingsOpen) { settingsOpen = false; if (S.open && S.tab === d.tab) { save(); render(); return; } }
    if (S.open && S.tab === d.tab) return setOpen(false);
    S.tab = d.tab;
    if (!S.open) return setOpen(true);
  }
  else if ('close' in d) return setOpen(false);
  else if ('swap' in d) return swapSide();
  else if ('add' in d) return addTask();
  else if (d.toggle) { const t = S.tasks.find(x => x.id == d.toggle); const n = setDone(t, !t.done); if (t.done) popId = t.id; if (n) toastInfo(`下一次「${t.title.slice(0, 12)}」已排到 ${+n.due.slice(5, 7)}月${+n.due.slice(8)}日`); }
  else if (d.sub) { const [id, i] = d.sub.split(':'); const s = S.tasks.find(x => x.id == id).subs[i]; s.done = !s.done; }
  else if ('focus' in d) { running = !running; return renderFocus(); }
  else if ('quit' in d) return quitAll();
  else if ('screen' in d) return nextMonitor();
  else if ('cal' in d) return openCalendar();
  else if ('settings' in d) { settingsOpen = !settingsOpen; backups = null; restoreAsk = null; }
  else if ('setClose' in d) { settingsOpen = false; }
  else if ('export' in d) return exportData();
  else if ('import' in d) return $('importFile').click();
  else if (d.restore) return restoreBackup(d.restore);
  else if ('wide' in d) return toggleWide();
  else if (d.scope) { S.scope = d.scope; }
  else return;
  save(); render();
});

// 便签库里的点击
function noteClick(e) {
  const el = e.target.closest('[data-n-pick],[data-n-win],[data-n-open],[data-n-opengroup],[data-n-back],[data-n-up],[data-n-new],[data-n-newgroup],[data-n-del],[data-n-delgroup],[data-n-delsel],[data-n-all],[data-n-qclear]');
  if (!el) return false;
  const d = el.dataset, byId = id => S.notes.find(n => n.id === +id);
  if (d.nPick) { const id = +d.nPick; noteSel.has(id) ? noteSel.delete(id) : noteSel.add(id); render(); }
  else if (d.nWin) toggleNoteWin(byId(d.nWin));
  else if (d.nOpen) { noteEdit = +d.nOpen; render(); }
  else if (d.nOpengroup) { noteGroup = +d.nOpengroup; noteSel.clear(); render(); }
  else if ('nBack' in d) closeNoteEditor();
  else if ('nUp' in d) { noteGroup = null; noteSel.clear(); render(); }
  else if ('nNew' in d) newNote();
  else if ('nNewgroup' in d) newGroup();
  else if (d.nDel) { const n = byId(d.nDel); removeNotes([n], `已删除「${n.title || '无标题'}」`); }
  else if ('nDelsel' in d) { const list = S.notes.filter(n => noteSel.has(n.id)); removeNotes(list, `删除了 ${list.length} 张便签`); }
  else if ('nDelgroup' in d) {
    // 删分组不删便签：里面的便签回到「未分组」
    const g = S.groups.find(x => x.id === noteGroup); if (!g) return true;
    const moved = S.notes.filter(n => n.group === g.id);
    moved.forEach(n => n.group = null);
    S.groups = S.groups.filter(x => x !== g); noteGroup = null; noteSel.clear(); save(); render();
    showUndo(`已删除分组「${g.name}」，便签移到了未分组`, () => { S.groups.push(g); moved.forEach(n => { const x = S.notes.find(y => y.id === n.id); if (x) x.group = g.id; }); save(); render(); });
  }
  else if ('nAll' in d) {
    const vis = [...document.querySelectorAll('[data-n-pick]')].map(b => +b.dataset.nPick);
    const all = vis.length && vis.every(id => noteSel.has(id));
    vis.forEach(id => all ? noteSel.delete(id) : noteSel.add(id)); render();
  }
  else if ('nQclear' in d) { noteQuery = ''; nqFocus = true; render(); }
  return true;
}

// 编辑框里的输入：边打字边保存
document.addEventListener('input', e => {
  const d = e.target.dataset, t = curTask();
  if ('edTitle' in d && t) { t.title = e.target.value; save(); }
  else if (d.edSub !== undefined && t) { t.subs[+d.edSub].t = e.target.value; save(); }
  else if (d.c) { S.course[d.c] = e.target.value; save(); }
  else if ('alpha' in d) { S.alpha = +e.target.value / 100; applyAlpha(); $('alphaV').textContent = e.target.value + '%'; save(); }
  else if ('nTitle' in d) { const n = curNote(); if (n) { n.title = e.target.value; n.updated = Date.now(); save(); } }
  else if ('nGname' in d) { const g = S.groups.find(x => x.id === noteGroup); if (g) { g.name = e.target.value; save(); } }
  else if ('nQ' in d && !e.isComposing) { noteQuery = e.target.value; nqFocus = true; render(); }
});
// 输入法打完一个词再搜索，免得拼音打到一半列表就跳
document.addEventListener('compositionend', e => { if ('nQ' in e.target.dataset) { noteQuery = e.target.value; nqFocus = true; render(); } });
document.addEventListener('change', e => {
  const t = curTask();
  const ed = e.target.dataset;
  if (t && ('edDue' in ed || 'edStart' in ed || 'edDueTime' in ed || 'edStartTime' in ed)) {
    const v = e.target.value || null;
    if ('edDue' in ed) t.due = v;
    if ('edStart' in ed) t.start = v;
    if ('edDueTime' in ed) t.dueTime = v;
    if ('edStartTime' in ed) t.startTime = v;
    t.notified = null; save(); renderAfterEdit(e.target);
  }
  const nd = e.target.dataset;
  if ('nGroup' in nd) { const n = curNote(); if (n) { n.group = nd && e.target.value ? +e.target.value : null; save(); } }
  if ('nMove' in nd && e.target.value) {
    const g = e.target.value === 'none' ? null : +e.target.value;
    S.notes.forEach(n => { if (noteSel.has(n.id)) n.group = g; }); noteSel.clear(); save(); render();
  }
  if ('nGname' in nd) { const g = S.groups.find(x => x.id === noteGroup); if (g && !g.name.trim()) { g.name = '未命名分组'; save(); render(); } }
  if ('edRemind' in e.target.dataset && t) { t.remind = e.target.value || null; t.notified = null; save(); renderAfterEdit(e.target); }
});

// 日期 / 时间框：一填出合法的值浏览器就会触发 change，这时如果重画编辑框，光标会丢、后面输入的数字就没了。
// 所以编辑框开着时不重画，只把其他几个框的值同步一下（比如开始日期晚于截止日期时自动调整的那个）；
// 关掉编辑框时会整体重画一次。
// 离开开始 / 截止框时再整理日期（见 shared.js 的 fixSpan）
document.addEventListener('focusout', e => {
  const d = e.target.dataset || {}, t = curTask();
  if (!t || !e.target.closest || !e.target.closest('[data-editor]')) return;
  if (!('edStart' in d || 'edDue' in d || 'edStartTime' in d || 'edDueTime' in d || 'edRemind' in d)) return;
  const before = J(t); fixSpan(t, 'edStart' in d || 'edStartTime' in d ? 'start' : 'due');
  if (J(t) !== before) { save(); renderAfterEdit(e.target); }
});
function renderAfterEdit(el) {
  const box = el.closest('[data-editor]'), t = curTask();
  if (!box || !t) return render();
  const set = (sel, v) => { const i = box.querySelector(sel); if (i && i !== el && i.value !== (v || '')) i.value = v || ''; };
  set('[data-ed-start]', t.start); set('[data-ed-start-time]', t.startTime);
  set('[data-ed-due]', t.due); set('[data-ed-due-time]', t.dueTime); set('[data-ed-remind]', t.remind);
}

document.addEventListener('keydown', e => {
  const d = e.target.dataset || {};
  if (e.key === 'Enter' && !e.isComposing) {
    if ('edSubnew' in d) { const v = e.target.value.trim(); if (v) { curTask().subs.push({ t: v, done: false }); save(); render(); focusEditor('[data-ed-subnew]'); } return; }
    if ('edTitle' in d || d.edSub !== undefined) return closeEditor();
    if (d.c) { editingCourse = false; save(); return renderCourse(); }
    if ('nGname' in d) return e.target.blur();
    if ('nTitle' in d) return $('note') && $('note').focus();
    if (e.target.matches('[data-n-open],[data-n-opengroup]')) return e.target.click();
  }
  if (e.key === 'Escape') {
    if (editing !== null) return closeEditor();          // Esc 先关编辑框
    if (editingCourse) { editingCourse = false; save(); return renderCourse(); }
    if (settingsOpen) { settingsOpen = false; return render(); }
    if (S.tab === 'note' && S.open && noteEdit !== null) return closeNoteEditor();
    if (S.tab === 'note' && S.open && (noteQuery || noteSel.size)) { noteQuery = ''; noteSel.clear(); return render(); }
    if (S.tab === 'note' && S.open && noteGroup !== null) { noteGroup = null; return render(); }
    if (S.open) setOpen(false);                          // 再按一次收起面板
  }
});
// 窗口里不需要浏览器的右键菜单
if (TAURI) document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });

setInterval(() => {
  if (!running) return;
  focusLeft--;
  if (focusLeft <= 0) {
    focusLeft = FOCUS; running = false; renderFocus(); notify('专注结束', '25 分钟到了，起来活动一下吧。');
    if (mode === 'compact' && !busy) placeWindow('compact');   // 计时条消失了，小窗口跟着变短
    return;
  }
  renderFocus();
  $('fb').style.width = (1 - focusLeft / FOCUS) * 100 + '%';
}, 1000);

// 过了零点自动刷新日期
let today = new Date().getDate();
setInterval(() => { if (new Date().getDate() !== today) { today = new Date().getDate(); render(); backupToday().catch(() => {}); } }, 60000);

if (win) {
  setInterval(keepDocked, 2000);
  setInterval(updateMonitorButton, 5000);
  win.onScaleChanged(() => placeWindow(mode)).catch(() => {});
}

/* ───────────── 透明的地方让鼠标穿过去 ───────────── */
// 展开时窗口比面板大（上下留白、阴影、页签旁边的空位），这些透明区域本来会挡住下面软件的点击。
// 鼠标在面板上时：用网页自己的 mousemove 判断（不耗资源）；一离开面板就让窗口「忽略鼠标」，
// 之后才需要定时问系统鼠标在哪 —— 离窗口远时问得慢（0.3 秒），靠近时问得快（0.08 秒）。
let ignoring = false, pollTimer = null;
async function setIgnore(v) {
  if (v === ignoring) return;
  ignoring = v;
  try { await win.setIgnoreCursorEvents(v); } catch (e) { ignoring = false; }
  if (v) schedulePoll(80); else stopPoll();
}
function overUI(x, y) {
  const els = [$('panel'), ...document.querySelectorAll('.strip .tab:not([hidden])')];
  return els.some(el => { const r = el.getBoundingClientRect(); return r.width && x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2; });
}
const passThroughOn = () => win && mode === 'full' && !busy && !drag && winGeo && S.open;
function stopPoll() { clearTimeout(pollTimer); pollTimer = null; }
function schedulePoll(ms) { stopPoll(); pollTimer = setTimeout(pollCursor, ms); }
async function pollCursor() {
  pollTimer = null;
  if (!passThroughOn()) return setIgnore(false);
  try {
    const c = await TAURI.window.cursorPosition();
    const x = (c.x - winGeo.x) / winGeo.s, y = (c.y - winGeo.y) / winGeo.s;
    if (overUI(x, y)) return setIgnore(false);
    const far = x < -60 || x > innerWidth + 60 || y < -60 || y > innerHeight + 60;
    if (ignoring) schedulePoll(far ? 300 : 80);
  } catch (e) { setIgnore(false); }
}
if (win && TAURI.window.cursorPosition) {
  document.addEventListener('mousemove', e => { if (passThroughOn() && !ignoring && !overUI(e.clientX, e.clientY)) setIgnore(true); }, { passive: true });
  document.addEventListener('mouseleave', () => { if (passThroughOn() && !ignoring) setIgnore(true); });
}

/* ───────────── 放大面板 ───────────── */
async function toggleWide() {
  S.wide = !S.wide; save();
  if (S.wide) { await placeWindow('full'); render(); }               // 先把窗口变宽，再让面板展开
  else { render(); await sleep(320); if (!S.wide && S.open) await placeWindow('full'); }  // 先收面板，再缩窗口
  const ta = $('note') || $('nt'); if (ta && S.wide) ta.focus();
}

/* ───────────── 拖动页签上下移动 ───────────── */
let drag = null, suppressClick = false, placing = false, placePending = false;
async function placeCompactSoon() {
  if (placing) { placePending = true; return; }
  placing = true;
  try { await placeWindow('compact'); } finally { placing = false; if (placePending) { placePending = false; placeCompactSoon(); } }
}
$('strip').addEventListener('pointerdown', e => {
  const t = e.target.closest('.tab'); if (!t || e.button !== 0) return;
  drag = { y0: e.screenY, top0: stripTop(), moved: false };
  t.setPointerCapture(e.pointerId);
});
$('strip').addEventListener('pointermove', e => {
  if (!drag) return;
  const dy = e.screenY - drag.y0;
  if (!drag.moved && Math.abs(dy) < 6) return;      // 动了 6 像素以上才算拖动
  drag.moved = true;
  S.stripTop = Math.round(drag.top0 + dy);
  S.stripTop = stripTop();
  $('app').style.setProperty('--strip-top', S.stripTop + 'px');
  if (mode === 'compact') placeCompactSoon();         // 收起时整个小窗口跟着走
});
const endDrag = () => { if (drag && drag.moved) { suppressClick = true; setTimeout(() => suppressClick = false, 50); save(); } drag = null; };
$('strip').addEventListener('pointerup', endDrag);
$('strip').addEventListener('pointercancel', endDrag);

/* ───────────── 全局快捷键 Alt+Shift+D ───────────── */
const HOTKEY = 'Alt+Shift+D';
async function setupHotkey() {
  const G = TAURI.globalShortcut; if (!G) return;
  try { await G.unregisterAll(); } catch (e) {}
  await G.register(HOTKEY, async ev => {
    if (ev.state && ev.state !== 'Pressed') return;
    if (S.open) return setOpen(false);
    await setOpen(true);
    try { await win.setFocus(); } catch (e) {}       // 用快捷键呼出时，直接可以打字
    const box = $('nt') || $('note'); if (box) box.focus();
  });
}

/* ───────────── 提醒（系统通知） ───────────── */
async function notify(title, body) {
  const N = TAURI && TAURI.notification;
  try {
    if (N) {
      let ok = await N.isPermissionGranted();
      if (!ok) ok = (await N.requestPermission()) === 'granted';
      if (ok) N.sendNotification({ title, body });
    } else if ('Notification' in window) new Notification(title, { body });
  } catch (e) { console.warn('通知失败', e); }
}
// 每 20 秒看一眼：到了提醒时间、还没提醒过、也还没做完的待办，就弹通知（错过超过 12 小时的不再补弹）
function checkReminders() {
  const now = Date.now();
  let changed = false;
  for (const t of S.tasks) {
    if (t.done || !t.due || !t.remind) continue;
    const key = t.due + ' ' + t.remind;
    if (t.notified === key) continue;
    const [y, m, d] = t.due.split('-').map(Number), [hh, mm] = t.remind.split(':').map(Number);
    const at = new Date(y, m - 1, d, hh, mm).getTime();
    if (now >= at) {
      if (now - at < 12 * 3600e3) notify('待办提醒', t.title + (t.subs.length ? `（子任务 ${t.subs.filter(s => s.done).length}/${t.subs.length}）` : ''));
      t.notified = key; changed = true;
    }
  }
  if (changed) save();
}
setInterval(checkReminders, 20000);

/* ───────────── 自动更新（GitHub Releases） ───────────── */
let update = null, updating = false;
async function checkUpdate(manual) {
  const U = TAURI && TAURI.updater; if (!U) return manual && toastInfo('浏览器预览里没法检查更新');
  try {
    const u = await U.check();
    if (u) {
      update = u; renderUpdate(); if (manual && !S.open) setOpen(true);
      // 面板收起时也要看得到：页签上亮小红点；每个新版本弹一次系统通知
      if (!manual && S.updNotified !== u.version) { S.updNotified = u.version; save(); notify('边栏待办有新版本 ' + u.version, '点开边栏面板，在顶部点「更新」就能升级。'); }
    }
    else if (manual) { if (!S.open) await setOpen(true); toastInfo('已经是最新版本 ' + (await TAURI.app.getVersion())); }
  } catch (e) { console.warn('检查更新失败', e); if (manual) { if (!S.open) await setOpen(true); toastInfo('检查更新失败：可能是网络连不上 GitHub'); } }
}
function renderUpdate(msg) {
  const el = $('upd');
  $('app').classList.toggle('has-upd', !!update && !updating);
  if (!update) { el.hidden = true; return; }
  el.hidden = false;
  const notes = (update.body || '').trim().split('\n').filter(l => l.trim() && !/\.exe|安装包/.test(l)).slice(0, 3).map(esc).join('<br>');
  el.innerHTML = msg ? `<span>${msg}</span>` : `<div><b>有新版本 ${esc(update.version)}</b>${notes ? `<small>${notes}</small>` : ''}</div>
    <span class="upd-acts"><button class="n-link" data-upd-later>以后</button><button class="ed-ok sm" data-upd-go>更新</button></span>`;
}
async function installUpdate() {
  if (!update || updating) return;
  updating = true;
  let got = 0, total = 0;
  try {
    await save();                                   // 先把数据写进文件
    await update.downloadAndInstall(ev => {
      if (ev.event === 'Started') total = ev.data.contentLength || 0;
      else if (ev.event === 'Progress') { got += ev.data.chunkLength; renderUpdate(total ? `正在下载… ${Math.round(got / total * 100)}%` : '正在下载…'); }
      else if (ev.event === 'Finished') renderUpdate('下载好了，正在安装，马上重启…');
    });
    await TAURI.process.relaunch();
  } catch (e) { console.warn(e); updating = false; renderUpdate(); toastInfo('更新失败，稍后再试'); }
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-upd-go]')) installUpdate();
  else if (e.target.closest('[data-upd-later]')) { update = null; renderUpdate(); }
});
if (win) { setTimeout(() => checkUpdate(false), 8000); setInterval(() => checkUpdate(false), 6 * 3600e3); }

/* ───────────── 托盘图标 ───────────── */
const autostart = () => TAURI && TAURI.autostart;
async function setupTray() {
  const { TrayIcon } = TAURI.tray, { Menu, MenuItem, CheckMenuItem, PredefinedMenuItem } = TAURI.menu;
  let autoOn = false;
  try { autoOn = await autostart().isEnabled(); } catch (e) {}
  const itemShow = await MenuItem.new({ id: 'show', text: '展开 / 收起面板', action: () => setOpen(!S.open) });
  const itemSide = await MenuItem.new({ id: 'side', text: '换到另一边', action: swapSide });
  const itemCal = await MenuItem.new({ id: 'cal', text: '打开日历', action: () => openCalendar() });
  const itemUpd = await MenuItem.new({ id: 'upd', text: '检查更新', action: () => checkUpdate(true) });
  const itemAuto = await CheckMenuItem.new({ id: 'auto', text: '开机自动启动', checked: autoOn, action: async () => {
    try {
      if (await autostart().isEnabled()) await autostart().disable(); else await autostart().enable();
      await itemAuto.setChecked(await autostart().isEnabled());
    } catch (e) { console.warn(e); }
  } });
  const sep = await PredefinedMenuItem.new({ item: 'Separator' });
  const itemQuit = await MenuItem.new({ id: 'quit', text: '退出', action: quitAll });
  const menu = await Menu.new({ items: [itemShow, itemCal, itemSide, itemAuto, itemUpd, sep, itemQuit] });
  await TrayIcon.new({
    id: 'main', tooltip: '边栏待办', icon: await TAURI.app.defaultWindowIcon(), menu, showMenuOnLeftClick: false,
    action: e => { if (e.type === 'Click' && e.button === 'Left' && e.buttonState === 'Up') setOpen(!S.open); }
  });
}
// 退出：先关掉日历和便签小窗口（用 destroy，不会把便签的“显示在桌面”记成关掉，下次启动还会自动弹出来），再关主窗口
async function quitAll() {
  if (!win) return;
  try { for (const w of await TAURI.window.getAllWindows()) if (w.label !== win.label) await w.destroy(); } catch (e) { console.warn(e); }
  await win.close();
}
async function swapSide() { S.side = S.side === 'right' ? 'left' : 'right'; save(); render(); await placeWindow(S.open ? 'full' : 'compact'); }

/* ───────────── 别的窗口改了数据 ───────────── */
// 正在打字时先不重画（不然光标会跳），等输入框失焦再画
let pendingRender = false;
function onExternal() {
  const a = document.activeElement;
  if (a && a.matches('input,textarea,select') && $('panel').contains(a)) { pendingRender = true; return; }
  render();
}
document.addEventListener('focusout', () => setTimeout(() => {
  if (!pendingRender) return;
  const a = document.activeElement;
  if (a && a.matches('input,textarea,select') && $('panel').contains(a)) return;
  pendingRender = false; render();
}, 0));

/* ───────────── 启动 ───────────── */
(async function start() {
  const app = $('app');
  await openStore(onExternal);
  applyAlpha();
  backupToday().catch(e => console.warn('备份失败', e));
  app.classList.toggle('compact', !S.open);
  render();
  checkReminders();
  if (!win) { app.classList.remove('compact'); return; }   // 浏览器里预览：不收成小窗口
  setupTray().catch(e => console.warn('托盘创建失败', e));
  setupHotkey().catch(e => console.warn('快捷键注册失败（可能被别的软件占用）', e));
  S.notes.filter(n => n.win).forEach(n => openNoteWindow(n).catch(() => {}));   // 上次放在桌面上的便签重新弹出来
  try {
    await placeWindow(S.open ? 'full' : 'compact');
    await setFocusable(S.open);
    updateMonitorButton();
  } finally {
    await win.show();   // 摆好位置再显示，避免先在屏幕中间闪一下
  }
})();
