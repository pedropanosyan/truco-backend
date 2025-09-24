export enum ClientToServerEvents {
  CREATE_ROOM = 'createRoom',
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  DELETE_ROOM = 'deleteRoom',
  PLAY_CARD = 'playCard',
}

export enum ServerToClientEvents {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ROOM_CREATED = 'roomCreated',
  ROOM_UPDATED = 'roomUpdated',
  ROOM_CLOSED = 'roomClosed',
  GAME_STARTING = 'gameStarting',
  START_GAME = 'startGame',
  CARD_PLAYED = 'cardPlayed',
  ERROR = 'error',
}
