export interface JoinRoomDto {
  roomId: string;
  playerId: string;
}

export interface JoinRoomResponse {
  roomId: string;
  players: string[];
}
