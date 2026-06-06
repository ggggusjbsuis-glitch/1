// 管理员面板 — 活跃房间监控 + 剧本 JSON 增删管理
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function AdminPage() {
  const { state, sendMessage } = useGame();
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { sendMessage({ type: 'admin_list_scripts', payload: {} }); }, []);
  useEffect(() => { const list = (state as any)._scriptList; if (list) setScripts(list); }, [(state as any)._scriptList]);
  useEffect(() => { const list = (state as any)._roomList; if (list) setRooms(list); }, [(state as any)._roomList]);

  const refreshRooms = () => sendMessage({ type: 'get_room_list', payload: {} });

  const handleDelete = (scriptId: string) => {
    if (confirm('确定删除剧本 "' + scriptId + '"？')) {
      sendMessage({ type: 'admin_delete_script', payload: { scriptId } });
      setMsg('已删除: ' + scriptId);
      setTimeout(() => { sendMessage({ type: 'admin_list_scripts', payload: {} }); setMsg(''); }, 500);
    }
  };

  const handleAdd = () => {
    try {
      const data = JSON.parse(jsonInput);
      sendMessage({ type: 'admin_add_script', payload: { scriptData: data } });
      setMsg('剧本已添加！');
      setShowAdd(false); setJsonInput('');
      setTimeout(() => { sendMessage({ type: 'admin_list_scripts', payload: {} }); setMsg(''); }, 500);
    } catch (e) {
      setMsg('JSON格式错误: ' + (e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#060310] flex flex-col px-4">
      <div className="py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #e0c060, #c49b3f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            管理员面板
          </h1>
          <p className="text-gray-500 text-xs mt-1">房间监控 · 剧本管理 · 平台配置</p>
        </div>
        <button onClick={() => navigate('/')} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">退出</button>
      </div>

      {msg && (
        <div className="rounded-lg px-3 py-2 text-xs mb-3" style={{ background: 'rgba(196,155,63,0.08)', border: '1px solid rgba(196,155,63,0.2)', color: '#e0c060' }}>{msg}</div>
      )}

      {/* 房间监控 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-300 text-sm font-medium">活跃房间 ({rooms.length})</h2>
          <button onClick={refreshRooms} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">刷新</button>
        </div>
        {rooms.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(16,12,30,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-gray-500 text-sm">暂无活跃房间</p>
            <p className="text-gray-700 text-xs mt-1">玩家创建房间后会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((r: any) => (
              <div key={r.roomId}
                className="rounded-xl p-4 border transition-all"
                style={r.gameStarted
                  ? { background: 'rgba(58,157,110,0.06)', borderColor: 'rgba(58,157,110,0.25)' }
                  : { background: 'rgba(179,71,234,0.05)', borderColor: 'rgba(179,71,234,0.2)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium">{r.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={r.gameStarted
                          ? { background: 'rgba(58,157,110,0.15)', color: '#6ec99a' }
                          : { background: 'rgba(179,71,234,0.15)', color: '#c97df5' }}>
                        {r.gameStarted ? '游戏中' : '等待中'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      {r.playerCount}/{r.maxPlayers} 人
                      {r.hasGM ? ' · 有房主' : ' · 无房主'}
                      <span className="text-gray-700 ml-2">ID: {r.roomId.slice(0, 8)}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 剧本管理 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-300 text-sm font-medium">已安装剧本 ({scripts.length})</h2>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-1.5 text-white rounded-lg text-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #c49b3f, #8b6914)', boxShadow: '0 0 16px rgba(196,155,63,0.3)' }}>+ 添加剧本</button>
        </div>
        <div className="space-y-2">
          {scripts.map(s => (
            <div key={s.scriptId} className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(16,12,30,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <p className="text-white text-sm font-medium">{s.title}</p>
                <p className="text-gray-500 text-xs">{s.playerCount}人 · {s.estimatedTime} · {(s.tags || []).join(', ')}</p>
              </div>
              <button onClick={() => handleDelete(s.scriptId)}
                className="px-3 py-1 rounded-lg text-xs transition-all hover:bg-red-600/30"
                style={{ background: 'rgba(255,77,46,0.08)', border: '1px solid rgba(255,77,46,0.2)', color: '#e8746a' }}>删除</button>
            </div>
          ))}
          {!scripts.length && <p className="text-gray-600 text-sm text-center py-8">暂无剧本</p>}
        </div>
      </div>

      {/* 平台信息 */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(16,12,30,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="text-gray-300 text-sm font-medium mb-2">平台信息</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p>服务端口: 3000</p>
          <p>剧本目录: server/scripts/ · 支持添加JSON或放入文件</p>
        </div>
      </div>

      {/* 添加剧本弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-enhanced rounded-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-amber-400 font-bold">添加剧本</h2>
              <button onClick={() => setJsonInput(JSON.stringify({
                scriptId: 'new_' + Date.now().toString(36), title: '新剧本', subtitle: '', description: '',
                playerCount: 6, totalDays: 5, estimatedTime: '45-90分钟', tags: ['自定义'], version: '1.0.0',
                heroes: { A: { name: '', publicImage: '', truth: '' }, B: { name: '', publicImage: '', truth: '' } },
                mainGoals: [], endings: {}, endingThresholds: { truthHigh: 0.8, truthLow: 0.4 },
                characters: [], clues: [], items: [], map: { regions: [], regionCluePools: {}, regionItemPool: {}, specialLocations: {} }
              }, null, 2))} className="text-xs text-gray-500 hover:text-amber-400 transition-colors">模板</button>
            </div>
            <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
              className="flex-1 w-full rounded-xl p-3 text-gray-300 text-xs font-mono resize-none focus:outline-none transition-all"
              style={{ background: 'rgba(10,6,22,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(196,155,63,0.4)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              placeholder='粘贴剧本JSON...' rows={15} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-3 text-white rounded-xl transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>取消</button>
              <button onClick={handleAdd} disabled={!jsonInput.trim()}
                className="btn-glow flex-1 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #c49b3f, #8b6914)' }}>添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
