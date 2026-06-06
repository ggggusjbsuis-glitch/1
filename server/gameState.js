// ========================================
// 游戏状态机 — 初始化游戏、移动玩家、推进天数、玩家/GM视图构建（信息隔离）、纯函数设计
// ========================================

const REGIONS = ['档案馆', '黑市', '真理祭坛', '星陨遗迹', '封印基座', '圣殿'];

// ---- 初始化游戏 ----
// 只给非GM玩家（6人）创建状态，GM不占角色位
function initGame(players) {
  const startPositions = ['档案馆', '黑市', '真理祭坛', '星陨遗迹', '封印基座', '圣殿'];
  const playerStates = {};
  const gamePlayers = players.filter(p => !p.isGM);

  gamePlayers.forEach((p, i) => {
    playerStates[p.id] = {
      id: p.id,
      name: p.name,
      isGM: false,
      characterId: null,
      position: startPositions[i] || '档案馆',
      actionPoints: 3,
      clueCards: [],
      itemCards: [],
      locked: false,
    };
  });

  return {
    phase: 'playing',
    currentDay: 1,
    players: playerStates,
    regions: REGIONS,
    gameLog: [],
    dayStarted: false,
  };
}

// ---- 移动玩家 ----
function movePlayer(gameState, playerId, targetRegion) {
  const player = gameState.players[playerId];
  if (!player) return { error: '玩家不存在' };
  if (player.locked) return { error: '你已锁定，无法行动' };
  if (player.actionPoints < 1) return { error: '行动点不足' };
  if (!REGIONS.includes(targetRegion)) return { error: '无效的区域' };
  if (player.position === targetRegion) return { error: '你已在此区域' };

  const newPlayers = {
    ...gameState.players,
    [playerId]: {
      ...player,
      position: targetRegion,
      actionPoints: player.actionPoints - 1,
      locked: player.actionPoints - 1 <= 0,
    }
  };

  return {
    gameState: {
      ...gameState,
      players: newPlayers,
      gameLog: [...gameState.gameLog, `${player.name} 移动到 ${targetRegion}`]
    },
    public: true,
  };
}

// ---- 全员锁定检查 ----
function allPlayersLocked(gameState) {
  return Object.values(gameState.players).every(p => p.locked);
}

// ---- 推进下一天 ----
// 重置AP+锁+每日忏悔书使用次数
function advanceDay(gameState) {
  const nextDay = gameState.currentDay + 1;
  const resetPlayers = {};
  Object.entries(gameState.players).forEach(([id, p]) => {
    resetPlayers[id] = { ...p, actionPoints: 3, locked: false };
  });

  return {
    ...gameState,
    currentDay: nextDay,
    players: resetPlayers,
    _dailyConfessions: {},   // 重置每日忏悔书
    _pendingArchive: {},     // 清理残留的档案馆待选
    gameLog: [...gameState.gameLog, `=== 第 ${nextDay} 天 ===`],
  };
}

// ---- 信息隔离视图 ----
// GM：全量数据（所有手牌+真相值）
// 玩家：仅己方手牌+他人公开位置
function buildPlayerView(gameState, playerId, isGM) {
  if (isGM) {
    return {
      isGM: true,
      phase: gameState.phase,
      currentDay: gameState.currentDay,
      regions: gameState.regions,
      gameLog: gameState.gameLog || [],
      players: Object.values(gameState.players).map(pl => ({
        id: pl.id, name: pl.name, position: pl.position,
        actionPoints: pl.actionPoints, locked: pl.locked,
        clueCount: pl.clueCards.length, itemCount: pl.itemCards.length,
      })),
      allPlayerHands: Object.fromEntries(
        Object.entries(gameState.players).map(([id, pl]) => [
          id, { clues: pl.clueCards.map(c => c.title), items: pl.itemCards.map(i => i.name) }
        ])
      ),
      truthScore: calculateTruthScore(gameState),
    };
  }

  const p = gameState.players[playerId];
  if (!p) return null;

  return {
    isGM: false,
    phase: gameState.phase,
    currentDay: gameState.currentDay,
    myPosition: p.position,
    myActionPoints: p.actionPoints,
    myClueCards: p.clueCards || [],
    myItemCards: p.itemCards || [],
    myLocked: p.locked || false,
    players: Object.values(gameState.players).map(pl => ({
      id: pl.id, name: pl.name, position: pl.position,
      actionPoints: pl.actionPoints, locked: pl.locked,
      clueCount: pl.clueCards.length, itemCount: pl.itemCards.length,
    })),
    regions: gameState.regions,
    gameLog: gameState.gameLog || [],
  };
}

// ---- 真相值估算（仅用于GM面板展示）----
function calculateTruthScore(gameState) {
  let totalClues = 0;
  Object.values(gameState.players).forEach(p => { totalClues += p.clueCards.length; });
  return Math.min(totalClues / 12, 1.0);
}

// ---- 同区域玩家查询 ----
function getPlayersInRegion(gameState, region) {
  return Object.values(gameState.players)
    .filter(p => p.position === region)
    .map(p => ({ id: p.id, name: p.name }));
}

module.exports = { REGIONS, initGame, movePlayer, advanceDay, allPlayersLocked, buildPlayerView, getPlayersInRegion };
