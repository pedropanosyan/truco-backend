import { Card, CardPlay, Player, Score } from '../../engine';

export type StartGame = {
  roomId: string;
  players: string[];
  betAmount: number;
  scoreLimit: number;
};

export enum GameStatus {
  IDLE = 'IDLE',
  IN_PROGRESS = 'IN_PROGRESS',
  GAME_END = 'GAME_END',
}

export interface ClientGameState {
  players: Player[];
  currentTurn: string;
  table: CardPlay[];
  hand: Card[];
  roomId: string;
  betAmount: number;
  availableActions: string[];
  scoreLimit: number;
  score: Score;
}
