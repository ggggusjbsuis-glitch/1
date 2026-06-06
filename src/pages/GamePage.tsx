// 游戏主界面 — GM全量监控视图 / 玩家行动操作视图（移动/搜索/交换/道具/投票）
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import MapView from '../scripts/starfall_academy/MapView';
import GameLog from '../components/GameLog';
import ClueDetailModal from '../scripts/starfall_academy/ClueDetailModal';
import ExchangeModal from '../scripts/starfall_academy/ExchangeModal';
import ItemUseModal from '../scripts/starfall_academy/ItemUseModal';
import DailyScriptModal from '../scripts/starfall_academy/DailyScriptModal';
import VoteModal from '../scripts/starfall_academy/VoteModal';
import GodQuestionModal from '../scripts/starfall_academy/GodQuestionModal';

export default function GamePage() {
  const { state, sendMessage } = useGame();
  const navigate = useNavigate();

  const [showDaily, setShowDaily] = useState(false);
  const [showClueDetail, setShowClueDetail] = useState<any>(null);
  const [showExchange, setShowExchange] = useState(false);
  const [showItemUse, setShowItemUse] = useState<any>(null);
  const [showVote, setShowVote] = useState(false);
  const [archiveOptions, setArchiveOptions] = useState<any>(null);
  const [showGodQ, setShowGodQ] = useState(false);

  useEffect(() => {
    if (state.phase === 'ended') navigate('/ending');
  }, [state.phase, navigate]);

  useEffect(() => {
    const opts = (state as any)._archiveOptions;
    if (opts && opts.length) setArchiveOptions(opts);
  }, [(state as any)._archiveOptions]);

  const isGM = state.isGM === true;
  const hasGameData = state.phase === 'playing' && state.currentDay >= 1;
  const myPos = state.myPosition || '';
  const myAP = typeof state.myActionPoints === 'number' ? state.myActionPoints : 0;
  const myClues = Array.isArray(state.myClueCards) ? state.myClueCards : [];
  const myItems = Array.isArray(state.myItemCards) ? state.myItemCards : [];
  const playerList = Array.isArray(state.players) ? state.players : [];
  const logList = Array.isArray(state.gameLog) ? state.gameLog : [];
  const regionList = Array.isArray(state.regions) ? state.regions : ['档案馆','黑市','真理祭坛','星陨遗迹','封印基座','圣殿'];

  const playersHere = playerList.filter(
    (p: any) => p.position === myPos && p.id !== state.playerId
  );

  const handleMove = (r: string) => sendMessage({ type: 'move', payload: { targetRegion: r } });
  const handleSearch = () => sendMessage({ type: 'search', payload: {} });
  const handleEndTurn = () => sendMessage({ type: 'end_turn', payload: {} });
  const handleNextDay = () => sendMessage({ type: 'gm_next_day', payload: {} });
  const handleVote = (c: string) => { sendMessage({ type: 'vote_ending', payload: { choice: c } }); setShowVote(false); };

  // ===== GM 视图 =====
  if (isGM) {
    if (!hasGameData) {
      return (
        <div className="min-h-screen bg-[#060310] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ boxShadow: '0 0 20px rgba(196,155,63,0.4)' }} />
            <p className="text-gray-400 text-sm">等待游戏数据...</p>
            <p className="text-gray-600 text-xs mt-2">phase:{state.phase} day:{state.currentDay} players:{playerList.length}</p>
          </div>
        </div>
      );
    }

    const hands = (state as any).allPlayerHands || {};
    const questions = (state as any)._godQuestions || [];

    return (
      <div className="min-h-screen bg-[#060310] text-white flex flex-col">
        <div className="px-4 py-3 border-b border-amber-800/50 flex items-center justify-between"
          style={{ background: 'rgba(20,14,36,0.9)', backdropFilter: 'blur(20px)' }}>
          <span className="text-amber-400 font-bold">GM 面板 · D{state.currentDay}</span>
          {state.currentDay < 5 ? (
            <button onClick={handleNextDay} className="px-4 py-1.5 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #c49b3f, #8b6914)', boxShadow: '0 0 16px rgba(196,155,63,0.3)' }}>推进下一天</button>
          ) : (
            <button onClick={() => sendMessage({ type: 'gm_force_end', payload: {} })}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all">强制结束</button>
          )}
        </div>

        <div className="px-4 py-3">
          <h3 className="text-gray-400 text-xs mb-2">玩家状态</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {playerList.map((p: any) => (
              <div key={p.id} className="rounded-lg p-2 flex justify-between" style={{ background: 'rgba(20,14,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-gray-300">{p.name || '?'}</span>
                <span className="text-gray-500">{p.position || '?'} · AP:{p.actionPoints ?? '-'}{p.locked ? ' ✓' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {Object.keys(hands).length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-gray-400 text-xs mb-2">手牌总览</h3>
            <div className="space-y-1 text-xs">
              {Object.entries(hands).map(([id, h]: any) => {
                const p = playerList.find((pl: any) => pl.id === id);
                return (
                  <div key={id} className="rounded-lg p-2" style={{ background: 'rgba(20,14,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-purple-400">{(p as any)?.name || id}:</span>
                    <span className="text-gray-500 ml-2">线索[{h.clues?.length || 0}]: {h.clues?.join(', ') || '无'}</span>
                    <span className="text-gray-600 ml-2">| 道具: {h.items?.join(', ') || '无'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {questions.length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-indigo-400 text-xs mb-2">待回答问题 ({questions.length})</h3>
            {questions.map((gq: any) => (
              <div key={gq.id} className="rounded-lg p-2 mb-2 text-xs" style={{ background: 'rgba(20,14,36,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-gray-300 mb-1"><span className="text-indigo-400">{gq.playerName}</span>: {gq.question}</p>
                <div className="flex gap-1">
                  <button onClick={() => sendMessage({ type: 'god_reply', payload: { questionId: gq.id, answer: '是' } })}
                    className="flex-1 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs transition-all">是</button>
                  <button onClick={() => sendMessage({ type: 'god_reply', payload: { questionId: gq.id, answer: '否' } })}
                    className="flex-1 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition-all">否</button>
                  <button onClick={() => { const a = prompt('自定义回答:'); if (a) sendMessage({ type: 'god_reply', payload: { questionId: gq.id, answer: a } }); }}
                    className="flex-1 py-1 text-white rounded text-xs transition-all" style={{ background: 'rgba(255,255,255,0.08)' }}>自定义</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2">
          {state.currentDay === 4 && (
            <button onClick={() => sendMessage({ type: 'gm_trigger', payload: { event: 'memory_crystal_shard' } })}
              className="px-3 py-1 text-gray-400 rounded text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>记忆水晶碎片入黑市</button>
          )}
        </div>

        <div className="flex-1 px-4 pb-4">
          <GameLog logs={logList} />
        </div>

        {showVote && <VoteModal onVote={handleVote} onClose={() => setShowVote(false)} />}
        <p className="text-center text-gray-700 text-xs pb-4">GM 模式</p>
      </div>
    );
  }

  // ===== 玩家视图 =====
  if (!hasGameData) {
    return (
      <div className="min-h-screen bg-[#060310] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ boxShadow: '0 0 20px rgba(179,71,234,0.4)' }} />
          <p className="text-gray-400 text-sm">加载游戏数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: 'linear-gradient(180deg, #060310 0%, #0c081e 50%, #060310 100%)' }}>
      {/* Top Bar */}
      <div className="px-4 py-3 border-b border-white/5" style={{ background: 'rgba(14,10,28,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-amber-400/90 text-2xl font-bold tracking-tight">D{state.currentDay}</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map(n => (
              <div key={n} className={`w-3 h-3 rotate-45 rounded-sm transition-all ${n <= myAP ? 'bg-purple-500' : 'bg-gray-700'}`}
                style={n <= myAP ? { boxShadow: '0 0 8px rgba(179,71,234,0.5)' } : {}} />
            ))}
            <span className="text-purple-400 font-mono text-sm ml-1">{myAP}/3</span>
          </div>
        </div>
        <p className="text-purple-400/50 text-xs">{myPos || '——'}</p>
      </div>

      {/* Daily Script 横幅 */}
      {state.dailyScript && (
        <div
          className="border-b border-purple-800/50 px-4 py-3 flex items-center justify-between cursor-pointer"
          style={{ background: 'linear-gradient(90deg, rgba(100,30,180,0.2), rgba(100,30,180,0.05))' }}
          onClick={() => setShowDaily(true)}>
          <div>
            <p className="text-purple-200 text-sm font-medium">{state.dailyScript.title}</p>
            <p className="text-purple-400/60 text-xs mt-0.5">剧情已更新，点击查看</p>
          </div>
          <span className="text-purple-400 text-lg">→</span>
        </div>
      )}

      {/* Voting 横幅 */}
      {state.currentDay === 5 && (
        <div
          className="border-b border-amber-800/50 px-4 py-3 flex items-center justify-between cursor-pointer"
          style={{ background: 'linear-gradient(90deg, rgba(196,155,63,0.15), rgba(196,155,63,0.05))' }}
          onClick={() => setShowVote(true)}>
          <div>
            <p className="text-amber-200 text-sm font-medium">最终抉择</p>
            <p className="text-amber-400/60 text-xs mt-0.5">三条路径，你选择哪一条？</p>
          </div>
          <span className="text-amber-400 text-lg">→</span>
        </div>
      )}

      {/* Map */}
      <div className="px-4 py-4">
        <MapView regions={regionList} currentPosition={myPos} players={playerList} onMove={handleMove} disabled={myAP <= 0} />
      </div>

      {/* 玩家位置分布条 */}
      <div className="px-4 mb-3">
        <p className="text-gray-600 text-xs mb-2">地图分布</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {playerList.map((p: any, idx: number) => (
            <div key={p.id} className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs ${p.position === myPos ? 'border' : 'border'}`}
              style={p.position === myPos
                ? { background: 'rgba(179,71,234,0.15)', borderColor: 'rgba(179,71,234,0.35)', color: '#c0a0e8' }
                : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: '#7a6e8a' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: ['#a78bfa','#f472b6','#60a5fa','#fbbf24','#34d399','#fb923c'][idx % 6] }} />
              <span>{p.name}</span>
              <span className="text-gray-600">@{p.position}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 同区域玩家 */}
      {playersHere.length > 0 && (
        <div className="px-4 mb-2">
          <div className="flex gap-2">
            {playersHere.map((p: any) => (
              <span key={p.id} className="px-2 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(179,71,234,0.08)', border: '1px solid rgba(179,71,234,0.2)', color: '#c0a0e8' }}>{p.name} 在此</span>
            ))}
          </div>
        </div>
      )}

      {/* 手牌 */}
      <div className="px-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-500 text-xs">手牌</p>
          <p className="text-gray-600 text-xs">{myClues.length} 线索 · {myItems.length} 道具</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {myClues.map((c: any) => (
            <button key={c.id} onClick={() => setShowClueDetail(c)}
              className="card-enhanced flex-shrink-0 w-28 h-20 rounded-xl p-2.5 text-left transition-all group"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', border: '1px solid rgba(196,155,63,0.15)' }}>
              <div className="w-full h-0.5 bg-purple-500/40 rounded mb-1.5" />
              <p className="text-gray-300 text-xs leading-tight line-clamp-3 group-hover:text-purple-300">{c.title}</p>
            </button>
          ))}
          {myItems.map((i: any) => (
            <button key={i.id} onClick={() => setShowItemUse(i)}
              className="card-enhanced flex-shrink-0 w-28 h-20 rounded-xl p-2.5 text-left transition-all group"
              style={{ background: 'linear-gradient(135deg, rgba(100,30,180,0.2), rgba(100,30,180,0.1))', border: '1px solid rgba(179,71,234,0.25)' }}>
              <p className="text-amber-400/80 text-lg text-center mb-0.5">◆</p>
              <p className="text-purple-300 text-xs leading-tight truncate group-hover:text-purple-200">{i.name}</p>
            </button>
          ))}
          {!myClues.length && !myItems.length && (
            <p className="text-gray-700 text-xs py-2">移动至档案馆搜索、黑市抽取来获得卡牌</p>
          )}
        </div>
      </div>

      {/* 区域专属操作 */}
      <div className="px-4 pb-1">
        {myPos === '档案馆' && (
          <button onClick={() => sendMessage({ type: 'archive_search', payload: {} })} disabled={myAP <= 0}
            className="btn-glow w-full py-3.5 text-white rounded-xl text-sm font-medium disabled:opacity-30 mb-2 transition-all"
            style={{ background: 'linear-gradient(135deg, #6080e8, #4060c0)' }}>
            📚 档案馆搜索 · 抽二选一
          </button>
        )}
        {myPos === '真理祭坛' && (
          <button onClick={() => setShowGodQ(true)} disabled={myAP < 2 || myClues.length === 0}
            className="btn-glow w-full py-3.5 text-white rounded-xl text-sm font-medium disabled:opacity-30 mb-2 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
            🔮 真理祭坛提问 · 消耗 2AP + 1线索
          </button>
        )}
        {myPos === '黑市' && (
          <button onClick={() => sendMessage({ type: 'black_market', payload: {} })} disabled={myAP <= 0}
            className="btn-glow w-full py-3.5 text-white rounded-xl text-sm font-medium disabled:opacity-30 mb-2 transition-all"
            style={{ background: 'linear-gradient(135deg, #c49b3f, #8b6914)' }}>
            💎 黑市抽道具 · 消耗 1AP
          </button>
        )}
      </div>

      {/* 通用操作按钮 */}
      <div className="px-4 pb-3 flex gap-2">
        {myPos !== '档案馆' && myPos !== '真理祭坛' && myPos !== '黑市' && (
          <button onClick={handleSearch} disabled={myAP <= 0}
            className="flex-1 py-3 text-white rounded-xl text-sm font-medium disabled:opacity-30 transition-all"
            style={{ background: 'linear-gradient(135deg, #b347ea, #6b21d4)', boxShadow: '0 0 16px rgba(179,71,234,0.3)' }}>
            🔍 搜索
          </button>
        )}
        <button onClick={() => setShowExchange(true)} disabled={myAP <= 0 || myClues.length === 0}
          className="flex-1 py-3 text-white rounded-xl text-sm font-medium disabled:opacity-30 transition-all"
          style={{ background: 'rgba(96,128,232,0.3)', border: '1px solid rgba(96,128,232,0.3)' }}>
          ⇄ 交流
        </button>
        <button onClick={() => sendMessage({ type: 'confession_reveal', payload: {} })}
          className="flex-1 py-3 rounded-xl text-xs transition-all"
          style={{ background: 'rgba(255,77,46,0.1)', border: '1px solid rgba(255,77,46,0.2)', color: '#ff7755' }}>
          📜 忏悔书
        </button>
        <button onClick={handleEndTurn}
          className="flex-1 py-3 rounded-xl text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#7a6e8a' }}>
          结束
        </button>
      </div>

      {/* Game Log */}
      <div className="px-4 pb-4">
        <GameLog logs={logList} />
      </div>

      {/* Modals */}
      {archiveOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-enhanced rounded-2xl w-full max-w-sm p-6" style={{ animation: 'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <h2 className="text-purple-300 text-lg font-bold mb-1">抽二选一</h2>
            <p className="text-gray-500 text-xs mb-4">选择一张保留，另一张公开标题并放回</p>
            {archiveOptions.map((opt: any) => (
              <button key={opt.id} onClick={() => { sendMessage({ type: 'archive_pick', payload: { pickedId: opt.id } }); setArchiveOptions(null); }}
                className="w-full py-3 text-white rounded-xl text-sm mb-2 text-left px-4 transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, rgba(179,71,234,0.3), rgba(179,71,234,0.1))', border: '1px solid rgba(179,71,234,0.2)' }}>{opt.title}</button>
            ))}
            <button onClick={() => setArchiveOptions(null)}
              className="w-full py-2 rounded-xl text-sm mt-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#7a6e8a' }}>取消</button>
          </div>
        </div>
      )}

      {showClueDetail && <ClueDetailModal clue={showClueDetail} onClose={() => setShowClueDetail(null)} />}
      {showExchange && <ExchangeModal players={playersHere} onClose={() => setShowExchange(false)} sendMessage={sendMessage} myClues={myClues} />}
      {showItemUse && <ItemUseModal item={showItemUse} players={playerList} myPosition={myPos} myPlayerId={state.playerId} onClose={() => setShowItemUse(null)} sendMessage={sendMessage} />}
      {showDaily && state.dailyScript && <DailyScriptModal script={state.dailyScript} onClose={() => setShowDaily(false)} />}
      {showVote && <VoteModal onVote={handleVote} onClose={() => setShowVote(false)} />}
      {showGodQ && <GodQuestionModal onAsk={(q: string) => { sendMessage({ type: 'ask_god', payload: { question: q } }); setShowGodQ(false); }} onClose={() => setShowGodQ(false)} />}
    </div>
  );
}
