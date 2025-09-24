import { RoomStatus } from '../dto';


export interface Room {
  id: string;
  owner: string;
  players: string[];
  maxPlayers: number;
  status: RoomStatus;
  betAmount: number;
}

export interface RoomOptions {
  maxPlayers: number;
  betAmount: number;
}

export interface Player {
  socketId: string;
  playerId: string;
  roomId: string | null;
}
