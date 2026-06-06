// 星陨学院·投票抉择 — D5三条路径（加固封印A / 重建封印B / 第三条路C）
interface Props { onVote: (choice: string) => void; onClose: () => void; }

export default function VoteModal({ onVote, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-amber-400 text-lg font-bold mb-2">最终抉择</h2>
        <p className="text-gray-400 text-sm mb-4">天空已经裂开。封印的崩溃开始了。你的选择将决定所有人的命运。</p>
        <div className="space-y-3">
          <button onClick={() => onVote('A')}
            className="btn-glow w-full py-4 text-white rounded-xl font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #6080e8, #4060c0)' }}>
            ✨ 支持伊莱亚斯 · 加固封印
          </button>
          <button onClick={() => onVote('B')}
            className="btn-glow w-full py-4 text-white rounded-xl font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #ff4d2e, #c0392b)' }}>
            ⚔ 支持卡珊德拉 · 重建封印
          </button>
          <button onClick={() => onVote('C')}
            className="btn-glow w-full py-4 text-white rounded-xl font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #3a9d6e, #2d7a55)' }}>
            🌸 第三条路 · 星泪花置换
          </button>
        </div>
        <button onClick={onClose}
          className="w-full mt-3 py-2 rounded-xl text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#7a6e8a' }}>
          稍后投票
        </button>
      </div>
    </div>
  );
}
