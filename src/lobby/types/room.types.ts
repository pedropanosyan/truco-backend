export interface Room {
  id: string;
  owner: string;
  players: string[];
  maxPlayers: number;
  betAmount: number;
  scoreLimit: number;
}

export interface RoomOptions {
  maxPlayers: number;
  betAmount: number;
  scoreLimit: number;
}

export interface Player {
  socketId: string;
  playerId: string;
  roomId: string | null;
}
