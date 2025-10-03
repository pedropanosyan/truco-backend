import { Module } from '@nestjs/common';
import { LobbyGateway } from './gateway';
import { LobbyService } from './service';
import { RoomManager } from './utils';
import { GameModule } from '../game';

@Module({
  imports: [GameModule],
  providers: [LobbyGateway, LobbyService, RoomManager],
  exports: [LobbyGateway],
})
export class LobbyModule {}
