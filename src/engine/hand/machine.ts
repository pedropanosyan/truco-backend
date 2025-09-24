import { handSetup } from './setup';
import { HandActions, HandEvents, HandStates, next } from '.';
import { EnvidoEvents } from '../envido/';

export const handMachine = handSetup.createMachine({
  id: 'hand',
  initial: HandStates.IDLE,

  context: ({ input }) => ({
    players: input.players,
    hands: {},
    cardPlays: [],
    currentTurn: input.startingPlayer,
    startingPlayer: input.startingPlayer,
    trucoPoints: 0,
    scoreLimit: input.scoreLimit,
    currentScores: input.currentScores,
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
              actions: [HandActions.CHANGE_TURN],
            },
            [HandEvents.CALL_TRUCO]: {
              target: `#hand.${HandStates.TRUCO_PHASE}.${HandStates.TRUCO_PHASE_PLAYING}`,
              actions: [HandActions.CHANGE_TURN],
            },
            [HandEvents.PLAY_CARD]: [
              {
                guard: 'canPlayCardAndCloseEnvido',
                target: `#hand.${HandStates.TRUCO_PHASE}.${HandStates.TRUCO_PHASE_IDLE}`,
                actions: [HandActions.PLAY_CARD],
              },
              {
                guard: 'canPlayCard',
                target: HandStates.ENVIDO_PHASE_IDLE,
                actions: [HandActions.PLAY_CARD],
              },
            ],
            [HandEvents.FORFEIT]: {
              target: `#hand.${HandStates.HAND_END}`,
              actions: [HandActions.HANDLE_FORFEIT, HandActions.CHANGE_TURN],
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
              next: () => next(context),
            }),
          },
          on: {
            [HandEvents.ENVIDO_ACCEPTED]: {
              target: `#hand.${HandStates.TRUCO_PHASE}.${HandStates.TRUCO_PHASE_IDLE}`,
              actions: [HandActions.ENVIDO_ACCEPTED],
            },
            [HandEvents.ENVIDO_DECLINED]: {
              target: `#hand.${HandStates.TRUCO_PHASE}.${HandStates.TRUCO_PHASE_IDLE}`,
              actions: [HandActions.ENVIDO_DECLINED],
            },
            [HandEvents.TRUCO_ACCEPTED]: {
              target: HandStates.ENVIDO_PHASE_IDLE,
              actions: [HandActions.TRUCO_ACCEPTED],
            },
            [HandEvents.TRUCO_DECLINED]: {
              target: HandStates.ENVIDO_PHASE_IDLE,
              actions: [HandActions.TRUCO_DECLINED],
            },
            [HandEvents.CALL_TRUCO]: {
              target: `#hand.${HandStates.TRUCO_PHASE}.${HandStates.TRUCO_PHASE_PLAYING}`,
              actions: [HandActions.CHANGE_TURN],
            },
            [HandEvents.PLAY_CARD]: [
              {
                guard: 'canPlayCardAndCloseEnvido',
                target: `#hand.${HandStates.TRUCO_PHASE}.${HandStates.TRUCO_PHASE_IDLE}`,
                actions: [HandActions.PLAY_CARD],
              },
              {
                guard: 'canPlayCard',
                target: HandStates.ENVIDO_PHASE_PLAYING,
                actions: [HandActions.PLAY_CARD],
              },
            ],
            [HandEvents.FORFEIT]: {
              target: `#hand.${HandStates.HAND_END}`,
              actions: [HandActions.HANDLE_FORFEIT, HandActions.CHANGE_TURN],
            },
          },
        },
      },
    },

    [HandStates.TRUCO_PHASE]: {
      initial: HandStates.TRUCO_PHASE_IDLE,
      states: {
        [HandStates.TRUCO_PHASE_IDLE]: {
          on: {
            [HandEvents.PLAY_CARD]: {
              guard: 'canPlayCard',
              target: HandStates.TRUCO_PHASE_IDLE,
              actions: [HandActions.PLAY_CARD],
            },
            [HandEvents.CALL_TRUCO]: {
              target: HandStates.TRUCO_PHASE_PLAYING,
              actions: [HandActions.CHANGE_TURN],
            },
            [HandEvents.FORFEIT]: {
              target: `#hand.${HandStates.HAND_END}`,
              actions: [HandActions.HANDLE_FORFEIT, HandActions.CHANGE_TURN],
            },
            [HandEvents.HAND_END]: {
              target: `#hand.${HandStates.HAND_END}`,
            },
          },
        },
        [HandStates.TRUCO_PHASE_PLAYING]: {
          invoke: {
            id: 'truco',
            src: 'truco',
            input: ({ context }) => ({
              next: () => next(context),
            }),
          },
          on: {
            [HandEvents.TRUCO_ACCEPTED]: {
              target: HandStates.TRUCO_PHASE_IDLE,
              actions: [HandActions.TRUCO_ACCEPTED],
            },
            [HandEvents.TRUCO_DECLINED]: {
              target: HandStates.TRUCO_PHASE_IDLE,
              actions: [HandActions.TRUCO_DECLINED],
            },
            [HandEvents.PLAY_CARD]: {
              guard: 'canPlayCard',
              target: HandStates.TRUCO_PHASE_PLAYING,
              actions: [HandActions.PLAY_CARD],
            },
            [HandEvents.FORFEIT]: {
              target: `#hand.${HandStates.HAND_END}`,
              actions: [HandActions.HANDLE_FORFEIT, HandActions.CHANGE_TURN],
            },
            [HandEvents.HAND_END]: {
              target: `#hand.${HandStates.HAND_END}`,
            },
          },
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
