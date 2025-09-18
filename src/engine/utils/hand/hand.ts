import {
  Card,
  EnvidoStatus,
  HandContext,
  Player,
  Rank,
  Suit,
  TrucoStatus,
} from '../../types';

function createDeck(): Card[] {
  const suits: Suit[] = ['ESPADA', 'BASTO', 'ORO', 'COPA'];
  const ranks: Rank[] = ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }

  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const getNextPlayer = (current: Player, players: Player[]): Player => {
  const currentIndex = players.findIndex((p) => p.id === current.id);
  return players[(currentIndex + 1) % players.length];
};

export function initHand(numPlayers: number, dealer: Player): HandContext {
  const players = Array.from({ length: numPlayers }, (_, i) => ({ id: i }));
  const mano = getNextPlayer(dealer, players);

  const deck = shuffleDeck(createDeck());

  const hands: Record<Player['id'], Card[]> = {};
  for (let i = 0; i < numPlayers; i++) {
    hands[i] = [];
    for (let j = 0; j < 3; j++) {
      const card = deck.pop();
      if (card) hands[i].push(card);
    }
  }

  return {
    players,
    dealer,
    currentTurn: mano,
    hands,
    envidoStatus: EnvidoStatus.NONE,
    trucoStatus: TrucoStatus.NONE,
    round: 1,
    results: {},
  };
}

export const handleAccept = (context: HandContext, event: HandEvents) => {
  
}