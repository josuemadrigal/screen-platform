import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    StorageModule,
    EventsModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
