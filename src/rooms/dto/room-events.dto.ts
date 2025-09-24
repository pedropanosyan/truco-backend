export interface ConnectedResponse {
  message: string;
  socketId: string;
}

export interface DisconnectedResponse {
  message: string;
  socketId: string;
}

export interface RoomUpdatedEvent {
  roomId: string;
  players: string[];
  status: string;
}

export interface StartGameEvent {
  roomId: string;
  players: string[];
  mode: string;
}

export interface RoomClosedEvent {
  roomId: string;
  reason: 'deleted_by_owner' | 'empty' | 'owner_left' | 'timeout';
}

export enum RoomStatus {
  WAITING = 'waiting',
  IN_GAME = 'in_game',
  CLOSED = 'closed',
}

