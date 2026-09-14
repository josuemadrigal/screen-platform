import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { PlaylistsService } from './playlists.service';
import { HistoryService } from '../history/history.service';
import { EventsGateway } from '../events/events.gateway';
import { JwtService } from '@nestjs/jwt';
import { getUserIdFromRequest } from '../auth/get-user-id';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('playlists')
@Controller('playlists')
export class PlaylistsController {
  constructor(
    private readonly playlistsService: PlaylistsService,
    private readonly historyService: HistoryService,
    private readonly jwtService: JwtService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new playlist' })
  async create(@Body() dto: CreatePlaylistDto, @Req() req: Request) {
    const result = await this.playlistsService.create(dto);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Playlist creada: "${dto.playlistname}"` });
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all playlists' })
  findAll() {
    return this.playlistsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get playlist by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.playlistsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update playlist' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlaylistDto, @Req() req: Request) {
    const previous = await this.playlistsService.findOne(id);
    const result = await this.playlistsService.update(id, dto);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Playlist actualizada: "${result.playlistname}" (ID: ${id})` });
    // Reload every TV client whose screen uses this playlist (matched by id, old name or new name).
    const codes = await this.playlistsService.findScreenCodesUsingPlaylist(id, [
      previous?.playlist?.playlistname,
      result.playlistname,
    ]);
    for (const code of codes) this.eventsGateway.reloadScreensByCode(code);
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete playlist' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const playlist = await this.playlistsService.findOne(id);
    const result = await this.playlistsService.remove(id);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Playlist eliminada: "${playlist.playlist.playlistname}" (ID: ${id})` });
    return result;
  }
}
