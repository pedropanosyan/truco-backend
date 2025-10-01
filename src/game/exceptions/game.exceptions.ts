import { HttpException, HttpStatus } from '@nestjs/common';

export class GameNotFoundException extends HttpException {
  constructor() {
    super(`Game not found`, HttpStatus.NOT_FOUND);
  }
}

export class GameNotInProgressException extends HttpException {
  constructor(roomId: string) {
    super(
      `Game is not in progress for room: ${roomId}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidTurnException extends HttpException {
  constructor(playerId: string, expectedPlayerId: string) {
    super(
      `It's not ${playerId}'s turn. Expected: ${expectedPlayerId}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidCardException extends HttpException {
  constructor(playerId: string, cardRank: string, cardSuit: string) {
    super(
      `Player ${playerId} doesn't have card ${cardRank} of ${cardSuit}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidGamePhaseException extends HttpException {
  constructor(currentPhase: string, expectedPhase: string) {
    super(
      `Invalid game phase. Current: ${currentPhase}, Expected: ${expectedPhase}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidPlayerCountException extends HttpException {
  constructor(playerCount: number) {
    super(
      `Invalid player count: ${playerCount}. Game requires 2-4 players`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PlayerNotInGameException extends HttpException {
  constructor(playerId: string, roomId: string) {
    super(
      `Player ${playerId} is not in game for room: ${roomId}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class NoActiveCallException extends HttpException {
  constructor(roomId: string) {
    super(
      `No active call to respond to in room: ${roomId}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
