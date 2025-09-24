export interface CreateRoomDto {
  playerId: string;
  options: {
    maxPlayers: number;
    betAmount: number;
  };
}

export interface CreateRoomResponse {
  id: string;
  owner: string;
  players: string[];
  betAmount: number;
  maxPlayers: number;
}
