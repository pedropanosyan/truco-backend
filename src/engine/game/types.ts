import { Player } from "../hand";


export enum GameActions {
  UPDATE_GAME_POINTS = 'UPDATE_GAME_POINTS',
}

// ============================================================================
// MACHINE CONTEXT
// ============================================================================

export interface GameContext {
  scoreLimit: number;
  scores: Record<Player['id'], number>;
}