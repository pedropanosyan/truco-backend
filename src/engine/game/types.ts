import { Player } from '../hand';

// ============================================================================
// MACHINE STATES
// ============================================================================

export enum GameStates {
  IDLE = 'IDLE',
  IN_PROGRESS = 'IN_PROGRESS',
  GAME_END = 'GAME_END',
}

// ============================================================================
// MACHINE EVENTS
// ============================================================================

export enum GameEvents {
  START_GAME = 'START_GAME',
  END_GAME = 'END_GAME',
  UPDATE_GAME_POINTS = 'UPDATE_GAME_POINTS',
}

// ============================================================================
// MACHINE ACTIONS
// ============================================================================

export enum GameActions {
  START_GAME = 'START_GAME',
  END_GAME = 'END_GAME',
  UPDATE_GAME_POINTS = 'UPDATE_GAME_POINTS',
}

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export type GameEventPayloads =
  | { type: GameEvents.START_GAME; players: Player[]; scoreLimit: number }
  | { type: GameEvents.END_GAME; winnerId: string }
  | { type: GameEvents.UPDATE_GAME_POINTS; points: number; playerId: string };

// ============================================================================
// MACHINE CONTEXT
// ============================================================================

export interface GameContext {
  players: Player[];
  scoreLimit: number;
  scores: Score;
  id: string | null;
  betAmount: number;
}

// ============================================================================
// MACHINE INPUT
// ============================================================================

export interface GameInput {
  players: Player[];
  scoreLimit: number;
  betAmount: number;
  id: string;
}

// ============================================================================
// GAME RULES
// ============================================================================

export const GAME_RULES = {
  DEFAULT_SCORE_LIMIT: 30,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
} as const;

export type Score = Record<Player['id'], number>;