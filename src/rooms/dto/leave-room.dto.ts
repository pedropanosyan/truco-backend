import { IsString, IsNotEmpty } from 'class-validator';

export class LeaveRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}

export interface LeaveRoomResponse {
  roomId: string;
  players: string[];
}
