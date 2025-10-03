import { IsNotEmpty, IsString } from "class-validator";
import { ClientGameState } from "src/game/types";

export class StartGameDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}

export interface StartGameResponse {
  gameState: ClientGameState;
}
