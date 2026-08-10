// 解析 Steam 成就 XML，输出已解锁成就的 apiname 列表 JSON
// 用法: node parse-steam.js <input.xml> <output.json>
const fs = require('fs');

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const STEAM_ID = '76561199040448818';
const APP_ID = '250900';

if (!inputPath || !outputPath) {
  console.error('Usage: node parse-steam.js <input.xml> <output.json>');
  process.exit(1);
}

const xml = fs.readFileSync(inputPath, 'utf-8');

// Steam XML 的成就节点是自闭合标签，属性形式：
//   <achievement closed="1" apiname="..." name="..." icon="..." />
// closed 与 apiname 的先后顺序不固定，所以先抓整个标签再分别提取属性
const unlocked = [];

const tagRe = /<achievement\b([^>]*?)\/?>/g;
let m;
while ((m = tagRe.exec(xml)) !== null) {
  const attrs = m[1];
  const closedMatch = attrs.match(/closed\s*=\s*"(\d+)"/);
  const apinameMatch = attrs.match(/apiname\s*=\s*"([^"]+)"/);
  if (closedMatch && closedMatch[1] === '1' && apinameMatch) {
    unlocked.push(apinameMatch[1]);
  }
}

// 兜底：少数情况是子元素形式 <achievement><apiname>x</apiname><closed>1</closed></achievement>
if (unlocked.length === 0) {
  const blockRe = /<achievement>([\s\S]*?)<\/achievement>/g;
  let b;
  while ((b = blockRe.exec(xml)) !== null) {
    const inner = b[1];
    const closedMatch = inner.match(/<closed>\s*(\d+)\s*<\/closed>/);
    const apinameMatch = inner.match(/<apiname>\s*([^<]+)\s*<\/apiname>/);
    if (closedMatch && closedMatch[1] === '1' && apinameMatch) {
      unlocked.push(apinameMatch[1].trim());
    }
  }
}

const out = {
  steamId: STEAM_ID,
  appId: APP_ID,
  unlockedApinames: unlocked,
  count: unlocked.length,
  updatedAt: new Date().toISOString()
};

fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
console.log(`Parsed ${unlocked.length} unlocked achievements -> ${outputPath}`);
