// 等待室 — 6人槽位展示 + GM开始游戏 + 踢人操作
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const SLOTS = 6;

export default function LobbyPage() {
  const { state, sendMessage, disconnect } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.phase === 'playing' && state.currentDay >= 1) navigate('/game');
    if (!state.playerId && state.players.length === 0 && state.phase === 'lobby') navigate('/');
  }, [state.phase, state.currentDay, state.playerId, state.players.length, navigate]);

  const gmPlayer = state.players.find((p: any) => p.isGM);
  const gamePlayers = state.players.filter((p: any) => !p.isGM);
  const filledCount = gamePlayers.length;

  const handleStart = () => {
    const sent = sendMessage({ type: 'start_game', payload: {} });
    if (sent) navigate('/game');
    else alert('连接已断开，请刷新页面后重试');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* 房间号 */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 8 }}>房间号</p>
        <p style={{
          color: '#c97df5', fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
          padding: '8px 18px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(179,71,234,0.1)', border: '1px solid rgba(179,71,234,0.25)',
          textShadow: '0 0 16px rgba(179,71,234,0.5)', letterSpacing: '0.08em',
        }}>
          {state.roomId ? state.roomId.slice(0, 10) : '连接中...'}
        </p>
      </div>

      {/* GM */}
      {gmPlayer && (
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 12 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4, textAlign: 'center' }}>上帝 (GM)</p>
          <div style={{ borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center', border: '2px solid rgba(196,155,63,0.4)', background: 'rgba(196,155,63,0.08)', boxShadow: '0 0 20px rgba(196,155,63,0.12)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', background: 'linear-gradient(135deg, #c49b3f, #8b6914)', boxShadow: '0 0 16px rgba(196,155,63,0.4)' }}>
              {gmPlayer.name[0]}
            </div>
            <p style={{ color: '#e0c060', fontSize: '0.9rem', fontWeight: 600 }}>{gmPlayer.name}</p>
          </div>
        </div>
      )}

      {/* 玩家槽位 */}
      <div style={{ width: '100%', maxWidth: 320, marginBottom: 32 }}>
        <h2 style={{ color: '#e8e0f0', fontSize: '1.05rem', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          玩家列表 ({filledCount}/{SLOTS})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {Array.from({ length: SLOTS }).map((_, i) => {
            const player = gamePlayers[i];
            return (
              <div key={i} style={{
                borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center',
                border: player ? '2px solid rgba(179,71,234,0.45)' : '2px solid rgba(255,255,255,0.06)',
                background: player ? 'rgba(179,71,234,0.08)' : 'rgba(255,255,255,0.015)',
                boxShadow: player ? '0 0 16px rgba(179,71,234,0.12)' : 'none',
              }}>
                {player ? (
                  <>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem', background: 'linear-gradient(135deg, #b347ea, #6b21d4)', boxShadow: '0 0 14px rgba(179,71,234,0.3)' }}>
                      {player.name[0]}
                    </div>
                    <p style={{ color: '#e8ddf5', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</p>
                    {state.isGM && (
                      <button onClick={(e) => { e.stopPropagation(); sendMessage({ type: 'kick_player', payload: { targetId: player.id } }); }}
                        style={{ color: '#e8746a', fontSize: '0.7rem', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer' }}>踢出</button>
                    )}
                  </>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>等待中</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state.isGM && (
          <button onClick={handleStart} disabled={filledCount < 6}
            className="btn-next-step" style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
            开始游戏（需6名玩家）
          </button>
        )}
        <button onClick={() => { sendMessage({ type: 'leave_room', payload: {} }); disconnect(); navigate('/'); }}
          style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
          离开房间
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 32 }}>切片 1 · 等待玩家加入</p>
    </div>
  );
}
