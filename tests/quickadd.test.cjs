// 一句话记待办的识别测试（Node 直接跑：node tests/quickadd.test.cjs）
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
// quickadd.js 是给网页用的普通脚本，这里用 vm 载入
const ctx = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/quickadd.js'), 'utf8'), ctx);
const { parseQuick, describeQuick } = ctx.module.exports;
const NOW = new Date(2026, 10, 12, 10, 0);   // 2026-11-12 周四 上午 10 点
const cases = [
  ['明天下午3点交实验报告', { title: '交实验报告', due: '2026-11-13', dueTime: '15:00', remind: '15:00' }],
  ['后天上午9点半 高数小测', { title: '高数小测', due: '2026-11-14', dueTime: '09:30' }],
  ['周五交C语言作业', { title: '交C语言作业', due: '2026-11-13' }],
  ['下周一 例会', { title: '例会', due: '2026-11-16' }],
  ['周四 健身', { title: '健身', due: '2026-11-12' }],
  ['这周末 大扫除', { title: '大扫除', due: '2026-11-14' }],
  ['11月20日 交论文', { title: '交论文', due: '2026-11-20' }],
  ['十一月二十三号 体测', { title: '体测', due: '2026-11-23' }],
  ['12/1 交房租', { title: '交房租', due: '2026-12-01' }],
  ['2026-12-24 平安夜聚餐', { title: '平安夜聚餐', due: '2026-12-24' }],
  ['3天后 还书', { title: '还书', due: '2026-11-15' }],
  ['15号 交电费', { title: '交电费', due: '2026-11-15' }],
  ['5号 交电费', { title: '交电费', due: '2026-12-05' }],
  ['周一到周三 写报告', { title: '写报告', start: '2026-11-16', due: '2026-11-18' }],
  ['明天下午2点到4点 开会', { title: '开会', due: '2026-11-13', startTime: '14:00', dueTime: '16:00' }],
  ['每天 背单词', { title: '背单词', repeat: 'day' }],
  ['每个工作日 打卡', { title: '打卡', repeat: 'workday' }],
  ['每周一三五 跑步', { title: '跑步', repeat: 'weekdays', repeatDays: [1, 3, 5], due: '2026-11-13' }],
  ['每周 交周报', { title: '交周报', repeat: 'week' }],
  ['每月15号 还信用卡', { title: '还信用卡', repeat: 'month', due: '2026-11-15' }],
  ['今晚 复习', { title: '复习', due: '2026-11-12', dueTime: '20:00' }],
  ['晚上8点一刻 打电话', { title: '打电话', dueTime: '20:15' }],
  ['3点 取快递', { title: '取快递', dueTime: '15:00' }],
  ['交报告!', { title: '交报告', imp: true }],
  ['交报告！！', { title: '交报告', imp: true, urg: true }],
  ['#紧急 修bug', { title: '修bug', urg: true }],
  // 不该被当成日期 / 时间的
  ['去5号楼找老师', { title: '去5号楼找老师', due: undefined, dueTime: undefined }],
  ['复习第2点', { title: '复习第2点', dueTime: undefined }],
  ['四级单词 50 个', { title: '四级单词 50 个', found: false }],
  ['高数作业 第三章习题', { title: '高数作业 第三章习题', found: false }],
  ['体测 1000 米跑一次', { title: '体测 1000 米跑一次', found: false }],
  ['周报', { title: '周报', found: false }],
  ['看3.1节', { title: '看3.1节', found: false }]
];
let fail = 0;
for (const [input, want] of cases) {
  const got = parseQuick(input, NOW);
  for (const k in want) {
    try { assert.strictEqual(JSON.stringify(got[k]), JSON.stringify(want[k])); }
    catch (e) { fail++; console.log(`✗ 「${input}」 ${k}: 得到 ${JSON.stringify(got[k])}，应为 ${JSON.stringify(want[k])}`); }
  }
}
assert.strictEqual(describeQuick(parseQuick('明天下午3点交实验报告', NOW), NOW), '明天 15:00');
assert.strictEqual(describeQuick(parseQuick('每周一三五 跑步!', NOW), NOW), '明天 · 每周一三五 · 重要');
console.log(fail ? `一句话记待办：${fail} 处不对` : `一句话记待办：${cases.length} 条全部通过`);
process.exitCode = fail ? 1 : 0;
