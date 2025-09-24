import { Player, Room } from '../types';

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly sockets = new Map<string, Player>();

  // --- Rooms ---
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  updateRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  // --- Players ---
  getPlayer(socketId: string): Player | undefined {
    return this.sockets.get(socketId);
  }

  setPlayer(
    socketId: string,
    playerId: string,
    roomId: string | null = null,
  ): void {
    this.sockets.set(socketId, { socketId, playerId, roomId });
  }

  removePlayer(socketId: string): void {
    this.sockets.delete(socketId);
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const updated: Room = {
      ...room,
      players: room.players.filter((p) => p !== playerId),
    };
    this.rooms.set(roomId, updated);
  }

  addPlayerToRoom(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const updatedRoom: Room = {
      ...room,
      players: [...room.players, playerId],
    };
    this.rooms.set(roomId, updatedRoom);
    return updatedRoom;
  }

  shouldDeleteRoom(room: Room, playerId: string): boolean {
    return room.owner === playerId || room.players.length === 1;
  }

  // helpers
  getPlayerId(socketId: string): string | undefined {
    return this.sockets.get(socketId)?.playerId;
  }

  getRoomId(socketId: string): string | null {
    return this.sockets.get(socketId)?.roomId ?? null;
  }
}
