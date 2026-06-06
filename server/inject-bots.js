// Bot注入工具 — 注入6个虚拟玩家到指定房间
// 注入6个虚拟玩家
const { WebSocket } = require('ws');
const names = ['洛根','艾琳','马库斯','塞拉','莉迪亚','达米安'];
const bots = []; let started = false;

function inject() {
  names.forEach((n,i) => setTimeout(() => {
    const w = new WebSocket('ws://localhost:3000');
    w.on('open', () => { console.log('['+n+'] 加入'); w.send(JSON.stringify({ type:'join_room', payload:{playerName:n} })); bots.push({ws:w,n}); });
    w.on('message', (d2) => {
      const m2 = JSON.parse(d2.toString());
      if (m2.type==='game_start') { if(!started){ started=true;
        setTimeout(() => bots.forEach((b,i)=>{ if(b.ws.readyState===1){ const t=['档案馆','黑市','真理祭坛','星陨遗迹','封印基座','圣殿'][i]; setTimeout(()=>b.ws.send(JSON.stringify({ type:'move',payload:{targetRegion:t} })),i*300); }}),1500);
        setTimeout(() => bots.forEach((b,i)=>{ if(b.ws.readyState===1) setTimeout(()=>b.ws.send(JSON.stringify({ type:'search',payload:{} })),i*400); }),3500);
        setTimeout(() => bots.forEach(b=>{ if(b.ws.readyState===1) b.ws.send(JSON.stringify({ type:'end_turn',payload:{} })); }),7000);
      }}
      if (m2.type==='voting_start') { const v=['A','B','B','B','C','B']; const i=bots.findIndex(b=>b.ws===w); setTimeout(()=>w.send(JSON.stringify({ type:'vote_ending',payload:{choice:v[i]||'B'} })),i*500); }
    });
  }, i*200));
}

const ws = new WebSocket('ws://localhost:3000');
ws.on('open', () => ws.send(JSON.stringify({ type: 'join_room', payload: { playerName: '_CK_' } })));
ws.on('message', (d) => {
  const m = JSON.parse(d.toString());
  if (m.type==='room_update' && m.payload.players.some(p=>p.isGM)) { ws.close(); inject(); }
  else { ws.close(); setTimeout(() => { const ws2 = new WebSocket('ws://localhost:3000'); ws2.on('open', () => ws2.send(JSON.stringify({ type:'join_room', payload:{playerName:'_CK2_'} }))); ws2.on('message', (d2) => { const m2 = JSON.parse(d2.toString()); if (m2.type==='room_update' && m2.payload.players.some(p=>p.isGM)) { ws2.close(); inject(); } else { ws2.close(); console.log('无房主'); process.exit(1); } }); }, 2000); }
});
