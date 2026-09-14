import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { HistoryService } from './history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('history')
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a history entry' })
  create(@Body() createHistoryDto: CreateHistoryDto) {
    return this.historyService.create(createHistoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all history' })
  findAll() {
    return this.historyService.findAll();
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get history by user ID' })
  findByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.historyService.findByUserId(id);
  }
}
