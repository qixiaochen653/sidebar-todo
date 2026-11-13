// 边栏待办 · 几个窗口共用的数据层（边栏、日历窗口、便签小窗口都先加载这个文件）
// 所有窗口读写同一个 data.json；一个窗口改了，其他窗口通过 onKeyChange 收到新数据并重画。

/* ───────────── 数据 ───────────── */
const KEY = 'sidebar-todo-proto-v1';
// 新装时从空白开始（发给别人用时，不会带着任何示例或个人内容）
const defaults = { open: true, tab: 'today', side: 'right', nextId: 1, tasks: [], notes: [], groups: [], nextNoteId: 1, nextGroupId: 1 };
const pad2 = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isoIn = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); };
// 截止日存真实日期（'2026-11-12'），显示时再换算成“还剩几天”；null 表示没有截止日
const daysLeft = iso => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - t) / 864e5);
};
// 新建待办 / 便签 / 分组用的编号：带时间戳，几个窗口同时新建也不会撞号
let lastUid = 0;
const uid = () => { let n = Date.now() * 10 + Math.floor(Math.random() * 10); if (n <= lastUid) n = lastUid + 1; return (lastUid = n); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 旧数据自动升级：
//  · 原型里 due 是“距今天数” → 真实日期
//  · 补上课程卡片
//  · 0.4 起便签从“一张”变成“便签库”：旧的那张自动变成第一张「随手记」
function upgrade(s) {
  s.tasks = s.tasks || [];
  s.tasks.forEach(t => { if (typeof t.due === 'number') t.due = isoIn(t.due); if (t.due === undefined) t.due = null; t.subs = t.subs || []; });
  s.course = s.course || { time: '', name: '', place: '' };
  if (!Array.isArray(s.notes)) {
    // 老版本的那一张便签变成「随手记」；本来就是空的就不建
    s.notes = s.note ? [{ id: 1, title: '随手记', body: s.note, group: null, win: false, top: true, updated: Date.now() }] : [];
  }
  s.groups = s.groups || [];
  s.nextNoteId = s.nextNoteId || Math.max(0, ...s.notes.map(n => n.id)) + 1;
  s.nextGroupId = s.nextGroupId || Math.max(0, ...s.groups.map(g => g.id)) + 1;
  delete s.note;
  // 0.7 起「随手记的待办默认就是当天」：老数据里没日期、还没做完的待办，统一放到升级那天
  if (!s.v7) { const today = isoIn(0); s.tasks.forEach(t => { if (!t.due && !t.done) t.due = today; }); s.v7 = 1; }
  return s;
}

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaults); } catch (e) { S = structuredClone(defaults); }
upgrade(S);

/* ───────────── 保存 & 多窗口同步 ───────────── */
// 在软件里存到 AppData\Roaming\com.haovu.sidebartodo\data.json；浏览器预览时存 localStorage
//
// 几个窗口（边栏、日历、桌面便签）都会写同一份数据。为了不互相覆盖，保存时做「三方合并」：
//   base   = 这个窗口上次看到的数据
//   mine   = 这个窗口现在的数据（包含刚做的改动）
//   theirs = 文件里最新的数据（可能已经被别的窗口改过）
// 谁改了哪一条、哪一个字段，就保留谁的；两边改了同一个字段时，以自己这次的改动为准。
const TAURI = window.__TAURI__;
let store = null;
let myRev = '';                        // 自己最后一次写入的版本号，收到自己的回声时忽略
let base = structuredClone(S);
let onExternalCb = null;
const J = v => JSON.stringify(v);
const SKIP = new Set(['rev']);
function mergeObj(b, m, t) {
  if (J(m) === J(b)) return structuredClone(t);
  if (J(t) === J(b)) return m;
  if (!m || !t || typeof m !== 'object' || typeof t !== 'object' || Array.isArray(m) || Array.isArray(t)) return m;
  const out = {};
  for (const k of new Set([...Object.keys(m), ...Object.keys(t)])) {
    const bv = b ? b[k] : undefined, mv = m[k], tv = t[k];
    out[k] = J(mv) === J(bv) ? tv : mv;
    if (out[k] === undefined) delete out[k];
  }
  return out;
}
function mergeList(b = [], m = [], t = []) {
  const bm = new Map(b.map(x => [x.id, x])), mm = new Map(m.map(x => [x.id, x])), tm = new Map(t.map(x => [x.id, x]));
  const out = [];
  const pick = id => {
    const bx = bm.get(id), mx = mm.get(id), tx = tm.get(id);
    if (mx && tx) return mergeObj(bx, mx, tx);
    if (mx && !tx) return bx && J(mx) === J(bx) ? null : mx;   // 别的窗口删了它，而我没改过 → 跟着删
    if (!mx && tx) return bx && J(tx) === J(bx) ? null : tx;   // 我删了它，而别的窗口没改过 → 删
    return null;
  };
  const seen = new Set();
  for (const x of t) { seen.add(x.id); const v = pick(x.id); if (v) out.push(v); }
  for (const x of m) { if (seen.has(x.id)) continue; seen.add(x.id); const v = pick(x.id); if (v) out.push(v); }
  return out;
}
const LISTS = ['tasks', 'notes', 'groups'];
function merge3(b, m, t) {
  if (!t || !t.tasks) return m;
  const out = {};
  for (const k of new Set([...Object.keys(m), ...Object.keys(t)])) {
    if (SKIP.has(k)) continue;
    if (LISTS.includes(k)) out[k] = mergeList(b[k], m[k], t[k]);
    else if (k.startsWith('next')) out[k] = Math.max(m[k] || 0, t[k] || 0);
    else out[k] = J(m[k]) === J(b[k]) ? t[k] : m[k];
    if (out[k] === undefined) delete out[k];
  }
  return out;
}
async function readLatest() {
  if (store) { try { return await store.get('state'); } catch (e) { return null; } }
  try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
}
let flushing = null, dirty = false;
async function flush() {
  while (dirty) {
    dirty = false;
    const theirs = await readLatest();
    const merged = theirs ? upgrade(merge3(base, S, upgrade(theirs))) : S;
    const pickedUp = theirs && J({ ...merged, rev: 0 }) !== J({ ...S, rev: 0 });
    merged.rev = myRev = Math.random().toString(36).slice(2) + Date.now().toString(36);
    if (pickedUp) S = merged; else S.rev = merged.rev;
    base = structuredClone(S);
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (store) { try { await store.set('state', S); } catch (e) {} }
    if (pickedUp && onExternalCb) onExternalCb();       // 顺便收到了别的窗口的改动：重画
  }
}
// 改了数据就调用 save()；返回的 Promise 在真正写进文件后完成
const save = () => {
  dirty = true;
  if (!flushing) flushing = flush().finally(() => { flushing = null; });
  return flushing;
};
function receive(v) {
  if (!v || !v.tasks || v.rev === myRev) return;
  if (dirty || flushing) return;                         // 自己正在保存：保存时会把它一起合并进来
  S = upgrade(merge3(base, S, upgrade(v)));
  base = structuredClone(S);
  onExternalCb && onExternalCb();
}

// 打开数据文件；onExternal 在“别的窗口改了数据”时调用
async function openStore(onExternal) {
  onExternalCb = onExternal;
  if (!(TAURI && TAURI.store)) {
    // 浏览器预览：用 storage 事件模拟多窗口同步（同一浏览器开两个页面也能互相刷新）
    window.addEventListener('storage', e => {
      if (e.key !== KEY || !e.newValue) return;
      try { receive(JSON.parse(e.newValue)); } catch (err) {}
    });
    return;
  }
  try {
    store = (TAURI.store.getStore && await TAURI.store.getStore('data.json')) || await TAURI.store.load('data.json', { autoSave: 300 });
    const saved = await store.get('state');
    if (saved && saved.tasks) { S = upgrade(saved); base = structuredClone(S); }
    else { base = {}; await save(); }   // 第一次：把旧版（localStorage）里的数据搬进文件
    await store.onKeyChange('state', receive);
  } catch (e) { console.warn('读取数据文件失败，先用浏览器存储', e); }
}

/* ───────────── 窗口 ───────────── */
const WW = () => TAURI && TAURI.webviewWindow && TAURI.webviewWindow.WebviewWindow;
// 已经开着就拿到前台，没开就新建
async function openWindow(label, opts) {
  const W = WW();
  if (!W) { window.open(opts.url, label); return null; }
  const old = await W.getByLabel(label);
  if (old) { try { await old.unminimize(); await old.show(); await old.setFocus(); } catch (e) {} return old; }
  const w = new W(label, opts);
  w.once('tauri://error', e => console.warn('窗口创建失败', label, e));
  return w;
}
const openCalendar = () => openWindow('calendar', {
  url: 'calendar.html', title: '日历 · 边栏待办', width: 1000, height: 660, minWidth: 720, minHeight: 460, center: true, focus: true
});
// 便签小窗口：位置/大小/是否置顶都记在便签自己身上
const noteLabel = id => 'note-' + id;
function openNoteWindow(n) {
  const o = {
    url: 'note.html?id=' + n.id, title: n.title || '便签', width: n.w || 300, height: n.h || 340, minWidth: 220, minHeight: 180,
    decorations: false, alwaysOnTop: n.top !== false, skipTaskbar: false, focus: true, shadow: true
  };
  if (n.x != null && n.y != null) { o.x = n.x; o.y = n.y; } else o.center = true;
  return openWindow(noteLabel(n.id), o);
}
async function closeNoteWindow(id) {
  const W = WW(); if (!W) return;
  const w = await W.getByLabel(noteLabel(id));
  if (w) try { await w.close(); } catch (e) {}
}

/* ───────────── 重复待办 ───────────── */
const REPEAT = { day: '每天', workday: '工作日', week: '每周', weekdays: '每周几', month: '每月' };
const WD = ['日', '一', '二', '三', '四', '五', '六'];
// 「每周几」显示成「每周一三五」
const repeatLabel = t => t.repeat === 'weekdays' ? '每周' + (t.repeatDays || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => WD[d]).join('') : REPEAT[t.repeat] || '';
const parseIso = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 864e5);
const shiftIso = (iso, n) => { const d = parseIso(iso); d.setDate(d.getDate() + n); return isoOf(d); };
function stepDate(d, r, days) {
  const x = new Date(d);
  if (r === 'day') x.setDate(x.getDate() + 1);
  else if (r === 'workday') { do x.setDate(x.getDate() + 1); while (x.getDay() === 0 || x.getDay() === 6); }
  else if (r === 'weekdays') {
    const set = new Set(days && days.length ? days : [d.getDay()]);
    do x.setDate(x.getDate() + 1); while (!set.has(x.getDay()));
  }
  else if (r === 'week') x.setDate(x.getDate() + 7);
  else if (r === 'month') {
    const day = d.getDate(); x.setDate(1); x.setMonth(x.getMonth() + 1);
    x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));   // 31 号 → 下个月最后一天
  }
  return x;
}
// 下一次的日期：从这次的截止日往后推，推到“今天之后”为止（漏掉的几次不补）
function nextDue(iso, r, days) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let d = stepDate(iso ? parseIso(iso) : today, r, days);
  while (d <= today) d = stepDate(d, r, days);
  return isoOf(d);
}
// 勾选 / 取消勾选都走这里：重复的待办做完后自动生成下一次；取消勾选时把刚生成的那条收回
function setDone(t, done) {
  t.done = done;
  if (done && t.repeat && !t.nextOf) {
    const due = nextDue(t.due, t.repeat, t.repeatDays);
    const n = { id: uid(), title: t.title, due, dueTime: t.dueTime || null, imp: t.imp, urg: t.urg, done: false, repeat: t.repeat,
      repeatDays: t.repeatDays ? t.repeatDays.slice() : undefined, remind: t.remind || null, subs: t.subs.map(s => ({ t: s.t, done: false })) };
    // 有开始日期的：开始日期跟着一起往后挪，保持同样的天数
    if (t.start && t.due) { n.start = shiftIso(t.start, dayDiff(t.due, due)); n.startTime = t.startTime || null; }
    if (!n.repeatDays) delete n.repeatDays;
    S.tasks.push(n); t.nextOf = n.id;
    return n;
  }
  if (!done && t.nextOf) {
    const n = S.tasks.find(x => x.id === t.nextOf);
    if (n && !n.done) S.tasks = S.tasks.filter(x => x !== n);
    delete t.nextOf;
  }
  return null;
}

/* ───────────── 开始 / 截止 ───────────── */
// 待办在日历上占的日子：有开始日期就是「开始 → 截止」，否则只有截止那天
function spanOf(t) {
  if (!t.due && !t.start) return null;
  const to = t.due || t.start, from = t.start && t.start <= to ? t.start : to;
  return { from, to };
}
// 这一天是不是在待办的时间范围里
const coversDay = (t, iso) => { const sp = spanOf(t); return !!sp && sp.from <= iso && iso <= sp.to; };
// 「今天要处理的」：今天在范围内，或者已经逾期还没做完，或者根本没定日期（边栏「今天」列表用）
const isTodayTask = t => { const today = isoIn(0); return !t.due && !t.start ? true : coversDay(t, today) || (!t.done && (t.due || t.start) < today); };

/* ───────────── 面板不透明度 ───────────── */
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
function applyAlpha() {
  const a = Math.min(1, Math.max(0.6, S.alpha ?? 0.94)), dk = darkMQ.matches;
  const r = document.documentElement.style;
  r.setProperty('--glass', dk ? `rgba(24,32,34,${a})` : `rgba(248,247,243,${a})`);
  r.setProperty('--glass-tab', dk ? `rgba(28,37,39,${Math.max(a - .02, .6)})` : `rgba(248,247,243,${Math.max(a - .02, .6)})`);
}
darkMQ.addEventListener && darkMQ.addEventListener('change', applyAlpha);

/* ───────────── 自动备份（每天一份，留最近 7 天，存在 backups.json 里，和 data.json 分开） ───────────── */
const BKEY = 'sidebar-todo-backups';
let bstore = null;
async function backupStore() {
  if (bstore || !(TAURI && TAURI.store)) return bstore;
  try { bstore = (TAURI.store.getStore && await TAURI.store.getStore('backups.json')) || await TAURI.store.load('backups.json', { autoSave: false }); } catch (e) { console.warn('打开备份文件失败', e); }
  return bstore;
}
async function listBackups() {
  const b = await backupStore();
  let all = {};
  if (b) { for (const [k, v] of await b.entries()) all[k] = v; }
  else { try { all = JSON.parse(localStorage.getItem(BKEY)) || {}; } catch (e) {} }
  return Object.keys(all).sort().reverse().map(k => ({ day: k, state: all[k] }));
}
async function backupToday() {
  const day = isoOf(new Date()), snap = JSON.parse(JSON.stringify(S));
  const b = await backupStore();
  if (b) {
    await b.set(day, snap);           // 同一天里多次启动：用最新的覆盖
    const keys = (await b.keys()).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - 7))) await b.delete(k);
    await b.save();
  } else {
    let all = {}; try { all = JSON.parse(localStorage.getItem(BKEY)) || {}; } catch (e) {}
    all[day] = snap;
    Object.keys(all).sort().slice(0, Math.max(0, Object.keys(all).length - 7)).forEach(k => delete all[k]);
    try { localStorage.setItem(BKEY, JSON.stringify(all)); } catch (e) {}
  }
}
