// 抓取 Steam 成就 XML 并解析出已解锁成就的 apiname 列表
// 用法: node parse-steam.js [input.xml] [output.json]
// 若 input.xml 缺失或不含成就数据，脚本会用带浏览器 UA 的 fetch 自行抓取
const fs = require('fs');

const STEAM_ID = '76561199040448818';
const APP_ID = '250900';
const STEAM_URL = `https://steamcommunity.com/profiles/${STEAM_ID}/stats/${APP_ID}/?xml=1`;
// Steam 会拒绝 curl 默认 UA，必须伪装成浏览器
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchXml() {
  console.log('Fetching Steam XML with browser User-Agent...');
  const resp = await fetch(STEAM_URL, { headers: { 'User-Agent': UA } });
  const text = await resp.text();
  console.log(`Fetched ${text.length} bytes, HTTP ${resp.status}`);
  return text;
}

function parseXml(xml) {
  const unlocked = [];

  // Steam XML 成就节点为自闭合标签，属性形式（closed/apiname 顺序不固定）：
  //   <achievement closed="1" apiname="..." name="..." />
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

  // 兜底：少数情况是子元素形式
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
  return unlocked;
}

(async () => {
  let xml = '';

  // 优先用 curl 预先抓取的文件（workflow Fetch step 产出）
  const inputPath = process.argv[2];
  if (inputPath && fs.existsSync(inputPath)) {
    xml = fs.readFileSync(inputPath, 'utf-8');
    console.log(`Read ${xml.length} bytes from ${inputPath}`);
  }

  // curl 抓的内容若无效（空或不含 achievement），用带浏览器 UA 的 fetch 重抓
  if (!xml || !/<achievement/i.test(xml)) {
    console.log('Input missing achievements, re-fetching with browser UA...');
    xml = await fetchXml();
  }

  const unlocked = parseXml(xml);
  console.log(`Parsed ${unlocked.length} unlocked achievements`);

  const out = {
    steamId: STEAM_ID,
    appId: APP_ID,
    unlockedApinames: unlocked,
    count: unlocked.length,
    updatedAt: new Date().toISOString()
  };

  // 诊断：解析为 0 时记录原始 XML 摘要，便于排查（Steam 反爬 / 资料未公开等）
  if (unlocked.length === 0) {
    out.debug = {
      xmlLength: xml.length,
      achievementTagCount: (xml.match(/<achievement/gi) || []).length,
      hasPlayerstats: /<playerstats/i.test(xml),
      xmlHead: xml.substring(0, 800)
    };
  }

  const outputPath = process.argv[3] || 'unlocked.json';
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outputPath}`);
})();
