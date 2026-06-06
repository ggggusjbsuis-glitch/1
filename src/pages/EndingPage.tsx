// 结局展示 — 结局文本 + 真相评分 + 投票统计 + 返回首页
import { useGame } from '../context/GameContext';
import { useNavigate } from 'react-router-dom';

export default function EndingPage() {
  const { state } = useGame();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 20, filter: 'drop-shadow(0 0 40px rgba(179,71,234,0.5))' }}>🎭</div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', letterSpacing: '0.06em', background: 'linear-gradient(135deg, #c97df5, #e0c060)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>
        {state.finalEnding || '游戏结束'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 340, marginBottom: 32 }}>
        {state.finalEnding || '感谢参与星陨学院·碎星之夜。真相已被拼凑——或已被永远埋葬。'}
      </p>
      <div style={{ width: '100%', maxWidth: 320, borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 24, background: 'rgba(20,14,36,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>游戏数据</p>
        <p style={{ color: '#c97df5', fontSize: '0.9rem', fontWeight: 600 }}>收集线索: {state.myClueCards?.length || 0} 张</p>
      </div>
      <button onClick={() => navigate('/')}
        className="btn-next-step" style={{ width: '100%', maxWidth: 320, padding: '14px', fontSize: '1rem' }}>
        返回首页
      </button>
    </div>
  );
}
