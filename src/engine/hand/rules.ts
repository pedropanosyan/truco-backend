import { HandContext, Card, Rank, Suit } from './types';

const isCurrentTurn = (context: HandContext, playerId: string): boolean => {
  return context.currentTurn === playerId;
};

const next = (context: HandContext, playerId: string) => {
  const currentPlayerIndex = context.players.findIndex(
    (p) => p.id === playerId,
  );
  const nextPlayerIndex = (currentPlayerIndex + 1) % context.players.length;
  context.currentTurn = context.players[nextPlayerIndex].id;
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

const shouldCloseEnvido = (context: HandContext, playerId: string): boolean => {
  // Check if all players have played their first card and current player is about to play their second
  const allPlayedFirst = allPlayersPlayedFirstCard(context);
  const currentPlayerCards = context.cardPlays.filter(
    (play) => play.playerId === playerId,
  ).length;
  return allPlayedFirst && currentPlayerCards === 1;
};

const endHand = (context: HandContext) => {
  // Logic to end the hand and reset for next hand
};

const handleForfeit = (context: HandContext, playerId: string) => {
  // Logic to handle player forfeit
  // Could involve ending the hand or round
};

const updateEnvidoPoints = (context: HandContext, points: number) => {
  context.envidoPoints += points;
};

const updateTrucoPoints = (context: HandContext, points: number) => {
  context.trucoPoints += points;
};

const resetHand = (context: HandContext) => {
  // Reset the hand for a new game
  context.hands = {};
  context.cardPlays = [];
  context.envidoPoints = 0;
  context.trucoPoints = 0;
  context.currentTurn = context.startingPlayer;
};

export {
  isCurrentTurn,
  next,
  hasCard,
  dealCards,
  playCard,
  allPlayersPlayedFirstCard,
  shouldCloseEnvido,
  endHand,
  handleForfeit,
  updateEnvidoPoints,
  updateTrucoPoints,
  resetHand,
};
