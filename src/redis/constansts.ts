export const keys = {
  room: (roomId: string) => `room:${roomId}`,
  roomPlayers: (roomId: string) => `room:${roomId}:players`,
  roomsAll: 'rooms:all',
  roomsByStatus: (status: string) => `rooms:status:${status}`,
  player: (playerId: string) => `player:${playerId}`,
};
