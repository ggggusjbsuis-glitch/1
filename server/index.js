// ========================================
// 服务端主入口 — Express静态托管 + WebSocket消息路由 + 多房间管理 + 游戏全流程（497行）
// ========================================

const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { initGame, movePlayer, advanceDay, allPlayersLocked, buildPlayerView } = require('./gameState');
const { searchClue, exchangeClues, useItem, tradeGift, useKey } = require('./cardSystem');
const { loadAllData, loadDailyScripts } = require('./dataLoader');
const { getScriptList, loadScript, validateScript } = require('./scriptManager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ---- 配置 ----
const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = { adminPassword:'admin123', adminUsername:'admin', maxPlayersPerRoom:6, port:3000 };
try { if (fs.existsSync(CONFIG_PATH)) config = JSON.parse(fs.readFileSync(CONFIG_PATH,'utf-8')); }
catch(e){ console.error('配置加载失败'); }

// ---- 多房间存储 ----
const rooms = new Map();  // roomId → { id, name, players:[], gameState, staticData, selectedScriptId, scriptData }
const pendingReconnects = new Map();  // playerToken → { roomId, pid, timeout, timestamp }

function getRoom(roomId) { return rooms.get(roomId); }
function getRoomList() {
  const list = [];
  rooms.forEach(r => {
    const gamePlayers = r.players.filter(p => !p.isGM);
    list.push({ roomId: r.id, name: r.name, playerCount: gamePlayers.length, maxPlayers: config.maxPlayersPerRoom, hasGM: r.players.some(p => p.isGM), gameStarted: !!r.gameState });
  });
  return list;
}

// ================================================================
// WebSocket
// ================================================================
wss.on('connection', (ws) => {
  const pid = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  ws._playerId = pid;
  ws._role = 'unauthenticated';
  ws._roomId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch(e) { return; }

    // === 认证 ===
    if (msg.type === 'auth_skip') {
      const { playerToken, playerName } = msg.payload || {};
      ws._playerToken = playerToken || null;

      // 尝试恢复断线连接
      if (playerToken && pendingReconnects.has(playerToken)) {
        const pr = pendingReconnects.get(playerToken);
        clearTimeout(pr.timeout);
        pendingReconnects.delete(playerToken);

        const room = rooms.get(pr.roomId);
        if (room) {
          const player = room.players.find(p => p.id === pr.pid);
          if (player) {
            player.ws = ws;  // 替换为新的 WebSocket 引用
            ws._playerId = pr.pid;
            ws._role = 'player';
            ws._roomId = pr.roomId;

            if (room.gameState?.players[pr.pid]) {
              room.gameState.players[pr.pid].locked = false;
              room.gameState.players[pr.pid].actionPoints = 3;
            }

            sendTo(ws, { type: 'reconnect_ok', payload: {
              playerId: pr.pid, roomId: pr.roomId, isGM: !!player.isGM,
              phase: room.gameState?.phase || 'lobby',
              currentDay: room.gameState?.currentDay || 0,
            }});

            if (room.gameState) {
              room.gameState.gameLog.push(`${player.name} 重新连接`);
              broadcastRoom(room, { type: 'player_reconnected', payload: { playerId: pr.pid, name: player.name } });
              broadcastRoomState(room);
            }

            broadcastGlobalRoomList();
            return;
          }
        }
      }

      // 正常新连接
      ws._role = 'player';
      sendTo(ws, { type:'auth_ok', payload:{ role:'player', playerId: pid } });
      sendTo(ws, { type:'room_list', payload:{ rooms: getRoomList() } });
      return;
    }
    if (msg.type === 'auth_login') {
      const { username, password } = msg.payload || {};
      if (username === config.adminUsername && password === config.adminPassword) {
        ws._role = 'admin';
        sendTo(ws, { type:'auth_ok', payload:{ role:'admin', playerId: pid } });
        // 管理员登录后推送房间列表 + 剧本列表
        sendTo(ws, { type:'room_list', payload:{ rooms: getRoomList() } });
        sendTo(ws, { type:'script_list', payload:{ scripts: getScriptList() } });
      } else {
        sendTo(ws, { type:'auth_fail', payload:{ message:'用户名或密码错误' } });
      }
      return;
    }
    if (ws._role === 'unauthenticated') {
      sendTo(ws, { type:'error', payload:{ message:'请先登录或跳过登录' } });
      return;
    }

    // === 权限守卫 ===
    const isAdmin = ws._role === 'admin';
    const room = ws._roomId ? getRoom(ws._roomId) : null;
    const me = room?.players?.find(p => p.id === ws._playerId);

    // GM 不能执行玩家操作
    const playerActions = ['move','search','exchange','use_item','trade_gift','use_key',
      'end_turn','ask_god','archive_search','archive_pick','black_market','confession_reveal','vote_ending'];
    if (playerActions.includes(msg.type) && me?.isGM) {
      sendTo(ws, { type:'error', payload:{ message:'GM不能执行玩家操作' } }); return;
    }

    // 管理员专属
    if (['admin_add_script','admin_delete_script'].includes(msg.type) && !isAdmin) {
      sendTo(ws, { type:'error', payload:{ message:'权限不足' } }); return;
    }

    // 需要房间的操作
    const needsRoom = ['select_script','start_game','player_ready','kick_player','gm_next_day','gm_trigger','gm_force_end'];
    if (needsRoom.includes(msg.type) && !room) {
      sendTo(ws, { type:'error', payload:{ message:'请先加入房间' } }); return;
    }

    switch (msg.type) {

      // ========================================================
      // 房间大厅
      // ========================================================

      case 'get_room_list':
        sendTo(ws, { type:'room_list', payload:{ rooms: getRoomList() } });
        break;

      case 'create_room':
        if (ws._roomId) { sendTo(ws, { type:'error', payload:{ message:'你已在房间中' } }); return; }
        const newRoomId = Date.now().toString(36);
        const newRoom = {
          id: newRoomId,
          name: msg.payload.roomName || (msg.payload.playerName + '的房间'),
          players: [{ id: pid, name: msg.payload.playerName, ws, isGM: true }],
          gameState: null, staticData: null, selectedScriptId: null, scriptData: null,
        };
        rooms.set(newRoomId, newRoom);
        ws._roomId = newRoomId;
        broadcastRoom(newRoom, { type:'room_update', payload:{ roomId:newRoomId, name:newRoom.name, players: formatRoomPlayers(newRoom) } });
        // 广播房间列表更新给所有人
        broadcastGlobalRoomList();
        break;

      case 'join_room':
        if (ws._roomId) { sendTo(ws, { type:'error', payload:{ message:'你已在房间中' } }); return; }
        const targetRoom = getRoom(msg.payload.roomId);
        if (!targetRoom) { sendTo(ws, { type:'error', payload:{ message:'房间不存在' } }); return; }
        if (targetRoom.gameState) { sendTo(ws, { type:'error', payload:{ message:'游戏已开始，无法加入' } }); return; }
        const nonGM = targetRoom.players.filter(p => !p.isGM);
        if (nonGM.length >= config.maxPlayersPerRoom) { sendTo(ws, { type:'error', payload:{ message:'房间已满' } }); return; }
        targetRoom.players.push({ id: pid, name: msg.payload.playerName, ws, isGM: false });
        ws._roomId = msg.payload.roomId;
        broadcastRoom(targetRoom, { type:'room_update', payload:{ roomId:targetRoom.id, name:targetRoom.name, players: formatRoomPlayers(targetRoom) } });
        broadcastGlobalRoomList();
        break;

      case 'leave_room':
        if (!room) return;
        const wasGM = me?.isGM;
        room.players = room.players.filter(p => p.id !== pid);
        ws._roomId = null;
        // GM离开 → 销毁房间
        if (wasGM || room.players.length === 0) {
          rooms.delete(room.id);
          broadcastGlobalRoomList();
          sendTo(ws, { type:'room_list', payload:{ rooms: getRoomList() } });
          return;
        }
        broadcastRoom(room, { type:'room_update', payload:{ roomId:room.id, name:room.name, players: formatRoomPlayers(room) } });
        broadcastGlobalRoomList();
        sendTo(ws, { type:'room_list', payload:{ rooms: getRoomList() } });
        break;

      // ========================================================
      // 剧本大厅（在房间内操作）
      // ========================================================

      case 'get_script_list':
        sendTo(ws, { type:'script_list', payload:{ scripts: getScriptList() } });
        break;

      case 'select_script':
        if (!room) return; if (!me?.isGM) { sendTo(ws, { type:'error', payload:{ message:'仅房主可选剧本' } }); return; }
        room.selectedScriptId = msg.payload.scriptId;
        room.scriptData = loadScript(msg.payload.scriptId);
        broadcastRoom(room, { type:'script_selected', payload:{ scriptId: msg.payload.scriptId, title: room.scriptData?.title || msg.payload.scriptId } });
        break;

      case 'player_ready':
        if (!room || !me || me.isGM) return;
        me._ready = !me._ready;
        broadcastRoom(room, { type:'player_ready_update', payload:{ playerId:pid, name:me.name, ready:me._ready } });
        break;

      // ========================================================
      // 管理员：剧本管理
      // ========================================================

      case 'admin_add_script':
        try {
          const s = msg.payload.scriptData;
          const v = validateScript(s);
          if (!v.valid) { sendTo(ws, { type:'error', payload:{ message:'校验失败:'+v.errors.join(',') } }); return; }
          fs.writeFileSync(path.join(__dirname,'scripts',(s.scriptId||'s_'+Date.now().toString(36))+'.json'), JSON.stringify(s,null,2));
          sendTo(ws, { type:'admin_script_added', payload:{ scriptId:s.scriptId, message:'已添加:'+(s.title||s.scriptId) } });
        } catch(e) { sendTo(ws, { type:'error', payload:{ message:'失败:'+e.message } }); }
        break;

      case 'admin_delete_script':
        try {
          const fp = path.join(__dirname,'scripts',msg.payload.scriptId+'.json');
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
          sendTo(ws, { type:'admin_script_deleted', payload:{ scriptId:msg.payload.scriptId, message:'已删除' } });
        } catch(e) { sendTo(ws, { type:'error', payload:{ message:'失败:'+e.message } }); }
        break;

      case 'admin_list_scripts':
        sendTo(ws, { type:'script_list', payload:{ scripts: getScriptList() } });
        break;

      // ========================================================
      // 房间内：踢人
      // ========================================================

      case 'kick_player':
        if (!room) return;
        if (!me?.isGM && !isAdmin) { sendTo(ws, { type:'error', payload:{ message:'仅房主/管理员可踢人' } }); return; }
        const kt = room.players.find(p => p.id === msg.payload.targetId);
        if (!kt) { sendTo(ws, { type:'error', payload:{ message:'目标不存在' } }); return; }
        if (kt.isGM && !isAdmin) { sendTo(ws, { type:'error', payload:{ message:'不能踢房主' } }); return; }
        sendTo(kt.ws, { type:'kicked', payload:{ message:'你被移出房间' } });
        kt.ws.close();
        room.players = room.players.filter(p => p.id !== msg.payload.targetId);
        broadcastRoom(room, { type:'room_update', payload:{ roomId:room.id, name:room.name, players: formatRoomPlayers(room) } });
        break;

      // ========================================================
      // 游戏开始
      // ========================================================

      case 'start_game':
        if (!room) return; if (!me?.isGM) return;
        // 至少需要1名非GM玩家
        const nonGMPlayers = room.players.filter(p => !p.isGM);
        if (nonGMPlayers.length === 0) { sendTo(ws, { type:'error', payload:{ message:'至少需要1名玩家才能开始' } }); return; }
        if (!room.staticData) {
          if (room.scriptData) {
            const cbi = {}; room.scriptData.clues.forEach(c => { cbi[c.id] = c; });
            const ibi = {}; room.scriptData.items.forEach(i => { ibi[i.id] = i; });
            const rp = {}; Object.entries(room.scriptData.map.regionCluePools).forEach(([r,ids]) => { rp[r] = [...ids]; });
            room.staticData = { clues:cbi, items:ibi, map:room.scriptData.map, regionPools:rp };
          } else { room.staticData = loadAllData(); }
        }
        room.gameState = initGame(room.players);
        room.gameState._markers = { secretOpened:false, confessionRevealed:false, betrayerExposed:false, thirdPathAttempted:false };
        room.gameState._votes = {}; room.gameState._dailyConfessions = {};
        const roleOrder = ['role_1','role_2','role_3','role_4','role_5','role_6']; let ri = 0;
        room.players.forEach((p) => {
          if (p.isGM) return;
          const ps = room.gameState.players[p.id]; if (!ps) return;
          ps.characterId = roleOrder[ri++];
          ps.clueCards = []; ps.itemCards = [];
          if (room.staticData.clues) Object.values(room.staticData.clues).forEach(c => { if (c.region==='initial'&&c.initialHolder===ps.characterId) ps.clueCards.push({ id:c.id, title:c.title, content:c.content }); });
          if (room.staticData.items) Object.values(room.staticData.items).forEach(i => { if (i.initialHolder===ps.characterId) ps.itemCards.push({ id:i.id, name:i.name, effectType:i.effectType, effect:i.effect, bound:i.bound }); });
        });
        const d1s = loadDailyScripts(1);
        room.players.forEach((p) => {
          const rid = room.gameState.players[p.id]?.characterId;
          sendTo(p.ws, { type:'game_start', payload:{ ...buildPlayerView(room.gameState, p.id, p.isGM), playerId:p.id, dailyScript: d1s[rid]||null } });
        });
        break;

      // ========================================================
      // 玩家行动（需要 room + gameState）
      // ========================================================

      case 'move': {
        if (!room?.gameState) return;
        const r = movePlayer(room.gameState, ws._playerId, msg.payload.targetRegion);
        if (r.error) { sendTo(ws, { type:'error', payload:{ message:r.error } }); return; }
        room.gameState = r.gameState; broadcastRoomState(room); break;
      }
      case 'search': {
        if (!room?.gameState || !room.staticData) return;
        const r = searchClue(room.gameState, ws._playerId, room.staticData.clues, room.staticData.regionPools);
        if (r.error) { sendTo(ws, { type:'error', payload:{ message:r.error } }); return; }
        sendTo(ws, { type:'search_result', payload:{ clue:r.clue } });
        if (r.toxinWarning) sendTo(ws, { type:'error', payload:{ message:r.toxinWarning } });
        broadcastRoomState(room); break;
      }
      case 'archive_search': {
        if (!room?.gameState || !room.staticData) return;
        const ap = room.gameState.players[ws._playerId];
        if (!ap||ap.locked||ap.actionPoints<1) { sendTo(ws,{type:'error',payload:{message:'AP不足'}}); return; }
        if (ap.position!=='档案馆') { sendTo(ws,{type:'error',payload:{message:'仅档案馆'}}); return; }
        const pool = room.staticData.regionPools['档案馆'];
        if (!pool||pool.length<2) { const fb=searchClue(room.gameState,ws._playerId,room.staticData.clues,room.staticData.regionPools); if(fb.error){sendTo(ws,{type:'error',payload:{message:fb.error}});return;} sendTo(ws,{type:'search_result',payload:{clue:fb.clue}}); broadcastRoomState(room); return; }
        const i1=Math.floor(Math.random()*pool.length),c1=pool.splice(i1,1)[0];
        const i2=Math.floor(Math.random()*pool.length),c2=pool.splice(i2,1)[0];
        const cd1=room.staticData.clues[c1],cd2=room.staticData.clues[c2];
        if(!cd1||!cd2){sendTo(ws,{type:'error',payload:{message:'线索异常'}});return;}
        if(!room.gameState._pendingArchive) room.gameState._pendingArchive={};
        room.gameState._pendingArchive[ws._playerId]={card1:cd1,card2:cd2,pool};
        sendTo(ws,{type:'archive_choice',payload:{options:[{id:cd1.id,title:cd1.title},{id:cd2.id,title:cd2.title}]}}); break;
      }
      case 'archive_pick': {
        if(!room?.gameState?._pendingArchive?.[ws._playerId]){sendTo(ws,{type:'error',payload:{message:'无待选'}});return;}
        const pn=room.gameState._pendingArchive[ws._playerId];
        const pk=msg.payload.pickedId;
        const picked=(pn.card1.id===pk)?pn.card1:pn.card2;
        const discarded=(pn.card1.id===pk)?pn.card2:pn.card1;
        const pp=room.gameState.players[ws._playerId];
        pp.clueCards.push({id:picked.id,title:picked.title,content:picked.content});
        pp.actionPoints-=1; if(pp.actionPoints<=0)pp.locked=true;
        pn.pool.push(discarded.id);
        room.gameState.gameLog.push(`${pp.name}获得"${picked.title}"(放弃"${discarded.title}")`);
        delete room.gameState._pendingArchive[ws._playerId];
        sendTo(ws,{type:'search_result',payload:{clue:picked,discardedTitle:discarded.title}});
        broadcastRoomState(room); break;
      }
      case 'exchange': {
        if(!room?.gameState)return;
        const r=exchangeClues(room.gameState,ws._playerId,msg.payload.targetPlayerId,msg.payload.clueId);
        if(r.error){sendTo(ws,{type:'error',payload:{message:r.error}});return;}
        sendTo(ws,{type:'exchange_result',payload:{receivedClue:r.receivedClue}});
        const tw=room.players.find(p=>p.id===msg.payload.targetPlayerId)?.ws;
        if(tw)sendTo(tw,{type:'exchange_result',payload:{receivedClue:r.givenClue}});
        broadcastRoomState(room); break;
      }
      case 'use_item': {
        if(!room?.gameState)return;
        const r=useItem(room.gameState,ws._playerId,msg.payload.itemId);
        if(r.error){sendTo(ws,{type:'error',payload:{message:r.error}});return;}
        sendTo(ws,{type:'item_result',payload:{success:true,effect:r.log}});
        broadcastRoomState(room); break;
      }
      case 'trade_gift': {
        if(!room?.gameState)return;
        const r=tradeGift(room.gameState,ws._playerId,msg.payload.targetPlayerId,msg.payload.itemId,msg.payload.clueId);
        if(r.error){sendTo(ws,{type:'error',payload:{message:r.error}});return;}
        broadcastRoomState(room); break;
      }
      case 'use_key': {
        if(!room?.gameState||!room.staticData)return;
        const r=useKey(room.gameState,ws._playerId,msg.payload.targetPlayerId,room.staticData.items,room.staticData.map);
        if(r.error){sendTo(ws,{type:'error',payload:{message:r.error}});return;}
        if(r.secretOpened){room.gameState._markers.secretOpened=true; broadcastRoomAll(room,{type:'secret_room_open',payload:{announceText:r.announceText}});}
        broadcastRoomState(room); break;
      }
      case 'end_turn': {
        if(!room?.gameState?.players[ws._playerId])return;
        room.gameState.players[ws._playerId].locked=true; room.gameState.players[ws._playerId].actionPoints=0;
        room.gameState.gameLog.push(`${room.gameState.players[ws._playerId].name} 结束行动`);
        broadcastRoomState(room);
        if(allPlayersLocked(room.gameState)) broadcastRoomAll(room,{type:'all_locked',payload:{}}); break;
      }

      // ========================================================
      // 忏悔/祭坛/黑市
      // ========================================================

      case 'confession_reveal':
        if(!room?.gameState)return;
        if(!room.gameState._dailyConfessions)room.gameState._dailyConfessions={};
        if(room.gameState._dailyConfessions[ws._playerId]){sendTo(ws,{type:'error',payload:{message:'今天已公示过'}});return;}
        room.gameState._dailyConfessions[ws._playerId]=true;
        if(!room.gameState._markers.confessionRevealed){room.gameState._markers.confessionRevealed=true;room.gameState.gameLog.push('忏悔书公之于众！真相+20%');}
        else room.gameState.gameLog.push(`${room.gameState.players[ws._playerId]?.name}再次公示忏悔书`);
        broadcastRoomState(room); break;

      case 'ask_god':
        if(!room?.gameState)return;
        const agp=room.gameState.players[ws._playerId];
        if(!agp||agp.locked||agp.actionPoints<2){sendTo(ws,{type:'error',payload:{message:'需要2AP'}});return;}
        if(agp.position!=='真理祭坛'){sendTo(ws,{type:'error',payload:{message:'仅真理祭坛'}});return;}
        if(!agp.clueCards?.length){sendTo(ws,{type:'error',payload:{message:'需要1线索'}});return;}
        const ccd=agp.clueCards.pop();agp.actionPoints-=2;if(agp.actionPoints<=0)agp.locked=true;
        if(!room.gameState._godQuestions)room.gameState._godQuestions=[];
        room.gameState._godQuestions.push({id:Date.now().toString(),playerId:ws._playerId,playerName:agp.name,question:msg.payload.question,consumedClueTitle:ccd.title});
        const gm=room.players.find(p=>p.isGM);
        if(gm)sendTo(gm.ws,{type:'god_question',payload:{questions:room.gameState._godQuestions}});
        sendTo(ws,{type:'god_asked',payload:{message:'问题已提交'}});
        broadcastRoomState(room); break;

      case 'god_reply':
        if(!room?.gameState?._godQuestions)return;
        const gm3=room.players.find(p=>p.id===ws._playerId);if(!gm3?.isGM)return;
        const qi=room.gameState._godQuestions.findIndex(q=>q.id===msg.payload.questionId);if(qi===-1)return;
        const gq=room.gameState._godQuestions.splice(qi,1)[0];
        const tpp=room.players.find(p=>p.id===gq.playerId);
        if(tpp)sendTo(tpp.ws,{type:'god_answer',payload:{question:gq.question,answer:msg.payload.answer,consumedClueTitle:gq.consumedClueTitle}});
        if(gm3)sendTo(gm3.ws,{type:'god_question',payload:{questions:room.gameState._godQuestions}});
        broadcastRoomState(room); break;

      case 'black_market':
        if(!room?.gameState||!room.staticData)return;
        const bmpp=room.gameState.players[ws._playerId];
        if(!bmpp||bmpp.locked||bmpp.actionPoints<1){sendTo(ws,{type:'error',payload:{message:'AP不足'}});return;}
        if(bmpp.position!=='黑市'){sendTo(ws,{type:'error',payload:{message:'仅黑市'}});return;}
        const bmpool=room.staticData.items?Object.values(room.staticData.items).filter(i=>i.source==='黑市'&&!i.initialHolder).map(i=>i.id):[];
        if(room.gameState._blackMarketPool)bmpool.push(...room.gameState._blackMarketPool);
        if(!bmpool.length){sendTo(ws,{type:'error',payload:{message:'黑市无道具'}});return;}
        const rri=Math.floor(Math.random()*bmpool.length),iid=bmpool.splice(rri,1)[0];
        const itm=room.staticData.items[iid];if(!itm){sendTo(ws,{type:'error',payload:{message:'道具异常'}});return;}
        bmpp.itemCards.push({id:itm.id,name:itm.name,effectType:itm.effectType,effect:itm.effect,bound:itm.bound});
        bmpp.actionPoints-=1;if(bmpp.actionPoints<=0)bmpp.locked=true;
        room.gameState.gameLog.push(`${bmpp.name}在黑市获得${itm.name}`);
        sendTo(ws,{type:'item_result',payload:{success:true,effect:`获得${itm.name}`}});
        broadcastRoomState(room); break;

      // ========================================================
      // GM操作
      // ========================================================

      case 'gm_next_day':
        if(!room?.gameState)return;if(!me?.isGM)return;
        if(room.gameState.currentDay>=5){sendTo(ws,{type:'error',payload:{message:'已是D5'}});return;}
        room.gameState=advanceDay(room.gameState);
        const day=room.gameState.currentDay;
        const scripts=loadDailyScripts(day);
        room.players.forEach((p)=>{if(p.isGM)return;const rid=room.gameState.players[p.id]?.characterId;if(!rid)return;sendTo(p.ws,{type:'daily_script',payload:scripts[rid]||{day,title:`第${day}天`,narrative:'(待补充)',actionGuide:'收集线索'}});});
        if(day===4)room.players.forEach((p)=>{if(p.isGM)return;const ps=room.gameState.players[p.id];if(!ps)return;if(ps.characterId==='role_1'){ps.itemCards.push({id:'item_012',name:'密室钥匙·A',effectType:null,effect:'与B联合开启',bound:false});sendTo(p.ws,{type:'item_result',payload:{success:true,effect:'收到密室钥匙·A'}});}if(ps.characterId==='role_2'){ps.itemCards.push({id:'item_013',name:'密室钥匙·B',effectType:null,effect:'与A联合开启',bound:false});sendTo(p.ws,{type:'item_result',payload:{success:true,effect:'发现密室钥匙·B'}});}});
        if(day===5)broadcastRoomAll(room,{type:'voting_start',payload:{options:['加固伊莱亚斯的封印','重建卡珊德拉的封印','第三条路:星泪花置换']}});
        broadcastRoomState(room); break;

      case 'gm_trigger':
        if(!room?.gameState)return;if(!me?.isGM)return;
        if(msg.payload.event==='memory_crystal_shard'){if(!room.gameState._blackMarketPool)room.gameState._blackMarketPool=[];room.gameState._blackMarketPool.push('item_014');room.gameState.gameLog.push('记忆水晶碎片入黑市');broadcastRoomState(room);}
        break;

      case 'gm_force_end':
        if(!room?.gameState)return;if(!me?.isGM)return;
        broadcastRoomAll(room,{type:'ending',payload:calculateEnding(room.gameState)});
        room.gameState.phase='ended'; break;

      // ========================================================
      // 投票
      // ========================================================

      case 'vote_ending':
        if(!room?.gameState)return;
        if(!room.gameState._votes)room.gameState._votes={};
        room.gameState._votes[ws._playerId]=msg.payload.choice;
        room.gameState.gameLog.push(`${room.gameState.players[ws._playerId]?.name}投出了抉择一票`);
        if(Object.keys(room.gameState._votes).length>=room.players.filter(p=>!p.isGM).length){
          broadcastRoomAll(room,{type:'ending',payload:calculateEnding(room.gameState)});
          room.gameState.phase='ended';
        }
        broadcastRoomState(room); break;
    }
  });

  // ---- 断开（延迟删除，给30秒重连窗口）----
  ws.on('close', () => {
    for (const [rid, r] of rooms) {
      const idx = r.players.findIndex(p => p.id === pid);
      if (idx !== -1) {
        const player = r.players[idx];
        const wasGM = player.isGM;
        const token = ws._playerToken || pid;

        const timeout = setTimeout(() => {
          pendingReconnects.delete(token);
          r.players = r.players.filter(p => p.id !== pid);
          if (wasGM || r.players.length === 0) {
            rooms.delete(rid);
            broadcastGlobalRoomList();
          } else {
            broadcastRoom(r, { type:'room_update', payload:{ roomId:r.id, name:r.name, players: formatRoomPlayers(r) } });
          }
          if (r.gameState?.players[pid]) {
            r.gameState.players[pid].locked = true;
            r.gameState.players[pid].actionPoints = 0;
            broadcastRoomState(r);
          }
          broadcastGlobalRoomList();
        }, 30000);

        pendingReconnects.set(token, { roomId: rid, pid, timeout, timestamp: Date.now() });

        if (r.gameState) {
          r.gameState.gameLog.push(`${player.name} 断开连接`);
          broadcastRoom(r, { type:'player_disconnected', payload: { playerId: pid, name: player.name, isGM: wasGM } });
        }

        break;
      }
    }
  });
});

// ================================================================
// 辅助
// ================================================================
function formatRoomPlayers(room) { return room.players.map(p => ({ id:p.id, name:p.name, isGM:p.isGM })); }
function broadcastRoom(room, msg) { const d = JSON.stringify(msg); room.players.forEach(p => { if (p.ws.readyState===1) p.ws.send(d); }); }
function broadcastRoomAll(room, msg) { broadcastRoom(room, msg); }
function broadcastRoomState(room) { if (!room.gameState) return; room.players.forEach(p => { const v = buildPlayerView(room.gameState, p.id, p.isGM); if (v) sendTo(p.ws, { type:'state_sync', payload:v }); }); }
function broadcastGlobalRoomList() {
  const list = getRoomList();
  wss.clients.forEach(c => { if (c._role === 'player' || c._role === 'admin') { try { c.send(JSON.stringify({ type:'room_list', payload:{ rooms: list } })); } catch(e) {} } });
}
function sendTo(ws, msg) { if (ws.readyState===1) ws.send(JSON.stringify(msg)); }

function calculateEnding(gameState) {
  const votes=gameState._votes||{};let a=0,b=0,c=0;
  Object.values(votes).forEach(v=>{if(v==='A')a++;else if(v==='B')b++;else if(v==='C')c++;});
  let tc=0;Object.values(gameState.players).forEach(p=>{tc+=(p.clueCards?.length||0);});
  const ts=Math.min((Math.min(tc/12,1))*0.6+(gameState._markers?.secretOpened?0.2:0)+(gameState._markers?.confessionRevealed?0.2:0),1);
  let bias='split';const tv=a+b+c;if(tv>0){if(a>b&&a>c)bias='A';else if(b>a&&b>c)bias='B';else if(c>a&&c>b)bias='C';}
  let eid,title;
  if(ts>=0.8){if(bias==='A'){eid='ending_1';title='圣徒线真结局';}else if(bias==='B'){eid='ending_2';title='叛徒线真结局';}else{eid='ending_3';title='混沌结局';}}
  else if(ts>=0.4){eid='ending_3';title='混沌结局';}
  else{eid=(gameState._markers?.betrayerExposed&&gameState._markers?.thirdPathAttempted)?'ending_3':'ending_4';title=eid==='ending_3'?'混沌结局(第三条路)':'迷失结局';}
  let text;try{text=fs.readFileSync(path.join(__dirname,'data','endings',eid+'.txt'),'utf-8');}catch(e){text=title;}
  return{endingId:eid,title,text,truthScore:Math.round(ts*100),votes:{a,b,c},bias,markers:{secretOpened:!!(gameState._markers?.secretOpened),confessionRevealed:!!(gameState._markers?.confessionRevealed),betrayerExposed:!!(gameState._markers?.betrayerExposed),thirdPathAttempted:!!(gameState._markers?.thirdPathAttempted)}};
}

function getLocalIPs(){const nets=os.networkInterfaces();const ips=[];for(const[name,addrs]of Object.entries(nets)){if(name.toLowerCase().includes('vpn')||name.toLowerCase().includes('loopback')||name.toLowerCase().includes('radmin'))continue;for(const net of addrs){if(net.family==='IPv4'&&!net.internal)ips.push({name,ip:net.address});}}return ips;}

// ================================================================
// 启动
// ================================================================
app.use(express.static(path.join(__dirname,'..','dist')));
server.listen(config.port, () => {
  const ips = getLocalIPs();
  console.log('\n=======================================');
  console.log('  剧本杀综合平台 v2.1 · 多房间');
  console.log('  本机: http://localhost:'+config.port);
  ips.forEach(({name,ip}) => console.log('  '+name+': http://'+ip+':'+config.port));
  console.log('  管理员: '+config.adminUsername+' / '+config.adminPassword);
  console.log('=======================================\n');
});
