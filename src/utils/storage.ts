// localStorage 封装 — 玩家身份持久化（token + 昵称）
function genToken() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export function getPlayerToken(): string {
  let t = localStorage.getItem('curtain_token');
  if (!t) { t = genToken(); localStorage.setItem('curtain_token', t); }
  return t;
}

export function getPlayerName(): string {
  return localStorage.getItem('curtain_name') || '';
}

export function setPlayerName(name: string): void {
  localStorage.setItem('curtain_name', name);
}
