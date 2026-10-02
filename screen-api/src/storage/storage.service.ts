import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { statSync, unlinkSync, existsSync, renameSync } from 'fs';
import { randomBytes } from 'crypto';
import { execFile } from 'child_process';
import { Logger } from '@nestjs/common';
import { Video } from '@prisma/client';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Re-encodes a video the way phone cameras do, which is what TV decoders are tuned for:
   * H.264 High level 4.1 with CABAC (Baseline/CAVLC streams gave PIPELINE_ERROR_DECODE on the
   * Nikkei TVs while High-profile phone videos played), yuv420p, at most 1920x1080 (never upscaled), width and height
   * width padded to a multiple of 16 (a 1918-wide export gives MEDIA_ERR_DECODE on some TV SoCs), height even,
   * at most 30 fps, bitrate capped around 6 Mb/s, AAC stereo 48 kHz, moov atom at the front.
   * A silent audio track (common in signage exports) is dropped: AAC frames of pure silence
   * make the audio decoder of some TVs fail, and the video never starts (MEDIA_ERR_DECODE).
   * The result gets a new file name so TVs re-download it; the old file is removed.
   */
  async optimizeForTv(id: number): Promise<Video | null> {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) return null;
    const dir = path.join(process.cwd(), 'storage');
    const input = path.join(dir, video.fileName);
    if (!existsSync(input)) {
      this.logger.warn(`optimizeForTv: archivo no encontrado ${video.fileName}`);
      return video;
    }
    await this.prisma.video.update({ where: { id }, data: { processing: true } });
    // TV_MAX_HEIGHT=720 in the server .env limits output to 720p for TVs whose decoder rejects 1080p.
    const maxH = Math.max(360, parseInt(process.env.TV_MAX_HEIGHT || '1080', 10) || 1080);
    const maxW = Math.round((maxH * 16) / 9);
    const newName = `${randomBytes(16).toString('hex')}.mp4`;
    const tmp = path.join(dir, `${newName}.tmp.mp4`);
    const started = Date.now();
    try {
      const fps = await this.probeFps(input);
      const silent = await this.isSilent(input);
      if (silent) this.logger.log(`Video ${id}: audio en silencio, se quita la pista`);
      await new Promise<void>((resolve, reject) => {
        const cmd = Ffmpeg(input)
          .videoCodec('libx264')
          .outputOptions([
            '-profile:v high',
            '-level 4.1',
            '-pix_fmt yuv420p',
            '-preset medium',
            // Mirror what phone encoders emit: no weighted prediction, 3 refs, 2 B-frames.
            '-x264-params cabac=1:ref=3:bframes=2:weightp=0:keyint=60:min-keyint=24',
            // Drop x264's SEI user-data NAL: some TV decoders fail on it (phone videos carry none).
            '-bsf:v filter_units=remove_types=6',
            '-crf 23',
            '-maxrate 6M',
            '-bufsize 12M',
            // Fit inside the max size without upscaling; width to a multiple of 16, height even (black, centered).
            `-vf scale=w=min(${maxW}\\,iw):h=min(${maxH}\\,ih):force_original_aspect_ratio=decrease,pad=ceil(iw/16)*16:ceil(ih/2)*2:(ow-iw)/2:(oh-ih)/2`,
            '-movflags +faststart',
          ])
        if (silent) cmd.noAudio();
        else cmd.audioCodec('aac').audioBitrate('128k').audioFrequency(48000).audioChannels(2);
        if (fps && fps > 30) cmd.outputOptions(['-r 30']);
        cmd
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(tmp);
      });
      renameSync(tmp, path.join(dir, newName));
      const updated = await this.prisma.video.update({
        where: { id },
        data: { fileName: newName, path: `/${newName}`, processing: false },
      });
      try { unlinkSync(input); } catch { /* already gone */ }
      this.logger.log(`Video ${id} optimizado para TV (máx. ${maxH}p) en ${Math.round((Date.now() - started) / 1000)} s: ${video.fileName} -> ${newName}`);
      return updated;
    } catch (err) {
      try { unlinkSync(tmp); } catch { /* nothing to clean */ }
      this.logger.error(`optimizeForTv falló para el video ${id} (${video.fileName}): ${err?.message || err}`);
      // Keep the original playable rather than leaving the video hidden forever.
      return this.prisma.video.update({ where: { id }, data: { processing: false } });
    }
  }

  /** True when the first audio track is missing or never rises above -60 dB. */
  private isSilent(file: string): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(
        'ffmpeg',
        ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0?', '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
        { maxBuffer: 10 * 1024 * 1024 },
        (_err, _stdout, stderr) => {
          const m = /max_volume:\s*(-?[\d.]+) dB/.exec(stderr || '');
          if (!m) return resolve(true); // no audio stream at all
          resolve(parseFloat(m[1]) < -60);
        },
      );
    });
  }

  private probeFps(file: string): Promise<number | null> {
    return new Promise((resolve) => {
      Ffmpeg.ffprobe(file, (err, data) => {
        if (err) return resolve(null);
        const v = data.streams?.find((s) => s.codec_type === 'video');
        const rate = v?.r_frame_rate || '';
        const [n, d] = rate.split('/').map(Number);
        resolve(n && d ? n / d : null);
      });
    });
  }

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

  /** Size in bytes of the stored file, or null when it is missing on disk. */
  private fileSize(fileName: string): number | null {
    try {
      return statSync(path.join(process.cwd(), 'storage', fileName)).size;
    } catch {
      return null;
    }
  }

  async findAll() {
    const videos = await this.prisma.video.findMany();
    return videos.map((v) => ({ ...v, size: this.fileSize(v.fileName) }));
  }

  async findOne(id: number) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    return video ? { ...video, size: this.fileSize(video.fileName) } : video;
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
