// 界面自动测试：用无界面浏览器打开边栏和日历，模拟真实操作（node tests/ui.test.cjs）
// 需要：npm install --no-save playwright && npx playwright install chromium
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '../src');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

let passed = 0; const errors = [];
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { errors.push(name); console.log('  ✗ ' + name + '\n    ' + (e.stack || e).toString().split('\n').slice(0, 3).join('\n    ')); }
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'zh-CN' });
  const pageErrors = [];
  const open = async (file) => {
    const p = await ctx.newPage(); p.on('pageerror', e => pageErrors.push(file + ': ' + e.message));
    await p.goto(`${base}/${file}`); await p.waitForTimeout(300); return p;
  };
  const p = await open('index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  const iso = n => p.evaluate(n => isoIn(n), n);
  const tasks = () => p.evaluate(() => JSON.parse(JSON.stringify(S.tasks)));
  const add = async text => { await p.fill('#nt', text); await p.press('#nt', 'Enter'); await p.waitForTimeout(150); return (await tasks()).at(-1); };

  console.log('边栏');
  await test('全新安装是空白的，没有示例内容', async () => {
    assert.strictEqual((await tasks()).length, 0);
    assert.strictEqual(await p.evaluate(() => S.notes.length), 0);
  });
  await test('随手记的待办默认放在今天', async () => {
    const t = await add('买牛奶');
    assert.strictEqual(t.title, '买牛奶'); assert.strictEqual(t.due, await iso(0));
    assert.ok(await p.locator('.item', { hasText: '买牛奶' }).count());
  });
  await test('一句话记待办：边打字边显示识别结果', async () => {
    await p.fill('#nt', '明天下午3点交实验报告');
    const prev = await p.textContent('#qaPrev');
    assert.ok(prev.includes('交实验报告') && prev.includes('15:00'), prev);
    await p.press('#nt', 'Enter'); await p.waitForTimeout(150);
    assert.strictEqual((await p.textContent('#qaPrev')).trim(), '', '加完后预览要清空');
    const t = (await tasks()).at(-1);
    assert.strictEqual(t.title, '交实验报告'); assert.strictEqual(t.due, await iso(1));
    assert.strictEqual(t.dueTime, '15:00'); assert.strictEqual(t.remind, '15:00');
  });
  await test('一句话记待办：每周一三五 + 重要', async () => {
    const t = await add('每周一三五 背单词 #重要');
    assert.strictEqual(t.title, '背单词'); assert.strictEqual(t.repeat, 'weekdays');
    assert.deepStrictEqual(t.repeatDays, [1, 3, 5]); assert.strictEqual(t.imp, true);
  });
  await test('一句话记待办：开始到截止', async () => {
    const t = await add('明天到大后天 复习期末');
    assert.strictEqual(t.start, await iso(1)); assert.strictEqual(t.due, await iso(3));
  });
  await test('勾掉循环待办会排下一次，取消勾选会把下一次收回', async () => {
    const id = (await tasks()).find(t => t.title === '背单词').id;
    await p.click('[data-scope=all]');
    await p.click(`[data-toggle="${id}"]`); await p.waitForTimeout(300);
    assert.strictEqual((await tasks()).filter(t => t.title === '背单词').length, 2);
    await p.click(`.chk.done[data-toggle="${id}"]`); await p.waitForTimeout(300);
    const left = (await tasks()).filter(t => t.title === '背单词');
    assert.strictEqual(left.length, 1); assert.strictEqual(left[0].done, false);
  });
  await test('编辑器里开始晚于截止时自动对齐', async () => {
    const r = await p.evaluate(() => { const t = { id: 'x', title: 'x', start: isoIn(5), due: isoIn(2) }; fixSpan(t, 'start'); return [t.start, t.due]; });
    assert.ok(r[0] <= r[1], r.join(' > '));
  });
  await test('旧数据迁移：没日期的未完成待办挪到今天', async () => {
    const r = await p.evaluate(() => { const d = upgrade({ v: 6, tasks: [{ id: 1, title: 'old', done: false, subs: [] }] }); return d.tasks[0].due; });
    assert.strictEqual(r, await iso(0));
  });

  await test('更新提示里显示这一版的改动（取自 README）', async () => {
    const body = require('child_process').execFileSync('node', [path.join(__dirname, '../scripts/release-notes.cjs')], { encoding: 'utf8' });
    assert.ok(!body.includes('README'), '当前版本在 README 里要有一节更新说明');
    await p.evaluate(b => { update = { version: '9.9.9', body: b }; renderUpdate(); }, body);
    const txt = await p.textContent('#upd');
    assert.ok(txt.includes('9.9.9') && txt.includes('· ') && !txt.includes('.exe'), txt);
    await p.evaluate(() => { update = null; renderUpdate(); });
  });

  console.log('日历');
  const c = await open('calendar.html');
  await test('今天的待办出现在日历今天这一格', async () => {
    const txt = await c.locator('.today').first().textContent();
    assert.ok(txt.includes('买牛奶'), txt);
  });
  await test('从开始到截止的每一天都显示', async () => {
    const days = await c.evaluate(() => [1, 2, 3].map(n => tasksOn(isoIn(n)).some(t => t.title === '复习期末')));
    assert.deepStrictEqual(days, [true, true, true]);
    assert.strictEqual(await c.evaluate(() => tasksOn(isoIn(4)).some(t => t.title === '复习期末')), false);
  });
  await test('边栏新加的待办，日历窗口会同步看到', async () => {
    await add('同步测试');
    await c.waitForTimeout(400);
    assert.ok(await c.evaluate(() => S.tasks.some(t => t.title === '同步测试')));
  });

  await test('日历格子里快速添加：只写时间就放在这一格的日期', async () => {
    const day = await c.evaluate(() => { quickDay = isoIn(2); render(); return quickDay; });
    await c.fill('[data-qinput]', '下午4点 开组会'); await c.press('[data-qinput]', 'Enter'); await c.waitForTimeout(150);
    const t = await c.evaluate(() => JSON.parse(JSON.stringify(S.tasks.at(-1))));
    assert.strictEqual(t.title, '开组会'); assert.strictEqual(t.due, day); assert.strictEqual(t.dueTime, '16:00');
  });

  await test('页面没有报错', async () => { assert.deepStrictEqual(pageErrors, []); });

  await browser.close(); server.close();
  console.log(errors.length ? `\n界面测试：${errors.length} 条没通过，${passed} 条通过` : `\n界面测试：${passed} 条全部通过`);
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
