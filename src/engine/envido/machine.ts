import { envidoSetup } from './setup';
import { EnvidoActions, EnvidoEvents, EnvidoStates } from './types';

export const envidoMachine = envidoSetup.createMachine({
  id: 'envido',
  initial: EnvidoStates.IDLE,

  context: ({ input }) => ({
    pointsOnStake: 0,
    scoreLimit: input.scoreLimit,
    greaterScore: input.greaterScore,
    next: () => input.next(),
  }),

  states: {
    [EnvidoStates.IDLE]: {
      on: {
        [EnvidoEvents.CALL_ENVIDO]: {
          target: EnvidoStates.ENVIDO,
          actions: [EnvidoActions.CALL_ENVIDO],
        },
        [EnvidoEvents.RAISE_REAL_ENVIDO]: {
          target: EnvidoStates.REAL_ENVIDO,
          actions: [EnvidoActions.RAISE_REAL_ENVIDO],
        },
        [EnvidoEvents.RAISE_FALTA_ENVIDO]: {
          target: EnvidoStates.FALTA_ENVIDO,
          actions: [EnvidoActions.RAISE_FALTA_ENVIDO],
        },
      },
    },

    [EnvidoStates.ENVIDO]: {
      on: {
        [EnvidoEvents.CALL_ENVIDO]: {
          target: EnvidoStates.ENVIDO_DOBLE,
          actions: [EnvidoActions.RAISE_ENVIDO],
        },
        [EnvidoEvents.RAISE_REAL_ENVIDO]: {
          target: EnvidoStates.REAL_ENVIDO,
          actions: [EnvidoActions.RAISE_REAL_ENVIDO],
        },
        [EnvidoEvents.RAISE_FALTA_ENVIDO]: {
          target: EnvidoStates.FALTA_ENVIDO,
          actions: [EnvidoActions.RAISE_FALTA_ENVIDO],
        },
        [EnvidoEvents.ACCEPT]: {
          target: EnvidoStates.ACCEPTED,
        },
        [EnvidoEvents.DECLINE]: {
          target: EnvidoStates.DECLINED,
        },
      },
    },

    [EnvidoStates.ENVIDO_DOBLE]: {
      on: {
        [EnvidoEvents.RAISE_REAL_ENVIDO]: {
          target: EnvidoStates.REAL_ENVIDO,
          actions: [EnvidoActions.RAISE_REAL_ENVIDO],
        },
        [EnvidoEvents.RAISE_FALTA_ENVIDO]: {
          target: EnvidoStates.FALTA_ENVIDO,
          actions: [EnvidoActions.RAISE_FALTA_ENVIDO],
        },
        [EnvidoEvents.ACCEPT]: {
          target: EnvidoStates.ACCEPTED,
        },
        [EnvidoEvents.DECLINE]: {
          target: EnvidoStates.DECLINED,
        },
      },
    },

    [EnvidoStates.REAL_ENVIDO]: {
      on: {
        [EnvidoEvents.RAISE_FALTA_ENVIDO]: {
          target: EnvidoStates.FALTA_ENVIDO,
          actions: [EnvidoActions.RAISE_FALTA_ENVIDO],
        },
        [EnvidoEvents.ACCEPT]: {
          target: EnvidoStates.ACCEPTED,
        },
        [EnvidoEvents.DECLINE]: {
          target: EnvidoStates.DECLINED,
        },
      },
    },

    [EnvidoStates.FALTA_ENVIDO]: {
      on: {
        [EnvidoEvents.ACCEPT]: {
          target: EnvidoStates.ACCEPTED,
        },
        [EnvidoEvents.DECLINE]: {
          target: EnvidoStates.DECLINED,
        },
      },
    },

    [EnvidoStates.DECLINED]: {
      type: 'final',
      entry: EnvidoActions.DECLINE_ENVIDO,
    },

    [EnvidoStates.ACCEPTED]: {
      type: 'final',
      entry: EnvidoActions.ACCEPT_ENVIDO,
    },
  },
});
