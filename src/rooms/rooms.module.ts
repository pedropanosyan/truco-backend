import { Module } from '@nestjs/common';
import { RoomsGateway } from './gateway';
import { RoomsService } from './service/rooms.service';

@Module({
  providers: [RoomsGateway, RoomsService],
  exports: [RoomsGateway],
})
export class RoomsModule {}
