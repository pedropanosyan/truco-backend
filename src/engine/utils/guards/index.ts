import { HandEvents } from "src/engine/machine/hand.machine";
import { HandContext } from "../../types";

export const isCurrentTurn = (context: HandContext, event: HandEvents) => {
  return event.player === context.currentTurn.id;
};