// ============================================================================
// ENVIDO BID TYPES
// ============================================================================

export enum EnvidoBid {
  ENVIDO = 'ENVIDO',
  ENVIDO_DOBLE = 'ENVIDO_DOBLE',
  REAL_ENVIDO = 'REAL_ENVIDO',
  FALTA_ENVIDO = 'FALTA_ENVIDO',
}

// ============================================================================
// MACHINE STATES
// ============================================================================

export enum EnvidoStates {
  IDLE = 'IDLE',
  ENVIDO = 'ENVIDO',
  ENVIDO_DOBLE = 'ENVIDO_DOBLE',
  REAL_ENVIDO = 'REAL_ENVIDO',
  FALTA_ENVIDO = 'FALTA_ENVIDO',
  DECLINED = 'DECLINED',
  ACCEPTED = 'ACCEPTED',
}

// ============================================================================
// MACHINE EVENTS
// ============================================================================

export enum EnvidoEvents {
  CALL_ENVIDO = 'CALL_ENVIDO',
  RAISE_ENVIDO = 'RAISE_ENVIDO',
  RAISE_REAL_ENVIDO = 'RAISE_REAL_ENVIDO',
  RAISE_FALTA_ENVIDO = 'RAISE_FALTA_ENVIDO',
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',
}

// ============================================================================
// MACHINE ACTIONS
// ============================================================================

export enum EnvidoActions {
  CALL_ENVIDO = 'CALL_ENVIDO',
  RAISE_ENVIDO = 'RAISE_ENVIDO',
  RAISE_REAL_ENVIDO = 'RAISE_REAL_ENVIDO',
  RAISE_FALTA_ENVIDO = 'RAISE_FALTA_ENVIDO',
  DECLINE_ENVIDO = 'DECLINE_ENVIDO',
  ACCEPT_ENVIDO = 'ACCEPT_ENVIDO',
  CHANGE_TURN = 'CHANGE_TURN',
}

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export type EnvidoEventPayloads =
  | { type: EnvidoEvents.CALL_ENVIDO }
  | { type: EnvidoEvents.RAISE_ENVIDO }
  | { type: EnvidoEvents.RAISE_REAL_ENVIDO }
  | { type: EnvidoEvents.RAISE_FALTA_ENVIDO }
  | { type: EnvidoEvents.ACCEPT }
  | { type: EnvidoEvents.DECLINE }
  
// ============================================================================
// MACHINE CONTEXT
// ============================================================================

export interface EnvidoContext {
  /** Current points at stake in the envido */
  pointsOnStake: number;
  /** Last points at stake in the envido */
  lastBid: EnvidoBid | undefined;
  /** Maximum score limit for the game */
  scoreLimit: number;
  /** Current highest score among players */
  greaterScore: number;
  /** Function to switch to the next player */
  next: () => void;
}

// ============================================================================
// MACHINE INPUT
// ============================================================================

export interface EnvidoInput {
  /** Maximum score limit for the game */
  scoreLimit: number;
  /** Current highest score among players */
  greaterScore: number;
  /** Function to switch to the next player */
  next: () => void;
}
