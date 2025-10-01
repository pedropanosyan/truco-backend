import { Player, Room } from '../types';

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly players = new Map<string, Player>(); // Store players by playerId
  private readonly socketToPlayer = new Map<string, string>(); // Map socketId to playerId

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
    const playerId = this.socketToPlayer.get(socketId);
    return playerId ? this.players.get(playerId) : undefined;
  }

  getPlayerByPlayerId(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  savePlayer(player: Player): void {
    this.players.set(player.playerId, player);
    this.socketToPlayer.set(player.socketId, player.playerId);
  }

  deletePlayer(socketId: string): void {
    const playerId = this.socketToPlayer.get(socketId);
    if (playerId) {
      this.socketToPlayer.delete(socketId);
      this.players.delete(playerId);
    }
  }

  // Keep player data but remove socket mapping for reconnection
  disconnectPlayer(socketId: string): void {
    this.socketToPlayer.delete(socketId);
  }

  // Update socket mapping for reconnection
  updateSocketMapping(socketId: string, playerId: string): void {
    this.socketToPlayer.set(socketId, playerId);
  }

  // --- Helper Methods ---
  getPlayerId(socketId: string): string | undefined {
    return this.socketToPlayer.get(socketId);
  }

  getRoomId(socketId: string): string | null {
    const player = this.getPlayer(socketId);
    return player?.roomId ?? null;
  }

  findPlayerByPlayerId(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  // Clear room association for all players in a room
  clearRoomForAllPlayers(roomId: string): void {
    for (const [playerId, player] of this.players.entries()) {
      if (player.roomId === roomId) {
        const updatedPlayer = { ...player, roomId: null };
        this.players.set(playerId, updatedPlayer);
      }
    }
  }
}
