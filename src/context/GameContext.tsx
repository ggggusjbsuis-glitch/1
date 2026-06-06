// ========================================
// 全局状态管理 — WebSocket 连接 + useReducer 消息分发中枢
// useReducer + Context · 服务端为唯一状态源
// ========================================
import { createContext, useContext, useReducer, useRef, useCallback, ReactNode } from 'react';
import type { GameState, GameAction } from '../types';
import { getPlayerToken, getPlayerName } from '../utils/storage';

const initialState: GameState = {
  playerId: null, isGM: false, roomId: null, phase: 'lobby',
  currentDay: 0, myCharacter: null, myPosition: '', myActionPoints: 3,
  myClueCards: [], myItemCards: [], dailyScript: null, players: [], gameLog: [],
};

// ---- Reducer ----
function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PLAYER':
      return { ...state, playerId: action.payload.playerId, isGM: action.payload.isGM };
    case 'SET_ROOM':
      return { ...state, roomId: action.payload.roomId, players: action.payload.players, isGM: action.payload.players?.find((p: any) => p.id === state.playerId)?.isGM || false };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SYNC_STATE':
      return { ...state, ...action.payload };  // 服务端全量覆盖
    case 'SET_DAILY_SCRIPT':
      return { ...state, dailyScript: action.payload };
    case 'ADD_CLUE':
      return { ...state, myClueCards: [...state.myClueCards, action.payload] };
    case 'REMOVE_CLUE':
      return { ...state, myClueCards: state.myClueCards.filter(c => c.id !== action.payload) };
    case 'ADD_ITEM':
      return { ...state, myItemCards: [...state.myItemCards, action.payload] };
    case 'REMOVE_ITEM':
      return { ...state, myItemCards: state.myItemCards.filter(i => i.id !== action.payload) };
    case 'ADD_LOG':
      return { ...state, gameLog: [...state.gameLog, action.payload] };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ---- Context 类型 ----
interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  connect: (url: string, onOpenMsgs?: object | object[], onReady?: () => void) => void;
  sendMessage: (msg: object) => boolean;
  disconnect: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// ---- Provider ----
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const urlRef = useRef<string>('');
  const manualCloseRef = useRef(false);
  const reconnectRef = useRef(false);
  const retryRef = useRef(0);

  // 发送消息（返回是否成功）
  const sendMessage = useCallback((msg: object): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
    console.warn('[WS] 无法发送, 状态:', wsRef.current?.readyState);
    return false;
  }, []);

  // 建立WebSocket连接（onReady在连接成功后回调，onOpenMsg在连接成功后发送）
  // 5秒超时自动取消
  // onOpenMsgs支持单条消息或消息数组（用于auth+create_room等连续操作）
  const connect = useCallback((url: string, onOpenMsgs?: object | object[], onReady?: () => void) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    urlRef.current = url;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    const token = getPlayerToken();
    const name = getPlayerName();
    (ws as any)._playerToken = token;

    const timeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        console.error('[WS] 连接超时');
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      const msgs = Array.isArray(onOpenMsgs) ? onOpenMsgs : (onOpenMsgs ? [onOpenMsgs] : []);
      // 向 auth_skip 自动注入玩家身份信息
      let hasAuth = false;
      msgs.forEach(m => {
        if ((m as any).type === 'auth_skip') {
          (m as any).payload = { ...(m as any).payload, playerToken: token, playerName: name };
          hasAuth = true;
        }
        ws.send(JSON.stringify(m));
      });
      // 如果调用方没发 auth_skip（重连场景），补发一个
      if (!hasAuth) {
        ws.send(JSON.stringify({ type: 'auth_skip', payload: { playerToken: token, playerName: name } }));
      }
      if (onReady) onReady();
    };

    // ---- 消息分发 ----
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        // 认证
        case 'auth_ok':
          dispatch({ type: 'SET_PLAYER', payload: { playerId: msg.payload.playerId, isGM: false } });
          dispatch({ type: 'SYNC_STATE', payload: { _authRole: msg.payload.role, _authResult: 'ok' } });
          break;
        case 'auth_fail':
          dispatch({ type: 'SYNC_STATE', payload: { _authResult: 'fail' } });
          break;

        // 断线重连恢复
        case 'reconnect_ok':
          dispatch({ type: 'SET_PLAYER', payload: { playerId: msg.payload.playerId, isGM: msg.payload.isGM } });
          dispatch({ type: 'SYNC_STATE', payload: { roomId: msg.payload.roomId, phase: msg.payload.phase, currentDay: msg.payload.currentDay, _reconnected: true } });
          retryRef.current = 0;
          reconnectRef.current = false;
          break;

        case 'player_disconnected':
          dispatch({ type: 'ADD_LOG', payload: `🔌 ${msg.payload.name} 断开连接` });
          break;

        case 'player_reconnected':
          dispatch({ type: 'ADD_LOG', payload: `🔗 ${msg.payload.name} 已重连` });
          break;

        // 管理员操作反馈
        case 'admin_script_added':
        case 'admin_script_deleted':
          dispatch({ type: 'ADD_LOG', payload: msg.payload.message });
          break;

        // 房间列表（大厅）
        case 'room_list':
          dispatch({ type: 'SYNC_STATE', payload: { _roomList: msg.payload.rooms } });
          break;

        // 房间内更新
        case 'room_update':
          dispatch({ type: 'SET_ROOM', payload: { roomId: msg.payload.roomId, players: msg.payload.players } });
          break;

        // 剧本大厅
        case 'script_list':
          dispatch({ type: 'SYNC_STATE', payload: { _scriptList: msg.payload.scripts } });
          break;
        case 'script_selected':
          dispatch({ type: 'SYNC_STATE', payload: { _selectedScriptId: msg.payload.scriptId } });
          break;
        case 'player_ready_update':
          break; // 暂时仅广播，不需前端状态

        // 游戏开始（全量状态 + 剧情）
        case 'game_start':
          dispatch({ type: 'SYNC_STATE', payload: msg.payload });
          dispatch({ type: 'SET_PHASE', payload: 'playing' });
          if (msg.payload.dailyScript) {
            dispatch({ type: 'SET_DAILY_SCRIPT', payload: msg.payload.dailyScript });
          }
          break;

        // 每次行动后的状态同步
        case 'state_sync':
          dispatch({ type: 'SYNC_STATE', payload: msg.payload });
          break;

        // 每日剧情推送
        case 'daily_script':
          dispatch({ type: 'SET_DAILY_SCRIPT', payload: msg.payload });
          break;

        // 搜索
        case 'search_result':
          dispatch({ type: 'ADD_CLUE', payload: msg.payload.clue });
          dispatch({ type: 'ADD_LOG', payload: `获得线索: ${msg.payload.clue.title}` });
          dispatch({ type: 'SYNC_STATE', payload: { _archiveOptions: null } });
          break;

        // 档案馆抽选
        case 'archive_choice':
          dispatch({ type: 'SYNC_STATE', payload: { _archiveOptions: msg.payload.options } });
          break;

        // 线索交流
        case 'exchange_result':
          dispatch({ type: 'ADD_CLUE', payload: msg.payload.receivedClue });
          dispatch({ type: 'ADD_LOG', payload: `交换获得线索: ${msg.payload.receivedClue.title}` });
          break;

        // D5投票
        case 'voting_start':
          dispatch({ type: 'SYNC_STATE', payload: { currentDay: 5 } });
          break;

        // 祭坛提问（玩家端：已提交）
        case 'god_asked':
          dispatch({ type: 'ADD_LOG', payload: '问题已提交给上帝，等待回应...' });
          break;

        // 祭坛待答（GM端）
        case 'god_question':
          dispatch({ type: 'SYNC_STATE', payload: { _godQuestions: msg.payload.questions } });
          break;

        // 祭坛回答
        case 'god_answer':
          dispatch({ type: 'ADD_LOG', payload: `上帝回答: ${msg.payload.question} → ${msg.payload.answer} (消耗: ${msg.payload.consumedClueTitle})` });
          break;

        // 密室开启
        case 'secret_room_open':
          dispatch({ type: 'ADD_LOG', payload: '🔓 ' + msg.payload.announceText });
          break;

        // 结局
        case 'ending':
          dispatch({ type: 'SYNC_STATE', payload: { phase: 'ended', finalEnding: msg.payload.title + '\n' + msg.payload.text } });
          break;

        // 道具使用反馈
        case 'item_result':
          dispatch({ type: 'ADD_LOG', payload: '🎒 ' + (msg.payload.effect || '道具使用成功') });
          break;

        // 被踢
        case 'kicked':
          dispatch({ type: 'RESET' });
          break;

        // 错误提示
        case 'error':
          dispatch({ type: 'ADD_LOG', payload: '⚠ ' + msg.payload.message });
          break;
      }
    };

    // 断线自动重连（指数退避: 1s→2s→4s→8s→16s 最多5次）
    ws.onclose = () => {
      if (manualCloseRef.current) { manualCloseRef.current = false; return; }
      if (reconnectRef.current) return;
      if (retryRef.current >= 5) {
        dispatch({ type: 'ADD_LOG', payload: '⚠ 连接失败，请刷新页面重试' });
        return;
      }
      reconnectRef.current = true;
      const delay = Math.pow(2, retryRef.current) * 1000;
      retryRef.current++;
      setTimeout(() => {
        connect(url, [], () => {
          // 重连后 ws 已就绪，不额外处理（由 reconnect_ok 消息驱动）
        });
      }, delay);
    };

    ws.onerror = (e) => console.error('[WS] 错误', e);
  }, [dispatch]);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    retryRef.current = 0;
    reconnectRef.current = false;
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, connect, sendMessage, disconnect }}>
      {children}
    </GameContext.Provider>
  );
}

// ---- Hook ----
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
