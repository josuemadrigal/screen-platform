import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { Video } from '@prisma/client';

@Injectable()
export class StorageService {
  constructor(private prisma: PrismaService) {}

  async createVideoRecord(data: any) {
    return this.prisma.video.create({
      data: {
        fileName: data.fileName,
        title: data.title,
        idUser: data.idUser,
        path: data.path,
        thumbnail: data.thumbnail,
        duration: data.duration,
        dateout: data.dateout,
        status: parseInt(data.status) || 1,
      },
    });
  }

  async findAll() {
    return this.prisma.video.findMany();
  }

  async findOne(id: number) {
    return this.prisma.video.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: any) {
    const { status, ...rest } = data;
    return this.prisma.video.update({
      where: { id },
      data: {
        ...rest,
        status: status !== undefined ? parseInt(status) : undefined,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.video.delete({
      where: { id },
    });
  }

  /**
   * Codes of the screens whose assigned playlist contains this video.
   * Playlists store videos as a comma-separated id list, and screens may reference
   * a playlist by id or by name, so both forms are matched.
   */
  async findScreenCodesUsingVideo(videoId: number): Promise<string[]> {
    const playlists = await this.prisma.playlist.findMany({
      select: { id: true, playlistname: true, videos: true },
    });
    const containing = playlists.filter((playlist) =>
      (playlist.videos || '')
        .split(',')
        .map((value) => parseInt(value.trim(), 10))
        .includes(videoId),
    );
    if (containing.length === 0) return [];

    const references = containing.flatMap((playlist) => [String(playlist.id), playlist.playlistname]);
    const screens = await this.prisma.screen.findMany({
      where: { playlist: { in: references } },
      select: { code: true },
    });
    return screens.map((screen) => screen.code);
  }

  async generateThumbnail(pathVideo: string, nameVideo: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${nameVideo}_thumb_${timestamp}.jpg`;
    const folder = path.join(process.cwd(), 'storage', 'thumbs');
    if (!require('fs').existsSync(folder)) {
      require('fs').mkdirSync(folder, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      Ffmpeg(pathVideo)
        .screenshots({
          timestamps: ['10%'],
          filename: fileName,
          folder: folder,
        })
        .on('end', () => {
          console.log('Thumbnail generado exitosamente.');
          resolve(fileName);
        })
        .on('error', (err) => {
          console.error('Error al generar el thumbnail:', err);
          reject(err);
        });
    });
  }
}
