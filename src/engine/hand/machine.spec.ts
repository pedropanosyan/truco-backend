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
      expect(actor.getSnapshot().context.currentTurn).toBe('player1'); // Turn should remain unchanged
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
      expect(actor.getSnapshot().context.currentTurn).toBe('player2'); // Turn should change to next player
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
      expect(actor.getSnapshot().context.currentTurn).toBe('player2'); // Turn should change to player2

      // Play first card for player2
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player2',
        card: player2Hand[0],
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player1'); // Turn should change back to player1

      // Act - Play second card for player1 (should close envido)
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: actor.getSnapshot().context.hands.player1[0],
      });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.TRUCO_PHASE]: HandStates.TRUCO_PHASE_IDLE,
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player2'); // Turn should change to player2
    });

    it('should not transition when current player plays a wrong card', () => {
      // Arrange - Get a card from the other player's hand
      const otherPlayerHand = actor.getSnapshot().context.hands.player2;
      const cardToPlay = otherPlayerHand[0];
      const initialTurn = actor.getSnapshot().context.currentTurn;

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
      expect(actor.getSnapshot().context.currentTurn).toBe(initialTurn); // Turn should remain unchanged
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
      const initialTurn = actor.getSnapshot().context.currentTurn;

      // Act
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player2'); // Turn should change after ENVIDO call
    });

    it('should handle TRUCO calls in ENVIDO_PHASE', () => {
      // Act
      actor.send({ type: HandEvents.CALL_TRUCO, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.TRUCO_PHASE]: HandStates.TRUCO_PHASE_PLAYING,
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player2'); // Turn should change after TRUCO call
    });
  });

  describe('TRUCO_PHASE State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
      // Transition to TRUCO_PHASE by calling TRUCO
      actor.send({ type: HandEvents.CALL_TRUCO, playerId: 'player1' });
    });

    it('should be in TRUCO_PHASE_PLAYING after CALL_TRUCO', () => {
      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.TRUCO_PHASE]: HandStates.TRUCO_PHASE_PLAYING,
      });
    });

    it('should handle FORFEIT in TRUCO_PHASE', () => {
      // Act
      actor.send({ type: HandEvents.FORFEIT, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.HAND_END);
    });

    it('should handle card plays in TRUCO_PHASE_PLAYING', () => {
      const currentTurnBefore = actor.getSnapshot().context.currentTurn;
      const currentPlayerHand =
        actor.getSnapshot().context.hands[currentTurnBefore];
      const cardToPlay = currentPlayerHand[0];

      // Act
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: currentTurnBefore,
        card: cardToPlay,
      });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.TRUCO_PHASE]: HandStates.TRUCO_PHASE_PLAYING,
      });
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(1);
      expect(actor.getSnapshot().context.currentTurn).toBe(
        currentTurnBefore === 'player1' ? 'player2' : 'player1',
      ); // Turn should change to the other player
    });
  });

  describe('ENVIDO_PHASE_PLAYING State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });
    });

    it('should be in ENVIDO_PHASE_PLAYING after CALL_ENVIDO', () => {
      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
    });

    it('should handle TRUCO calls during ENVIDO_PHASE_PLAYING', () => {
      // Act
      actor.send({ type: HandEvents.CALL_TRUCO, playerId: 'player2' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.TRUCO_PHASE]: HandStates.TRUCO_PHASE_PLAYING,
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player1'); // Turn should change after TRUCO call
    });

    it('should handle card plays in ENVIDO_PHASE_PLAYING', () => {
      const currentTurnBefore = actor.getSnapshot().context.currentTurn;
      const currentPlayerHand =
        actor.getSnapshot().context.hands[currentTurnBefore];
      const cardToPlay = currentPlayerHand[0];

      // Act
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: currentTurnBefore,
        card: cardToPlay,
      });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(1);
      expect(actor.getSnapshot().context.currentTurn).toBe(
        currentTurnBefore === 'player1' ? 'player2' : 'player1',
      ); // Turn should change to the other player
    });
  });

  describe('HAND_END State', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
      // Force to HAND_END via forfeit
      actor.send({ type: HandEvents.FORFEIT, playerId: 'player1' });
    });

    it('should be in HAND_END state after forfeit', () => {
      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.HAND_END);
    });

    it('should handle RESET event and return to IDLE', () => {
      // Act
      actor.send({ type: HandEvents.RESET });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.IDLE);
      expect(actor.getSnapshot().context.hands).toEqual({});
      expect(actor.getSnapshot().context.cardPlays).toEqual([]);
    });
  });

  describe('Card Play Validation', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
    });

    it('should not allow invalid card plays', () => {
      const initialCardPlays = actor.getSnapshot().context.cardPlays.length;
      const player1Hand = actor.getSnapshot().context.hands.player1;
      const player2Hand = actor.getSnapshot().context.hands.player2;

      // Create a card that's definitely not in player1's hand
      // Find a card that's not in player1's hand by checking player2's hand
      const cardNotInPlayer1Hand = player2Hand.find(
        (card) =>
          !player1Hand.some(
            (p1Card) => p1Card.rank === card.rank && p1Card.suit === card.suit,
          ),
      );

      // Act - try to play a card not in player1's hand
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: cardNotInPlayer1Hand!,
      });

      // Assert - card plays should remain unchanged
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(
        initialCardPlays,
      );
    });

    it('should allow valid card plays and update turn', () => {
      const playerHand = actor.getSnapshot().context.hands.player1;
      const cardToPlay = playerHand[0];
      const initialTurn = actor.getSnapshot().context.currentTurn;

      // Act
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: cardToPlay,
      });

      // Assert
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(1);
      expect(actor.getSnapshot().context.currentTurn).not.toBe(initialTurn);
      expect(actor.getSnapshot().context.hands.player1).toHaveLength(2);
    });
  });

  describe('Phase Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
    });

    it('should transition from ENVIDO_PHASE to TRUCO_PHASE via CALL_TRUCO', () => {
      // Arrange - should start in ENVIDO_PHASE_IDLE
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_IDLE,
      });

      // Act
      actor.send({ type: HandEvents.CALL_TRUCO, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.TRUCO_PHASE]: HandStates.TRUCO_PHASE_PLAYING,
      });
    });

    it('should handle multiple card plays without errors', () => {
      const player1Hand = actor.getSnapshot().context.hands.player1;
      const player2Hand = actor.getSnapshot().context.hands.player2;

      // Act - Play multiple cards
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: player1Hand[0],
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player2'); // Turn should change to player2

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player2',
        card: player2Hand[0],
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player1'); // Turn should change back to player1

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: actor.getSnapshot().context.hands.player1[0],
      });
      expect(actor.getSnapshot().context.currentTurn).toBe('player2'); // Turn should change to player2 again

      // Assert
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(3);
      expect(actor.getSnapshot().context.hands.player1).toHaveLength(1);
      expect(actor.getSnapshot().context.hands.player2).toHaveLength(2);
    });
  });
});
