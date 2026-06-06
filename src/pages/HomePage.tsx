// 首页 — 剧本库浏览 + 房间列表 + 创建/加入房间 + 管理员登录
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { getPlayerName, setPlayerName } from '../utils/storage';

const WS_URL = import.meta.env.VITE_WS_SERVER || 'ws://localhost:3000';

/* ============ 纯 CSS 粒子背景 ============ */
const PARTICLE_STYLES = `
@media (min-width: 768px) {
  .bg-particles { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
  .bg-particle {
    position: absolute; border-radius: 50%;
    animation: floatUp linear infinite;
    opacity: 0;
  }
  @keyframes floatUp {
    0%   { transform: translateY(105vh) scale(0); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(-15vh) scale(1); opacity: 0; }
  }
}
`;

export default function HomePage() {
  const { state, sendMessage, connect, disconnect } = useGame();
  const navigate = useNavigate();

  const [connected, setConnected] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const savedName = getPlayerName();
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState(savedName);
  const [playerName, setPlayerName] = useState(savedName);
  const [showJoinName, setShowJoinName] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('全部');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  // ======== 连接 ========
  useEffect(() => {
    if (!connected) {
      connect(WS_URL,
        { type: 'auth_skip', payload: {} },
        () => setConnected(true)
      );
    }
  }, []);
  useEffect(() => {
    if (connected) {
      sendMessage({ type: 'get_script_list', payload: {} });
      sendMessage({ type: 'get_room_list', payload: {} });
    }
  }, [connected]);

  // ======== 数据监听 ========
  useEffect(() => { const l = (state as any)._scriptList; if (l) setScripts(l); }, [(state as any)._scriptList]);
  useEffect(() => { const l = (state as any)._roomList; if (l) setRooms(l); }, [(state as any)._roomList]);
  useEffect(() => { if (state.roomId) navigate('/hall'); }, [state.roomId, navigate]);
  useEffect(() => { if ((state as any)._authRole === 'admin') { setShowAdminLogin(false); navigate('/admin'); } }, [(state as any)._authRole, navigate]);
  useEffect(() => { if ((state as any)._authResult === 'fail') setAdminError('用户名或密码错误'); }, [(state as any)._authResult]);

  // ======== 创建/加入房间 ========
  const handleCreateRoom = () => {
    if (!roomName.trim()) return;
    setPlayerName(roomName.trim());
    sendMessage({ type: 'create_room', payload: { roomName: roomName.trim(), playerName: roomName.trim() } });
    setShowCreate(false);
    setRoomName('');
  };
  const handleJoinRoom = (roomId: string) => {
    if (!playerName.trim()) { setShowJoinName(roomId); return; }
    setPlayerName(playerName.trim());
    sendMessage({ type: 'join_room', payload: { roomId, playerName: playerName.trim() } });
    setShowJoinName(null);
  };
  const handleRefresh = () => {
    sendMessage({ type: 'get_script_list', payload: {} });
    sendMessage({ type: 'get_room_list', payload: {} });
  };
  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };
  const handleAdminLogin = () => {
    if (!adminUser.trim() || !adminPass.trim()) return;
    setAdminError('');
    sendMessage({ type: 'auth_login', payload: { username: adminUser.trim(), password: adminPass } });
  };

  // ======== 筛选 ========
  const allTags = ['全部', ...Array.from(new Set(scripts.flatMap((s: any) => s.tags || [])))];
  const filteredScripts = scripts.filter((s: any) => {
    const tags: string[] = s.tags || [];
    const title = (s.title || s.name || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return (!q || title.includes(q) || tags.some(t => t.toLowerCase().includes(q)))
      && (activeTag === '全部' || tags.includes(activeTag));
  });

  // 封面渐变色板
  const coverColors: Record<string, { bg: string; accent: string; tagBg: string; tagColor: string; tagBorder: string }> = {
    '悬疑': { bg: 'linear-gradient(145deg, #1a0828 0%, #2d1060 40%, #1a0540 100%)', accent: '#a855f7', tagBg: 'rgba(168,85,247,0.15)', tagColor: '#c084fc', tagBorder: 'rgba(168,85,247,0.25)' },
    '推理': { bg: 'linear-gradient(145deg, #1a1005 0%, #3d2608 40%, #1a0e02 100%)', accent: '#c49b3f', tagBg: 'rgba(196,155,63,0.15)', tagColor: '#e0c060', tagBorder: 'rgba(196,155,63,0.25)' },
    '恐怖': { bg: 'linear-gradient(145deg, #1a0505 0%, #3d0a0a 40%, #1a0202 100%)', accent: '#ef4444', tagBg: 'rgba(239,68,68,0.15)', tagColor: '#f87171', tagBorder: 'rgba(239,68,68,0.25)' },
    '情感': { bg: 'linear-gradient(145deg, #021a10 0%, #063d22 40%, #021a0c 100%)', accent: '#3a9d6e', tagBg: 'rgba(58,157,110,0.15)', tagColor: '#6ec99a', tagBorder: 'rgba(58,157,110,0.25)' },
    '科幻': { bg: 'linear-gradient(145deg, #02101a 0%, #062840 40%, #020e1a 100%)', accent: '#60a5fa', tagBg: 'rgba(96,165,250,0.15)', tagColor: '#93c5fd', tagBorder: 'rgba(96,165,250,0.25)' },
    '欢乐': { bg: 'linear-gradient(145deg, #1a0e02 0%, #402a06 40%, #1a0a02 100%)', accent: '#f59e0b', tagBg: 'rgba(245,158,11,0.15)', tagColor: '#fbbf24', tagBorder: 'rgba(245,158,11,0.25)' },
    '奇幻': { bg: 'linear-gradient(145deg, #0a1020 0%, #1a2860 40%, #080e28 100%)', accent: '#818cf8', tagBg: 'rgba(129,140,248,0.15)', tagColor: '#a5b4fc', tagBorder: 'rgba(129,140,248,0.25)' },
  };
  const defaultCover = coverColors['悬疑'];

  // ======== 加载中 ========
  if (!connected) {
    return (
      <div style={{ minHeight: '100vh', background: '#060310', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 20px',
            border: '3px solid rgba(179,71,234,0.15)', borderRadius: '50%',
            borderTopColor: '#b347ea',
            animation: 'spin 0.8s linear infinite',
            boxShadow: '0 0 30px rgba(179,71,234,0.25)'
          }} />
          <p style={{ color: '#b0a4c0', fontSize: '0.95rem', fontWeight: 500 }}>正在连接服务器</p>
          <p style={{ color: '#7a6e8a', fontSize: '0.8rem', marginTop: 8 }}>{new URL(WS_URL).host}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060310', position: 'relative' }}>

      {/* ======== 背景光晕 ======== */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', filter: 'blur(150px)', opacity: 0.2, background: 'radial-gradient(circle, rgba(100,30,180,0.5), transparent 70%)', top: '-15%', left: '-10%' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', filter: 'blur(130px)', opacity: 0.15, background: 'radial-gradient(circle, rgba(30,20,120,0.5), transparent 70%)', bottom: '-10%', right: '-8%' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.12, background: 'radial-gradient(circle, rgba(200,50,50,0.4), transparent 70%)', top: '50%', left: '45%' }} />
      </div>

      {/* ======== 纯 CSS 粒子 ======== */}
      <div className="bg-particles" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-particle" style={{
            left: `${8 + Math.random() * 84}%`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: i % 3 === 0 ? '#c97df5' : i % 3 === 1 ? '#ff7755' : '#90b8f0',
            animationDuration: `${8 + Math.random() * 15}s`,
            animationDelay: `${Math.random() * 12}s`,
            boxShadow: `0 0 ${4 + Math.random() * 6}px currentColor`,
          }} />
        ))}
      </div>

      {/* ======== 主容器 ======== */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ======== 顶部导航 ======== */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(10,6,20,0.82)',
          backdropFilter: 'blur(32px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* 顶部光条 */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(179,71,234,0.3), rgba(255,77,46,0.2), rgba(179,71,234,0.3), transparent)' }} />

          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '12px 24px' }}>
            {/* 行1：Logo + 搜索 + 状态 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #b347ea, #6b21d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', boxShadow: '0 0 18px rgba(179,71,234,0.4)'
                }}>🎭</div>
                <span style={{
                  fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.04em',
                  background: 'linear-gradient(135deg, #e8ddf5, #c0a8e0)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  fontFamily: 'Georgia, "Noto Serif SC", serif'
                }}>幕间</span>
              </div>

              {/* 搜索栏 */}
              <div style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', opacity: 0.45 }}>🔍</span>
                <input
                  type="text" placeholder="搜索剧本名称或标签..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px 10px 40px', borderRadius: 24,
                    background: 'rgba(12,8,24,0.6)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#e8e0f0', fontSize: '0.88rem', outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(179,71,234,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(179,71,234,0.08), 0 0 24px rgba(179,71,234,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#7a6e8a', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 6px', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#7a6e8a'}>✕</button>
                )}
              </div>

              {/* 状态 + 操作 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#7a6e8a' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5eea8b', boxShadow: '0 0 8px rgba(94,234,139,0.5)' }} />
                  {rooms.length}房·{scripts.length}剧本
                </span>
                <button onClick={handleRefresh}
                  style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#7a6e8a', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#e8e0f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#7a6e8a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>刷新</button>
                <button onClick={() => { setAdminError(''); setAdminUser(''); setAdminPass(''); setShowAdminLogin(true); }}
                  style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#7a6e8a', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#e0c060'; e.currentTarget.style.borderColor = 'rgba(196,155,63,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#7a6e8a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>管理</button>
              </div>
            </div>

            {/* 行2：分类标签 */}
            {allTags.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {allTags.map(tag => {
                  const active = tag === activeTag;
                  return (
                    <button key={tag} onClick={() => setActiveTag(tag)}
                      style={{
                        padding: '5px 16px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                        border: '1px solid', cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
                        background: active ? 'rgba(179,71,234,0.22)' : 'transparent',
                        borderColor: active ? 'rgba(179,71,234,0.4)' : 'rgba(255,255,255,0.06)',
                        color: active ? '#e8ddf5' : '#8a7e9a',
                        boxShadow: active ? '0 0 16px rgba(179,71,234,0.15)' : 'none',
                        transform: active ? 'translateY(-1px)' : 'none',
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#b0a4c0'; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#8a7e9a'; } }}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* ======== 主布局 ======== */}
        <div style={{ flex: 1, maxWidth: 1440, margin: '0 auto', width: '100%', padding: '24px 24px 0' }}>
          <div className="resp-main-layout" style={{ display: 'flex', gap: 28 }}>

            {/* ======== 左：房间面板 ======== */}
            <aside className="resp-sidebar" style={{ flex: '0 0 330px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', color: '#8a7e9a', textTransform: 'uppercase' }}>我的房间</h2>
                {rooms.length > 0 && (
                  <span style={{ fontSize: '0.7rem', color: '#7a6e8a' }}>{rooms.length} 个</span>
                )}
              </div>

              {rooms.length === 0 ? (
                /* ---- 空态 ---- */
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 20, borderRadius: 18, padding: '40px 24px', textAlign: 'center',
                  background: 'rgba(16,12,30,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                  border: '2px dashed rgba(255,255,255,0.06)', minHeight: 340,
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* 辉光装饰 */}
                  <div style={{ position: 'absolute', inset: -60, background: 'radial-gradient(ellipse at center, rgba(179,71,234,0.06), transparent 60%)', animation: 'emptyGlow 5s ease-in-out infinite' }} />
                  <span style={{ fontSize: '3.5rem', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 25px rgba(179,71,234,0.3))', animation: 'doorFloat 4s ease-in-out infinite' }}>🚪</span>
                  <button onClick={() => setShowCreate(true)} style={{
                    position: 'relative', zIndex: 1, padding: '14px 44px', borderRadius: 50,
                    background: 'linear-gradient(135deg, #b347ea, #7c22ce)', border: 'none',
                    color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer',
                    boxShadow: '0 6px 28px rgba(179,71,234,0.45)', transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(179,71,234,0.6)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 28px rgba(179,71,234,0.45)'; }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'}>＋ 创建房间</button>
                  <p style={{ position: 'relative', zIndex: 1, fontSize: '0.8rem', color: '#7a6e8a' }}>创建房间，邀请好友一起进入剧本世界</p>
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 10, opacity: 0.3 }}>
                    {['🎪', '🔮', '🗝️'].map((e, i) => (
                      <div key={i} style={{
                        width: 70, height: 90, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.4rem', border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(30,22,50,0.3)',
                        animation: `cardFloat 3s ease-in-out ${i * 0.4}s infinite`
                      }}>{e}</div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ---- 房间列表 ---- */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 540, paddingRight: 2 }}>
                  <button onClick={() => setShowCreate(true)} style={{
                    padding: '12px 0', borderRadius: 50, border: 'none', color: '#fff', fontSize: '0.88rem', fontWeight: 700,
                    background: 'linear-gradient(135deg, #b347ea, #7c22ce)', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(179,71,234,0.35)', transition: 'all 0.25s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(179,71,234,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(179,71,234,0.35)'; }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}>＋ 创建房间</button>

                  {rooms.map((r: any, idx: number) => {
                    const isPlaying = r.gameStarted;
                    const pc = r.playerCount || 0;
                    const mp = r.maxPlayers || 6;
                    const canJoin = !isPlaying && pc < mp;
                    return (
                      <div key={r.roomId} style={{
                        background: 'rgba(16,12,30,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                        borderRadius: 16, padding: '16px 18px', cursor: 'pointer',
                        border: `1px solid ${isPlaying ? 'rgba(255,255,255,0.04)' : 'rgba(179,71,234,0.18)'}`,
                        transition: 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                        animation: `cardSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 0.05}s both`,
                        boxShadow: isPlaying ? 'none' : '0 0 20px rgba(179,71,234,0.06)',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = isPlaying ? 'rgba(255,255,255,0.08)' : 'rgba(179,71,234,0.35)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5), 0 0 28px rgba(179,71,234,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = isPlaying ? 'rgba(255,255,255,0.04)' : 'rgba(179,71,234,0.18)'; e.currentTarget.style.boxShadow = isPlaying ? 'none' : '0 0 20px rgba(179,71,234,0.06)'; }}>
                        {/* 标题 + 状态 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e0d8f0' }}>{r.name}</span>
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', fontWeight: 600,
                            padding: '3px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.25)',
                            border: `1px solid ${isPlaying ? 'rgba(240,160,64,0.2)' : 'rgba(94,234,139,0.2)'}`,
                            color: isPlaying ? '#f0a040' : '#5eea8b'
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: isPlaying ? '#f0a040' : '#5eea8b',
                              boxShadow: `0 0 8px ${isPlaying ? 'rgba(240,160,64,0.5)' : 'rgba(94,234,139,0.5)'}`,
                              animation: `dotPulse ${isPlaying ? 1.3 : 2}s ease-in-out infinite`
                            }} />
                            {isPlaying ? '游戏中' : '等待中'}
                          </span>
                        </div>
                        {/* 人数 + 房间码 */}
                        <div style={{ fontSize: '0.72rem', color: '#7a6e8a', marginBottom: 8 }}>
                          👥 {pc}/{mp}人 · <code style={{
                            fontSize: '0.7rem', fontFamily: '"SF Mono","Cascadia Code",monospace', letterSpacing: '0.06em',
                            color: '#c084fc', background: 'rgba(179,71,234,0.08)', padding: '2px 8px', borderRadius: 5
                          }}>{r.roomId?.slice(0, 6)}</code>
                        </div>
                        {/* 进度条 */}
                        <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', marginBottom: 10 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.min(100, pc / mp * 100)}%`,
                            background: `linear-gradient(90deg, ${isPlaying ? '#c49b3f' : '#b347ea'}, ${isPlaying ? '#e0c060' : '#c97df5'})`,
                            transition: 'width 0.5s cubic-bezier(0.32, 0.72, 0, 1)'
                          }} />
                        </div>
                        {/* 加入按钮 */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={e => { e.stopPropagation(); handleJoinRoom(r.roomId); }} disabled={!canJoin}
                            style={{
                              padding: '6px 20px', borderRadius: 14, fontSize: '0.72rem', fontWeight: 600, border: 'none', cursor: canJoin ? 'pointer' : 'not-allowed',
                              transition: 'all 0.25s ease',
                              background: canJoin ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.03)',
                              color: canJoin ? '#fff' : '#5a5068',
                              boxShadow: canJoin ? '0 0 14px rgba(99,102,241,0.25)' : 'none',
                            }}
                            onMouseEnter={e => { if (canJoin) { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.4)'; } }}
                            onMouseLeave={e => { if (canJoin) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 14px rgba(99,102,241,0.25)'; } }}
                            onMouseDown={e => { if (canJoin) e.currentTarget.style.transform = 'scale(0.95)'; }}>
                            {isPlaying ? '已开始' : !canJoin ? '已满' : '加入'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>

            {/* ======== 右：剧本库 ======== */}
            <main className="resp-script-area" style={{ flex: 1, minWidth: 0, paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', color: '#8a7e9a', textTransform: 'uppercase' }}>剧本库</h2>
                <span style={{ fontSize: '0.7rem', color: '#7a6e8a' }}>
                  {filteredScripts.length}{filteredScripts.length !== scripts.length ? ` / ${scripts.length}` : ''} 部
                </span>
              </div>

              {filteredScripts.length === 0 ? (
                <div style={{
                  borderRadius: 18, padding: '48px 24px', textAlign: 'center',
                  background: 'rgba(16,12,30,0.4)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                  border: '2px dashed rgba(255,255,255,0.05)',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{scripts.length === 0 ? '📖' : '🔍'}</div>
                  <p style={{ fontSize: '0.85rem', color: '#7a6e8a' }}>{scripts.length === 0 ? '暂无剧本，请联系管理员添加' : '没有匹配的剧本'}</p>
                  {scripts.length > 0 && <p style={{ fontSize: '0.75rem', color: '#5a5068', marginTop: 4 }}>试试其他关键词或标签</p>}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 18 }}>
                  {filteredScripts.map((s: any, idx: number) => {
                    const tags: string[] = s.tags || [];
                    const tag0 = tags[0] || '';
                    const c = coverColors[tag0] || defaultCover;
                    return (
                      <article key={s.scriptId || s.id || idx} style={{
                        background: 'rgba(16,12,30,0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
                        animation: `cardSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) ${idx * 0.04}s both`,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'rgba(179,71,234,0.35)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5), 0 0 36px rgba(179,71,234,0.18)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.35)'; }}>
                        {/* 封面 */}
                        <div style={{ height: 150, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0, background: c.bg }} />
                          {/* 装饰图案 */}
                          <svg viewBox="0 0 200 150" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.2 }}>
                            <circle cx="100" cy="75" r="55" fill="none" stroke={c.accent} strokeWidth="0.6" opacity="0.4" />
                            <circle cx="100" cy="75" r="35" fill="none" stroke={c.accent} strokeWidth="0.8" opacity="0.5" />
                            <circle cx="100" cy="75" r="18" fill={c.accent} opacity="0.25" />
                          </svg>
                          {/* 渐变覆盖 */}
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,3,16,0.78) 0%, transparent 60%)' }} />
                          {/* 光泽扫描 */}
                          <div style={{
                            position: 'absolute', top: '-60%', left: '-60%', width: '60%', height: '200%',
                            background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 65%)',
                            transform: 'skewX(-20deg)', animation: `shimmerScan 4s ease-in-out ${idx * 0.7}s infinite`
                          }} />
                          {/* 热门标记 */}
                          {idx < 3 && (
                            <span style={{
                              position: 'absolute', top: 10, right: 10, zIndex: 2,
                              padding: '3px 10px', borderRadius: 12, fontSize: '0.62rem', fontWeight: 700,
                              background: '#ff4d2e', color: '#fff',
                              boxShadow: '0 0 14px rgba(255,77,46,0.5)', animation: 'badgeGlow 2.5s ease-in-out infinite'
                            }}>🔥 热门</span>
                          )}
                        </div>
                        {/* 内容 */}
                        <div style={{ padding: '14px 16px' }}>
                          <h3 style={{
                            fontSize: '0.92rem', fontWeight: 700, marginBottom: 6, letterSpacing: '0.02em',
                            color: '#e8ddf5', fontFamily: 'Georgia, "Noto Serif SC", serif',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>{s.title || s.name}</h3>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                            {tags.slice(0, 2).map((t: string, i: number) => {
                              const tc = coverColors[t] || c;
                              return (
                                <span key={i} style={{
                                  fontSize: '0.62rem', padding: '2px 9px', borderRadius: 10,
                                  background: tc.tagBg, color: tc.tagColor, border: `1px solid ${tc.tagBorder}`,
                                  fontWeight: 500
                                }}>{t}</span>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: 14, fontSize: '0.7rem', color: '#7a6e8a' }}>
                            <span>👤 {s.playerCount || s.players || 6}人</span>
                            <span>⏱ {s.estimatedTime || s.duration || '?'}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        </div>

        {/* ======== 创建房间弹窗 ======== */}
        {showCreate && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'overlayIn 0.2s ease-out'
          }} onClick={() => setShowCreate(false)}>
            <div style={{
              width: '100%', maxWidth: 380, padding: '28px 26px', borderRadius: 20, position: 'relative',
              background: 'linear-gradient(165deg, #1a0f32 0%, #120a26 45%, #0c0618 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(179,71,234,0.15)',
              animation: 'modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(179,71,234,0.4), rgba(255,77,46,0.2), rgba(179,71,234,0.4), transparent)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c97df5', marginBottom: 18, fontFamily: 'Georgia, "Noto Serif SC", serif' }}>创建房间</h2>
              <input type="text" placeholder="你的昵称（也是房间名）" value={roomName}
                onChange={e => setRoomName(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom(); }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 18,
                  background: 'rgba(8,4,18,0.6)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e8e0f0', fontSize: '0.9rem', outline: 'none',
                  transition: 'all 0.25s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(179,71,234,0.4)'; e.target.style.boxShadow = '0 0 0 2px rgba(179,71,234,0.06)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowCreate(false)} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.03)', color: '#b0a4c0', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e8e0f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#b0a4c0'; }}>取消</button>
                <button onClick={handleCreateRoom} disabled={!roomName.trim()} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: roomName.trim() ? 'linear-gradient(135deg, #b347ea, #7c22ce)' : 'rgba(255,255,255,0.04)',
                  color: roomName.trim() ? '#fff' : '#5a5068', fontSize: '0.85rem', fontWeight: 600, cursor: roomName.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: roomName.trim() ? '0 0 20px rgba(179,71,234,0.3)' : 'none',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => { if (roomName.trim()) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(179,71,234,0.45)'; } }}
                  onMouseLeave={e => { if (roomName.trim()) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 20px rgba(179,71,234,0.3)'; } }}
                  onMouseDown={e => { if (roomName.trim()) e.currentTarget.style.transform = 'scale(0.97)'; }}>创建</button>
              </div>
            </div>
          </div>
        )}

        {/* ======== 加入房间弹窗 ======== */}
        {showJoinName && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'overlayIn 0.2s ease-out'
          }} onClick={() => setShowJoinName(null)}>
            <div style={{
              width: '100%', maxWidth: 380, padding: '28px 26px', borderRadius: 20, position: 'relative',
              background: 'linear-gradient(165deg, #1a0f32 0%, #120a26 45%, #0c0618 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(179,71,234,0.15)',
              animation: 'modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(179,71,234,0.4), rgba(255,77,46,0.2), rgba(179,71,234,0.4), transparent)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c97df5', marginBottom: 18, fontFamily: 'Georgia, "Noto Serif SC", serif' }}>加入房间</h2>
              <input type="text" placeholder="你的昵称" value={playerName}
                onChange={e => setPlayerName(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && playerName.trim()) handleJoinRoom(showJoinName!); }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 18,
                  background: 'rgba(8,4,18,0.6)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e8e0f0', fontSize: '0.9rem', outline: 'none',
                  transition: 'all 0.25s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(179,71,234,0.4)'; e.target.style.boxShadow = '0 0 0 2px rgba(179,71,234,0.06)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowJoinName(null)} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.03)', color: '#b0a4c0', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e8e0f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#b0a4c0'; }}>取消</button>
                <button onClick={() => handleJoinRoom(showJoinName!)} disabled={!playerName.trim()} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: playerName.trim() ? 'linear-gradient(135deg, #b347ea, #7c22ce)' : 'rgba(255,255,255,0.04)',
                  color: playerName.trim() ? '#fff' : '#5a5068', fontSize: '0.85rem', fontWeight: 600, cursor: playerName.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: playerName.trim() ? '0 0 20px rgba(179,71,234,0.3)' : 'none',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => { if (playerName.trim()) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(179,71,234,0.45)'; } }}
                  onMouseLeave={e => { if (playerName.trim()) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 20px rgba(179,71,234,0.3)'; } }}
                  onMouseDown={e => { if (playerName.trim()) e.currentTarget.style.transform = 'scale(0.97)'; }}>加入</button>
              </div>
            </div>
          </div>
        )}

        {/* ======== 管理员登录弹窗 ======== */}
        {showAdminLogin && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'overlayIn 0.2s ease-out'
          }} onClick={() => setShowAdminLogin(false)}>
            <div style={{
              width: '100%', maxWidth: 380, padding: '28px 26px', borderRadius: 20, position: 'relative',
              background: 'linear-gradient(165deg, #1a0f32 0%, #120a26 45%, #0c0618 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(196,155,63,0.15)',
              animation: 'modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1)'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(196,155,63,0.4), rgba(255,77,46,0.2), rgba(196,155,63,0.4), transparent)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e0c060', marginBottom: 18, fontFamily: 'Georgia, "Noto Serif SC", serif' }}>管理员登录</h2>
              {adminError && (
                <p style={{ color: '#e8746a', fontSize: '0.8rem', marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,77,46,0.08)', border: '1px solid rgba(255,77,46,0.15)' }}>{adminError}</p>
              )}
              <input type="text" placeholder="用户名" value={adminUser}
                onChange={e => { setAdminUser(e.target.value); setAdminError(''); }} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAdminLogin(); }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 12,
                  background: 'rgba(8,4,18,0.6)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e8e0f0', fontSize: '0.9rem', outline: 'none',
                  transition: 'all 0.25s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(196,155,63,0.4)'; e.target.style.boxShadow = '0 0 0 2px rgba(196,155,63,0.06)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }} />
              <input type="password" placeholder="密码" value={adminPass}
                onChange={e => { setAdminPass(e.target.value); setAdminError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleAdminLogin(); }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 18,
                  background: 'rgba(8,4,18,0.6)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#e8e0f0', fontSize: '0.9rem', outline: 'none',
                  transition: 'all 0.25s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(196,155,63,0.4)'; e.target.style.boxShadow = '0 0 0 2px rgba(196,155,63,0.06)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAdminLogin(false)} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.03)', color: '#b0a4c0', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e8e0f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#b0a4c0'; }}>取消</button>
                <button onClick={handleAdminLogin} disabled={!adminUser.trim() || !adminPass.trim()} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: (adminUser.trim() && adminPass.trim()) ? 'linear-gradient(135deg, #c49b3f, #8b6914)' : 'rgba(255,255,255,0.04)',
                  color: (adminUser.trim() && adminPass.trim()) ? '#fff' : '#5a5068', fontSize: '0.85rem', fontWeight: 600,
                  cursor: (adminUser.trim() && adminPass.trim()) ? 'pointer' : 'not-allowed',
                  boxShadow: (adminUser.trim() && adminPass.trim()) ? '0 0 20px rgba(196,155,63,0.3)' : 'none',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => { if (adminUser.trim() && adminPass.trim()) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(196,155,63,0.45)'; } }}
                  onMouseLeave={e => { if (adminUser.trim() && adminPass.trim()) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 20px rgba(196,155,63,0.3)'; } }}
                  onMouseDown={e => { if (adminUser.trim() && adminPass.trim()) e.currentTarget.style.transform = 'scale(0.97)'; }}>登录</button>
              </div>
            </div>
          </div>
        )}

        {/* ======== Toast ======== */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
            padding: '11px 28px', borderRadius: 28, fontSize: '0.85rem', fontWeight: 600,
            color: '#e8e0f0', background: 'rgba(20,12,34,0.96)', border: '1px solid rgba(179,71,234,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 24px rgba(179,71,234,0.2)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            animation: 'toastIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {toast}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, height: 2,
              background: 'linear-gradient(90deg, #b347ea, #ff4d2e)',
              animation: 'toastBar 2.2s linear forwards',
              borderRadius: '0 0 28px 28px'
            }} />
          </div>
        )}
      </div>

      {/* ======== 关键帧动画 (一次性注入) ======== */}
      <style>{`
        ${PARTICLE_STYLES}
        @keyframes emptyGlow { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.25)} }
        @keyframes doorFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes cardFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes cardSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
        @keyframes shimmerScan { 0%,100%{left:-60%} 35%{left:120%} 35.01%{left:-60%} }
        @keyframes badgeGlow { 0%,100%{box-shadow:0 0 14px rgba(255,77,46,0.5)} 50%{box-shadow:0 0 22px rgba(255,77,46,0.8)} }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.92) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(24px);filter:blur(4px)} to{opacity:1;transform:translateX(-50%) translateY(0);filter:blur(0)} }
        @keyframes toastBar { from{width:100%} to{width:0%} }

        @media (max-width: 768px) {
          .resp-main-layout { flex-direction: column !important; }
          .resp-sidebar { flex: 1 1 auto !important; min-width: 100% !important; }
          .resp-script-area { min-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
