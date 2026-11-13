// 边栏待办 · 一句话记待办
// 「明天下午3点交实验报告」→ 标题「交实验报告」，截止明天 15:00，15:00 提醒。
// 只做识别，不碰界面和数据，所以浏览器和 Node（自动测试）都能直接用。
(function (root) {
  const pad2 = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // 中文数字（到 99）：三、十五、二十三、两
  const CN = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  function num(s) {
    if (s == null || s === '') return NaN;
    if (/^\d+$/.test(s)) return +s;
    if (s === '十') return 10;
    const m = s.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
    if (m) return (m[1] ? CN[m[1]] : 1) * 10 + (m[2] ? CN[m[2]] : 0);
    if (s.length === 1 && s in CN) return CN[s];
    return NaN;
  }
  const N = '(\\d{1,2}|[一二两三四五六七八九十]{1,3})';
  const WDCH = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };
  const WDNAME = ['日', '一', '二', '三', '四', '五', '六'];
  // 「5号楼」「第2点」这类不是日期 / 时间
  const NOT_DAY = '(?![楼线床位门房机库字球桌窗车]|[\\d])';

  // 日期写法：返回 { re, fn(match, today) → Date }
  const DATE_RULES = [
    { re: /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, fn: m => new Date(+m[1], +m[2] - 1, +m[3]) },
    { re: new RegExp(N + '月' + N + '[日号]?' + NOT_DAY), fn: (m, t) => { const mo = num(m[1]), d = num(m[2]); if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null; let x = new Date(t.getFullYear(), mo - 1, d); if (x < addDays(t, -60)) x = new Date(t.getFullYear() + 1, mo - 1, d); return x; } },
    { re: /(?<![\d.])(\d{1,2})\/(\d{1,2})(?![\d/])/, fn: (m, t) => { const mo = +m[1], d = +m[2]; if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null; let x = new Date(t.getFullYear(), mo - 1, d); if (x < addDays(t, -60)) x = new Date(t.getFullYear() + 1, mo - 1, d); return x; } },
    { re: /大后天/, fn: (m, t) => addDays(t, 3) },
    { re: /后天/, fn: (m, t) => addDays(t, 2) },
    { re: /明天|明日|明早|明晚/, fn: (m, t) => addDays(t, 1) },
    { re: /今天|今日|今晚|今早|今儿/, fn: (m, t) => t },
    { re: /(下下|下个|下|本|这个|这)?(?:周|星期|礼拜)([一二三四五六日天1-7])/, fn: (m, t) => {
      const wd = WDCH[m[2]], cur = t.getDay();
      const mon = addDays(t, -((cur + 6) % 7));                     // 本周一
      const off = (wd + 6) % 7;                                     // 周一=0 … 周日=6
      if (m[1] === '下' || m[1] === '下个') return addDays(mon, 7 + off);
      if (m[1] === '下下') return addDays(mon, 14 + off);
      if (m[1]) return addDays(mon, off);                           // 本周 / 这周
      let x = addDays(mon, off); if (x < t) x = addDays(x, 7);     // 只说「周三」：今天或之后最近的那个
      return x;
    } },
    { re: /(下个|下|这个|这|本)?周末/, fn: (m, t) => { const mon = addDays(t, -((t.getDay() + 6) % 7)); let x = addDays(mon, 5); if (m[1] === '下' || m[1] === '下个') x = addDays(x, 7); else if (!m[1] && x < t && t.getDay() !== 0) x = addDays(x, 7); return x < t ? t : x; } },
    { re: /下(?:个)?(?:周|星期|礼拜)(?![一二三四五六日天1-7末])/, fn: (m, t) => addDays(t, 7 - ((t.getDay() + 6) % 7)) },
    { re: new RegExp(N + '天[之以]?后'), fn: (m, t) => { const n = num(m[1]); return n >= 0 ? addDays(t, n) : null; } },
    { re: new RegExp('下个?月' + N + '[号日]'), fn: (m, t) => { const d = num(m[1]); return d >= 1 && d <= 31 ? new Date(t.getFullYear(), t.getMonth() + 1, d) : null; } },
    { re: new RegExp('(?<![月\\d一二两三四五六七八九十第])' + N + '[号日]' + NOT_DAY), fn: (m, t) => { const d = num(m[1]); if (!(d >= 1 && d <= 31)) return null; let x = new Date(t.getFullYear(), t.getMonth(), d); if (x < t) x = new Date(t.getFullYear(), t.getMonth() + 1, d); return x; } }
  ];

  // 时间：上午9点、下午3点半、15:30、晚上8点一刻、2点20分
  const TIME_RE = new RegExp('(凌晨|早上|早晨|上午|早|中午|下午|傍晚|晚上|今晚|明晚|晚)?\\s*(?<!第)' + N + '\\s*(?:[:：](\\d{2})|点(?:(半)|(一刻)|(三刻)|' + N + '分?)?)(?![\\d钟个])');
  function parseTime(m) {
    const q = m[1] || '', h0 = num(m[2]);
    let mi = m[3] != null ? +m[3] : m[4] ? 30 : m[5] ? 15 : m[6] ? 45 : m[7] != null ? num(m[7]) : 0;
    if (!(h0 >= 0 && h0 <= 24) || !(mi >= 0 && mi < 60)) return null;
    let h = h0;
    if (/下午|傍晚|晚/.test(q) && h < 12) h += 12;
    else if (q === '中午' && h < 6) h += 12;
    else if (!q && m[3] == null && h >= 1 && h <= 6) h += 12;     // 只说「3点」：多半是下午
    if (h === 24) h = 0;
    return pad2(h) + ':' + pad2(mi);
  }

  // 重复
  const REPEAT_RULES = [
    { re: /每(?:个)?工作日|工作日每天/, fn: () => ({ repeat: 'workday' }) },
    { re: /每(?:一)?天|每日|天天/, fn: () => ({ repeat: 'day' }) },
    { re: /每(?:个)?(?:周|星期|礼拜)([一二三四五六日天1-7](?:[、,，和及与]?[一二三四五六日天1-7])*)/, fn: m => {
      const days = [...new Set([...m[1]].filter(c => c in WDCH).map(c => WDCH[c]))];
      return { repeat: 'weekdays', repeatDays: days };
    } },
    { re: /每(?:个)?(?:周|星期|礼拜)/, fn: () => ({ repeat: 'week' }) },
    { re: new RegExp('每(?:个)?月' + N + '[号日]?'), fn: (m, t) => { const d = num(m[1]); if (!(d >= 1 && d <= 31)) return null; let x = new Date(t.getFullYear(), t.getMonth(), d); if (x < t) x = new Date(t.getFullYear(), t.getMonth() + 1, d); return { repeat: 'month', due: x }; } },
    { re: /每(?:个)?月/, fn: () => ({ repeat: 'month' }) }
  ];

  // 在 text 里找 re，把找到的部分从 text 里挖掉（换成占位），返回 match 和位置
  function take(state, re) {
    const m = state.text.match(re);
    if (!m) return null;
    const at = m.index, len = m[0].length;
    state.text = state.text.slice(0, at) + '\u0000'.repeat(len) + state.text.slice(at + len);
    return { m, at, end: at + len };
  }

  function parseQuick(input, now) {
    const today = new Date(now || Date.now()); today.setHours(0, 0, 0, 0);
    const st = { text: String(input || '') };
    const out = {};
    // 重要 / 紧急：结尾的 ! / ！（两个 = 重要且紧急），或者 #重要 #紧急 #急
    st.text = st.text.replace(/#重要/g, () => (out.imp = true, '\u0000\u0000\u0000'));
    st.text = st.text.replace(/#紧急|#急/g, s => (out.urg = true, '\u0000'.repeat(s.length)));
    st.text = st.text.replace(/[!！]{1,3}\s*$/, s => { const n = (s.match(/[!！]/g) || []).length; out.imp = true; if (n >= 2) out.urg = true; return '\u0000'.repeat(s.length); });

    // 重复（先认重复，免得「每周一」里的「周一」被当成日期）
    for (const r of REPEAT_RULES) {
      const hit = take(st, r.re); if (!hit) continue;
      const v = r.fn(hit.m, today); if (!v) continue;
      Object.assign(out, v); break;
    }

    // 日期：最多认两个，用「到 / 至 / ~ / -」连起来的就是开始 → 截止
    const dates = [];
    for (let k = 0; k < 2; k++) {
      let best = null;
      for (const r of DATE_RULES) {
        const m = st.text.match(r.re); if (!m) continue;
        if (!best || m.index < best.m.index) best = { m, r };
      }
      if (!best) break;
      const d = best.r.fn(best.m, today);
      const at = best.m.index, end = at + best.m[0].length;
      st.text = st.text.slice(0, at) + '\u0000'.repeat(end - at) + st.text.slice(end);
      if (d) dates.push({ d, at, end, word: best.m[0] });
    }
    dates.sort((a, b) => a.at - b.at);

    // 时间：最多两个（「2点到4点」）
    const times = [];
    for (let k = 0; k < 2; k++) {
      const hit = take(st, TIME_RE); if (!hit) break;
      const v = parseTime(hit.m); if (v) times.push({ v, at: hit.at, end: hit.end, q: hit.m[1] });
    }
    times.sort((a, b) => a.at - b.at);
    const conn = (a, b) => b && /^\s*(到|至|~|～|-|—|–)\s*$/.test(String(input).slice(a.end, b.at));

    if (dates.length === 2 && conn(dates[0], dates[1])) { out.start = iso(dates[0].d); out.due = iso(dates[1].d); }
    else if (dates.length) out.due = iso(dates[0].d);
    // 「今晚」「明晚」没写几点：默认晚上 8 点
    if (!times.length && dates.some(x => /晚/.test(x.word))) times.push({ v: '20:00' });
    if (times.length === 2 && conn(times[0], times[1])) { out.startTime = times[0].v; out.dueTime = times[1].v; if (!out.start) out.start = out.due || null; }
    else if (times.length) out.dueTime = times[0].v;
    if (out.dueTime) out.remind = out.dueTime;                      // 到点提醒
    if (out.start === null) delete out.start;

    // 每周几重复但没写日期：截止日 = 今天或之后最近的那一天
    if (out.repeat === 'weekdays' && !out.due && out.repeatDays && out.repeatDays.length) {
      let x = new Date(today); for (let i = 0; i < 7 && !out.repeatDays.includes(x.getDay()); i++) x = addDays(x, 1);
      out.due = iso(x);
    }
    if (out.due instanceof Date) out.due = iso(out.due);

    // 剩下的就是标题：去掉识别过的部分和多余的连接词、标点
    let title = st.text.replace(/\u0000+/g, ' ')
      .replace(/(^|\s)(到|至|~|～|-|—|–|的|在|于|之前|以前|前)(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ').replace(/^[\s,，、。:：;；]+|[\s,，、。:：;；]+$/g, '').trim();
    if (!title) title = String(input).trim();
    out.title = title;
    out.found = ['due', 'start', 'dueTime', 'repeat', 'imp', 'urg'].some(k => out[k]);
    return out;
  }

  // 预览：「明天 15:00 · 每周一三 · 重要」
  function describeQuick(p, now) {
    if (!p || !p.found) return '';
    const today = new Date(now || Date.now()); today.setHours(0, 0, 0, 0);
    const dayWord = s => {
      const [y, m, d] = s.split('-').map(Number), x = new Date(y, m - 1, d), n = Math.round((x - today) / 864e5);
      const w = '周' + WDNAME[x.getDay()];
      return n === 0 ? '今天' : n === 1 ? '明天' : n === 2 ? '后天' : `${m}月${d}日 ${w}`;
    };
    const parts = [];
    if (p.start && p.start !== p.due) parts.push(`${dayWord(p.start)}${p.startTime ? ' ' + p.startTime : ''} → ${p.due ? dayWord(p.due) : ''}${p.dueTime ? ' ' + p.dueTime : ''}`);
    else if (p.due || p.dueTime) parts.push(`${p.due ? dayWord(p.due) : '今天'}${p.startTime ? ' ' + p.startTime + '–' + p.dueTime : p.dueTime ? ' ' + p.dueTime : ''}`);
    if (p.repeat) parts.push(p.repeat === 'weekdays' ? '每周' + p.repeatDays.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => WDNAME[d]).join('') : { day: '每天', workday: '工作日', week: '每周', month: '每月' }[p.repeat]);
    if (p.imp && p.urg) parts.push('重要且紧急'); else if (p.imp) parts.push('重要'); else if (p.urg) parts.push('紧急');
    return parts.join(' · ');
  }

  const api = { parseQuick, describeQuick };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
