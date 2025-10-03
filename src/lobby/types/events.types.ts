export enum ClientToServerEvents {
  CREATE_ROOM = 'createRoom',
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  DELETE_ROOM = 'deleteRoom',
  START_GAME = 'startGame',
  REGISTER_PLAYER = 'registerPlayer',
}

export enum ServerToClientEvents {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ROOM_CREATED = 'roomCreated',
  ROOM_UPDATED = 'roomUpdated',
  ROOM_DELETED = 'roomDeleted',
  GAME_STARTING = 'gameStarting',
  START_GAME = 'startGame',
  ROOMS = 'rooms',
  ERROR = 'error',
}
