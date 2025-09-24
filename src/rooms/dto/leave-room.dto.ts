export interface LeaveRoomDto {
  roomId: string;
  playerId: string;
}

export interface LeaveRoomResponse {
  roomId: string;
  players: string[];
  status: string;
}
