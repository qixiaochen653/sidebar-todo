// 从 README.md 里取出当前版本那一节，作为发布页和应用内更新提示的说明
// 用法：node scripts/release-notes.cjs [版本号]（不写就用 package.json 里的版本）
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const ver = process.argv[2] || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const lines = fs.readFileSync(path.join(root, 'README.md'), 'utf8').split(/\r?\n/);
const at = lines.findIndex(l => l.trim() === '## ' + ver);
let body = [];
if (at >= 0) for (let i = at + 1; i < lines.length && !/^#{1,2} /.test(lines[i]); i++) body.push(lines[i]);
const notes = body.join('\n').trim();
process.stdout.write((notes || '这一版的改进见 README。') + '\n\n下载下面的 sidebar-todo_' + ver + '_x64-setup.exe 安装；已经装了的会自动收到更新提示。\n');
