import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HistoryService } from '../history/history.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public, BootstrapPublic } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly historyService: HistoryService,
  ) {}

  @Post('register')
  @BootstrapPublic()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new user (no token needed only while no user exists)' })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    await this.historyService.create({
      userid: result.user.id,
      action: `Usuario registrado: ${registerDto.name} (${registerDto.user})`,
    });
    return result;
  }

  @Post('login')
  @Public()
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
