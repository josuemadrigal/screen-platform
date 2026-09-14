import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, user: username } = registerDto;

    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { user: username }] },
    });
    if (exists) throw new ConflictException('Email or username already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: { email, name, user: username, password: hashedPassword },
    });

    return this.login({ email: username, password });
  }

  async login(loginDto: LoginDto) {
    const { email: emailOrUser, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUser },
          { user: emailOrUser },
        ],
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token: await this.jwtService.signAsync(payload),
    };
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        user: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async validateUser(payload: any) {
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }
}
