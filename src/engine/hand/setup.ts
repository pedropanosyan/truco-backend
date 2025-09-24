import { setup, sendParent } from 'xstate';
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
  getEnvidoWinner,
  getTrucoWinner,
  hasCard,
  resetHand,
  shouldCloseEnvido,
  next,
  getForfeitPoints,
} from './rules';
import { envidoMachine } from '../envido/machine';
import { trucoMachine } from '../truco/machine';
import { GameActions } from '../game';

export const handSetup = setup({
  types: {
    events: {} as HandEventPayloads,
    context: {} as HandContext,
    input: {} as HandInput,
  },

  actors: {
    envido: envidoMachine,
    truco: trucoMachine,
  },

  guards: {
    canPlayCard: ({ context, event }): boolean => {
      if (event.type === HandEvents.PLAY_CARD) {
        return hasCard(context, event.playerId, event.card);
      }
      return false;
    },
    canPlayCardAndCloseEnvido: ({ context, event }): boolean => {
      if (event.type === HandEvents.PLAY_CARD) {
        return (
          hasCard(context, event.playerId, event.card) &&
          shouldCloseEnvido(context)
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
        next(context);
      }
    },

    [HandActions.HANDLE_FORFEIT]: ({ context, event }) => ({
      type: GameActions.UPDATE_GAME_POINTS,
      points: getForfeitPoints(context),
      playerId: context.currentTurn,
    }),

    [HandActions.ENVIDO_ACCEPTED]: sendParent(({ context, event }) => ({
      type: GameActions.UPDATE_GAME_POINTS,
      points: (event as { points: number }).points,
      playerId: getEnvidoWinner(context),
    })),

    [HandActions.ENVIDO_DECLINED]: sendParent(({ context, event }) => ({
      type: GameActions.UPDATE_GAME_POINTS,
      points: (event as { points: number }).points,
      playerId: context.currentTurn,
    })),

    [HandActions.TRUCO_ACCEPTED]: sendParent(({ context, event }) => ({
      type: GameActions.UPDATE_GAME_POINTS,
      points: (event as { points: number }).points,
      playerId: getTrucoWinner(context),
    })),

    [HandActions.TRUCO_DECLINED]: sendParent(({ context, event }) => ({
      type: GameActions.UPDATE_GAME_POINTS,
      points: (event as { points: number }).points,
      playerId: context.currentTurn,
    })),

    [HandActions.RESET_HAND]: ({ context }) => {
      resetHand(context);
    },
    
    [HandActions.CHANGE_TURN]: ({ context }) => {
      next(context);
    },
  },
});
