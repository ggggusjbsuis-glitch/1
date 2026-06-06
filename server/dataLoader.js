// ========================================
// 数据加载器 — 读取静态游戏数据（clues.json/items.json/map.json）+ 每日剧情TXT文本
// ========================================
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SCRIPT_DIR = path.join(DATA_DIR, 'daily-scripts');

// ---- JSON 文件读取 ----
function loadJSON(filename) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(raw);
}

// ---- 单个剧情文本读取 ----
function loadScript(roleId, day) {
  const file = path.join(SCRIPT_DIR, `${roleId}_d${day}.txt`);
  if (!fs.existsSync(file)) return `第${day}天剧情（待补充）`;
  return fs.readFileSync(file, 'utf-8');
}

// ---- 启动时加载全部静态数据 ----
function loadAllData() {
  const clues = loadJSON('clues.json');
  const items = loadJSON('items.json');
  const map = loadJSON('map.json');

  // 构建快速索引
  const cluesById = {};
  clues.forEach(c => { cluesById[c.id] = c; });

  const itemsById = {};
  items.forEach(i => { itemsById[i.id] = i; });

  // 区域线索池（深拷贝，搜索时 splice 消耗）
  const regionPools = {};
  Object.entries(map.regionCluePools).forEach(([region, ids]) => {
    regionPools[region] = [...ids];
  });

  return { clues: cluesById, items: itemsById, map, regionPools };
}

// ---- 每天开始时加载所有角色当天的剧情 ----
function loadDailyScripts(day) {
  const roleIds = ['role_1', 'role_2', 'role_3', 'role_4', 'role_5', 'role_6'];
  const scripts = {};
  roleIds.forEach(id => {
    scripts[id] = {
      day,
      title: `第${day}天`,
      narrative: loadScript(id, day),
      actionGuide: '收集线索，与其他玩家交流，为最终抉择做准备。'
    };
  });
  return scripts;
}

module.exports = { loadAllData, loadDailyScripts };
