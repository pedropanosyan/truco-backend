// ============================================================================
// TRUCO BID TYPES
// ============================================================================

export enum TrucoBid {
  TRUCO = 'TRUCO',
  RETRUCO = 'RETRUCO',
  VALE_CUATRO = 'VALE_CUATRO',
}

// ============================================================================
// MACHINE STATES
// ============================================================================

export enum TrucoStates {
  IDLE = 'IDLE',
  TRUCO = 'TRUCO',
  RETRUCO = 'RETRUCO',
  VALE_CUATRO = 'VALE_CUATRO',
  DECLINED = 'DECLINED',
  ACCEPTED = 'ACCEPTED',
}

// ============================================================================
// MACHINE EVENTS
// ============================================================================

export enum TrucoEvents {
  CALL_TRUCO = 'CALL_TRUCO',
  RAISE_RETRUCO = 'RAISE_RETRUCO',
  RAISE_VALE_CUATRO = 'RAISE_VALE_CUATRO',
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',
}

// ============================================================================
// MACHINE ACTIONS
// ============================================================================

export enum TrucoActions {
  CALL_TRUCO = 'CALL_TRUCO',
  RAISE_RETRUCO = 'RAISE_RETRUCO',
  RAISE_VALE_CUATRO = 'RAISE_VALE_CUATRO',
  DECLINE_TRUCO = 'DECLINE_TRUCO',
  ACCEPT_TRUCO = 'ACCEPT_TRUCO',
  CHANGE_TURN = 'CHANGE_TURN',
}

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export type TrucoEventPayloads =
  | { type: TrucoEvents.CALL_TRUCO }
  | { type: TrucoEvents.RAISE_RETRUCO }
  | { type: TrucoEvents.RAISE_VALE_CUATRO }
  | { type: TrucoEvents.ACCEPT }
  | { type: TrucoEvents.DECLINE };

// ============================================================================
// MACHINE CONTEXT
// ============================================================================

export interface TrucoContext {
  /** Current points at stake in the truco */
  pointsOnStake: number;
  /** Function to switch to the next player */
  next: () => void;
}

// ============================================================================
// MACHINE INPUT
// ============================================================================

export interface TrucoInput {
  /** Function to switch to the next player */
  next: () => void;
}
