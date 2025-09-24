import { setup, sendParent } from 'xstate';
import {
  TrucoActions,
  TrucoContext,
  TrucoEventPayloads,
  TrucoInput,
} from './types';
import { callTruco, callRetruco, callValeCuatro } from './rules';

export const trucoSetup = setup({
  types: {
    events: {} as TrucoEventPayloads,
    context: {} as TrucoContext,
    input: {} as TrucoInput,
  },

  actions: {
    [TrucoActions.CALL_TRUCO]: ({ context }) => {
      callTruco(context);
    },
    [TrucoActions.RAISE_RETRUCO]: ({ context }) => {
      callRetruco(context);
    },
    [TrucoActions.RAISE_VALE_CUATRO]: ({ context }) => {
      callValeCuatro(context);
    },
    [TrucoActions.ACCEPT_TRUCO]: sendParent(({ context }) => ({
      type: TrucoActions.ACCEPT_TRUCO,
      points: context.pointsOnStake,
    })),
    [TrucoActions.DECLINE_TRUCO]: sendParent(({ context }) => ({
      type: TrucoActions.DECLINE_TRUCO,
      points: Math.max(context.pointsOnStake - 1, 1),
    })),
    [TrucoActions.CHANGE_TURN]: ({ context }) => {
      context.next();
    },
  },
});
