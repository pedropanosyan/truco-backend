import { Module } from '@nestjs/common';
import { RoomsGateway } from './gateway';
import { RoomsService } from './service/rooms.service';
import { RoomManager } from './utils';
import { GameModule } from '../game';

@Module({
  imports: [GameModule],
  providers: [RoomsGateway, RoomsService, RoomManager],
  exports: [RoomsGateway],
})
export class RoomsModule {}
