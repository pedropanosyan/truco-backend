import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from './lobby';
import { GameModule } from './game';

@Module({
  imports: [RoomsModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
