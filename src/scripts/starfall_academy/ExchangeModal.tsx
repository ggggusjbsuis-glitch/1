// 星陨学院·线索交换 — 选择己方线索 + 目标玩家 → 随机交换对方一张
interface Props { players: { id: string; name: string }[]; onClose: () => void; sendMessage: (msg: object) => void; myClues: { id: string; title: string }[]; }

export default function ExchangeModal({ players, onClose, sendMessage, myClues }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-white text-lg font-bold mb-4">线索交流</h2>
        {players.length === 0 ? (
          <p className="text-gray-500 text-sm mb-4">当前区域没有其他玩家</p>
        ) : (
          <div className="space-y-2 mb-4">
            {players.map(p => (
              <div key={p.id} className="rounded-xl p-3" style={{ background: 'rgba(20,14,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-white text-sm mb-2">{p.name}</p>
                <div className="flex flex-wrap gap-1">
                  {myClues.map(c => (
                    <button key={c.id} onClick={() => { sendMessage({ type: 'exchange', payload: { targetPlayerId: p.id, clueId: c.id } }); onClose(); }}
                      className="text-xs text-gray-300 px-2 py-1 rounded transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      换出: {c.title.slice(0, 8)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose}
          className="w-full py-3 text-white rounded-xl transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          取消
        </button>
      </div>
    </div>
  );
}
