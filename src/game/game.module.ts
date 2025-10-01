import { Module } from '@nestjs/common';
import { GameGateway } from './gateway';
import { GameService } from './service';
import { GameManager } from './utils';

@Module({
  providers: [GameGateway, GameService, GameManager],
  exports: [GameService, GameManager],
})
export class GameModule {}
