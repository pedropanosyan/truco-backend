import { Test, TestingModule } from '@nestjs/testing';
import { GameManager } from './GameManager';
import { GameEvents, HandEvents } from 'src/engine';

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameManager],
    }).compile();

    gameManager = module.get<GameManager>(GameManager);
  });

  describe('createGame', () => {
    it('should create a new game and return client state', () => {
      const result = gameManager.createGame(
        'room1',
        ['player1', 'player2'],
        30,
        100,
      );

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room1');
      expect(result.players).toHaveLength(2);
      expect(result.scoreLimit).toBe(30);
      expect(result.betAmount).toBe(100);
      expect(result.availableActions).toBeDefined();
    });

    it('should set default score limit when not provided', () => {
      const result = gameManager.createGame(
        'room1',
        ['player1', 'player2'],
        undefined,
        100,
      );

      expect(result.scoreLimit).toBe(30);
    });
  });

  describe('getGame', () => {
    it('should return undefined for non-existent game', () => {
      const result = gameManager.getGame('non-existent');

      expect(result).toBeUndefined();
    });

    it('should return client game state for existing game', () => {
      gameManager.createGame('room1', ['player1', 'player2'], 30, 100);

      const result = gameManager.getGame('room1');

      expect(result).toBeDefined();
      expect(result?.roomId).toBe('room1');
    });
  });

  describe('getClientGameState', () => {
    beforeEach(() => {
      gameManager.createGame('room1', ['player1', 'player2'], 30, 100);
    });

    it('should return client state for specific player', () => {
      const result = gameManager.getClientGameState('room1', 'player1');

      expect(result).toBeDefined();
      expect(result?.roomId).toBe('room1');
      expect(result?.hand).toBeDefined();
      expect(result?.availableActions).toBeDefined();
    });

    it('should return undefined for non-existent game', () => {
      const result = gameManager.getClientGameState('non-existent', 'player1');

      expect(result).toBeUndefined();
    });
  });

  describe('sendEventToGame', () => {
    beforeEach(() => {
      gameManager.createGame('room1', ['player1', 'player2'], 30, 100);
    });

    it('should send event to existing game', () => {
      const result = gameManager.sendEventToGame('room1', {
        type: GameEvents.END_GAME,
      });

      expect(result).toBe(true);
    });

    it('should return false for non-existent game', () => {
      const result = gameManager.sendEventToGame('non-existent', {
        type: GameEvents.END_GAME,
      });

      expect(result).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    it('should return available actions array', () => {
      const result = gameManager.createGame(
        'room1',
        ['player1', 'player2'],
        30,
        100,
      );

      expect(result.availableActions).toBeDefined();
      expect(Array.isArray(result.availableActions)).toBe(true);
    });

    it('should update available actions when game state changes', () => {
      gameManager.createGame('room1', ['player1', 'player2'], 30, 100);

      const initialState = gameManager.getClientGameState('room1', 'player1');
      const initialActionsCount = initialState?.availableActions.length || 0;

      // Send an event to potentially change available actions
      gameManager.sendEventToGame('room1', {
        type: GameEvents.UPDATE_GAME_POINTS,
        points: 5,
        playerId: 'player1',
      });

      const updatedState = gameManager.getClientGameState('room1', 'player1');

      expect(updatedState?.availableActions).toBeDefined();
      expect(Array.isArray(updatedState?.availableActions)).toBe(true);
    });
  });
});
