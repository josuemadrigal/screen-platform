import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { HistoryService } from '../history/history.service';
import { RequirePermission } from '../auth/permissions.guard';
import { AuthUser, PERMISSIONS } from '../auth/permissions';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly historyService: HistoryService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user with role, permissions and presence' })
  me(@Req() req: Request) {
    return this.usersService.findOne((req.user as AuthUser).id);
  }

  @Get()
  @RequirePermission(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'List users with role, last login, last seen and online flag' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Get one user' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Update name, email, role or status' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @Req() req: Request) {
    const actor = req.user as AuthUser;
    const result = await this.usersService.update(id, dto, actor);
    await this.historyService.create({ userid: actor.id, action: `Usuario actualizado: ${result.name} (ID: ${id})` });
    return result;
  }

  /** Own password (current password required) or, with users.manage, anyone's. */
  @Patch(':id/password')
  @ApiOperation({ summary: 'Change a password: own (with current password) or, with users.manage, any user' })
  async changePassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangePasswordDto, @Req() req: Request) {
    const actor = req.user as AuthUser;
    const result = await this.usersService.changePassword(id, dto, actor);
    await this.historyService.create({
      userid: actor.id,
      action: actor.id === id ? 'Cambió su contraseña' : `Restableció la contraseña del usuario ID ${id}`,
    });
    return result;
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Delete a user (not yourself)' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const actor = req.user as AuthUser;
    const result = await this.usersService.remove(id, actor);
    await this.historyService.create({ userid: actor.id, action: `Usuario eliminado: ${result.name} (ID: ${id})` });
    return result;
  }
}
