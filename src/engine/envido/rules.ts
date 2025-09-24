import { EnvidoBid, EnvidoContext } from './types';

const ENVIDO_POINTS = {
  [EnvidoBid.ENVIDO]: 2,
  [EnvidoBid.ENVIDO_DOBLE]: 2,
  [EnvidoBid.REAL_ENVIDO]: 3,
  [EnvidoBid.FALTA_ENVIDO]: 1,
};

const getPointsToRaise = (greaterScore: number, scoreLimit: number) => {
  return scoreLimit - greaterScore;
};

const applyBid = (context: EnvidoContext, points: number) => {
  context.pointsOnStake += points;
};

const callEnvido = (context: EnvidoContext) => {
  applyBid(context, ENVIDO_POINTS[EnvidoBid.ENVIDO]);
  context.lastBid = EnvidoBid.ENVIDO;
};

const callEnvidoAgain = (context: EnvidoContext) => {
  applyBid(context, ENVIDO_POINTS[EnvidoBid.ENVIDO_DOBLE]);
  context.lastBid = EnvidoBid.ENVIDO_DOBLE;
};

const callToRealEnvido = (context: EnvidoContext) => {
  applyBid(context, ENVIDO_POINTS[EnvidoBid.REAL_ENVIDO]);
  context.lastBid = EnvidoBid.REAL_ENVIDO;
};

const callToFaltaEnvido = (context: EnvidoContext) => {
  context.pointsOnStake = getPointsToRaise(
    context.greaterScore,
    context.scoreLimit,
  );
  context.lastBid = EnvidoBid.FALTA_ENVIDO;
};

const getRejectedPoints = (context: EnvidoContext) => {
  if (!context.lastBid) {
    return 1;
  }
  return Math.max(context.pointsOnStake - ENVIDO_POINTS[context.lastBid], 1);
};

export {
  callEnvido,
  callEnvidoAgain,
  callToRealEnvido,
  callToFaltaEnvido,
  getRejectedPoints,
};
