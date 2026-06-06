// ========================================
// 卡牌系统 — 搜索线索、交换线索、12种道具效果策略、交易赠送、密室钥匙联合开启
// ========================================

// ---- 道具效果策略映射表 ----
// 每张道具卡存储 effectType，后端通过此表查找执行函数
const itemEffectHandlers = {
  move_free(state, playerId) {
    const p = state.players[playerId];
    if (!p) return { error: '玩家不存在' };
    p.actionPoints += 2;
    return { success: true, log: `${p.name}使用守夜人之徽，获得额外移动点数` };
  },
  search_double(state, playerId) {
    const p = state.players[playerId];
    if (!p) return { error: '玩家不存在' };
    p._searchDouble = true;
    return { success: true, log: `${p.name}使用残缺手稿，下次搜索保留两张线索` };
  },
  reset_card(state, playerId) {
    const p = state.players[playerId];
    if (!p) return { error: '玩家不存在' };
    p.actionPoints = Math.min(p.actionPoints + 1, 3);
    p.locked = false;
    return { success: true, log: `${p.name}翻转虚空沙漏，时间倒流！恢复1AP` };
  },
  cancel_item(state, playerId) {
    return { success: true, log: '星陨之刃出鞘！契约被斩断' };
  },
  heal_toxin(state, playerId) {
    const p = state.players[playerId];
    if (!p) return { error: '玩家不存在' };
    p._toxinImmune = true;
    return { success: true, log: `${p.name}使用生命之泉，免疫下次虚空毒素` };
  },
  extra_question(state, playerId) {
    const p = state.players[playerId];
    if (!p) return { error: '玩家不存在' };
    p._extraQuestion = true;
    return { success: true, log: `${p.name}翻开圣言书，获得额外提问权` };
  },
  view_random(state, playerId) {
    return { success: true, log: '符文解读镜启动，窥视他人线索列表' };
  },
  peek_exchange(state, playerId) {
    return { success: true, log: '星泪花提取物生效，双方各窥对方一张线索' };
  },
  hide_search(state, playerId) {
    const p = state.players[playerId];
    if (!p) return { error: '玩家不存在' };
    p._hideSearch = true;
    return { success: true, log: `${p.name}披上匿踪斗篷，本次搜索不公开` };
  },
  force_truth(state, playerId) {
    return { success: true, log: '真言契约生效！' };
  },
  toxin_immune(state, playerId) {
    const p = state.players[playerId];
    if (!p) return { error: '玩家不存在' };
    p._toxinImmune = true;
    return { success: true, log: `${p.name}使用虚空抑制药剂，封印基座免疫毒素` };
  },
  memory_recall(state, playerId) {
    return { success: true, log: '记忆水晶碎片闪烁，回溯已消耗道具的信息' };
  }
};

// ---- 搜索线索 ----
function searchClue(state, playerId, cluesById, regionPools) {
  const player = state.players[playerId];
  if (!player) return { error: '玩家不存在' };
  if (player.locked) return { error: '你已锁定' };
  if (player.actionPoints < 1) return { error: '行动点不足' };

  const region = player.position;
  const pool = regionPools[region];
  if (!pool || pool.length === 0) return { error: `${region}没有线索了` };

  const idx = Math.floor(Math.random() * pool.length);
  const clueId = pool.splice(idx, 1)[0];
  const clue = cluesById[clueId];
  if (!clue) return { error: '线索数据异常' };

  if (!player.clueCards) player.clueCards = [];
  player.clueCards.push({ id: clue.id, title: clue.title, content: clue.content });

  player.actionPoints -= 1;
  if (player.actionPoints <= 0) player.locked = true;

  // 封印基座毒素检测
  let toxinWarning = null;
  if (region === '封印基座' && !player._toxinImmune) {
    toxinWarning = '你受到了虚空毒素的侵蚀！（在封印基座搜索不免疫毒素）';
  }
  if (player._toxinImmune) player._toxinImmune = false;

  state.gameLog = state.gameLog || [];
  state.gameLog.push(`${player.name} 在${region}搜索，获得了线索"${clue.title}"`);

  return { success: true, clue, toxinWarning };
}

// ---- 交换线索 ----
function exchangeClues(state, fromId, toId, clueId) {
  const from = state.players[fromId];
  const to = state.players[toId];
  if (!from || !to) return { error: '玩家不存在' };
  if (from.position !== to.position) return { error: '双方不在同一区域' };
  if (from.locked) return { error: '你已锁定' };
  if (from.actionPoints < 1) return { error: '行动点不足' };

  const cardIndex = from.clueCards.findIndex(c => c.id === clueId);
  if (cardIndex === -1) return { error: '你没有这张线索卡' };
  if (to.clueCards.length === 0) return { error: '对方没有线索卡可交换' };

  const toIdx = Math.floor(Math.random() * to.clueCards.length);
  const fromCard = from.clueCards.splice(cardIndex, 1)[0];
  const toCard = to.clueCards.splice(toIdx, 1)[0];
  from.clueCards.push(toCard);
  to.clueCards.push(fromCard);

  from.actionPoints -= 1;
  if (from.actionPoints <= 0) from.locked = true;

  state.gameLog.push(`${from.name} 与 ${to.name} 在${from.position}交换了线索`);
  return { success: true, receivedClue: toCard, givenClue: fromCard };
}

// ---- 使用道具 ----
function useItem(state, playerId, itemId) {
  const player = state.players[playerId];
  if (!player) return { error: '玩家不存在' };
  if (player.locked) return { error: '你已锁定' };
  if (player.actionPoints < 1) return { error: '行动点不足' };

  const itemIndex = player.itemCards.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return { error: '你没有这个道具' };

  const item = player.itemCards[itemIndex];
  const handler = itemEffectHandlers[item.effectType];

  if (!handler) {
    // effectType 为 null 的道具（如钥匙）不可直接使用，需通过 use_key
    return { error: '此道具需要通过联合行动（use_key）使用' };
  }

  const result = handler(state, playerId);
  if (result.error) return result;

  player.itemCards.splice(itemIndex, 1);  // 一次性消耗
  player.actionPoints -= 1;
  if (player.actionPoints <= 0) player.locked = true;

  state.gameLog.push(result.log);
  return result;
}

// ---- 交易/赠送 ----
function tradeGift(state, fromId, toId, itemId, clueId) {
  const from = state.players[fromId];
  const to = state.players[toId];
  if (!from || !to) return { error: '玩家不存在' };
  if (from.position !== to.position) return { error: '双方不在同一区域' };
  if (from.locked) return { error: '你已锁定' };
  if (from.actionPoints < 1) return { error: '行动点不足' };

  if (itemId) {
    const idx = from.itemCards.findIndex(i => i.id === itemId);
    if (idx === -1) return { error: '你没有这个道具' };
    const item = from.itemCards[idx];
    if (item.bound) return { error: '绑定道具不可交易或赠送' };
    from.itemCards.splice(idx, 1);
    to.itemCards.push(item);
    state.gameLog.push(`${from.name}将${item.name}赠送给${to.name}`);
  }

  if (clueId) {
    const idx = from.clueCards.findIndex(c => c.id === clueId);
    if (idx === -1) return { error: '你没有这张线索卡' };
    const clue = from.clueCards.splice(idx, 1)[0];
    to.clueCards.push(clue);
    state.gameLog.push(`${from.name}将线索"${clue.title}"赠送给${to.name}`);
  }

  from.actionPoints -= 1;
  if (from.actionPoints <= 0) from.locked = true;
  return { success: true };
}

// ---- 密室钥匙联合开启 ----
function useKey(state, fromId, toId, itemsById, map) {
  const from = state.players[fromId];
  const to = state.players[toId];
  if (!from || !to) return { error: '玩家不存在' };
  if (from.position !== to.position) return { error: '双方不在同一区域' };

  const fromHasA = from.itemCards.some(i => i.id === 'item_012');
  const toHasB = to.itemCards.some(i => i.id === 'item_013');
  const fromHasB = from.itemCards.some(i => i.id === 'item_013');
  const toHasA = to.itemCards.some(i => i.id === 'item_012');

  if (!((fromHasA && toHasB) || (fromHasB && toHasA))) {
    return { error: '双方需要分别持有密室钥匙·A和密室钥匙·B' };
  }

  state.gameLog.push('密室开启！两把钥匙同时转动...');
  return {
    success: true,
    secretOpened: true,
    announceText: map.specialLocations['地下密室'].announceText
  };
}

module.exports = { searchClue, exchangeClues, useItem, tradeGift, useKey, itemEffectHandlers };
