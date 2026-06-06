// 通用游戏日志 — 滚动显示游戏事件记录（服务端推送 + 前端追加）
import { useRef, useEffect } from 'react';

interface GameLogProps {
  logs: string[];
}

export default function GameLog({ logs }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="rounded-xl p-3 max-h-24 overflow-y-auto"
      style={{ background: 'rgba(16,12,30,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <p className="text-gray-600 text-xs mb-1">行动日志</p>
      {logs.slice(-10).map((log, i) => (
        <p key={i} className="text-gray-500 text-xs leading-relaxed">{log}</p>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
