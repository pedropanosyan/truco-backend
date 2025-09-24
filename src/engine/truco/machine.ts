import { trucoSetup } from './setup';
import { TrucoActions, TrucoEvents, TrucoStates } from './types';

export const trucoMachine = trucoSetup.createMachine({
  id: 'truco',
  initial: TrucoStates.IDLE,

  context: ({ input }) => ({
    pointsOnStake: 1,
    next: () => input.next(),
  }),

  states: {
    [TrucoStates.IDLE]: {
      on: {
        [TrucoEvents.CALL_TRUCO]: {
          target: TrucoStates.TRUCO,
          actions: [TrucoActions.CALL_TRUCO, TrucoActions.CHANGE_TURN],
        },
      },
    },

    [TrucoStates.TRUCO]: {
      on: {
        [TrucoEvents.RAISE_RETRUCO]: {
          target: TrucoStates.RETRUCO,
          actions: [TrucoActions.RAISE_RETRUCO, TrucoActions.CHANGE_TURN],
        },
        [TrucoEvents.RAISE_VALE_CUATRO]: {
          target: TrucoStates.VALE_CUATRO,
          actions: [TrucoActions.RAISE_VALE_CUATRO, TrucoActions.CHANGE_TURN],
        },
        [TrucoEvents.ACCEPT]: {
          target: TrucoStates.ACCEPTED,
        },
        [TrucoEvents.DECLINE]: {
          target: TrucoStates.DECLINED,
        },
      },
    },

    [TrucoStates.RETRUCO]: {
      on: {
        [TrucoEvents.RAISE_VALE_CUATRO]: {
          target: TrucoStates.VALE_CUATRO,
          actions: [TrucoActions.RAISE_VALE_CUATRO, TrucoActions.CHANGE_TURN],
        },
        [TrucoEvents.ACCEPT]: {
          target: TrucoStates.ACCEPTED,
        },
        [TrucoEvents.DECLINE]: {
          target: TrucoStates.DECLINED,
        },
      },
    },

    [TrucoStates.VALE_CUATRO]: {
      on: {
        [TrucoEvents.ACCEPT]: {
          target: TrucoStates.ACCEPTED,
        },
        [TrucoEvents.DECLINE]: {
          target: TrucoStates.DECLINED,
        },
      },
    },

    [TrucoStates.DECLINED]: {
      type: 'final',
      entry: [TrucoActions.DECLINE_TRUCO, TrucoActions.CHANGE_TURN],
    },

    [TrucoStates.ACCEPTED]: {
      type: 'final',
      entry: [TrucoActions.ACCEPT_TRUCO, TrucoActions.CHANGE_TURN],
    },
  },
});
