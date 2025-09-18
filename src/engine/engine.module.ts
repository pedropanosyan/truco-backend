import { Module } from '@nestjs/common';
import { EngineService } from './service/engine.service';
import { EngineController } from './controller';

@Module({
  providers: [EngineService],
  controllers: [EngineController],
})
export class EngineModule {}
