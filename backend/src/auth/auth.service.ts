import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('El usuario no está activo');
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      throw new InternalServerErrorException(
        'La configuración de autenticación no está disponible',
      );
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
      },
      {
        secret,
        expiresIn: '1h',
      },
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
