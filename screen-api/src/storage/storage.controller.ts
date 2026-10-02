import { Controller, Post, Get, Patch, Delete, Param, UseInterceptors, UploadedFile, Body, ParseIntPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { HistoryService } from '../history/history.service';
import { EventsGateway } from '../events/events.gateway';
import { JwtService } from '@nestjs/jwt';
import { getUserIdFromRequest } from '../auth/get-user-id';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../auth/permissions.guard';
import { PERMISSIONS } from '../auth/permissions';

import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly historyService: HistoryService,
    private readonly jwtService: JwtService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private async reloadScreensUsingVideo(videoId: number) {
    const codes = await this.storageService.findScreenCodesUsingVideo(videoId);
    for (const code of codes) this.eventsGateway.reloadScreensByCode(code);
  }

  @Post('upload')
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Upload a video file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        user: { type: 'string' },
        duration: { type: 'string' },
        dateout: { type: 'string' },
        status: { type: 'string' },
        optimize: { type: 'string', description: '"0" stores the file as uploaded, without the TV re-encode' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './storage',
      filename: (_req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Req() req: Request) {
    const nombre = file.filename.split('.').shift();
    const thumbnail = await this.storageService.generateThumbnail(file.path, nombre);

    const record = await this.storageService.createVideoRecord({
      fileName: file.filename,
      title: body.title,
      idUser: body.user,
      path: `/${file.filename}`,
      thumbnail,
      duration: body.duration,
      dateout: body.dateout,
      status: body.status ? parseInt(body.status, 10) : 1,
    });

    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Video subido: "${body.title}"` });

    if (body.optimize === '0' || body.optimize === 'false') {
      // Stored as uploaded (useful to test a known-good file on a TV).
      await this.reloadScreensUsingVideo(record.id);
      return record;
    }
    // Re-encode for TV in the background; the video stays hidden from screens until done.
    this.optimizeInBackground(record.id);
    return { ...record, processing: true };
  }

  /** Runs the TV re-encode without blocking the request, then refreshes the screens that use it. */
  private optimizeInBackground(id: number) {
    this.storageService
      .optimizeForTv(id)
      .then(() => this.reloadScreensUsingVideo(id))
      .catch((err) => console.error('optimizeForTv', err));
  }

  @Post('optimize-all')
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Re-encode every video to the TV-safe profile, one after another (background)' })
  async optimizeAll(@Req() req: Request) {
    const videos = await this.storageService.findAll();
    const pending = videos.filter((v) => !v.processing);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Optimización para TV de ${pending.length} videos` });
    // Sequential so the server never runs several ffmpeg jobs at once.
    (async () => {
      for (const v of pending) {
        await this.storageService.optimizeForTv(v.id).catch((err) => console.error('optimizeForTv', err));
        await this.reloadScreensUsingVideo(v.id);
      }
    })();
    return { ok: true, count: pending.length };
  }

  @Post(':id/optimize')
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Re-encode an existing video to the TV-safe profile (runs in background)' })
  async optimize(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const video = await this.storageService.findOne(id);
    if (!video) return { ok: false };
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Video optimizado para TV: "${video.title}" (ID: ${id})` });
    this.optimizeInBackground(id);
    return { ok: true, processing: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos' })
  findAll() {
    return this.storageService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one video' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.storageService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Update video metadata' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: Request) {
    const result = await this.storageService.update(id, body);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Video actualizado: "${result.title}" (ID: ${id})` });
    // Reload every TV client whose playlist contains this video.
    await this.reloadScreensUsingVideo(id);
    return result;
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Delete video' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const video = await this.storageService.findOne(id);
    // Resolve affected screens before the row is gone.
    const codes = await this.storageService.findScreenCodesUsingVideo(id);
    const result = await this.storageService.remove(id);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Video eliminado: "${video?.title}" (ID: ${id})` });
    for (const code of codes) this.eventsGateway.reloadScreensByCode(code);
    return result;
  }
}
