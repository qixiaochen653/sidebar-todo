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
  return s;
}

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || structuredClone(defaults); } catch (e) { S = structuredClone(defaults); }
upgrade(S);

/* ───────────── 保存 & 多窗口同步 ───────────── */
// 在软件里存到 AppData\Roaming\com.haovu.sidebartodo\data.json；浏览器预览时存 localStorage
const TAURI = window.__TAURI__;
let store = null;
let myRev = '';                        // 自己最后一次写入的版本号，收到自己的回声时忽略
const save = () => {
  S.rev = myRev = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  return store ? store.set('state', S).catch(() => {}) : Promise.resolve();
};

// 打开数据文件；onExternal 在“别的窗口改了数据”时调用
async function openStore(onExternal) {
  if (!(TAURI && TAURI.store)) {
    // 浏览器预览：用 storage 事件模拟多窗口同步（同一浏览器开两个页面也能互相刷新）
    window.addEventListener('storage', e => {
      if (e.key !== KEY || !e.newValue) return;
      try { const v = JSON.parse(e.newValue); if (v.rev !== myRev) { S = upgrade(v); onExternal && onExternal(); } } catch (err) {}
    });
    return;
  }
  try {
    store = (TAURI.store.getStore && await TAURI.store.getStore('data.json')) || await TAURI.store.load('data.json', { autoSave: 300 });
    const saved = await store.get('state');
    if (saved && saved.tasks) S = upgrade(saved);
    else await store.set('state', S);   // 第一次：把旧版（localStorage）里的数据搬进文件
    await store.onKeyChange('state', v => {
      if (!v || !v.tasks || v.rev === myRev) return;
      S = upgrade(v);
      onExternal && onExternal();
    });
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
const REPEAT = { day: '每天', workday: '工作日', week: '每周', month: '每月' };
const parseIso = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
function stepDate(d, r) {
  const x = new Date(d);
  if (r === 'day') x.setDate(x.getDate() + 1);
  else if (r === 'workday') { do x.setDate(x.getDate() + 1); while (x.getDay() === 0 || x.getDay() === 6); }
  else if (r === 'week') x.setDate(x.getDate() + 7);
  else if (r === 'month') {
    const day = d.getDate(); x.setDate(1); x.setMonth(x.getMonth() + 1);
    x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));   // 31 号 → 下个月最后一天
  }
  return x;
}
// 下一次的日期：从这次的截止日往后推，推到“今天之后”为止（漏掉的几次不补）
function nextDue(iso, r) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let d = stepDate(iso ? parseIso(iso) : today, r);
  while (d <= today) d = stepDate(d, r);
  return isoOf(d);
}
// 勾选 / 取消勾选都走这里：重复的待办做完后自动生成下一次；取消勾选时把刚生成的那条收回
function setDone(t, done) {
  t.done = done;
  if (done && t.repeat && !t.nextOf) {
    const n = { id: S.nextId++, title: t.title, due: nextDue(t.due, t.repeat), imp: t.imp, urg: t.urg, done: false, repeat: t.repeat,
      remind: t.remind || null, subs: t.subs.map(s => ({ t: s.t, done: false })) };
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
