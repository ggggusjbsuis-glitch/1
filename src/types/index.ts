// 全局类型定义 — PlayerInfo、GameState、ClueCard、ItemCard 等全部 TS 类型
export interface PlayerInfo {
  id: string;
  name: string;
  isGM: boolean;
}

export interface RoomState {
  roomId: string;
  players: PlayerInfo[];
}

export interface GameState {
  playerId: string | null;
  isGM: boolean;
  roomId: string | null;
  phase: 'lobby' | 'playing' | 'ended';
  currentDay: number;
  myCharacter: Character | null;
  myPosition: string;
  myActionPoints: number;
  myClueCards: ClueCard[];
  myItemCards: ItemCard[];
  dailyScript: DailyScript | null;
  players: PublicPlayerInfo[];
  gameLog: string[];
  // GM only
  allPlayerHands?: Record<string, { clues: string[]; items: string[] }>;
  truthScore?: number;
  suggestedEnding?: string | null;
  finalEnding?: string | null;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  camp: string;
}

export interface ClueCard {
  id: string;
  title: string;
  content: string;
}

export interface ItemCard {
  id: string;
  name: string;
  effect: string;
  effectType: string;
  bound: boolean;
  used?: boolean;
}

export interface DailyScript {
  day: number;
  title: string;
  narrative: string;
  actionGuide: string;
}

export interface PublicPlayerInfo {
  id: string;
  name: string;
  isGM: boolean;
}

export type GameAction =
  | { type: 'SET_PLAYER'; payload: { playerId: string; isGM: boolean } }
  | { type: 'SET_ROOM'; payload: { roomId: string; players: PlayerInfo[] } }
  | { type: 'SET_PHASE'; payload: 'lobby' | 'playing' | 'ended' }
  | { type: 'SYNC_STATE'; payload: Partial<GameState> }
  | { type: 'SET_DAILY_SCRIPT'; payload: DailyScript }
  | { type: 'ADD_CLUE'; payload: ClueCard }
  | { type: 'REMOVE_CLUE'; payload: string }
  | { type: 'ADD_ITEM'; payload: ItemCard }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'RESET' };
