import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { ScreensService } from './screens.service';
import { HistoryService } from '../history/history.service';
import { EventsGateway } from '../events/events.gateway';
import { JwtService } from '@nestjs/jwt';
import { getUserIdFromRequest } from '../auth/get-user-id';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../auth/permissions.guard';
import { PERMISSIONS } from '../auth/permissions';

import { Public } from '../auth/public.decorator';

@ApiTags('screens')
@ApiBearerAuth()
@Controller('screens')
export class ScreensController {
  constructor(
    private readonly screensService: ScreensService,
    private readonly historyService: HistoryService,
    private readonly jwtService: JwtService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Create a new screen' })
  async create(@Body() dto: CreateScreenDto, @Req() req: Request) {
    const result = await this.screensService.create(dto);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Pantalla creada: "${dto.name}" (código: ${dto.code})` });
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all screens' })
  async findAll() {
    const screens = await this.screensService.findAll();
    // Live presence from the socket gateway: how many TVs are showing this screen right now.
    return screens.map((s) => ({ ...s, connected: this.eventsGateway.connectedCount(s.code) }));
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: 'Get screen by code' })
  findByCode(@Param('code') code: string) {
    return this.screensService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get screen by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Update screen' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScreenDto, @Req() req: Request) {
    const result = await this.screensService.update(id, dto);
    const userid = getUserIdFromRequest(req, this.jwtService);
    const keys = Object.keys(dto ?? {});
    if (keys.length === 1 && keys[0] === 'muted') {
      // Sound toggle only: push it live, no reload needed.
      await this.historyService.create({ userid, action: `Pantalla "${result.name}" ${result.muted ? 'silenciada' : 'con sonido'} (ID: ${id})` });
      this.eventsGateway.setMutedByCode(result.code, result.muted);
      return result;
    }
    await this.historyService.create({ userid, action: `Pantalla actualizada: "${result.name}" (ID: ${id})` });
    // Tell any TV client linked to this screen to reload so it picks up the new config/playlist.
    this.eventsGateway.reloadScreensByCode(result.code);
    return result;
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Delete screen' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const screen = await this.screensService.findOne(id);
    const result = await this.screensService.remove(id);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Pantalla eliminada: "${(screen as any).name}" (ID: ${id})` });
    return result;
  }
}
