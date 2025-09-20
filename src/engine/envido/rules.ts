import { EnvidoBid, EnvidoContext } from './types';

const getPointsToRaise = (greaterScore: number, scoreLimit: number) => {
  return scoreLimit - greaterScore;
};

const applyBid = (context: EnvidoContext, points: number) => {
  context.pointsOnStake += points;
  context.next();
};

const callEnvido = (context: EnvidoContext) => {
  applyBid(context, 2);
};

const callEnvidoAgain = (context: EnvidoContext) => {
  applyBid(context, 2);
};

const callToRealEnvido = (context: EnvidoContext) => {
  applyBid(context, 3);
};

const callToFaltaEnvido = (context: EnvidoContext) => {
  context.pointsOnStake = getPointsToRaise(
    context.greaterScore,
    context.scoreLimit,
  );
  context.next();
};

export { callEnvido, callEnvidoAgain, callToRealEnvido, callToFaltaEnvido };
