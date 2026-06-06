// 星陨学院·每日剧情 — 弹窗展示当日角色剧情（narrative正文 + actionGuide指引）
interface Props { script: { day: number; title: string; narrative: string; actionGuide: string }; onClose: () => void; }

export default function DailyScriptModal({ script, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="modal-enhanced rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-purple-300 text-lg font-bold mb-1">第{script.day}天</h2>
        <h3 className="text-white text-sm font-medium mb-3">{script.title}</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">{script.narrative}</p>
        {script.actionGuide && (
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(100,30,180,0.15)', border: '1px solid rgba(179,71,234,0.2)' }}>
            <p className="text-purple-300 text-xs">{script.actionGuide}</p>
          </div>
        )}
        <button onClick={onClose}
          className="btn-glow w-full py-3 text-white rounded-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #b347ea, #6b21d4)' }}>
          确认
        </button>
      </div>
    </div>
  );
}
