// ============================================================================
// CARD TYPES
// ============================================================================

import { Score } from "../game/types";

export enum Rank {
  ACE = 'ACE',
  TWO = 'TWO',
  THREE = 'THREE',
  FOUR = 'FOUR',
  FIVE = 'FIVE',
  SIX = 'SIX',
  SEVEN = 'SEVEN',
  TEN = 'TEN',
  ELEVEN = 'ELEVEN',
  TWELVE = 'TWELVE',
}

export const RANK_ENVIDO_VALUES: Record<Rank, number> = {
  [Rank.ACE]: 1,
  [Rank.TWO]: 2,
  [Rank.THREE]: 3,
  [Rank.FOUR]: 4,
  [Rank.FIVE]: 5,
  [Rank.SIX]: 6,
  [Rank.SEVEN]: 7,
  [Rank.TEN]: 0,
  [Rank.ELEVEN]: 0,
  [Rank.TWELVE]: 0,
};

export const RANKING_TRUCO_VALUES: Record<string, number> = {
  'ESPADA-1': 14,
  'BASTO-1': 13,
  'ESPADA-7': 12,
  'ORO-7': 11,
  'ANY-3': 10,
  'ANY-2': 9,
  'COPA-1': 8,
  'ORO-1': 8,
  'ANY-12': 7,
  'ANY-11': 7,
  'ANY-10': 7,
  'COPA-7': 6,
  'BASTO-7': 6,
  'ANY-6': 5,
  'ANY-5': 4,
  'ANY-4': 3,
};

export enum Suit {
  COPA = 'COPA',
  ORO = 'ORO',
  BASTO = 'BASTO',
  ESPADA = 'ESPADA',
}

export type Card = {
  rank: Rank;
  suit: Suit;
};

export type Hand = Card[];

// ============================================================================
// MACHINE STATES
// ============================================================================

export enum HandStates {
  IDLE = 'IDLE',
  DEALING = 'DEALING',
  ENVIDO_PHASE = 'ENVIDO_PHASE',
  ENVIDO_PHASE_IDLE = 'ENVIDO_PHASE_IDLE',
  ENVIDO_PHASE_PLAYING = 'ENVIDO_PHASE_PLAYING',
  TRUCO_PHASE = 'TRUCO_PHASE',
  TRUCO_PHASE_IDLE = 'TRUCO_PHASE_IDLE',
  TRUCO_PHASE_PLAYING = 'TRUCO_PHASE_PLAYING',
  HAND_END = 'HAND_END',
}

// ============================================================================
// MACHINE EVENTS
// ============================================================================

export enum HandEvents {
  DEAL = 'DEAL',
  CARDS_DEALT = 'CARDS_DEALT',
  PLAY_CARD = 'PLAY_CARD',
  HAND_END = 'HAND_END',
  FORFEIT = 'FORFEIT',
  CALL_ENVIDO = 'CALL_ENVIDO',
  CALL_TRUCO = 'CALL_TRUCO',
  ENVIDO_ACCEPTED = 'ENVIDO_ACCEPTED',
  ENVIDO_DECLINED = 'ENVIDO_DECLINED',
  TRUCO_ACCEPTED = 'TRUCO_ACCEPTED',
  TRUCO_DECLINED = 'TRUCO_DECLINED',
  RESET = 'RESET',
}

// ============================================================================
// MACHINE ACTIONS
// ============================================================================

export enum HandActions {
  DEAL_CARDS = 'DEAL_CARDS',
  PLAY_CARD = 'PLAY_CARD',
  END_HAND = 'END_HAND',
  HANDLE_FORFEIT = 'HANDLE_FORFEIT',
  UPDATE_ENVIDO_POINTS = 'UPDATE_ENVIDO_POINTS',
  UPDATE_TRUCO_POINTS = 'UPDATE_TRUCO_POINTS',
  ENVIDO_ACCEPTED = 'ENVIDO_ACCEPTED',
  ENVIDO_DECLINED = 'ENVIDO_DECLINED',
  TRUCO_ACCEPTED = 'TRUCO_ACCEPTED',
  TRUCO_DECLINED = 'TRUCO_DECLINED',
  CLOSE_ENVIDO = 'CLOSE_ENVIDO',
  RESET_HAND = 'RESET_HAND',
  CHANGE_TURN = 'CHANGE_TURN',
}

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export type HandEventPayloads =
  | { type: HandEvents.DEAL }
  | { type: HandEvents.CARDS_DEALT }
  | { type: HandEvents.PLAY_CARD; playerId: string; card: Card }
  | { type: HandEvents.HAND_END }
  | { type: HandEvents.FORFEIT; playerId: string }
  | { type: HandEvents.CALL_ENVIDO; playerId: string }
  | { type: HandEvents.CALL_TRUCO; playerId: string }
  | { type: HandEvents.ENVIDO_ACCEPTED; points: number }
  | { type: HandEvents.ENVIDO_DECLINED; points: number }
  | { type: HandEvents.TRUCO_ACCEPTED; points: number }
  | { type: HandEvents.TRUCO_DECLINED; points: number }
  | { type: HandEvents.RESET };

// ============================================================================
// MACHINE CONTEXT
// ============================================================================

export type Player = {
  id: string;
};

export type CardPlay = {
  playerId: string;
  card: Card;
};

export interface HandContext {
  players: Player[];
  hands: Record<Player['id'], Hand>;
  cardPlays: CardPlay[];
  currentTurn: string;
  startingPlayer: string;
  scoreLimit: number;
  currentScores: Score;
}

// ============================================================================
// MACHINE INPUT
// ============================================================================

export interface HandInput {
  players: Player[];
  startingPlayer: string;
  scoreLimit: number;
  currentScores: Score;
}
