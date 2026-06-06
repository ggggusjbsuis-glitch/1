// 房间大厅 — 简洁版创建/加入房间入口（硬编码服务器 IP）
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { getPlayerName, setPlayerName } from '../utils/storage';

const WS_URL = import.meta.env.VITE_WS_SERVER || 'ws://localhost:3000';

export default function RoomLobby() {
  const { state, sendMessage, connect, disconnect } = useGame();
  const navigate = useNavigate();
  const savedName = getPlayerName();
  const [rooms, setRooms] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState(savedName);
  const [playerName, setPlayerName] = useState(savedName);
  const [showJoinName, setShowJoinName] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!connected) {
      connect(WS_URL,
        { type: 'auth_skip', payload: {} },
        () => { setConnected(true); }
      );
    }
  }, []);

  useEffect(() => {
    const list = (state as any)._roomList;
    if (list) setRooms(list);
  }, [(state as any)._roomList]);

  useEffect(() => {
    if (state.roomId) navigate('/hall');
  }, [state.roomId, navigate]);

  const handleCreate = () => {
    if (!roomName.trim()) return;
    setError('');
    setPlayerName(roomName.trim());
    sendMessage({ type: 'create_room', payload: { roomName: roomName.trim(), playerName: roomName.trim() } });
    setShowCreate(false);
  };

  const handleJoin = (roomId: string) => {
    if (!playerName.trim()) { setShowJoinName(roomId); return; }
    setError('');
    setPlayerName(playerName.trim());
    sendMessage({ type: 'join_room', payload: { roomId, playerName: playerName.trim() } });
    setShowJoinName(null);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#060310] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ boxShadow: '0 0 20px rgba(179,71,234,0.4)' }} />
          <p className="text-gray-400 text-sm">连接服务器...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060310] flex flex-col px-4">
      <div className="py-6 text-center">
        <h1 className="text-2xl font-bold"
          style={{ background: 'linear-gradient(135deg, #e8ddf5 0%, #c0a8e0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          房间大厅
        </h1>
        <p className="text-gray-500 text-xs mt-1">服务器 {new URL(WS_URL).host}</p>
      </div>

      {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

      <div className="flex-1 space-y-3 pb-24">
        {rooms.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3" style={{ filter: 'drop-shadow(0 0 30px rgba(179,71,234,0.4))' }}>🚪</div>
            <p className="text-gray-600 text-sm">暂无房间</p>
            <p className="text-gray-700 text-xs mt-1">点击下方按钮创建一个</p>
          </div>
        )}
        {rooms.map((r: any) => (
          <div key={r.roomId}
            className={`card-enhanced rounded-2xl p-5 border-2 ${r.gameStarted ? 'border-white/5' : 'border-purple-500/20'}`}
            style={r.gameStarted
              ? { background: 'rgba(16,12,30,0.4)' }
              : { background: 'rgba(40,20,60,0.3)', boxShadow: '0 0 16px rgba(179,71,234,0.1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">{r.name}</h3>
                <p className="text-gray-500 text-xs mt-1">
                  {r.playerCount}/{r.maxPlayers} 人
                  {r.hasGM ? ' · 有房主' : ''}
                  {r.gameStarted ? ' · 游戏中' : ' · 等待中'}
                </p>
              </div>
              <button onClick={() => handleJoin(r.roomId)} disabled={r.gameStarted || r.playerCount >= r.maxPlayers}
                className="btn-glow px-5 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-30 transition-all"
                style={{ background: 'linear-gradient(135deg, #b347ea, #6b21d4)' }}>
                {r.gameStarted ? '已开始' : r.playerCount >= r.maxPlayers ? '已满' : '加入'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部操作 */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 z-10"
        style={{ background: 'rgba(10,6,22,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex gap-2 max-w-sm mx-auto">
          <button onClick={() => setShowCreate(true)}
            className="btn-glow flex-1 py-3 text-white rounded-xl text-sm font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #b347ea, #6b21d4)', boxShadow: '0 0 24px rgba(179,71,234,0.35)' }}>
            创建房间
          </button>
          <button onClick={() => { sendMessage({ type: 'leave_room', payload: {} }); disconnect(); navigate('/'); }}
            className="flex-1 py-3 rounded-xl text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#b0a4c0' }}>
            返回首页
          </button>
        </div>
      </div>

      {/* 创建房间弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowCreate(false)}>
          <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-purple-300 font-bold mb-4">创建房间</h2>
            <input type="text" placeholder="你的昵称（也是房间名）" value={roomName} onChange={e => setRoomName(e.target.value)} autoFocus
              className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 mb-4 focus:outline-none transition-all"
              style={{ background: 'rgba(10,6,22,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(179,71,234,0.4)'; e.target.style.boxShadow = '0 0 20px rgba(179,71,234,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; }} />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-3 text-white rounded-xl transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>取消</button>
              <button onClick={handleCreate} disabled={!roomName.trim()}
                className="btn-glow flex-1 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #b347ea, #6b21d4)' }}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 加入房间：输入昵称 */}
      {showJoinName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowJoinName(null)}>
          <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-purple-300 font-bold mb-4">输入昵称</h2>
            <input type="text" placeholder="你的昵称" value={playerName} onChange={e => setPlayerName(e.target.value)} autoFocus
              className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 mb-4 focus:outline-none transition-all"
              style={{ background: 'rgba(10,6,22,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(179,71,234,0.4)'; e.target.style.boxShadow = '0 0 20px rgba(179,71,234,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; }} />
            <div className="flex gap-3">
              <button onClick={() => setShowJoinName(null)}
                className="flex-1 py-3 text-white rounded-xl transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>取消</button>
              <button onClick={() => { handleJoin(showJoinName!); }} disabled={!playerName.trim()}
                className="btn-glow flex-1 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #b347ea, #6b21d4)' }}>加入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
