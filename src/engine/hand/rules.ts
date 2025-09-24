import {
  HandContext,
  Card,
  Rank,
  Suit,
  Hand,
  RANK_ENVIDO_VALUES,
  RANKING_TRUCO_VALUES,
} from './types';

const getNextPlayer = (context: HandContext): string => {
  const currentPlayerIndex = context.players.findIndex(
    (p) => p.id === context.currentTurn,
  );
  const nextPlayerIndex = (currentPlayerIndex + 1) % context.players.length;
  return context.players[nextPlayerIndex].id;
};

const next = (context: HandContext) => {
  context.currentTurn = getNextPlayer(context);
};

const hasCard = (
  context: HandContext,
  playerId: string,
  card: Card,
): boolean => {
  const playerHand = context.hands[playerId];
  return playerHand.some((c) => c.rank === card.rank && c.suit === card.suit);
};

const createDeck = (): Card[] => {
  const ranks = Object.values(Rank);
  const suits = Object.values(Suit);
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }

  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const dealCards = (context: HandContext) => {
  const deck = shuffleDeck(createDeck());
  const cardsPerPlayer = 3;

  context.players.forEach((player, index) => {
    const startIndex = index * cardsPerPlayer;
    context.hands[player.id] = deck.slice(
      startIndex,
      startIndex + cardsPerPlayer,
    );
  });
};

const getTrucoRankingValue = (card: Card): number => {
  return (
    RANKING_TRUCO_VALUES[`${card.suit}-${card.rank}`] ??
    RANKING_TRUCO_VALUES[`ANY-${card.rank}`] ??
    0
  );
};

const getEnvido = (cards: Hand): number => {
  const bySuit = cards.reduce(
    (acc, card) => {
      if (!acc[card.suit]) acc[card.suit] = [];
      acc[card.suit].push(card);
      return acc;
    },
    {} as Record<Suit, Card[]>,
  );

  let best = 0;

  for (const suitCards of Object.values(bySuit)) {
    if (suitCards.length === 0) continue;

    const values = suitCards
      .map((card) => RANK_ENVIDO_VALUES[card.rank])
      .sort((a, b) => b - a);

    if (values.length === 1) {
      best = Math.max(best, values[0]);
    } else {
      best = Math.max(best, 20 + values[0] + values[1]);
    }
  }

  return best;
};

const playCard = (context: HandContext, playerId: string, card: Card) => {
  const playerHand = context.hands[playerId];
  const cardIndex = playerHand.findIndex(
    (c) => c.rank === card.rank && c.suit === card.suit,
  );

  if (cardIndex !== -1) {
    playerHand.splice(cardIndex, 1);
    context.cardPlays.push({ playerId, card });
  }
};

const allPlayersPlayedFirstCard = (context: HandContext): boolean => {
  // Check if all players have played exactly one card
  const playerIds = context.players.map((p) => p.id);
  return playerIds.every(
    (playerId) =>
      context.cardPlays.filter((play) => play.playerId === playerId).length ===
      1,
  );
};

const shouldCloseEnvido = (context: HandContext): boolean => {
  const allPlayedFirst = allPlayersPlayedFirstCard(context);
  const currentPlayerCards = context.cardPlays.filter(
    (play) => play.playerId === context.currentTurn,
  ).length;
  return allPlayedFirst && currentPlayerCards === 1;
};

const getForfeitPoints = (context: HandContext): number => {
  if (context.cardPlays.length >= context.players.length - 1) {
    return 1;
  }
  return 2;
};

const getEnvidoWinner = (context: HandContext): string => {
  const envidoByPlayer = context.players.map((player) => ({
    playerId: player.id,
    envido: getEnvido(context.hands[player.id]),
  }));

  const winner = envidoByPlayer.reduce((best, current) =>
    current.envido > best.envido ? current : best,
  );

  return winner.playerId;
};

const getTrucoWinner = (context: HandContext): string => {
  // Group card plays into rounds (pairs of cards)
  const rounds: { playerId: string; card: Card }[][] = [];

  for (let i = 0; i < context.cardPlays.length; i += 2) {
    const roundPlays = context.cardPlays.slice(i, i + 2);
    if (roundPlays.length === 2) {
      rounds.push(roundPlays);
    }
  }

  const score: Record<string, number> = {};

  // Evaluate each round
  for (const round of rounds) {
    if (round.length < 2) break;

    const [playA, playB] = round;
    const valueA = getTrucoRankingValue(playA.card);
    const valueB = getTrucoRankingValue(playB.card);

    if (valueA > valueB) {
      score[playA.playerId] = (score[playA.playerId] || 0) + 1;
    } else if (valueB > valueA) {
      score[playB.playerId] = (score[playB.playerId] || 0) + 1;
    }
    // If tied, neither player gets a point for this round
  }

  const playerIds = context.players.map((p) => p.id);

  // Check if someone won 2 out of 3 rounds
  for (const playerId of playerIds) {
    if ((score[playerId] || 0) >= 2) {
      return playerId;
    }
  }

  // Special case: if first round was tied and second round has a winner
  if (rounds.length >= 2) {
    const [round1, round2] = rounds;
    const value1A = getTrucoRankingValue(round1[0].card);
    const value1B = getTrucoRankingValue(round1[1].card);

    if (value1A === value1B) {
      // First round tied
      const value2A = getTrucoRankingValue(round2[0].card);
      const value2B = getTrucoRankingValue(round2[1].card);

      if (value2A > value2B) {
        return round2[0].playerId;
      }
      if (value2B > value2A) {
        return round2[1].playerId;
      }
    }
  }

  // If all rounds are tied or no clear winner, the starting player (mano) wins
  return context.startingPlayer;
};

const resetHand = (context: HandContext) => {
  context.hands = {};
  context.cardPlays = [];
  context.startingPlayer = context.currentTurn
};

export {
  next,
  hasCard,
  dealCards,
  getEnvido,
  playCard,
  allPlayersPlayedFirstCard,
  shouldCloseEnvido,
  getForfeitPoints,
  getEnvidoWinner,
  getTrucoWinner,
  resetHand,
};
