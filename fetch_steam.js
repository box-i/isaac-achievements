// fetch_steam.js — 从 Steam 获取以撒成就进度
// 用法: node fetch_steam.js <STEAM64_ID> <API_KEY>
// 生成 steam_achievements.json，可在页面中拖拽导入

const https = require('https');
const fs = require('fs');

const STEAM_ID = process.argv[2];
const API_KEY = process.argv[3];

if (!STEAM_ID || !API_KEY) {
  console.log('用法: node fetch_steam.js <STEAM64_ID> <API_KEY>');
  console.log('');
  console.log('Steam64 ID 查找: Steam客户端 → 右上角头像 → 账户明细 → Steam ID (7651开头的17位数字)');
  console.log('API Key 获取: https://steamcommunity.com/dev/apikey');
  process.exit(1);
}

const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${API_KEY}&steamid=${STEAM_ID}&appid=250900&l=english`;

console.log('正在从 Steam 获取成就数据...');

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);

      if (!json.playerstats || !json.playerstats.achievements) {
        console.log('❌ 返回数据异常');
        if (json.playerstats && json.playerstats.error) {
          console.log('错误信息:', json.playerstats.error);
        }
        console.log('原始响应:', JSON.stringify(json).substring(0, 500));
        return;
      }

      const achievements = json.playerstats.achievements;
      const unlocked = achievements.filter(a => a.achieved === 1);
      const total = achievements.length;

      console.log(`\n总成就: ${total}`);
      console.log(`已解锁: ${unlocked.length}`);
      console.log(`解锁率: ${(unlocked.length / total * 100).toFixed(1)}%\n`);

      // Show recently unlocked
      console.log('最近解锁的成就:');
      unlocked
        .filter(a => a.unlocktime > 0)
        .sort((a, b) => b.unlocktime - a.unlocktime)
        .slice(0, 15)
        .forEach(a => {
          const date = new Date(a.unlocktime * 1000).toISOString().split('T')[0];
          console.log(`  #${a.apiname.padStart(3)} | ${date}`);
        });

      // Save for import
      fs.writeFileSync('steam_achievements.json', JSON.stringify(json, null, 2), 'utf-8');
      console.log(`\n✅ 已保存到 steam_achievements.json`);
      console.log('在页面中点击「📥 导入成就数据」→ 拖拽此文件即可导入');
    } catch (e) {
      console.log('❌ 解析失败:', e.message);
      console.log('原始响应:', data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.log('❌ 网络请求失败:', e.message);
  console.log('请确认已开启加速器 / VPN，确保能访问 api.steampowered.com');
});
