// 星陨学院·真理祭坛 — 消耗1线索向GM提问（GM可在面板回答是/否/自定义）
import { useState } from 'react';

interface Props {
  onAsk: (question: string) => void;
  onClose: () => void;
}

const PRESETS = [
  '伊莱亚斯是否主动打开了虚空裂隙？',
  '卡珊德拉的灵魂是否仍在封印中？',
  '封印的核心锚点是否由伊莱亚斯的生命构成？',
  '卡珊德拉是否是自愿进入封印的？',
  '官方历史记载是否准确？',
  '星泪花是否可以用于置换封印核心？',
  '伊莱亚斯是否死于碎星之夜？',
  '封印是否存在原始缺陷？',
];

export default function GodQuestionModal({ onAsk, onClose }: Props) {
  const [input, setInput] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-indigo-300 text-lg font-bold mb-2">🔮 真理祭坛提问</h2>
        <p className="text-gray-500 text-xs mb-4">消耗 2AP + 1条线索，获得"是/否"回答</p>

        <div className="mb-4 space-y-1 max-h-40 overflow-y-auto">
          {PRESETS.map((q, i) => (
            <button key={i} onClick={() => { onAsk(q); }}
              className="w-full text-left px-3 py-2 text-gray-300 rounded-lg text-xs transition-all"
              style={{ background: 'rgba(20,14,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {q}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="或输入自己的问题..."
            className="flex-1 px-3 py-2 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none transition-all"
            style={{ background: 'rgba(10,6,22,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.4)'; e.target.style.boxShadow = '0 0 14px rgba(99,102,241,0.15)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; }}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onAsk(input.trim()); } }}
          />
          <button onClick={() => { if (input.trim()) onAsk(input.trim()); }}
            disabled={!input.trim()}
            className="px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
            问
          </button>
        </div>

        <button onClick={onClose}
          className="w-full mt-3 py-2 rounded-xl text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#7a6e8a' }}>
          取消
        </button>
      </div>
    </div>
  );
}
