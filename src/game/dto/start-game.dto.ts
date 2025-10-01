import { IsNotEmpty, IsString } from "class-validator";

export class StartGameDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}