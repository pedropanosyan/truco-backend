import { Test, TestingModule } from '@nestjs/testing';
import { EngineController } from './engine.controller';
import { HAND_EVENT, HAND_STATE } from '../types';

describe('EngineController', () => {
  let controller: EngineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngineController],
    }).compile();

    controller = module.get<EngineController>(EngineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('testGame', () => {
    it('should return initial game state', () => {
      const result = controller.testGame();

      expect(result.state).toBe(HAND_STATE.START_HAND);
      expect(result.context).toBeDefined();
      expect(result.context.players).toHaveLength(2);
      expect(result.context.dealer.id).toBe(0);
      expect(result.canReceive).toBe(true);
    });
  });

  describe('createGame', () => {
    it('should create a new game with correct parameters', () => {
      const result = controller.createGame({ numPlayers: 2, dealerId: 0 });

      expect(result.gameId).toBeDefined();
      expect(result.state).toBe(HAND_STATE.START_HAND);
      expect(result.context.players).toHaveLength(2);
      expect(result.context.dealer.id).toBe(0);
      expect(result.availableActions).toContain(HAND_EVENT.DEAL);
    });

    it('should create a game with 4 players', () => {
      const result = controller.createGame({ numPlayers: 4, dealerId: 1 });

      expect(result.context.players).toHaveLength(4);
      expect(result.context.dealer.id).toBe(1);
    });
  });

  describe('getGameState', () => {
    it('should return game state for existing game', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      const stateResult = controller.getGameState(createResult.gameId);

      expect(stateResult.gameId).toBe(createResult.gameId);
      expect(stateResult.state).toBe(HAND_STATE.START_HAND);
      expect(stateResult.availableActions).toContain(HAND_EVENT.DEAL);
    });

    it('should return error for non-existent game', () => {
      const result = controller.getGameState('non-existent-game');

      expect(result.error).toBe('Game not found');
    });
  });

  describe('deal', () => {
    it('should deal cards and transition to ready state', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      const dealResult = controller.deal(createResult.gameId);

      expect(dealResult.state).toBe(HAND_STATE.READY);
      expect(dealResult.actionPerformed).toBe(HAND_EVENT.DEAL);
      expect(dealResult.availableActions).toContain(HAND_EVENT.PLAY_CARD);
      expect(dealResult.availableActions).toContain(HAND_EVENT.CALL_ENVIDO);
      expect(dealResult.availableActions).toContain(HAND_EVENT.CALL_TRUCO);
    });
  });

  describe('playCard', () => {
    it('should play a card and transition to playing state', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);

      const playResult = controller.playCard(createResult.gameId, {
        player: 1, // mano player
        card: { suit: 'ESPADA', rank: '1' },
      });

      expect(playResult.state).toBe(HAND_STATE.PLAYING);
      expect(playResult.actionPerformed).toBe(HAND_EVENT.PLAY_CARD);
    });

    it('should reject playing card when not player turn', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);

      const playResult = controller.playCard(createResult.gameId, {
        player: 0, // not mano player
        card: { suit: 'ESPADA', rank: '1' },
      });

      expect(playResult.error).toBe('Invalid action for current state');
    });
  });

  describe('callEnvido', () => {
    it('should call envido and transition to envido state', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);

      const envidoResult = controller.callEnvido(createResult.gameId);

      expect(envidoResult.state).toBe(HAND_STATE.ENVIDO);
      expect(envidoResult.actionPerformed).toBe(HAND_EVENT.CALL_ENVIDO);
      expect(envidoResult.availableActions).toContain(HAND_EVENT.ACCEPT);
      expect(envidoResult.availableActions).toContain(HAND_EVENT.REJECT);
    });
  });

  describe('callTruco', () => {
    it('should call truco and transition to truco state', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);

      const trucoResult = controller.callTruco(createResult.gameId);

      expect(trucoResult.state).toBe(HAND_STATE.TRUCO);
      expect(trucoResult.actionPerformed).toBe(HAND_EVENT.CALL_TRUCO);
      expect(trucoResult.availableActions).toContain(HAND_EVENT.ACCEPT);
      expect(trucoResult.availableActions).toContain(HAND_EVENT.REJECT);
    });
  });

  describe('accept', () => {
    it('should accept envido and transition to resolving envido', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);
      controller.callEnvido(createResult.gameId);

      const acceptResult = controller.accept(createResult.gameId);

      expect(acceptResult.state).toBe(HAND_STATE.RESOLVING_ENVIDO);
      expect(acceptResult.actionPerformed).toBe(HAND_EVENT.ACCEPT);
    });

    it('should accept truco and transition to playing', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);
      controller.callTruco(createResult.gameId);

      const acceptResult = controller.accept(createResult.gameId);

      expect(acceptResult.state).toBe(HAND_STATE.PLAYING);
      expect(acceptResult.actionPerformed).toBe(HAND_EVENT.ACCEPT);
    });
  });

  describe('reject', () => {
    it('should reject envido and transition to post envido', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);
      controller.callEnvido(createResult.gameId);

      const rejectResult = controller.reject(createResult.gameId);

      expect(rejectResult.state).toBe(HAND_STATE.POST_ENVIDO);
      expect(rejectResult.actionPerformed).toBe(HAND_EVENT.REJECT);
    });

    it('should reject truco and transition to end hand', () => {
      const createResult = controller.createGame({
        numPlayers: 2,
        dealerId: 0,
      });
      controller.deal(createResult.gameId);
      controller.callTruco(createResult.gameId);

      const rejectResult = controller.reject(createResult.gameId);

      expect(rejectResult.state).toBe(HAND_STATE.END_HAND);
      expect(rejectResult.actionPerformed).toBe(HAND_EVENT.REJECT);
    });
  });

  describe('listGames', () => {
    it('should return list of active games', () => {
      controller.createGame({ numPlayers: 2, dealerId: 0 });
      controller.createGame({ numPlayers: 3, dealerId: 1 });

      const games = controller.listGames();

      expect(games).toHaveLength(2);
      expect(games[0]).toHaveProperty('gameId');
      expect(games[0]).toHaveProperty('state');
    });
  });
});
