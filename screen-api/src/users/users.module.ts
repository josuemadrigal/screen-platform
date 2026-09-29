import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { HistoryModule } from '../history/history.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [HistoryModule, EventsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
