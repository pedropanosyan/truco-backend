import { GameContext, GameEvents, GAME_RULES } from './types';

// ============================================================================
// GAME VALIDATION
// ============================================================================

export const validateGameStart = (context: GameContext): boolean => {
  return (
    context.players.length >= GAME_RULES.MIN_PLAYERS &&
    context.players.length <= GAME_RULES.MAX_PLAYERS &&
    context.scoreLimit > 0 &&
    Object.values(context.scores).every((score) => score >= 0)
  );
};

export const checkWinCondition = (context: GameContext): string | null => {
  const { scores, scoreLimit } = context;

  for (const [playerId, score] of Object.entries(scores)) {
    if (score >= scoreLimit) {
      return playerId;
    }
  }

  return null;
};

// ============================================================================
// GAME ACTIONS
// ============================================================================

export const startGame = (context: GameContext, event: any): void => {
  context.id = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  if (event.type === GameEvents.START_GAME) {
    context.players = event.players;
    context.scoreLimit = event.scoreLimit;
    // Initialize scores
    context.scores = {};
    event.players.forEach((player: any) => {
      context.scores[player.id] = 0;
    });
  }
};

export const endGame = (context: GameContext): void => {
  const winnerId = checkWinCondition(context);
  if (winnerId) {
    // Winner found - game ends
    console.log(`Game ended! Winner: ${winnerId}`);
  }
};

export const updateScores = (
  context: GameContext,
  playerId: string,
  points: number,
): void => {
  context.scores[playerId] += points;
};
