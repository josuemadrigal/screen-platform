import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { HistoryService } from '../history/history.service';
import { RequirePermission } from '../auth/permissions.guard';
import { AuthUser, PERMISSIONS } from '../auth/permissions';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly historyService: HistoryService,
  ) {}

  @Get('permissions')
  @RequirePermission(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Permission catalogue' })
  permissions() {
    return this.rolesService.listPermissions();
  }

  @Get('roles')
  @RequirePermission(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'List roles with their permissions and user counts' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('roles/:id')
  @RequirePermission(PERMISSIONS.USERS_VIEW)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Post('roles')
  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Create a role' })
  async create(@Body() dto: CreateRoleDto, @Req() req: Request) {
    const result = await this.rolesService.create(dto);
    await this.historyService.create({ userid: (req.user as AuthUser).id, action: `Rol creado: "${result.name}"` });
    return result;
  }

  @Patch('roles/:id')
  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Rename a role or replace its permissions' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto, @Req() req: Request) {
    const result = await this.rolesService.update(id, dto);
    await this.historyService.create({ userid: (req.user as AuthUser).id, action: `Rol actualizado: "${result.name}" (ID: ${id})` });
    return result;
  }

  @Delete('roles/:id')
  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Delete a role with no users' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const result = await this.rolesService.remove(id);
    await this.historyService.create({ userid: (req.user as AuthUser).id, action: `Rol eliminado: "${result.name}" (ID: ${id})` });
    return result;
  }
}
