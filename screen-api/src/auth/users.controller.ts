import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (without password hashes)' })
  findAll() {
    return this.authService.findAll();
  }
}
