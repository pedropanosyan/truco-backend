import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterPlayerDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;
}
