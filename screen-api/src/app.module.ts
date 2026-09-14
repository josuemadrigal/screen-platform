import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ScreensModule } from './screens/screens.module';
import { AuthModule } from './auth/auth.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { StorageModule } from './storage/storage.module';
import { EventsModule } from './events/events.module';
import { TasksModule } from './tasks/tasks.module';
import { HistoryModule } from './history/history.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'storage'),
      serveRoot: '/', // Servir desde la raíz como hasta ahora
      serveStaticOptions: {
        cacheControl: true,
        maxAge: 31536000000, // 1 año de caché (los archivos tienen nombres únicos)
        immutable: true,
      },
    }),
    PrismaModule,
    ScreensModule,
    AuthModule,
    PlaylistsModule,
    StorageModule,
    EventsModule,
    TasksModule,
    HistoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
