import { Room } from "../types";

export interface ConnectedResponse {
  message: string;
  socketId: string;
  rooms: Room[]
}

export interface DisconnectedResponse {
  message: string;
  socketId: string;
}

export interface RoomUpdatedEvent {
  roomId: string;
  players: string[];
}

export interface StartGameEvent {
  roomId: string;
  players: string[];
  mode: string;
}

