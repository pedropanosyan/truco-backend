import { createActor } from 'xstate';
import { envidoMachine } from './machine';
import { EnvidoEvents, EnvidoStates, EnvidoActions } from './types';
import { getRejectedPoints } from './rules';

describe('Envido Machine', () => {
  const mockNextTurn = jest.fn();
  const mockSendParent = jest.fn();
  const defaultInput = {
    scoreLimit: 30,
    greaterScore: 0,
    lastBid: undefined,
    next: mockNextTurn,
  };

  // Create test machine with mocked actions
  const testMachine = envidoMachine.provide({
    actions: {
      [EnvidoActions.ACCEPT_ENVIDO]: ({ context }) => {
        mockSendParent({
          type: EnvidoActions.ACCEPT_ENVIDO,
          points: context.pointsOnStake,
        });
      },
      [EnvidoActions.DECLINE_ENVIDO]: ({ context }) => {
        mockSendParent({
          type: EnvidoActions.DECLINE_ENVIDO,
          points: getRejectedPoints(context),
        });
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start in IDLE state with correct initial context', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      // Act
      actor.start();
      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.IDLE);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(0);
      expect(actor.getSnapshot().context.scoreLimit).toBe(30);
      expect(actor.getSnapshot().context.greaterScore).toBe(0);
    });
  });

  describe('IDLE State Transitions', () => {
    it('should transition to ENVIDO state when CALL_ENVIDO event is sent', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();

      // Act
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockNextTurn).toHaveBeenCalledTimes(1);
    });

    it('should transition to REAL_ENVIDO state when RAISE_REAL_ENVIDO event is sent', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();

      // Act
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.REAL_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3);
      expect(mockNextTurn).toHaveBeenCalledTimes(1);
    });

    it('should transition to FALTA_ENVIDO state when RAISE_FALTA_ENVIDO event is sent', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();

      // Act
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30); // scoreLimit - greaterScore = 30 - 0
      expect(mockNextTurn).toHaveBeenCalledTimes(1);
    });

    it('should calculate FALTA_ENVIDO points correctly with different scores', () => {
      // Arrange
      const customInput = {
        scoreLimit: 15,
        greaterScore: 5,
        next: mockNextTurn,
      };
      const actor = createActor(testMachine, {
        input: customInput,
      });
      actor.start();

      // Act
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(10);
      expect(mockNextTurn).toHaveBeenCalledTimes(1);
    });
  });

  describe('ENVIDO State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof testMachine>>;

    beforeEach(() => {
      actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
    });

    it('should transition to ENVIDO_DOBLE when CALL_ENVIDO event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ENVIDO_DOBLE);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // Once for initial CALL_ENVIDO, once for raise
    });

    it('should transition to REAL_ENVIDO when RAISE_REAL_ENVIDO event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.REAL_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(5); // 2 + 3
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // Once for initial CALL_ENVIDO, once for raise
    });

    it('should transition to FALTA_ENVIDO when RAISE_FALTA_ENVIDO event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30); // 2 + (30 - 0)
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // Once for initial CALL_ENVIDO, once for raise
    });

    it('should transition to ACCEPTED when ACCEPT event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ACCEPTED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.ACCEPT_ENVIDO,
        points: 2,
      });
    });

    it('should transition to DECLINED when DECLINE event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.DECLINED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.DECLINE_ENVIDO,
        points: 1,
      });
    });
  });

  describe('ENVIDO_DOBLE State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof testMachine>>;

    beforeEach(() => {
      actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
    });

    it('should transition to REAL_ENVIDO when RAISE_REAL_ENVIDO event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.REAL_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(7); // 2 + 2 + 3
      expect(mockNextTurn).toHaveBeenCalledTimes(3); // Initial + ENVIDO + REAL_ENVIDO
    });

    it('should transition to FALTA_ENVIDO when RAISE_FALTA_ENVIDO event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30); // 2 + 2 + (30 - 0)
      expect(mockNextTurn).toHaveBeenCalledTimes(3); // Initial + ENVIDO + FALTA_ENVIDO
    });

    it('should transition to ACCEPTED when ACCEPT event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ACCEPTED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.ACCEPT_ENVIDO,
        points: 4,
      });
    });

    it('should transition to DECLINED when DECLINE event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.DECLINED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.DECLINE_ENVIDO,
        points: 2,
      });
    });

    it('should not respond to CALL_ENVIDO event in ENVIDO_DOBLE state', () => {
      // Act
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ENVIDO_DOBLE); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // No additional calls
    });
  });

  describe('REAL_ENVIDO State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof testMachine>>;

    beforeEach(() => {
      actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO });
    });

    it('should transition to FALTA_ENVIDO when RAISE_FALTA_ENVIDO event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30); // 3 + (30 - 0)
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // Initial + FALTA_ENVIDO
    });

    it('should transition to ACCEPTED when ACCEPT event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ACCEPTED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.ACCEPT_ENVIDO,
        points: 3,
      });
    });

    it('should transition to DECLINED when DECLINE event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.DECLINED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.DECLINE_ENVIDO,
        points: getRejectedPoints(actor.getSnapshot().context),
      });
    });

    it('should not respond to CALL_ENVIDO or RAISE_REAL_ENVIDO events in REAL_ENVIDO state', () => {
      // Test CALL_ENVIDO event
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
      expect(actor.getSnapshot().value).toBe(EnvidoStates.REAL_ENVIDO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(1); // No additional calls

      // Test RAISE_REAL_ENVIDO event
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO });
      expect(actor.getSnapshot().value).toBe(EnvidoStates.REAL_ENVIDO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe('FALTA_ENVIDO State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof testMachine>>;

    beforeEach(() => {
      actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({
        type: EnvidoEvents.RAISE_FALTA_ENVIDO,
      });
    });

    it('should transition to ACCEPTED when ACCEPT event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ACCEPTED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.ACCEPT_ENVIDO,
        points: 30,
      });
    });

    it('should transition to DECLINED when DECLINE event is sent', () => {
      // Act
      actor.send({ type: EnvidoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.DECLINED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: EnvidoActions.DECLINE_ENVIDO,
        points: 29,
      });
    });

    it('should not respond to any raise events in FALTA_ENVIDO state', () => {
      // Test CALL_ENVIDO event
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(1); // No additional calls

      // Test RAISE_REAL_ENVIDO event
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO });
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(1); // No additional calls

      // Test RAISE_FALTA_ENVIDO event
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });
      expect(actor.getSnapshot().value).toBe(EnvidoStates.FALTA_ENVIDO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(30); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe('Final States', () => {
    it('should be in ACCEPTED final state after accepting', () => {
      // Arrange
      const actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });

      // Act
      actor.send({ type: EnvidoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ACCEPTED);
      expect(actor.getSnapshot().status).toBe('done');
    });

    it('should be in DECLINED final state after declining', () => {
      // Arrange
      const actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });

      // Act
      actor.send({ type: EnvidoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(EnvidoStates.DECLINED);
      expect(actor.getSnapshot().status).toBe('done');
    });
  });

  describe('Context Updates', () => {
    it('should correctly calculate points for FALTA_ENVIDO based on scoreLimit and greaterScore', () => {
      // Test with different scoreLimit and greaterScore values
      const customInput = {
        scoreLimit: 15,
        greaterScore: 5,
        next: mockNextTurn,
      };
      const actor = createActor(testMachine, {
        input: customInput,
      });
      actor.start();

      // Act
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });

      // Assert
      expect(actor.getSnapshot().context.pointsOnStake).toBe(10); // 15 - 5
    });

    it('should accumulate points correctly through multiple raises', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();

      // Act - ENVIDO (2) + ENVIDO_DOBLE (2) + REAL_ENVIDO (3) = 7
      actor.send({ type: EnvidoEvents.CALL_ENVIDO }); // 2 points
      actor.send({ type: EnvidoEvents.CALL_ENVIDO }); // +2 points = 4
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO }); // +3 points = 7

      // Assert
      expect(actor.getSnapshot().context.pointsOnStake).toBe(7);
      expect(actor.getSnapshot().value).toBe(EnvidoStates.REAL_ENVIDO);
    });

    it('should call nextTurn after each valid action', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();

      // Test CALL_ENVIDO
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
      expect(mockNextTurn).toHaveBeenCalledTimes(1);

      // Test RAISE_ENVIDO
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
      expect(mockNextTurn).toHaveBeenCalledTimes(2);

      // Test RAISE_REAL_ENVIDO
      actor.send({ type: EnvidoEvents.RAISE_REAL_ENVIDO });
      expect(mockNextTurn).toHaveBeenCalledTimes(3);

      // Test RAISE_FALTA_ENVIDO
      actor.send({ type: EnvidoEvents.RAISE_FALTA_ENVIDO });
      expect(mockNextTurn).toHaveBeenCalledTimes(4);
    });
  });

  describe('State Machine Properties', () => {
    it('should maintain state consistency across transitions', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();

      // Act & Assert - Test state consistency through transitions
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);

      actor.send({ type: EnvidoEvents.CALL_ENVIDO });
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ENVIDO_DOBLE);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
    });

    it('should preserve context during invalid transitions', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();
      actor.send({ type: EnvidoEvents.CALL_ENVIDO });

      // Act - Send invalid event
      actor.send({ type: 'INVALID_EVENT' as any });

      // Assert - Context should remain unchanged
      expect(actor.getSnapshot().value).toBe(EnvidoStates.ENVIDO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockNextTurn).toHaveBeenCalledTimes(1);
    });
  });
});
