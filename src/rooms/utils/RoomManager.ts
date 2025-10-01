import { Player, Room } from '../types';

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly sockets = new Map<string, Player>();

  // --- Room Repository Methods ---
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  saveRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  // --- Player Repository Methods ---
  getPlayer(socketId: string): Player | undefined {
    return this.sockets.get(socketId);
  }

  savePlayer(player: Player): void {
    this.sockets.set(player.socketId, player);
  }

  deletePlayer(socketId: string): void {
    this.sockets.delete(socketId);
  }

  // --- Helper Methods ---
  getPlayerId(socketId: string): string | undefined {
    return this.sockets.get(socketId)?.playerId;
  }

  getRoomId(socketId: string): string | null {
    return this.sockets.get(socketId)?.roomId ?? null;
  }
}
