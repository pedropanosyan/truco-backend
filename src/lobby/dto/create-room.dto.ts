import { IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RoomOptionsDto {
  @IsNumber()
  @IsNotEmpty()
  maxPlayers: number;

  @IsNumber()
  @IsNotEmpty()
  betAmount: number;

  @IsNumber()
  @IsNotEmpty()
  scoreLimit: number;
}

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsObject()
  @ValidateNested()         
  @Type(() => RoomOptionsDto)
  options: RoomOptionsDto;
}


export interface CreateRoomResponse {
  id: string;
  owner: string;
  players: string[];
  betAmount: number;
  maxPlayers: number;
  scoreLimit: number;
}
