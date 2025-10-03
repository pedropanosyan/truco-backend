export interface PlayerSession {
  playerId: string;
  socketId: string;
  roomId?: string;     
  isConnected: boolean;
  lastSeen: number;   
  reconnectUntil?: number; 
}