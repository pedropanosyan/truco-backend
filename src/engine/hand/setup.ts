import { setup } from 'xstate';
import {
  HandActions,
  HandContext,
  HandEventPayloads,
  HandEvents,
  HandInput,
} from './types';
import {
  dealCards,
  playCard,
  endHand,
  handleForfeit,
  updateEnvidoPoints,
  updateTrucoPoints,
  isCurrentTurn,
  hasCard,
  resetHand,
  shouldCloseEnvido,
  next,
} from './rules';
import { envidoMachine } from '../envido/machine';

export const handSetup = setup({
  types: {
    events: {} as HandEventPayloads,
    context: {} as HandContext,
    input: {} as HandInput,
  },

  actors: {
    envido: envidoMachine,
  },

  guards: {
    isCurrentTurn: ({ context, event }): boolean => {
      if (
        event.type === HandEvents.PLAY_CARD ||
        event.type === HandEvents.FORFEIT
      ) {
        return isCurrentTurn(context, event.playerId);
      }
      return false;
    },
    canPlayCard: ({ context, event }): boolean => {
      if (event.type === HandEvents.PLAY_CARD) {
        return (
          isCurrentTurn(context, event.playerId) &&
          hasCard(context, event.playerId, event.card)
        );
      }
      return false;
    },
    canPlayCardAndCloseEnvido: ({ context, event }): boolean => {
      if (event.type === HandEvents.PLAY_CARD) {
        return (
          isCurrentTurn(context, event.playerId) &&
          hasCard(context, event.playerId, event.card) &&
          shouldCloseEnvido(context, event.playerId)
        );
      }
      return false;
    },
  },

  actions: {
    [HandActions.DEAL_CARDS]: ({ context }) => {
      dealCards(context);
    },
    [HandActions.PLAY_CARD]: ({ context, event }) => {
      if (event.type === HandEvents.PLAY_CARD) {
        playCard(context, event.playerId, event.card);
        next(context, event.playerId);
      }
    },
    [HandActions.END_HAND]: ({ context }) => {
      endHand(context);
    },
    [HandActions.HANDLE_FORFEIT]: ({ context, event }) => {
      if (event.type === HandEvents.FORFEIT) {
        handleForfeit(context, event.playerId);
      }
    },
    [HandActions.UPDATE_ENVIDO_POINTS]: ({ context, event }) => {
      if (
        event.type === HandEvents.ENVIDO_ACCEPTED ||
        event.type === HandEvents.ENVIDO_DECLINED
      ) {
        updateEnvidoPoints(context, event.points);
      }
    },
    [HandActions.UPDATE_TRUCO_POINTS]: ({ context, event }) => {
      if (
        event.type === HandEvents.TRUCO_ACCEPTED ||
        event.type === HandEvents.TRUCO_DECLINED
      ) {
        updateTrucoPoints(context, event.points);
      }
    },
    [HandActions.RESET_HAND]: ({ context }) => {
      resetHand(context);
    },
  },
});
