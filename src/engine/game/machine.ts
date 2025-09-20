import { ActorRefFrom } from 'xstate';
import { gameSetup } from './setup';
import {
  GameStates,
  GameEvents,
  GameActions,
  GameContext,
  GAME_RULES,
} from './types';

export const gameMachine = gameSetup.createMachine({
  id: 'game',
  initial: GameStates.IDLE,
  context: {
    players: [],
    scoreLimit: GAME_RULES.DEFAULT_SCORE_LIMIT,
    scores: {},
    id: null,
  } as GameContext,

  states: {
    [GameStates.IDLE]: {
      on: {
        [GameEvents.START_GAME]: {
          target: GameStates.IN_PROGRESS,
          guard: 'canStartGame',
          actions: [GameActions.START_GAME],
        },
      },
    },

    [GameStates.IN_PROGRESS]: {
      invoke: {
        id: 'hand',
        src: 'hand',
        input: ({ context }) => ({
          players: context.players,
          startingPlayer: context.players[0].id,
          scoreLimit: context.scoreLimit,
          currentScores: context.scores,
        }),
      },
      on: {
        [GameEvents.UPDATE_GAME_POINTS]: {
          actions: [GameActions.UPDATE_GAME_POINTS],
        },
        [GameEvents.END_GAME]: {
          target: GameStates.GAME_END,
          actions: [GameActions.END_GAME],
        },
      },
      always: {
        target: GameStates.GAME_END,
        guard: 'hasWinner',
        actions: [GameActions.END_GAME],
      },
    },

    [GameStates.GAME_END]: {
      on: {
        [GameEvents.START_GAME]: {
          target: GameStates.IN_PROGRESS,
          guard: 'canStartGame',
          actions: [GameActions.START_GAME],
        },
      },
    },
  },
});

// ============================================================================
// MACHINE TYPES
// ============================================================================

export type GameMachine = typeof gameMachine;
export type GameActor = ActorRefFrom<GameMachine>;
