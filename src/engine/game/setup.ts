import { setup } from 'xstate';
import {
  GameActions,
  GameContext,
  GameEventPayloads,
  GameEvents,
  GameInput,
} from './types';
import {
  startGame,
  endGame,
  updateScores,
  validateGameStart,
  checkWinCondition,
} from './rules';
import { handMachine } from '../hand/machine';

export const gameSetup = setup({
  types: {
    events: {} as GameEventPayloads,
    context: {} as GameContext,
    input: {} as GameInput,
  },

  actors: {
    hand: handMachine,
  },

  guards: {
    canStartGame: ({ context }): boolean => {
      return validateGameStart(context) && context.id === null;
    },
    hasWinner: ({ context }): boolean => {
      return checkWinCondition(context) !== null;
    },
  },

  actions: {
    [GameActions.START_GAME]: ({ context, event }) => {
      startGame(context, event);
    },
    [GameActions.END_GAME]: ({ context }) => {
      endGame(context);
    },
    [GameActions.UPDATE_GAME_POINTS]: ({ context, event, self }) => {
      if (event.type === GameEvents.UPDATE_GAME_POINTS) {
        updateScores(context, event.playerId, event.points);
        const winnerId = checkWinCondition(context);
        if (winnerId) {
          self.send({ type: GameEvents.END_GAME, winnerId });
        }
      }
    },
  },
});
