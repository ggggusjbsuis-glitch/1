// ====================================
// 演示房间注入 — 启动时 Bot 自动创建演示房间 + 填充虚拟玩家
// ====================================
const DEMO_ROOMS = [
  { name: '星陨学院',    players: 6, gameStarted: false },
  { name: '末代帝王',    players: 6, gameStarted: true  },
  { name: '冰封灯塔',    players: 6, gameStarted: true  },
  { name: '深海实验室',  players: 6, gameStarted: false },
  { name: '血婚',        players: 6, gameStarted: true  },
];
// ====================================

const { WebSocket } = require('ws');
const SERVER = 'ws://localhost:3000';
let done = 0;

DEMO_ROOMS.forEach((room, i) => {
  setTimeout(() => {
    const host = new WebSocket(SERVER);
    host.on('open', () => host.send(JSON.stringify({ type:'auth_skip', payload:{} })));
    host.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'auth_ok') {
        host.send(JSON.stringify({ type:'create_room', payload:{ roomName:room.name, playerName:'房主' } }));
      }
      if (m.type === 'room_update' && m.payload.players?.some(p=>p.isGM)) {
        const filled = m.payload.players.filter(p=>!p.isGM).length;
        const need = room.players - 1 - filled;
        if (need <= 0) {
          done++;
          if (room.gameStarted) host.send(JSON.stringify({ type:'get_script_list', payload:{} }));
          if (done >= DEMO_ROOMS.length) console.log('全部虚拟房间已创建 ('+DEMO_ROOMS.length+'个) · 保持在线');
          return;
        }
        for (let j=0; j<need; j++) {
          const bot = new WebSocket(SERVER);
          bot.on('open', () => bot.send(JSON.stringify({ type:'auth_skip', payload:{} })));
          bot.on('message', (d2) => {
            const m2 = JSON.parse(d2.toString());
            if (m2.type === 'auth_ok') bot.send(JSON.stringify({ type:'join_room', payload:{ roomId:m.payload.roomId, playerName:'玩家'+(filled+j+1) } }));
          });
        }
      }
      if (m.type === 'script_list' && room.gameStarted) {
        host.send(JSON.stringify({ type:'select_script', payload:{ scriptId:'starfall_academy' } }));
      }
      if (m.type === 'script_selected') host.send(JSON.stringify({ type:'start_game', payload:{} }));
    });
  }, i * 800);
});

// 不退出，保持bot连接存活
