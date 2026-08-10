// 抓取 Steam 成就 XML 并解析出已解锁成就的 apiname 列表
// 用法: node parse-steam.js [input.xml] [output.json]
const fs = require('fs');

const STEAM_ID = '76561199040448818';
const APP_ID = '250900';
const STEAM_URL = `https://steamcommunity.com/profiles/${STEAM_ID}/stats/${APP_ID}/?xml=1`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchXml() {
  console.log('Fetching Steam XML with browser User-Agent...');
  const resp = await fetch(STEAM_URL, { headers: { 'User-Agent': UA } });
  const text = await resp.text();
  console.log(`Fetched ${text.length} bytes, HTTP ${resp.status}`);
  return text;
}

// 去除 CDATA 包裹与首尾空白
const strip = (s) => (s || '').replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').replace(/^[\s]*|[\s]*$/g, '');

function parseXml(xml) {
  const unlocked = [];

  // Steam 实际为混合格式：<achievement closed="1"> 开标签带 closed 属性，
  // apiname/name 等是子元素且被 CDATA 包裹。统一处理：匹配每个块，
  // 从开标签属性或子元素中取 closed 与 apiname（兼容纯属性/纯子元素形式）。
  const blockRe = /<achievement\b([^>]*)>([\s\S]*?)<\/achievement>/gi;
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const openAttrs = m[1];
    const inner = m[2];

    let closed = null;
    const closedAttr = openAttrs.match(/closed\s*=\s*"([^"]*)"/i);
    if (closedAttr) closed = strip(closedAttr[1]);
    if (closed === null) {
      const closedEl = inner.match(/<closed>([\s\S]*?)<\/closed>/i);
      if (closedEl) closed = strip(closedEl[1]);
    }

    let apiname = null;
    const apiEl = inner.match(/<apiname>([\s\S]*?)<\/apiname>/i);
    if (apiEl) apiname = strip(apiEl[1]);
    if (!apiname) {
      const apiAttr = openAttrs.match(/apiname\s*=\s*"([^"]*)"/i);
      if (apiAttr) apiname = strip(apiAttr[1]);
    }

    if (closed === '1' && apiname) unlocked.push(apiname);
  }

  // 兜底：纯自闭合形式 <achievement closed="1" apiname="X" />
  if (unlocked.length === 0) {
    const selfRe = /<achievement\b([^>]*?)\/>/gi;
    let s;
    while ((s = selfRe.exec(xml)) !== null) {
      const attrs = s[1];
      const closedM = attrs.match(/closed\s*=\s*"([^"]*)"/i);
      const apiM = attrs.match(/apiname\s*=\s*"([^"]*)"/i);
      if (closedM && strip(closedM[1]) === '1' && apiM && strip(apiM[1])) {
        unlocked.push(strip(apiM[1]));
      }
    }
  }

  return unlocked;
}

(async () => {
  let xml = '';
  const inputPath = process.argv[2];
  if (inputPath && fs.existsSync(inputPath)) {
    xml = fs.readFileSync(inputPath, 'utf-8');
    console.log(`Read ${xml.length} bytes from ${inputPath}`);
  }
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

  if (unlocked.length === 0) {
    const idx = xml.search(/<achievement/i);
    out.debug = {
      xmlLength: xml.length,
      achievementTagCount: (xml.match(/<achievement/gi) || []).length,
      firstAchievementRaw: idx >= 0 ? xml.substring(idx, idx + 600) : '(none)'
    };
  }

  const outputPath = process.argv[3] || 'unlocked.json';
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outputPath}`);
})();
