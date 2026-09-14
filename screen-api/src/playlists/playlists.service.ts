import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

@Injectable()
export class PlaylistsService {
  constructor(private prisma: PrismaService) {}

  async create(createPlaylistDto: CreatePlaylistDto) {
    return this.prisma.playlist.create({
      data: createPlaylistDto,
    });
  }

  async findAll() {
    return this.prisma.playlist.findMany();
  }

  async findOne(id: number) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
    });
    if (!playlist) throw new NotFoundException(`Playlist with ID ${id} not found`);

    // Get videos data
    let videosData = [];
    if (playlist.videos) {
      const videoIds = playlist.videos.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (videoIds.length > 0) {
        videosData = await this.prisma.video.findMany({
          where: {
            id: { in: videoIds },
            status: 1,
          }
        });
        
        // Sort videos according to the order in the playlist.videos string
        videosData.sort((a, b) => videoIds.indexOf(a.id) - videoIds.indexOf(b.id));
      }
    }

    const screensCount = await this.prisma.screen.count({
      where: { playlist: String(id) },
    });

    return {
      playlist,
      videosData,
      screensCount,
    };
  }

  async update(id: number, updatePlaylistDto: UpdatePlaylistDto) {
    return this.prisma.playlist.update({
      where: { id },
      data: updatePlaylistDto,
    });
  }

  /**
   * Codes of the screens that use this playlist. Screens may reference a playlist
   * either by its numeric id or by its name, so both forms are matched.
   */
  async findScreenCodesUsingPlaylist(id: number, names: string[]): Promise<string[]> {
    const references = [String(id), ...names.filter((name) => !!name)];
    const screens = await this.prisma.screen.findMany({
      where: { playlist: { in: references } },
      select: { code: true },
    });
    return screens.map((screen) => screen.code);
  }

  async remove(id: number) {
    return this.prisma.playlist.delete({
      where: { id },
    });
  }
}
