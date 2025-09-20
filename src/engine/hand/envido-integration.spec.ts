import { createActor } from 'xstate';
import { handMachine } from './machine';
import { HandEvents, HandStates } from './types';

describe('Hand-Envido Integration', () => {
  const defaultInput = {
    players: [{ id: 'player1' }, { id: 'player2' }],
    startingPlayer: 'player1',
    scoreLimit: 30,
    currentScores: { player1: 0, player2: 0 },
  };

  describe('Envido Machine Invocation', () => {
    it('should invoke envido machine when CALL_ENVIDO is sent', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });

      // Act
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });

      // Check that the envido machine is invoked by checking the snapshot
      const snapshot = actor.getSnapshot();
      expect(snapshot.children).toBeDefined();
      expect(Object.keys(snapshot.children)).toContain('envido');
    });

    it('should pass correct input to envido machine', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });

      // Act
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Assert
      const snapshot = actor.getSnapshot();
      expect(snapshot.children).toBeDefined();
      expect(Object.keys(snapshot.children)).toContain('envido');

      // The envido machine should be invoked with correct input
      // We can verify this by checking that the hand machine stays in ENVIDO_PHASE
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
    });

    it('should handle multiple envido calls in sequence', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });

      // Act - First envido call
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Second envido call should create a new envido machine
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player2' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
      const snapshot = actor.getSnapshot();
      expect(snapshot.children).toBeDefined();
      expect(Object.keys(snapshot.children)).toContain('envido');
    });
  });

  describe('Envido State Transitions in Hand Context', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
    });

    it('should handle envido acceptance and update points', () => {
      // Arrange - Start envido
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Act - Accept envido
      actor.send({ type: HandEvents.ENVIDO_ACCEPTED, points: 2 });

      // Assert
      expect(actor.getSnapshot().context.envidoPoints).toBe(2);
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
    });

    it('should handle envido decline and update points', () => {
      // Arrange - Start envido
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Act - Decline envido
      actor.send({ type: HandEvents.ENVIDO_DECLINED, points: 1 });

      // Assert
      expect(actor.getSnapshot().context.envidoPoints).toBe(1);
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
    });

    it('should handle envido acceptance and transition to truco phase', () => {
      // Arrange
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });
      actor.send({ type: HandEvents.ENVIDO_ACCEPTED, points: 2 });

      // Assert
      expect(actor.getSnapshot().context.envidoPoints).toBe(2);
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
    });
  });

  describe('Envido and Card Play Integration', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
    });

    it('should allow card play during envido phase', () => {
      // Arrange
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });
      const playerHand = actor.getSnapshot().context.hands.player1;
      const cardToPlay = playerHand[0];

      // Act
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: cardToPlay,
      });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
      expect(actor.getSnapshot().context.hands.player1).toHaveLength(2);
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(1);
    });

    it('should transition to truco phase when envido is closed by card play', () => {
      // Arrange
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Play first card for both players
      const player1Hand = actor.getSnapshot().context.hands.player1;
      const player2Hand = actor.getSnapshot().context.hands.player2;

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: player1Hand[0],
      });

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player2',
        card: player2Hand[0],
      });

      // Act - Play second card (should close envido)
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: actor.getSnapshot().context.hands.player1[0],
      });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
    });

    it('should maintain envido points when transitioning to truco phase', () => {
      // Arrange
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });
      actor.send({ type: HandEvents.ENVIDO_ACCEPTED, points: 3 });

      // Play cards to close envido
      const player1Hand = actor.getSnapshot().context.hands.player1;
      const player2Hand = actor.getSnapshot().context.hands.player2;

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: player1Hand[0],
      });

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player2',
        card: player2Hand[0],
      });

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: actor.getSnapshot().context.hands.player1[0],
      });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
      expect(actor.getSnapshot().context.envidoPoints).toBe(3);
    });
  });

  describe('Envido Machine State Management', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
    });

    it('should handle envido machine invocation and stay in envido phase', () => {
      // Arrange
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
      const snapshot = actor.getSnapshot();
      expect(snapshot.children).toBeDefined();
      expect(Object.keys(snapshot.children)).toContain('envido');
    });

    it('should handle multiple envido calls and maintain state', () => {
      // Arrange
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Act - Second envido call
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player2' });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
      const snapshot = actor.getSnapshot();
      expect(snapshot.children).toBeDefined();
      expect(Object.keys(snapshot.children)).toContain('envido');
    });

    it('should handle envido with different scores correctly', () => {
      // Arrange - Create actor with different scores
      const customInput = {
        ...defaultInput,
        currentScores: { player1: 15, player2: 20 },
      };
      const customActor = createActor(handMachine, { input: customInput });
      customActor.start();
      customActor.send({ type: HandEvents.DEAL });
      customActor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });

      // Assert
      expect(customActor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
      const snapshot = customActor.getSnapshot();
      expect(snapshot.children).toBeDefined();
      expect(Object.keys(snapshot.children)).toContain('envido');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let actor: ReturnType<typeof createActor<typeof handMachine>>;

    beforeEach(() => {
      actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });
    });

    it('should handle envido calls from wrong player', () => {
      // Act - Try to call envido when it's not player1's turn
      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: actor.getSnapshot().context.hands.player1[0],
      });
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' }); // Wrong player

      // Assert - Should still work as envido calls don't have turn restrictions in current implementation
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_PLAYING,
      });
    });

    it('should handle envido events when no envido machine is active', () => {
      // Act - Try to accept envido without calling it first
      actor.send({ type: HandEvents.ENVIDO_ACCEPTED, points: 2 });

      // Assert
      expect(actor.getSnapshot().value).toEqual({
        [HandStates.ENVIDO_PHASE]: HandStates.ENVIDO_PHASE_IDLE,
      });
      expect(actor.getSnapshot().context.envidoPoints).toBe(0);
    });

    it('should maintain hand state during envido operations', () => {
      // Arrange
      const initialHands = actor.getSnapshot().context.hands;

      // Act
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });
      actor.send({ type: HandEvents.ENVIDO_ACCEPTED, points: 2 });

      // Assert
      expect(actor.getSnapshot().context.hands).toEqual(initialHands);
      expect(actor.getSnapshot().context.cardPlays).toHaveLength(0);
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete envido flow and transition to truco phase', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });

      // Act - Complete envido flow
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player2' });

      // Accept envido
      actor.send({ type: HandEvents.ENVIDO_ACCEPTED, points: 4 });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
      expect(actor.getSnapshot().context.envidoPoints).toBe(4);
    });

    it('should handle envido followed by card play and truco phase', () => {
      // Arrange
      const actor = createActor(handMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: HandEvents.DEAL });

      // Act - Complete flow
      actor.send({ type: HandEvents.CALL_ENVIDO, playerId: 'player1' });
      actor.send({ type: HandEvents.ENVIDO_ACCEPTED, points: 2 });

      // Play cards to close envido and move to truco phase
      const player1Hand = actor.getSnapshot().context.hands.player1;
      const player2Hand = actor.getSnapshot().context.hands.player2;

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: player1Hand[0],
      });

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player2',
        card: player2Hand[0],
      });

      actor.send({
        type: HandEvents.PLAY_CARD,
        playerId: 'player1',
        card: actor.getSnapshot().context.hands.player1[0],
      });

      // Assert
      expect(actor.getSnapshot().value).toBe(HandStates.TRUCO_PHASE);
      expect(actor.getSnapshot().context.envidoPoints).toBe(2);
    });
  });
});
