import { handSetup } from './setup';
import { HandActions, HandEvents, HandStates, next } from '.';
import { EnvidoEvents } from '../envido/';
import { sendParent } from 'xstate';
import { GameActions } from '../game';

const toHand = (state: HandStates) => `#hand.${state}` as const;

export const handMachine = handSetup.createMachine({
  id: 'hand',
  initial: HandStates.IDLE,

  context: ({ input }) => ({
    players: input.players,
    hands: {},
    cardPlays: [],
    currentTurn: input.startingPlayer,
    startingPlayer: input.startingPlayer,
    envidoPoints: 0,
    trucoPoints: 0,
    scoreLimit: input.scoreLimit,
    currentScores: input.currentScores,
    envidoWinnerPlayerId: undefined,
    trucoWinnerPlayerId: undefined,
  }),

  states: {
    [HandStates.IDLE]: {
      on: {
        [HandEvents.DEAL]: {
          target: HandStates.DEALING,
          actions: [HandActions.DEAL_CARDS],
        },
      },
    },

    [HandStates.DEALING]: {
      always: {
        target: HandStates.ENVIDO_PHASE,
      },
    },

    [HandStates.ENVIDO_PHASE]: {
      initial: HandStates.ENVIDO_PHASE_IDLE,
      states: {
        [HandStates.ENVIDO_PHASE_IDLE]: {
          on: {
            [HandEvents.CALL_ENVIDO]: {
              target: HandStates.ENVIDO_PHASE_PLAYING,
            },
            [HandEvents.CALL_TRUCO]: {
              target: `#hand.${HandStates.TRUCO_PHASE}`,
              // TODO: Handle truco submachine
            },
            [HandEvents.PLAY_CARD]: [
              {
                guard: 'canPlayCardAndCloseEnvido',
                target: `#hand.${HandStates.TRUCO_PHASE}`,
                actions: [HandActions.PLAY_CARD],
              },
              {
                guard: 'canPlayCard',
                target: HandStates.ENVIDO_PHASE_IDLE,
                actions: [HandActions.PLAY_CARD],
              },
            ],
            [HandEvents.FORFEIT]: {
              guard: 'isCurrentTurn',
              target: toHand(HandStates.HAND_END),
              actions: [HandActions.HANDLE_FORFEIT],
            },
          },
        },
        [HandStates.ENVIDO_PHASE_PLAYING]: {
          invoke: {
            id: 'envido',
            src: 'envido',
            input: ({ context }) => ({
              scoreLimit: context.scoreLimit,
              greaterScore: Math.max(
                ...(Object.values(context.currentScores) as number[]),
              ),
              next: () => next(context, context.currentTurn),
            }),
          },
          on: {
            [HandEvents.ENVIDO_ACCEPTED]: {
              target: `#hand.${HandStates.TRUCO_PHASE}`,
              actions: [
                HandActions.UPDATE_ENVIDO_POINTS,
                sendParent(({ context,  }) => ({
                  type: GameActions.UPDATE_GAME_POINTS,
                  points: context.envidoPoints,
                  playerId: context.currentTurn,
                })),
              ],
            },
            [HandEvents.ENVIDO_DECLINED]: {
              target: `#hand.${HandStates.TRUCO_PHASE}`,
              actions: [HandActions.UPDATE_ENVIDO_POINTS],
            },
            [HandEvents.TRUCO_ACCEPTED]: {
              target: HandStates.ENVIDO_PHASE_IDLE,
              actions: [HandActions.UPDATE_TRUCO_POINTS],
            },
            [HandEvents.TRUCO_DECLINED]: {
              target: HandStates.ENVIDO_PHASE_IDLE,
              actions: [HandActions.UPDATE_TRUCO_POINTS],
            },
            [HandEvents.CALL_TRUCO]: {
              target: `#hand.${HandStates.TRUCO_PHASE}`,
              // TODO: Handle truco submachine
            },
            [HandEvents.PLAY_CARD]: [
              {
                guard: 'canPlayCardAndCloseEnvido',
                target: `#hand.${HandStates.TRUCO_PHASE}`,
                actions: [HandActions.PLAY_CARD],
              },
              {
                guard: 'canPlayCard',
                target: HandStates.ENVIDO_PHASE_PLAYING,
                actions: [HandActions.PLAY_CARD],
              },
            ],
            [HandEvents.FORFEIT]: {
              guard: 'isCurrentTurn',
              target: `#hand.${HandStates.HAND_END}`,
              actions: [HandActions.HANDLE_FORFEIT],
            },
          },
        },
      },
    },

    [HandStates.TRUCO_PHASE]: {
      on: {
        [HandEvents.PLAY_CARD]: {
          guard: 'canPlayCard',
          target: HandStates.TRUCO_PHASE,
          actions: [HandActions.PLAY_CARD],
        },
        [HandEvents.CALL_TRUCO]: {
          target: HandStates.TRUCO_PHASE,
          // TODO: Handle truco submachine
        },
        [HandEvents.FORFEIT]: {
          guard: 'isCurrentTurn',
          target: HandStates.HAND_END,
          actions: [HandActions.HANDLE_FORFEIT],
        },
        [HandEvents.TRUCO_ACCEPTED]: {
          target: HandStates.TRUCO_PHASE,
          actions: [HandActions.UPDATE_TRUCO_POINTS],
        },
        [HandEvents.TRUCO_DECLINED]: {
          target: HandStates.TRUCO_PHASE,
          actions: [HandActions.UPDATE_TRUCO_POINTS],
        },
        [HandEvents.HAND_END]: {
          target: HandStates.HAND_END,
          actions: [HandActions.END_HAND],
        },
      },
    },

    [HandStates.HAND_END]: {
      on: {
        [HandEvents.RESET]: {
          target: HandStates.IDLE,
          actions: [HandActions.RESET_HAND],
        },
      },
    },
  },
});
