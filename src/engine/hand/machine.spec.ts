import { createActor } from 'xstate';
import { handMachine } from './machine';
import { HandEvents, HandStates, Rank, Suit } from './types';

describe('Hand Machine', () => {
  const defaultInput = {
    players: [{ id: 'player1' }, { id: 'player2' }],
    startingPlayer: 'player1',
    scoreLimit: 30,
    currentScores: { player1: 0, player2: 0 },
  };

  describe('Initial State', () => {
    it('should start in IDLE state with correct initial context', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });

      // Act
      actor.start();

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.IDLE);
      expect(actor.getSnapshot().context.players).toEqual(defaultInput.players);
      expect(actor.getSnapshot().context.hands).toEqual({});
      expect(actor.getSnapshot().context.cardPlays).toEqual([]);
      expect(actor.getSnapshot().context.currentTurn).toBe('player1');
      expect(actor.getSnapshot().context.startingPlayer).toBe('player1');
      expect(actor.getSnapshot().context.trucoPoints).toBe(0);
      expect(actor.getSnapshot().context.scoreLimit).toBe(30);
      expect(actor.getSnapshot().context.currentScores).toEqual({
        player1: 0,
        player2: 0,
      });
    });
  });

  describe('IDLE State Transitions', () => {
    it('should transition to ENVIDO_PHASE when DEAL event is sent', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();

      // Act
      actor.send({ type: HandEvents.DEAL });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_IDLE,
      });
      expect(actor.getSnapshot().context.hands.player1).toHaveLength(3);
      expect(actor.getSnapshot().context.hands.player2).toHaveLength(3);
    });

    it('should deal all different cards when DEAL event is sent', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();

      // Act
      actor.send({ type: HandEvents.DEAL });

      // Assert
      expect(actor.getSnapshot().context.hands.player1).toHaveLength(3);
      expect(actor.getSnapshot().context.hands.player2).toHaveLength(3);
      actor.getSnapshot().context.hands.player1.forEach((card) => {
        expect(actor.getSnapshot().context.hands.player2).not.toContain(card);
      });
    });

    it('should not respond to other events in IDLE state', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();

      // Act & Assert - PLAY_CARD event
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: { rank: Rank.ACE, suit: Suit.ORO },
      });
      expect(actor.getSnapshot().value).toBe(HandStates.IDLE);
      expect(actor.getSnapshot().context.hands).toEqual({});
    });
  });

  describe('ENVIDO_PHASE State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
    });

    it('should stay in ENVIDO_PHASE when current player plays first card', () => {
      // Arrange - Get a card from the player's hand
      const playerHand = actor.getSnapshot().context.hands.player1;
      const cardToPlay = playerHand[0];

      // Act
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1', // Current player
        card: cardToPlay,
      });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_IDLE,
      });
      expect(actor.getSnapshot().context.hands.player1).toHaveLength(2);
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(1);
      expect(actor.getSnapshot().context.cardPlays[0].playerId).toBe('player1');
      expect(actor.getSnapshot().context.cardPlays[0].card).toEqual(cardToPlay);
    });

    it('should transition to TRUCO_PHASE when all players have played first card', () => {
      // Arrange - Play first card for both players
      const player1Hand = actor.getSnapshot().context.hands.player1;
      const player2Hand = actor.getSnapshot().context.hands.player2;

      // Play first card for player1
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: player1Hand[0],
      });

      // Play first card for player2
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player2',
        card: player2Hand[0],
      });

      // Act - Play second card for player1 (should close envido)
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: actor.getSnapshot().context.hands.player1[0],
      });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
    });

    it('should not transition when current player plays a wrong card', () => {
      // Arrange - Get a card from the other player's hand
      const otherPlayerHand = actor.getSnapshot().context.hands.player2;
      const cardToPlay = otherPlayerHand[0];

      // Act
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: cardToPlay,
      });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_IDLE,
      });
      expect(actor.getSnapshot().context.hands.player1).toHaveLength(3);
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(0);
    });

    it('should transition to the next player when playing a card', () => {
      // Arrange
      const player1Hand = actor.getSnapshot().context.hands.player1;
      const player2Hand = actor.getSnapshot().context.hands.player2;

      // Act
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: player1Hand[0],
      });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_IDLE,
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player2');
    });

    it('should transition to HAND_END on FORFEIT by current player', () => {
      // Act
      actor.send({ type: HandEvents.FORFEIT, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.HAND_END);
    });

    it('should handle ENVIDO calls in ENVIDO_PHASE', () => {
      // Act
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
    });

    it('should handle TRUCO calls in ENVIDO_PHASE', () => {
      // Act
      actor.send({ type: HandEvents.CALL_TRUCO, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
    });
  });
});
