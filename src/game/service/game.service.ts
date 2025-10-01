import { Injectable } from '@nestjs/common';
import { GameManager } from '../utils';
import { ClientGameState, StartGame } from '../types';
import { PlayCardDto } from '../dto';
import { GameNotFoundException } from '../exceptions';

@Injectable()
export class GameService {
  constructor(private readonly gameManager: GameManager) {}

  public startGame(startGameData: StartGame): ClientGameState {
    const { roomId, players, betAmount, scoreLimit } = startGameData;
    const gameState = this.gameManager.createGame(
      roomId,
      players,
      scoreLimit,
      betAmount,
    );

    return gameState;
  }

  public playCard(clientId: string, data: PlayCardDto): ClientGameState {
    const { roomId, playerId, card } = data;
    const gameState = this.gameManager.getGame(roomId);
    if (!gameState) {
      throw new GameNotFoundException();
    }

    return gameState;
  }
}
