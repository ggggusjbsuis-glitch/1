// 星陨学院·地图 — 6区域展示 + 当前位置高亮 + 点击移动（消耗1AP）
interface MapViewProps {
  regions: string[];
  currentPosition: string;
  players: { id: string; name: string; position: string }[];
  onMove: (region: string) => void;
  disabled: boolean;
}

const REGION_STYLES: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  '档案馆':   { bg: 'from-blue-950/40 to-blue-900/20', border: 'border-blue-500/30', icon: '📚', label: '档案' },
  '黑市':     { bg: 'from-amber-950/40 to-amber-900/20', border: 'border-amber-500/30', icon: '💎', label: '黑市' },
  '真理祭坛': { bg: 'from-indigo-950/40 to-indigo-900/20', border: 'border-indigo-500/30', icon: '🔮', label: '祭坛' },
  '星陨遗迹': { bg: 'from-purple-950/40 to-purple-900/20', border: 'border-purple-500/30', icon: '🌑', label: '遗迹' },
  '封印基座': { bg: 'from-red-950/40 to-red-900/20', border: 'border-red-500/30', icon: '⚡', label: '封印' },
  '圣殿':     { bg: 'from-gray-800/40 to-gray-700/20', border: 'border-gray-500/30', icon: '✨', label: '圣殿' },
};

export default function MapView({ regions, currentPosition, players, onMove, disabled }: MapViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {regions.map(region => {
        const style = REGION_STYLES[region] || REGION_STYLES['档案馆'];
        const isHere = region === currentPosition;
        const count = players.filter(p => p.position === region).length;

        return (
          <button
            key={region}
            onClick={() => onMove(region)}
            disabled={disabled || isHere}
            className={`card-enhanced relative rounded-2xl p-4 text-left transition-all duration-200 border-2 bg-gradient-to-br ${style.bg} ${isHere ? `${style.border}` : `${style.border} hover:border-gray-500`} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            style={isHere ? { boxShadow: '0 0 20px rgba(179,71,234,0.25)' } : {}}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{style.icon}</span>
              <span className={`text-sm font-medium ${isHere ? 'text-purple-300' : 'text-gray-300'}`}>
                {region}
              </span>
            </div>

            {count > 0 && (
              <div className="absolute top-3 right-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${isHere ? 'bg-purple-600/60 text-purple-200' : 'bg-gray-700/60 text-gray-400'}`}>
                  {count}
                </span>
              </div>
            )}

            {isHere && (
              <p className="text-purple-400/80 text-xs mt-1">● 你在这里</p>
            )}

            {!isHere && count > 0 && (
              <p className="text-gray-500 text-xs mt-1 truncate">
                {players.filter(p => p.position === region).map(p => p.name).join(', ')}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
