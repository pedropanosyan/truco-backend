import { EnvidoStatus, TrucoStatus } from './status';

export type Suit = 'ESPADA' | 'ORO' | 'BASTO' | 'COPA';
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '10' | '11' | '12';

export type RoundResult = { winner: number | "EMPATE" | null };


export type Card = {
  suit: Suit;
  rank: Rank;
};

export type Hand = [Card, Card, Card];

export type Player = { id: number };

export interface HandContext {
  players: Player[];
  dealer: Player;
  currentTurn: Player;

  hands: Record<Player['id'], Card[]>;

  envidoStatus: EnvidoStatus;
  trucoStatus: TrucoStatus;

  round: 1 | 2 | 3;

  results: { [key: Player['id']]: RoundResult }; 

}