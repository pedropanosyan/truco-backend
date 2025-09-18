import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { createActor } from 'xstate';
import { handMachine } from '../machine/hand.machine';
import { HAND_EVENT, Card } from '../types';

interface GameSession {
  actor: any;
  gameId: string;
}

const gameSessions = new Map<string, GameSession>();

@Controller('engine')
export class EngineController {
  @Get('test-game')
  testGame() {
    const actor = createActor(handMachine, {
      input: { numPlayers: 2, dealer: { id: 0 } },
    });

    actor.start();

    return {
      state: actor.getSnapshot().value,
      context: actor.getSnapshot().context,
      canReceive: actor.getSnapshot().can({ type: HAND_EVENT.DEAL }),
    };
  }

  @Post('create-game')
  createGame(@Body() body: { numPlayers: number; dealerId: number }) {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const actor = createActor(handMachine, {
      input: {
        numPlayers: body.numPlayers,
        dealer: { id: body.dealerId },
      },
    });

    actor.start();

    gameSessions.set(gameId, { actor, gameId });

    return {
      gameId,
      state: actor.getSnapshot().value,
      context: actor.getSnapshot().context,
      availableActions: this.getAvailableActions(actor),
    };
  }

  @Get('game/:gameId/state')
  getGameState(@Param('gameId') gameId: string) {
    const session = gameSessions.get(gameId);
    if (!session) {
      return { error: 'Game not found' };
    }

    const snapshot = session.actor.getSnapshot();
    return {
      gameId,
      state: snapshot.value,
      context: snapshot.context,
      availableActions: this.getAvailableActions(session.actor),
    };
  }

  @Post('game/:gameId/action')
  performAction(
    @Param('gameId') gameId: string,
    @Body() body: { action: string; player?: number; card?: Card },
  ) {
    const session = gameSessions.get(gameId);
    if (!session) {
      return { error: 'Game not found' };
    }

    const actor = session.actor;
    const snapshot = actor.getSnapshot();

    // Check if the action is valid
    if (!snapshot.can({ type: body.action as any, ...body })) {
      return {
        error: 'Invalid action for current state',
        currentState: snapshot.value,
        availableActions: this.getAvailableActions(actor),
      };
    }

    // Send the event
    actor.send({ type: body.action as any, ...body });

    const newSnapshot = actor.getSnapshot();
    return {
      gameId,
      state: newSnapshot.value,
      context: newSnapshot.context,
      availableActions: this.getAvailableActions(actor),
      actionPerformed: body.action,
    };
  }

  @Post('game/:gameId/play-card')
  playCard(
    @Param('gameId') gameId: string,
    @Body() body: { player: number; card: Card },
  ) {
    return this.performAction(gameId, {
      action: HAND_EVENT.PLAY_CARD,
      player: body.player,
      card: body.card,
    });
  }

  @Post('game/:gameId/call-envido')
  callEnvido(@Param('gameId') gameId: string) {
    return this.performAction(gameId, { action: HAND_EVENT.CALL_ENVIDO });
  }

  @Post('game/:gameId/call-truco')
  callTruco(@Param('gameId') gameId: string) {
    return this.performAction(gameId, { action: HAND_EVENT.CALL_TRUCO });
  }

  @Post('game/:gameId/accept')
  accept(@Param('gameId') gameId: string) {
    return this.performAction(gameId, { action: HAND_EVENT.ACCEPT });
  }

  @Post('game/:gameId/reject')
  reject(@Param('gameId') gameId: string) {
    return this.performAction(gameId, { action: HAND_EVENT.REJECT });
  }

  @Post('game/:gameId/deal')
  deal(@Param('gameId') gameId: string) {
    return this.performAction(gameId, { action: HAND_EVENT.DEAL });
  }

  @Post('game/:gameId/end-round')
  endRound(@Param('gameId') gameId: string) {
    return this.performAction(gameId, { action: HAND_EVENT.END_ROUND });
  }

  @Get('games')
  listGames() {
    return Array.from(gameSessions.keys()).map((gameId) => ({
      gameId,
      state: gameSessions.get(gameId)?.actor.getSnapshot().value,
    }));
  }

  private getAvailableActions(actor: any): string[] {
    const snapshot = actor.getSnapshot();
    const actions: string[] = [];

    // Check which events can be sent
    const events = [
      HAND_EVENT.DEAL,
      HAND_EVENT.PLAY_CARD,
      HAND_EVENT.CALL_ENVIDO,
      HAND_EVENT.CALL_REAL_ENVIDO,
      HAND_EVENT.CALL_FALTA_ENVIDO,
      HAND_EVENT.CALL_TRUCO,
      HAND_EVENT.CALL_RETRUCO,
      HAND_EVENT.CALL_VALE_CUATRO,
      HAND_EVENT.ACCEPT,
      HAND_EVENT.REJECT,
      HAND_EVENT.RESOLVE_ENVIDO,
      HAND_EVENT.END_ROUND,
    ];

    events.forEach((event) => {
      if (snapshot.can({ type: event })) {
        actions.push(event);
      }
    });

    return actions;
  }
}
