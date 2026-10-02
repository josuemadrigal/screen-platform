import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';

@Injectable()
export class ScreensService {
  constructor(private prisma: PrismaService) {}

  async create(createScreenDto: CreateScreenDto) {
    return this.prisma.screen.create({
      data: createScreenDto,
    });
  }

  async findAll() {
    return this.prisma.screen.findMany();
  }

  async findOne(id: number) {
    const screen = await this.prisma.screen.findUnique({
      where: { id },
    });
    if (!screen) throw new NotFoundException(`Screen with ID ${id} not found`);
    
    // Si tiene una playlist asignada, traer los videos
    if (screen.playlist) {
      const isNumeric = /^\d+$/.test(screen.playlist);
      const playlist = await this.prisma.playlist.findFirst({
        where: isNumeric 
          ? { OR: [{ id: parseInt(screen.playlist, 10) }, { playlistname: screen.playlist }] }
          : { playlistname: screen.playlist }
      });
      
      if (playlist) {
        const videoIds = playlist.videos.split(',').filter(id => id).map(id => parseInt(id, 10));
        const videos = await this.prisma.video.findMany({
          where: { id: { in: videoIds }, status: 1, processing: false }
        });

        // Ordenar videos según la secuencia en la playlist
        const videosData = videoIds.map(id => videos.find(v => v.id === id)).filter(Boolean);
        return { ...screen, playlistData: playlist, videosData };
      }
    }

    return { ...screen, videosData: [] };
  }

  async findByCode(code: string) {
    const screen = await this.prisma.screen.findUnique({
      where: { code },
    });
    if (!screen) throw new NotFoundException(`Screen with code ${code} not found`);

    // Misma lógica para traer videos
    if (screen.playlist) {
      const isNumeric = /^\d+$/.test(screen.playlist);
      const playlist = await this.prisma.playlist.findFirst({
        where: isNumeric
          ? { OR: [{ id: parseInt(screen.playlist, 10) }, { playlistname: screen.playlist }] }
          : { playlistname: screen.playlist }
      });

      if (playlist) {
        const videoIds = playlist.videos.split(',').filter(id => id).map(id => parseInt(id, 10));
        const videos = await this.prisma.video.findMany({
          where: { id: { in: videoIds }, status: 1, processing: false }
        });

        const videosData = videoIds.map(id => videos.find(v => v.id === id)).filter(Boolean);
        return { ...screen, playlistData: playlist, videosData };
      }
    }
    
    return { ...screen, videosData: [] };
  }

  async update(id: number, updateScreenDto: UpdateScreenDto) {
    return this.prisma.screen.update({
      where: { id },
      data: updateScreenDto,
    });
  }

  async remove(id: number) {
    return this.prisma.screen.delete({
      where: { id },
    });
  }
}
