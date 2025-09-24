import { createActor } from 'xstate';
import { trucoMachine } from './machine';
import { trucoSetup } from './setup';
import { TrucoEvents, TrucoStates, TrucoActions } from './types';

describe('Truco Machine', () => {
  const mockNextTurn = jest.fn();
  const mockSendParent = jest.fn();
  const defaultInput = {
    next: mockNextTurn,
  };

  // Create test machine with mocked actions
  const testMachine = trucoMachine.provide({
    actions: {
      [TrucoActions.ACCEPT_TRUCO]: ({ context }) => {
        mockSendParent({
          type: TrucoActions.ACCEPT_TRUCO,
          points: context.pointsOnStake,
        });
      },
      [TrucoActions.DECLINE_TRUCO]: ({ context }) => {
        mockSendParent({
          type: TrucoActions.DECLINE_TRUCO,
          points: Math.max(context.pointsOnStake - 1, 1),
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
      expect(actor.getSnapshot().value).toBe(TrucoStates.IDLE);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(1);
    });
  });

  describe('IDLE State Transitions', () => {
    it('should transition to TRUCO state when CALL_TRUCO event is sent', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();

      // Act
      actor.send({ type: TrucoEvents.CALL_TRUCO });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.TRUCO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockNextTurn).toHaveBeenCalledTimes(1);
    });
  });

  describe('TRUCO State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof testMachine>>;

    beforeEach(() => {
      actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: TrucoEvents.CALL_TRUCO });
    });

    it('should transition to RETRUCO when RAISE_RETRUCO event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.RAISE_RETRUCO });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.RETRUCO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3);
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // Once for initial CALL_TRUCO, once for raise
    });

    it('should transition to VALE_CUATRO when RAISE_VALE_CUATRO event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.RAISE_VALE_CUATRO });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.VALE_CUATRO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // Once for initial CALL_TRUCO, once for raise
    });

    it('should transition to ACCEPTED when ACCEPT event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.ACCEPTED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: TrucoActions.ACCEPT_TRUCO,
        points: 2,
      });
    });

    it('should transition to DECLINED when DECLINE event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.DECLINED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: TrucoActions.DECLINE_TRUCO,
        points: 1,
      });
    });

    it('should not respond to CALL_TRUCO event in TRUCO state', () => {
      // Act
      actor.send({ type: TrucoEvents.CALL_TRUCO });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.TRUCO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe('RETRUCO State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof testMachine>>;

    beforeEach(() => {
      actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: TrucoEvents.CALL_TRUCO });
      actor.send({ type: TrucoEvents.RAISE_RETRUCO });
    });

    it('should transition to VALE_CUATRO when RAISE_VALE_CUATRO event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.RAISE_VALE_CUATRO });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.VALE_CUATRO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
      expect(mockNextTurn).toHaveBeenCalledTimes(3); // Initial + TRUCO + VALE_CUATRO
    });

    it('should transition to ACCEPTED when ACCEPT event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.ACCEPTED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3);
    });

    it('should transition to DECLINED when DECLINE event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.DECLINED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: TrucoActions.DECLINE_TRUCO,
        points: 2,
      });
    });

    it('should not respond to CALL_TRUCO or RAISE_RETRUCO events in RETRUCO state', () => {
      // Test CALL_TRUCO event
      actor.send({ type: TrucoEvents.CALL_TRUCO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.RETRUCO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // No additional calls

      // Test RAISE_RETRUCO event
      actor.send({ type: TrucoEvents.RAISE_RETRUCO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.RETRUCO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(2); // No additional calls
    });
  });

  describe('VALE_CUATRO State Transitions', () => {
    let actor: ReturnType<typeof createActor<typeof testMachine>>;

    beforeEach(() => {
      actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: TrucoEvents.CALL_TRUCO });
      actor.send({ type: TrucoEvents.RAISE_RETRUCO });
      actor.send({ type: TrucoEvents.RAISE_VALE_CUATRO });
    });

    it('should transition to ACCEPTED when ACCEPT event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.ACCEPTED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
    });

    it('should transition to DECLINED when DECLINE event is sent', () => {
      // Act
      actor.send({ type: TrucoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.DECLINED);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
      expect(mockSendParent).toHaveBeenCalledWith({
        type: TrucoActions.DECLINE_TRUCO,
        points: 3,
      });
    });

    it('should not respond to any raise events in VALE_CUATRO state', () => {
      // Test CALL_TRUCO event
      actor.send({ type: TrucoEvents.CALL_TRUCO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.VALE_CUATRO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(3); // No additional calls

      // Test RAISE_RETRUCO event
      actor.send({ type: TrucoEvents.RAISE_RETRUCO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.VALE_CUATRO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(3); // No additional calls

      // Test RAISE_VALE_CUATRO event
      actor.send({ type: TrucoEvents.RAISE_VALE_CUATRO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.VALE_CUATRO); // State unchanged
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4); // Unchanged
      expect(mockNextTurn).toHaveBeenCalledTimes(3); // No additional calls
    });
  });

  describe('Final States', () => {
    it('should be in ACCEPTED final state after accepting', () => {
      // Arrange
      const actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: TrucoEvents.CALL_TRUCO });

      // Act
      actor.send({ type: TrucoEvents.ACCEPT });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.ACCEPTED);
      expect(actor.getSnapshot().status).toBe('done');
    });

    it('should be in DECLINED final state after declining', () => {
      // Arrange
      const actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: TrucoEvents.CALL_TRUCO });

      // Act
      actor.send({ type: TrucoEvents.DECLINE });

      // Assert
      expect(actor.getSnapshot().value).toBe(TrucoStates.DECLINED);
      expect(actor.getSnapshot().status).toBe('done');
    });

    it('should not respond to events in final states', () => {
      // Arrange - Get to ACCEPTED state
      const actor = createActor(testMachine, { input: defaultInput });
      actor.start();
      actor.send({ type: TrucoEvents.CALL_TRUCO });
      actor.send({ type: TrucoEvents.ACCEPT });

      // Act - Try to send various events
      actor.send({ type: TrucoEvents.CALL_TRUCO });
      actor.send({ type: TrucoEvents.RAISE_RETRUCO });
      actor.send({ type: TrucoEvents.ACCEPT });
      actor.send({ type: TrucoEvents.DECLINE });

      // Assert - State should remain ACCEPTED
      expect(actor.getSnapshot().value).toBe(TrucoStates.ACCEPTED);
      expect(actor.getSnapshot().status).toBe('done');
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
      actor.send({ type: TrucoEvents.CALL_TRUCO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.TRUCO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);

      actor.send({ type: TrucoEvents.RAISE_RETRUCO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.RETRUCO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(3);

      actor.send({ type: TrucoEvents.RAISE_VALE_CUATRO });
      expect(actor.getSnapshot().value).toBe(TrucoStates.VALE_CUATRO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(4);
    });

    it('should preserve context during invalid transitions', () => {
      // Arrange
      const actor = createActor(testMachine, {
        input: defaultInput,
      });
      actor.start();
      actor.send({ type: TrucoEvents.CALL_TRUCO });

      // Act - Send invalid event
      actor.send({ type: 'INVALID_EVENT' as any });

      // Assert - Context should remain unchanged
      expect(actor.getSnapshot().value).toBe(TrucoStates.TRUCO);
      expect(actor.getSnapshot().context.pointsOnStake).toBe(2);
      expect(mockNextTurn).toHaveBeenCalledTimes(1);
    });
  });
});
