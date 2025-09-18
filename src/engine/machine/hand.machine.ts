import { setup } from 'xstate';
import { Card, HAND_STATE, HandContext, Player } from '../types';
import { HAND_EVENT } from '../types';
import { initHand } from '../utils';
import { isCurrentTurn } from '../utils/guards';

export type HandEvents =
  | { type: HAND_EVENT.DEAL; player: number }
  | { type: HAND_EVENT.PLAY_CARD; player: number; card: Card }
  | { type: HAND_EVENT.CALL_ENVIDO; player: number }
  | { type: HAND_EVENT.CALL_REAL_ENVIDO; player: number }
  | { type: HAND_EVENT.CALL_FALTA_ENVIDO; player: number }
  | { type: HAND_EVENT.RESOLVE_ENVIDO; player: number }
  | { type: HAND_EVENT.CALL_TRUCO; player: number }
  | { type: HAND_EVENT.CALL_RETRUCO; player: number }
  | { type: HAND_EVENT.CALL_VALE_CUATRO; player: number }
  | { type: HAND_EVENT.ACCEPT; player: number }
  | { type: HAND_EVENT.REJECT; player: number }
  | { type: HAND_EVENT.END_ROUND; player: number };

export const handMachine = setup({
  types: {
    context: {} as HandContext,
    events: {} as HandEvents,
    input: {} as { numPlayers: number; dealer: Player },
  },
  guards: {
    isCurrentTurn: ({ context, event }) => isCurrentTurn(context, event),
  },
}).createMachine({
  id: 'trucoHand',
  initial: HAND_STATE.START_HAND,

  context: ({ input }) => initHand(input.numPlayers, input.dealer),

  states: {
    [HAND_STATE.START_HAND]: {
      on: {
        [HAND_EVENT.DEAL]: { target: HAND_STATE.READY },
      },
    },

    [HAND_STATE.READY]: {
      on: {
        [HAND_EVENT.CALL_ENVIDO]: {
          target: HAND_STATE.ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
          
        },
        [HAND_EVENT.CALL_REAL_ENVIDO]: {
          target: HAND_STATE.REAL_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_FALTA_ENVIDO]: {
          target: HAND_STATE.FALTA_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_TRUCO]: { target: HAND_STATE.TRUCO },
        [HAND_EVENT.PLAY_CARD]: {
          target: HAND_STATE.PLAYING,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.ENVIDO]: {
      on: {
        [HAND_EVENT.ACCEPT]: {
          target: HAND_STATE.RESOLVING_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.REJECT]: {
          target: HAND_STATE.POST_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_ENVIDO]: {
          target: HAND_STATE.ENVIDO2,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_REAL_ENVIDO]: {
          target: HAND_STATE.REAL_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_FALTA_ENVIDO]: {
          target: HAND_STATE.FALTA_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.ENVIDO2]: {
      on: {
        [HAND_EVENT.ACCEPT]: {
          target: HAND_STATE.RESOLVING_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.REJECT]: {
          target: HAND_STATE.POST_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_REAL_ENVIDO]: {
          target: HAND_STATE.REAL_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_FALTA_ENVIDO]: {
          target: HAND_STATE.FALTA_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.REAL_ENVIDO]: {
      on: {
        [HAND_EVENT.ACCEPT]: {
          target: HAND_STATE.RESOLVING_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.REJECT]: {
          target: HAND_STATE.POST_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_FALTA_ENVIDO]: {
          target: HAND_STATE.FALTA_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.FALTA_ENVIDO]: {
      on: {
        [HAND_EVENT.ACCEPT]: {
          target: HAND_STATE.RESOLVING_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.REJECT]: {
          target: HAND_STATE.POST_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.RESOLVING_ENVIDO]: {
      on: {
        [HAND_EVENT.RESOLVE_ENVIDO]: {
          target: HAND_STATE.POST_ENVIDO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.POST_ENVIDO]: {
      on: {
        [HAND_EVENT.CALL_TRUCO]: {
          target: HAND_STATE.TRUCO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.PLAY_CARD]: {
          target: HAND_STATE.PLAYING,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.TRUCO]: {
      on: {
        [HAND_EVENT.ACCEPT]: {
          target: HAND_STATE.PLAYING,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.REJECT]: {
          target: HAND_STATE.END_HAND,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_RETRUCO]: {
          target: HAND_STATE.RETRUCO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.RETRUCO]: {
      on: {
        [HAND_EVENT.ACCEPT]: {
          target: HAND_STATE.PLAYING,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.REJECT]: {
          target: HAND_STATE.END_HAND,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_VALE_CUATRO]: {
          target: HAND_STATE.VALE_CUATRO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.VALE_CUATRO]: {
      on: {
        [HAND_EVENT.ACCEPT]: {
          target: HAND_STATE.PLAYING,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.REJECT]: {
          target: HAND_STATE.END_HAND,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.PLAYING]: {
      on: {
        [HAND_EVENT.PLAY_CARD]: {
          target: HAND_STATE.PLAYING,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
        [HAND_EVENT.CALL_TRUCO]: {
          target: HAND_STATE.TRUCO,
          guard: ({ context, event }) => isCurrentTurn(context, event),
         },
        [HAND_EVENT.END_ROUND]: {
          target: HAND_STATE.END_HAND,
          guard: ({ context, event }) => isCurrentTurn(context, event),
        },
      },
    },

    [HAND_STATE.END_HAND]: {
      type: 'final',
    },
  },
});
