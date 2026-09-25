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
  @ApiOperation({ summary: 'Create a new screen' })
  async create(@Body() dto: CreateScreenDto, @Req() req: Request) {
    const result = await this.screensService.create(dto);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Pantalla creada: "${dto.name}" (código: ${dto.code})` });
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all screens' })
  findAll() {
    return this.screensService.findAll();
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
  @ApiOperation({ summary: 'Update screen' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScreenDto, @Req() req: Request) {
    const result = await this.screensService.update(id, dto);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Pantalla actualizada: "${result.name}" (ID: ${id})` });
    // Tell any TV client linked to this screen to reload so it picks up the new config/playlist.
    this.eventsGateway.reloadScreensByCode(result.code);
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete screen' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const screen = await this.screensService.findOne(id);
    const result = await this.screensService.remove(id);
    const userid = getUserIdFromRequest(req, this.jwtService);
    await this.historyService.create({ userid, action: `Pantalla eliminada: "${(screen as any).name}" (ID: ${id})` });
    return result;
  }
}
