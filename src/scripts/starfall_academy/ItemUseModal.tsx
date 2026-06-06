// 星陨学院·道具使用 — 道具使用/赠送操作（绑定道具不可赠送、钥匙需联合使用）
interface Props { item: any; players: { id: string; name: string; position: string }[]; myPosition: string; myPlayerId: string | null; onClose: () => void; sendMessage: (msg: object) => void; }

export default function ItemUseModal({ item, players, myPosition, myPlayerId, onClose, sendMessage }: Props) {
  const sameRegion = players.filter(p => p.position === myPosition && p.id !== myPlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-purple-300 text-lg font-bold mb-2">{item.name}</h2>
        <p className="text-gray-400 text-xs mb-1">{item.effect}</p>
        {item.bound && <p className="text-amber-400 text-xs mb-3">🔒 绑定道具 · 不可交易</p>}

        <div className="space-y-2 mb-4">
          <button onClick={() => { sendMessage({ type: 'use_item', payload: { itemId: item.id } }); onClose(); }}
            className="btn-glow w-full py-3 text-white rounded-xl transition-all text-sm"
            style={{ background: 'linear-gradient(135deg, #b347ea, #6b21d4)' }}>
            使用此道具
          </button>

          {!item.bound && sameRegion.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-1">赠送给同区域玩家</p>
              {sameRegion.map(p => (
                <button key={p.id} onClick={() => { sendMessage({ type: 'trade_gift', payload: { targetPlayerId: p.id, itemId: item.id } }); onClose(); }}
                  className="w-full py-2 text-white rounded-xl text-sm mb-1 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  送给 {p.name}
                </button>
              ))}
            </div>
          )}

          {item.effectType === null && item.id?.startsWith('item_01') && sameRegion.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-1">联合开启密室</p>
              {sameRegion.map(p => (
                <button key={p.id} onClick={() => { sendMessage({ type: 'use_key', payload: { targetPlayerId: p.id } }); onClose(); }}
                  className="btn-glow w-full py-2 text-white rounded-xl text-sm mb-1 transition-all"
                  style={{ background: 'linear-gradient(135deg, #c49b3f, #8b6914)' }}>
                  与 {p.name} 联合开启密室
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose}
          className="w-full py-3 text-white rounded-xl transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          关闭
        </button>
      </div>
    </div>
  );
}
