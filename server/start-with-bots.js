// ========================================
// 一键启动脚本 — 启动服务端 + 自动注入虚拟玩家（多房间版）
// ========================================
// ========================================
const { spawn } = require('child_process');
const { WebSocket } = require('ws');

console.log('🚀 启动平台服务端...');
const server = spawn('node', ['index.js'], { cwd: __dirname, stdio: 'inherit' });

setTimeout(() => {
  console.log('\n🔍 扫描可用房间...');
  checkAndInject();
}, 2000);

function checkAndInject() {
  const ws = new WebSocket('ws://localhost:3000');
  let authed = false;

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'auth_skip', payload: {} }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'auth_ok') {
      authed = true;
    }

    if (msg.type === 'room_list') {
      const rooms = msg.payload.rooms || [];
      const available = rooms.filter(r => !r.gameStarted && r.playerCount < r.maxPlayers);

      if (available.length > 0) {
        const target = available[0];
        const slotsLeft = target.maxPlayers - target.playerCount;
        console.log(`✅ 找到房间: "${target.name}" (${target.playerCount}/${target.maxPlayers}人, 需${slotsLeft}人)`);
        ws.close();
        injectBots(target.roomId, slotsLeft);
      } else if (rooms.length > 0) {
        console.log('⚠️ 所有房间已满/已开始, 5秒后重试...');
        ws.close();
        setTimeout(checkAndInject, 5000);
      } else {
        console.log('⏳ 等待房主创建房间... (5秒后重试)');
        ws.close();
        setTimeout(checkAndInject, 5000);
      }
    }
  });

  ws.on('error', () => {
    console.log('⏳ 服务端未就绪, 重试...');
    setTimeout(checkAndInject, 2000);
  });
}

function injectBots(roomId, count) {
  const allNames = ['洛根', '艾琳', '马库斯', '塞拉', '莉迪亚', '达米安'];
  const names = allNames.slice(0, Math.min(count, 6));
  const bots = [];
  let started = false;

  console.log(`\n🤖 注入 ${names.length} 名机器人到房间 ${roomId}...\n`);

  names.forEach((name, i) => {
    setTimeout(() => {
      const w = new WebSocket('ws://localhost:3000');

      w.on('open', () => {
        w.send(JSON.stringify({ type: 'auth_skip', payload: {} }));
      });

      w.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        // 认证成功后加入房间
        if (msg.type === 'auth_ok') {
          console.log(`  [${name}] 已认证, 加入房间`);
          w.send(JSON.stringify({ type: 'join_room', payload: { roomId, playerName: name } }));
        }

        if (msg.type === 'script_selected') {
          console.log(`  [${name}] 📖 房主选择了剧本: ${msg.payload.scriptId}`);
        }

        if (msg.type === 'game_start' && !started) {
          started = true;
          console.log('\n🎮 游戏开始! 机器人自动行动...\n');

          // 移动到各自区域
          setTimeout(() => {
            bots.forEach((b, idx) => {
              if (b.ws.readyState !== 1) return;
              const targets = ['档案馆', '黑市', '真理祭坛', '星陨遗迹', '封印基座', '圣殿'];
              setTimeout(() => {
                b.ws.send(JSON.stringify({ type: 'move', payload: { targetRegion: targets[idx] } }));
                console.log(`  [${b.name}] 🚶 → ${targets[idx]}`);
              }, idx * 300);
            });
          }, 1500);

          // 搜索
          setTimeout(() => {
            bots.forEach((b, idx) => {
              if (b.ws.readyState !== 1) return;
              setTimeout(() => {
                b.ws.send(JSON.stringify({ type: 'search', payload: {} }));
                console.log(`  [${b.name}] 🔍 搜索`);
              }, idx * 400);
            });
          }, 3500);

          // 结束回合
          setTimeout(() => {
            bots.forEach(b => {
              if (b.ws.readyState === 1) {
                b.ws.send(JSON.stringify({ type: 'end_turn', payload: {} }));
                console.log(`  [${b.name}] ✅ 结束回合`);
              }
            });
          }, 7000);
        }

        // D5 投票
        if (msg.type === 'voting_start') {
          const votes = ['A', 'B', 'B', 'B', 'C', 'B'];
          const idx = bots.findIndex(b => b.ws === w);
          const vote = votes[idx] || 'B';
          setTimeout(() => {
            if (w.readyState === 1) {
              w.send(JSON.stringify({ type: 'vote_ending', payload: { choice: vote } }));
              console.log(`  [${name}] 🗳️ 投票: ${vote}`);
            }
          }, idx * 500);
        }

        if (msg.type === 'ending') {
          console.log(`  [${name}] 🏁 结局: ${msg.payload.title}`);
        }
      });

      bots.push({ ws: w, name });
    }, i * 300);
  });

  setTimeout(() => {
    console.log('\n================================');
    console.log(`  ${names.length}名机器人已就位`);
    console.log('  GM可以开始游戏!');
    console.log('================================\n');
  }, names.length * 300 + 500);
}

process.on('SIGINT', () => {
  server.kill();
  process.exit();
});
