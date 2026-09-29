import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EventsGateway } from '../events/events.gateway';
import * as moment from 'moment';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private eventsGateway: EventsGateway,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.debug('Running background task: Update video status based on dateout');
    await this.updateVideoStatus();
  }

  // Also run on startup
  async onModuleInit() {
    this.logger.debug('Initializing TasksService: Running startup video status update');
    await this.updateVideoStatus();
  }

  private async updateVideoStatus() {
    try {
      // Use YYYY-MM-DD to match the format stored by the frontend's <input type="date">
      const today = moment().format('YYYY-MM-DD');

      // Collect the ids first: updateMany only returns a count, and the affected screens
      // must be told to reload so an expired video disappears from the TVs right away.
      const toExpire = await this.prisma.video.findMany({
        where: { dateout: { lt: today }, status: 1 },
        select: { id: true },
      });
      const toRestore = await this.prisma.video.findMany({
        where: { dateout: { gte: today }, status: 0 },
        select: { id: true },
      });

      const expired = await this.prisma.video.updateMany({
        where: { dateout: { lt: today }, status: 1 },
        data: { status: 0 },
      });

      const restored = await this.prisma.video.updateMany({
        where: { dateout: { gte: today }, status: 0 },
        data: { status: 1 },
      });

      if (expired.count > 0) this.logger.log(`Expired ${expired.count} video(s).`);
      if (restored.count > 0) this.logger.log(`Restored ${restored.count} video(s).`);
      if (expired.count === 0 && restored.count === 0) this.logger.debug('No video status changes needed.');

      const codes = new Set<string>();
      for (const { id } of [...toExpire, ...toRestore]) {
        for (const code of await this.storageService.findScreenCodesUsingVideo(id)) codes.add(code);
      }
      for (const code of codes) this.eventsGateway.reloadScreensByCode(code);
    } catch (error) {
      this.logger.error('Error updating video status:', error);
    }
  }
}
