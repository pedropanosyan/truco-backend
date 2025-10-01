import { WsException } from '@nestjs/websockets';

export class RoomNotFoundException extends WsException {
  constructor() {
    super(`Room with ID not found`);
  }
}

export class PlayerNotFoundException extends WsException {
  constructor() {
    super(`Player not found`);
  }
}

export class RoomFullException extends WsException {
  constructor() {
    super(`Room is full`);
  }
}

export class PlayerNotInRoomException extends WsException {
  constructor() {
    super(`Player is not in room`);
  }
}

export class UnauthorizedRoomActionException extends WsException {
  constructor(action: string) {
    super(`Player is not authorized to ${action} room`);
  }
}

export class PlayerAlreadyInRoomException extends WsException {
  constructor() {
    super(`Player is already in room`);
  }
}

export class InvalidRoomOptionsException extends WsException {
  constructor() {
    super(`Invalid room options`);
  }
}

export class RoomAlreadyStartedException extends WsException {
  constructor() {
    super(`Room has already started and cannot be modified`);
  }
}

export class PlayerAlreadyRegisteredException extends WsException {
  constructor() {
    super(`Player has already registered`);
  }
}
