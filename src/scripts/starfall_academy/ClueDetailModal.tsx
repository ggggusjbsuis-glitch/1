// 星陨学院·线索详情 — 弹窗展示线索完整内容（标题+正文）
interface Props { clue: { id: string; title: string; content: string }; onClose: () => void; }

export default function ClueDetailModal({ clue, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-purple-300 text-lg font-bold mb-2">{clue.title}</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">{clue.content}</p>
        <button onClick={onClose}
          className="w-full py-3 text-white rounded-xl transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          关闭
        </button>
      </div>
    </div>
  );
}
