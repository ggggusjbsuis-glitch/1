// 根组件 — 路由定义（7条路由）+ 全局视觉效果（粒子背景、帷幕动画、光标光晕）
import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import RoomLobby from './pages/RoomLobby';
import ScriptHall from './pages/ScriptHall';
import LobbyPage from './pages/LobbyPage';

const GamePage = lazy(() => import('./pages/GamePage'));
const EndingPage = lazy(() => import('./pages/EndingPage'));

/* ============ 加载动画 ============ */
function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--purple-neon)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px', boxShadow: '0 0 20px rgba(179,71,234,0.4)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>加载中...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ============ 帷幕入场 ============ */
function CurtainEntrance() {
  useEffect(() => {
    const sparks = document.getElementById('curtainSparkles');
    if (sparks) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 30; i++) {
        const s = document.createElement('div');
        s.className = 'curtain-sparkle';
        s.style.cssText = `
          left: ${40 + Math.random() * 20}%; top: ${35 + Math.random() * 30}%;
          --sx: ${(Math.random() - 0.5) * 120}px; --sy: ${(Math.random() - 0.5) * 120 - 40}px;
          animation-delay: ${0.6 + Math.random() * 1}s;
          width: ${1.5 + Math.random() * 3}px; height: ${1.5 + Math.random() * 3}px;
        `;
        frag.appendChild(s);
      }
      sparks.appendChild(frag);
    }
    const timer = setTimeout(() => {
      const stage = document.getElementById('curtainStage');
      if (stage) { stage.style.pointerEvents = 'none'; setTimeout(() => { if (stage) stage.style.display = 'none'; }, 500); }
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="curtain-stage" id="curtainStage">
      <div className="curtain-half left" />
      <div className="curtain-half right" />
      <div className="curtain-center-logo">
        <span className="logo-text">幕 间</span>
        <span className="logo-sub">CURTAIN · 沉浸式剧本杀</span>
      </div>
      <div className="curtain-sparkles" id="curtainSparkles" />
    </div>
  );
}

/* ============ 背景光晕 ============ */
function BackgroundAuras() {
  return (
    <div className="bg-layer">
      <div className="bg-auras">
        <div className="bg-aura" />
        <div className="bg-aura" />
        <div className="bg-aura" />
        <div className="bg-aura" />
        <div className="bg-aura" />
      </div>
    </div>
  );
}

/* ============ 浮动装饰球 ============ */
function FloatingOrbs() {
  return (
    <>
      <div className="floating-orb" style={{ top: '8%', right: '4%', width: 220, height: 220 }} />
      <div className="floating-orb" style={{ top: '70%', left: '4%', width: 150, height: 150 }} />
    </>
  );
}

/* ============ 粒子Canvas背景 ============ */
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef(0);

  const resize = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 70;
    const CONNECTION_DIST = 140;
    const MOUSE_R = 100;
    const particles: any[] = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        baseX: 0, baseY: 0, radius: 0.4 + Math.random() * 2,
        speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.3 - 0.15,
        opacity: 0.15 + Math.random() * 0.5, pulseSpeed: 0.004 + Math.random() * 0.018,
        pulseOffset: Math.random() * Math.PI * 2,
      });
      particles[i].baseX = particles[i].x; particles[i].baseY = particles[i].y;
    }
    particlesRef.current = particles;

    const onMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouseMove);

    function animate(ts: number) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      particles.forEach(p => {
        p.x += p.speedX; p.y += p.speedY; p.baseX += p.speedX; p.baseY += p.speedY;
        if (p.x < -20) { p.x = canvas.width + 20; p.baseX = p.x; }
        if (p.x > canvas.width + 20) { p.x = -20; p.baseX = p.x; }
        if (p.y < -20) { p.y = canvas.height + 20; p.baseY = p.y; }
        if (p.y > canvas.height + 20) { p.y = -20; p.baseY = p.y; }
        const dx = p.x - mx, dy = p.y - my, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_R) { const f = (1 - dist / MOUSE_R) * 3; p.x += (dx / dist) * f; p.y += (dy / dist) * f; }
        else { p.x += (p.baseX - p.x) * 0.03; p.y += (p.baseY - p.y) * 0.03; }
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(179,71,234,${(1 - dist / CONNECTION_DIST) * 0.12})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        const pulse = Math.sin(ts * p.pulseSpeed + p.pulseOffset) * 0.35 + 0.65;
        const alpha = p.opacity * pulse;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,170,235,${alpha})`; ctx.fill();
        if (p.radius > 1.1) {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(179,71,234,${alpha * 0.15})`; ctx.fill();
        }
      });

      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animRef.current);
    };
  }, [resize]);

  return <canvas id="particlesCanvas" ref={canvasRef} />;
}

/* ============ 光标光晕 ============ */
function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const glow = glowRef.current; if (!glow) return;
    let t: ReturnType<typeof setTimeout>;
    const move = (e: MouseEvent) => {
      glow.style.left = `${e.clientX}px`; glow.style.top = `${e.clientY}px`;
      glow.classList.add('visible'); clearTimeout(t);
      t = setTimeout(() => glow.classList.remove('visible'), 800);
    };
    window.addEventListener('mousemove', move);
    return () => { window.removeEventListener('mousemove', move); clearTimeout(t); };
  }, []);
  return <div className="cursor-glow" ref={glowRef} />;
}

/* ============ 根组件 ============ */
export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        {/* 全局视觉效果 — 所有页面共享 */}
        <CurtainEntrance />
        <BackgroundAuras />
        <FloatingOrbs />
        <ParticleBackground />
        <CursorGlow />

        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/rooms" element={<RoomLobby />} />
            <Route path="/hall" element={<ScriptHall />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/ending" element={<EndingPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </GameProvider>
  );
}
