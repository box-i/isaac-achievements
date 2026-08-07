# 以撒的结合：重生 - 成就追踪

一个以撒成就全追踪网页，包含全部 641 个成就的中文翻译、Steam 图标和解锁条件。

## 在线使用

🌐 **[点击这里打开](https://YOUR_USERNAME.github.io/isaac-achievements)**（部署后替换链接）

## 功能

- 📊 **641 个成就**，完整的中文翻译 + Steam 名称
- 🖼️ **Steam CDN 图标**，已解锁/未解锁两套样式
- 🔍 **中英文搜索**，同时匹配中文名和英文名
- 📂 **存档管理**，3 个独立存档槽，localStorage 持久化
- 📥 **存档导入**，支持 Steam API 或 JSON 文件导入
- 🔓 **解锁条件和奖励**，每个成就可查看详细条件和奖励

## 本地运行

线上版**不支持直接从 Steam 获取**（需要代理服务器），如需使用 Steam API 导入：

```bash
# 1. 下载项目
git clone https://github.com/YOUR_USERNAME/isaac-achievements.git
cd isaac-achievements

# 2. 启动本地服务器
node server.js

# 3. 浏览器打开
# http://localhost:8080
```

或者用 fetch_steam.js 获取数据后导入 JSON 文件：

```bash
node fetch_steam.js <你的Steam64 ID> <你的Steam API Key>
# 会在当前目录生成 steam_achievements.json
# 在网页中选择「方式二」导入该文件
```

## Steam API Key 获取

1. 打开 https://steamcommunity.com/dev/apikey
2. 登录 Steam，输入任意域名（如 `localhost`）
3. 复制生成的 Key

## 数据来源

- 成就数据：Steam Web API (AppID: 250900)
- 中文翻译 & 解锁条件：[以撒中文 Wiki](https://isaac.huijiwiki.com/wiki/成就)
