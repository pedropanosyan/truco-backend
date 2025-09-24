import { TrucoContext } from './types';

const applyBid = (context: TrucoContext, points: number) => {
  context.pointsOnStake = points;
};

const callTruco = (context: TrucoContext) => {
  applyBid(context, 2);
};

const callRetruco = (context: TrucoContext) => {
  applyBid(context, 3);
};

const callValeCuatro = (context: TrucoContext) => {
  applyBid(context, 4);
};

export { callTruco, callRetruco, callValeCuatro };
