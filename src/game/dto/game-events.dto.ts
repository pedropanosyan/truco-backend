import { IsString, IsNotEmpty, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Card, Rank, Suit } from '../../engine';

export class CardDto implements Card {
  @IsEnum(Rank)
  rank: Rank;

  @IsEnum(Suit)
  suit: Suit;
}

export class PlayCardDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ValidateNested()
  @Type(() => CardDto)
  card: CardDto;
}

// ============================================================================
// CALL TRUCO DTO
// ============================================================================

export class CallTrucoDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}

// ============================================================================
// CALL ENVIDO DTO
// ============================================================================

export class CallEnvidoDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}

// ============================================================================
// ACCEPT CALL DTO
// ============================================================================

export class AcceptCallDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}

// ============================================================================
// REJECT CALL DTO
// ============================================================================

export class RejectCallDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}

// ============================================================================
// RAISE TRUCO DTO
// ============================================================================

export class RaiseTrucoDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}

// ============================================================================
// RAISE ENVIDO DTO
// ============================================================================

export class RaiseEnvidoDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;
}
