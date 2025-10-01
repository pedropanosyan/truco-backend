import { Injectable } from '@nestjs/common';
import { ClientGameState } from '../types';
import {
  GameActor,
  GameEvents,
  gameMachine,
  HandEvents,
  EnvidoEvents,
  TrucoEvents,
  Card,
  CardPlay,
} from 'src/engine';
import { createActor } from 'xstate';

@Injectable()
export class GameManager {
  private games = new Map<string, GameActor>();

  createGame(
    roomId: string,
    players: string[],
    scoreLimit: number = 30,
    betAmount: number,
  ): ClientGameState {
    const playersObjects = players.map((player) => ({ id: player }));

    const gameActor = createActor(gameMachine, {
      input: {
        players: playersObjects,
        scoreLimit,
        betAmount,
        id: roomId,
      },
    });

    gameActor.start();

    this.games.set(roomId, gameActor);

    gameActor.send({
      type: GameEvents.START_GAME,
      players: playersObjects,
      scoreLimit,
    });

    return this.parseServerStateToClientState(roomId, gameActor, players[0]);
  }

  getGame(roomId: string): ClientGameState | undefined {
    const gameActor = this.games.get(roomId);
    
    if (!gameActor) return undefined;

    const snapshot = gameActor.getSnapshot();
    return this.parseServerStateToClientState(roomId, gameActor, snapshot.context.players[0].id);
  }

  getClientGameState(
    roomId: string,
    playerId: string,
  ): ClientGameState | undefined {
    const gameActor = this.games.get(roomId);
    if (!gameActor) return undefined;

    return this.parseServerStateToClientState(roomId, gameActor, playerId);
  }

  sendEventToGame(roomId: string, event: any): boolean {
    const gameActor = this.games.get(roomId);
    if (!gameActor) return false;

    gameActor.send(event);
    return true;
  }

  private parseServerStateToClientState(
    roomId: string,
    gameActor: GameActor,
    playerId: string,
  ): ClientGameState {
    const snapshot = gameActor.getSnapshot();
    const context = snapshot.context;

    const availableActions = this.getAvailableActions(snapshot);

    const handActor = snapshot.children?.hand;
    let playerHand: Card[] = [];
    let table: CardPlay[] = [];
    let currentTurn = playerId;

    if (handActor) {
      const handSnapshot = handActor.getSnapshot();
      const handContext = handSnapshot.context;
      currentTurn = handContext.currentTurn;
      table = handContext.cardPlays || [];
      playerHand = handContext.hands?.[playerId] || [];
    }

    return {
      roomId,
      players: context.players,
      currentTurn,
      table,
      hand: playerHand,
      betAmount: context.betAmount,
      availableActions,
      scoreLimit: context.scoreLimit,
      score: context.scores,
    };
  }

  private getAvailableActions(snapshot: any): string[] {
    const availableActions: string[] = [];

    this.checkEnumEvents(snapshot, GameEvents, availableActions);

    const handActor = snapshot.children?.hand;
    if (handActor) {
      const handSnapshot = handActor.getSnapshot();
      this.checkEnumEvents(handSnapshot, HandEvents, availableActions);

      const envidoActor = handSnapshot.children?.envido;
      if (envidoActor) {
        this.checkEnumEvents(
          envidoActor.getSnapshot(),
          EnvidoEvents,
          availableActions,
        );
      }

      const trucoActor = handSnapshot.children?.truco;
      if (trucoActor) {
        this.checkEnumEvents(
          trucoActor.getSnapshot(),
          TrucoEvents,
          availableActions,
        );
      }
    }

    return [...new Set(availableActions)];
  }

  private checkEnumEvents(
    actorSnapshot: any,
    eventEnum: Record<string, string>,
    availableActions: string[],
  ): void {
    Object.values(eventEnum).forEach((eventType) => {
      if (actorSnapshot.can({ type: eventType })) {
        availableActions.push(eventType);
      }
    });
  }
}
