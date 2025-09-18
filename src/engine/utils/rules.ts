import { Card, Player } from '../types';

const CARD_RANK: Record<string, number> = {
  ESPADA_1: 14,
  BASTO_1: 13,
  ESPADA_7: 12,
  ORO_7: 11,

  ESPADA_3: 10,
  BASTO_3: 10,
  ORO_3: 10,
  COPA_3: 10,

  ESPADA_2: 9,
  BASTO_2: 9,
  ORO_2: 9,
  COPA_2: 9,

  ORO_1: 8,
  COPA_1: 8,

  ESPADA_12: 7,
  BASTO_12: 7,
  ORO_12: 7,
  COPA_12: 7,

  ESPADA_11: 6,
  BASTO_11: 6,
  ORO_11: 6,
  COPA_11: 6,

  ESPADA_10: 5,
  BASTO_10: 5,
  ORO_10: 5,
  COPA_10: 5,

  COPA_7: 4,
  BASTO_7: 4,

  ESPADA_6: 3,
  BASTO_6: 3,
  ORO_6: 3,
  COPA_6: 3,

  ESPADA_5: 2,
  BASTO_5: 2,
  ORO_5: 2,
  COPA_5: 2,

  ESPADA_4: 1,
  BASTO_4: 1,
  ORO_4: 1,
  COPA_4: 1,
};

function getCardKey(card: Card): string {
  return `${card.suit}-${card.rank}`;
}

function getCardEnvidoValue(card: Card): number {
  const rank = card.rank;

  if (rank === '12' || rank === '11' || rank === '10') {
    return 0;
  }
  
  return parseInt(rank);
}

export function getCardWinner(cards: { Player: Player; Card: Card }[]): Player {
  const winner = cards.reduce(
    (max, { Player, Card }) => {
      const currentRank = CARD_RANK[getCardKey(Card)];
      const maxRank = CARD_RANK[getCardKey(max.Card)];

      return currentRank > maxRank ? { Player, Card } : max;
    },
    { Player: cards[0].Player, Card: cards[0].Card },
  );

  return winner.Player;
}

export function getEnvido(cards: Card[]): number {
  const suitGroups: Record<string, Card[]> = {};
  
  cards.forEach((card) => {
    if (!suitGroups[card.suit]) {
      suitGroups[card.suit] = [];
    }
    suitGroups[card.suit].push(card);
  });

  let maxEnvido = 0;

  Object.values(suitGroups).forEach((suitCards) => {
    if (suitCards.length >= 2) {
      const values = suitCards.map((card) => getCardEnvidoValue(card));
      values.sort((a, b) => b - a);
      const envidoValue = values[0] + values[1] + 20;
      maxEnvido = Math.max(maxEnvido, envidoValue);
    }
  });

  if (maxEnvido === 0) {
    const singleValues = cards.map((card) => getCardEnvidoValue(card));
    maxEnvido = Math.max(...singleValues);
  }

  return maxEnvido;
}