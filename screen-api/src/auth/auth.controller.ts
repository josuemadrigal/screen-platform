import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HistoryService } from '../history/history.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly historyService: HistoryService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    await this.historyService.create({
      userid: result.user.id,
      action: `Usuario registrado: ${registerDto.name} (${registerDto.user})`,
    });
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    await this.historyService.create({
      userid: result.user.id,
      action: `Inicio de sesión: ${result.user.name}`,
    });
    return result;
  }
}
