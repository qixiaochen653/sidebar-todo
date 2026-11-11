// 桌面便签小窗口：一张便签一个窗口，可以拖动、改大小、置顶。内容和边栏里的便签库是同一份。
const ID = +new URLSearchParams(location.search).get('id');
const W = TAURI ? TAURI.window.getCurrentWindow() : null;
const el = id => document.getElementById(id);
const me = () => S.notes.find(n => n.id === ID);

function when(t) {
  if (!t) return '';
  const d = new Date(t), now = new Date();
  const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  return d.toDateString() === now.toDateString() ? '今天 ' + hm : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}
function paint(force) {
  const n = me();
  if (!n) { if (W) W.destroy(); return; }   // 便签被删了
  const t = el('title'), b = el('body');
  if (force || document.activeElement !== t) t.value = n.title;
  if (force || document.activeElement !== b) b.value = n.body;
  el('pin').classList.toggle('on', n.top !== false);
  el('pin').setAttribute('aria-pressed', n.top !== false);
  el('count').textContent = n.body.length + ' 字';
  el('when').textContent = when(n.updated);
  document.title = n.title || '便签';
  if (W) W.setTitle(document.title).catch(() => {});
}

el('title').addEventListener('input', e => { const n = me(); if (!n) return; n.title = e.target.value; n.updated = Date.now(); save(); paint(); });
el('body').addEventListener('input', e => { const n = me(); if (!n) return; n.body = e.target.value; n.updated = Date.now(); save(); paint(); });
el('title').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) el('body').focus(); });

el('pin').addEventListener('click', async () => {
  const n = me(); if (!n) return;
  n.top = n.top === false; save(); paint();
  if (W) try { await W.setAlwaysOnTop(n.top); } catch (e) {}
});
// 关掉小窗口 = 收回便签库（不删内容）
async function closeMe() {
  const n = me();
  if (n) { n.win = false; await save(); }
  if (W) W.destroy(); else window.close();
}
el('close').addEventListener('click', closeMe);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMe(); });
if (TAURI) document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });

// 记住位置和大小（逻辑像素），下次在原地弹出
let geoTimer = null;
function rememberGeometry() {
  clearTimeout(geoTimer);
  geoTimer = setTimeout(async () => {
    const n = me(); if (!n || !W) return;
    try {
      const f = await W.scaleFactor(), p = await W.outerPosition(), s = await W.innerSize();
      n.x = Math.round(p.x / f); n.y = Math.round(p.y / f); n.w = Math.round(s.width / f); n.h = Math.round(s.height / f);
      save();
    } catch (e) {}
  }, 400);
}

(async function start() {
  await openStore(() => paint());
  paint(true);
  if (!W) return;
  W.onMoved(rememberGeometry);
  W.onResized(rememberGeometry);
  W.onCloseRequested(async ev => { ev.preventDefault(); closeMe(); });   // Alt+F4 也当成“收起”
  const n = me(); if (n && !n.body) el('body').focus();
})();
