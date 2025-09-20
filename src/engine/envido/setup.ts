import { setup, sendParent } from 'xstate';
import {
  EnvidoActions,
  EnvidoContext,
  EnvidoEventPayloads,
  EnvidoInput,
} from './types';
import {
  callEnvido,
  callEnvidoAgain,
  callToFaltaEnvido,
  callToRealEnvido,
} from './rules';

export const envidoSetup = setup({
  types: {
    events: {} as EnvidoEventPayloads,
    context: {} as EnvidoContext,
    input: {} as EnvidoInput,
  },

  actions: {
    [EnvidoActions.CALL_ENVIDO]: ({ context }) => {
      callEnvido(context);
    },
    [EnvidoActions.RAISE_ENVIDO]: ({ context }) => {
      callEnvidoAgain(context);
    },
    [EnvidoActions.RAISE_REAL_ENVIDO]: ({ context }) => {
      callToRealEnvido(context);
    },
    [EnvidoActions.RAISE_FALTA_ENVIDO]: ({ context }) => {
      callToFaltaEnvido(context);
    },
    [EnvidoActions.ACCEPT_ENVIDO]: sendParent(({ context }) => ({
      type: EnvidoActions.ACCEPT_ENVIDO,
      points: context.pointsOnStake,
    })),
    [EnvidoActions.DECLINE_ENVIDO]: sendParent(({ context }) => ({
      type: EnvidoActions.DECLINE_ENVIDO,
      points: context.pointsOnStake,
    })),
  },
});
