// 剧本大厅 — 房主选择剧本 + 玩家准备确认（带重试机制）
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function ScriptHall() {
  const { state, sendMessage } = useGame();
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const retryCount = useRef(0);
  const maxRetries = 5;

  // 游戏开始后跳转
  useEffect(() => {
    if (state.phase === 'playing' && state.currentDay >= 1) navigate('/game');
  }, [state.phase, state.currentDay, navigate]);

  // 请求剧本列表（带重试）
  const requestScripts = () => {
    setError('');
    const sent = sendMessage({ type: 'get_script_list', payload: {} });
    if (!sent) {
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.warn(`[ScriptHall] sendMessage失败, 重试 ${retryCount.current}/${maxRetries}`);
        setTimeout(requestScripts, 1000);
      } else {
        setError('无法连接到服务器，请返回首页重新连接');
      }
    }
  };

  useEffect(() => {
    requestScripts();
  }, []);

  // 监听服务端返回的剧本列表
  useEffect(() => {
    const list = (state as any)._scriptList;
    if (list && Array.isArray(list) && list.length > 0) {
      setScripts(list);
      setError('');
      retryCount.current = 0;
    }
  }, [(state as any)._scriptList]);

  // 5秒超时兜底
  useEffect(() => {
    if (scripts.length > 0) return;
    const timer = setTimeout(() => {
      if (scripts.length === 0) {
        // 再请求一次
        const sent = sendMessage({ type: 'get_script_list', payload: {} });
        if (!sent) setError('服务器连接超时，请确认服务端已启动');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [scripts.length]);

  // 监听房主选中的剧本
  useEffect(() => {
    const sid = (state as any)._selectedScriptId;
    if (sid) setSelectedId(sid);
  }, [(state as any)._selectedScriptId]);

  // 离开房间逻辑（来自 leave_room 或断开）
  useEffect(() => {
    if (!state.roomId && state.phase === 'lobby') navigate('/');
  }, [state.roomId, state.phase, navigate]);

  const handleSelect = (scriptId: string) => {
    if (!state.isGM) return;
    setSelectedId(scriptId);
    sendMessage({ type: 'select_script', payload: { scriptId } });
  };

  const handleStart = () => {
    if (!selectedId || !state.isGM) return;
    sendMessage({ type: 'start_game', payload: {} });
    navigate('/lobby');
  };

  const handleReady = () => {
    setReady(!ready);
    sendMessage({ type: 'player_ready', payload: {} });
  };

  // ---- 加载中 / 错误 ----
  if (scripts.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#060310', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          {error ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
              <p style={{ color: '#e8746a', fontSize: '0.9rem', marginBottom: 8 }}>{error}</p>
              <button onClick={() => { retryCount.current = 0; requestScripts(); }}
                style={{
                  marginTop: 16, padding: '10px 28px', borderRadius: 24,
                  background: 'linear-gradient(135deg, #b347ea, #6b21d4)',
                  color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                }}>
                重新连接
              </button>
              <button onClick={() => navigate('/')}
                style={{
                  marginTop: 12, marginLeft: 8, padding: '10px 28px', borderRadius: 24,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#b0a4c0', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
                }}>
                返回首页
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: 40, height: 40, border: '2px solid #b347ea', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 1s linear infinite',
                margin: '0 auto 16px', boxShadow: '0 0 20px rgba(179,71,234,0.4)'
              }} />
              <p style={{ color: '#b0a4c0', fontSize: '0.9rem' }}>加载剧本列表...</p>
              <p style={{ color: '#7a6e8a', fontSize: '0.75rem', marginTop: 8 }}>
                {retryCount.current > 0 ? `重试中 (${retryCount.current}/${maxRetries})` : '正在从服务器获取...'}
              </p>
            </>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const S = {
    bg: '#060310',
    purple: '#b347ea',
    purpleDark: '#6b21d4',
    purpleLight: '#c97df5',
    gold: '#c49b3f',
    green: '#5eea8b',
    text: '#e8e0f0',
    textSec: '#b0a4c0',
    textMut: '#7a6e8a',
    border: 'rgba(255,255,255,0.06)',
  };

  return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', flexDirection: 'column', padding: '0 20px', maxWidth: 640, margin: '0 auto' }}>
      {/* 顶部 */}
      <div style={{ padding: '32px 0 16px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'Georgia, "Noto Serif SC", serif', fontSize: '1.6rem', letterSpacing: '0.06em',
          background: `linear-gradient(135deg, ${S.text}, ${S.purpleLight})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4
        }}>
          剧本大厅
        </h1>
        <p style={{ color: S.textMut, fontSize: '0.8rem' }}>
          {state.isGM ? '选择剧本开始游戏' : '等待房主选择剧本'}
        </p>
      </div>

      {/* 剧本卡片列表 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 100 }}>
        {scripts.map((s: any) => {
          const sid = s.scriptId || s.id;
          const isSelected = sid === selectedId;
          return (
            <button
              key={sid}
              onClick={() => handleSelect(sid)}
              disabled={!state.isGM}
              style={{
                textAlign: 'left', width: '100%', cursor: state.isGM ? 'pointer' : 'default',
                background: isSelected ? 'rgba(50,25,80,0.7)' : 'rgba(16,12,30,0.6)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: isSelected ? '2px solid rgba(179,71,234,0.5)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: 16, transition: 'all 0.3s ease',
                boxShadow: isSelected ? '0 0 24px rgba(179,71,234,0.3)' : '0 4px 24px rgba(0,0,0,0.4)',
                color: '#fff', fontFamily: 'inherit',
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* 封面占位 */}
                <div style={{
                  width: 64, height: 80, borderRadius: 10,
                  background: 'linear-gradient(160deg, rgba(100,30,180,0.4), rgba(196,155,63,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, position: 'relative', overflow: 'hidden'
                }}>
                  <span style={{ fontSize: '1.8rem', position: 'relative', zIndex: 1 }}>{(s.title || '?')[0]}</span>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', color: isSelected ? S.purpleLight : S.text, letterSpacing: '0.03em' }}>
                    {s.title || '未命名剧本'}
                  </h3>
                  {s.subtitle && <p style={{ color: S.textMut, fontSize: '0.75rem', marginTop: 2 }}>{s.subtitle}</p>}
                  <p style={{
                    color: S.textSec, fontSize: '0.8rem', marginTop: 6, lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  }}>{s.description}</p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                    {(s.tags || []).slice(0, 3).map((t: string, i: number) => (
                      <span key={i} style={{
                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(179,71,234,0.15)', color: S.purpleLight,
                        border: '1px solid rgba(179,71,234,0.2)'
                      }}>{t}</span>
                    ))}
                  </div>
                  <p style={{ color: S.textMut, fontSize: '0.7rem', marginTop: 6 }}>
                    {s.playerCount || 6}人 · {s.estimatedTime || '?'}
                  </p>
                </div>
                {isSelected && (
                  <span style={{ color: S.purpleLight, fontSize: '1.3rem', textShadow: '0 0 12px rgba(179,71,234,0.6)' }}>✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 底部操作栏 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'rgba(10,6,22,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400, margin: '0 auto' }}>
          <div>
            {selectedId ? (
              <p style={{ color: S.purpleLight, fontSize: '0.9rem', fontWeight: 600 }}>
                {scripts.find(s => (s.scriptId || s.id) === selectedId)?.title || selectedId}
              </p>
            ) : (
              <p style={{ color: S.textMut, fontSize: '0.85rem' }}>
                {state.isGM ? '请选择一个剧本' : '等待房主选择...'}
              </p>
            )}
          </div>
          {state.isGM ? (
            <button onClick={handleStart} disabled={!selectedId}
              style={{
                padding: '10px 24px', borderRadius: 24, border: 'none',
                background: 'linear-gradient(135deg, #b347ea, #6b21d4)',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                cursor: selectedId ? 'pointer' : 'not-allowed',
                opacity: selectedId ? 1 : 0.35,
                boxShadow: selectedId ? '0 0 24px rgba(179,71,234,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}>
              开始游戏
            </button>
          ) : (
            <button onClick={handleReady}
              style={{
                padding: '10px 24px', borderRadius: 24, border: ready ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: ready ? 'linear-gradient(135deg, #3a9d6e, #2d7a55)' : 'transparent',
                color: ready ? '#fff' : S.textSec, fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}>
              {ready ? '已准备 ✓' : '准备'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
