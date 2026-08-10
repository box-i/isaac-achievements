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

  // 形式1：自闭合属性 <achievement closed="1" apiname="X" ... />
  const selfRe = /<achievement\b([^>]*?)\/?>/gi;
  let m;
  while ((m = selfRe.exec(xml)) !== null) {
    const attrs = m[1];
    const closedM = attrs.match(/closed\s*=\s*"([^"]*)"/i);
    const apiM = attrs.match(/apiname\s*=\s*"([^"]*)"/i);
    if (closedM && strip(closedM[1]) === '1' && apiM && strip(apiM[1])) {
      unlocked.push(strip(apiM[1]));
    }
  }

  // 形式2：子元素 <achievement>...<apiname><![CDATA[X]]></apiname>...<closed>1</closed>...</achievement>
  if (unlocked.length === 0) {
    const blockRe = /<achievement\b[^>]*>([\s\S]*?)<\/achievement>/gi;
    let b;
    while ((b = blockRe.exec(xml)) !== null) {
      const inner = b[1];
      const pick = (tag) => {
        const rm = inner.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'i'));
        return rm ? strip(rm[1]) : null;
      };
      const closed = pick('closed');
      const apiname = pick('apiname');
      if (closed === '1' && apiname) unlocked.push(apiname);
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
