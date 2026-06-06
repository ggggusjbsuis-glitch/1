// ========================================
// 剧本管理器 — 扫描 scripts/ 目录、获取剧本摘要列表、加载完整JSON、校验格式
// ========================================
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.join(__dirname, 'scripts');

// 必填字段列表（用于校验）
const REQUIRED_TOP = ['scriptId','title','playerCount','totalDays'];
const REQUIRED_SECTIONS = ['characters','clues','items','map'];

// ---- 扫描所有剧本 ----
function scanScripts() {
  if (!fs.existsSync(SCRIPTS_DIR)) { fs.mkdirSync(SCRIPTS_DIR, { recursive: true }); return []; }
  const files = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.json'));
  return files;
}

// ---- 获取剧本摘要列表（不含完整内容）----
function getScriptList() {
  const files = scanScripts();
  const list = [];
  files.forEach(file => {
    try {
      const raw = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      list.push({
        scriptId: data.scriptId || file.replace('.json',''),
        title: data.title || '未命名剧本',
        subtitle: data.subtitle || '',
        description: data.description || '',
        coverImage: data.coverImage || '',
        playerCount: data.playerCount || 0,
        estimatedTime: data.estimatedTime || '45-90分钟',
        tags: data.tags || [],
        version: data.version || '1.0.0',
      });
    } catch (e) {
      console.error('[ScriptManager] 解析失败:', file, e.message);
    }
  });
  return list;
}

// ---- 加载完整剧本数据 ----
function loadScript(scriptId) {
  const filename = scriptId.endsWith('.json') ? scriptId : scriptId + '.json';
  const filepath = path.join(SCRIPTS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[ScriptManager] 加载失败:', filename, e.message);
    return null;
  }
}

// ---- 校验剧本JSON格式 ----
function validateScript(scriptObj) {
  const errors = [];
  // 顶层必填
  REQUIRED_TOP.forEach(key => {
    if (!scriptObj[key]) errors.push('缺少顶层字段: ' + key);
  });
  // 分段必填
  REQUIRED_SECTIONS.forEach(key => {
    if (!scriptObj[key]) errors.push('缺少分段: ' + key);
  });
  // 角色校验
  if (scriptObj.characters) {
    if (!Array.isArray(scriptObj.characters)) errors.push('characters 必须是数组');
    else if (scriptObj.characters.length !== scriptObj.playerCount) {
      errors.push('角色数量(' + scriptObj.characters.length + ')与playerCount(' + scriptObj.playerCount + ')不匹配');
    }
  }
  // 线索校验
  if (scriptObj.clues && !Array.isArray(scriptObj.clues)) {
    errors.push('clues 必须是数组');
  }
  // 道具校验
  if (scriptObj.items && !Array.isArray(scriptObj.items)) {
    errors.push('items 必须是数组');
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { getScriptList, loadScript, validateScript };
