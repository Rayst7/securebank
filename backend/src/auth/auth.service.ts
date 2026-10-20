import {
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

 async login(dto: LoginDto) {
  const email = dto.email.trim().toLowerCase();
  const attemptsKey = `auth:failed:${email}`;
  const lockKey = `auth:locked:${email}`;

  try {
    const locked = await this.redis.get(lockKey);

    if (locked) {
      throw new ForbiddenException(
        'Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const passwordValid =
      user !== null &&
      (await bcrypt.compare(dto.password, user.passwordHash));

    if (!passwordValid) {
      const attempts = await this.redis.incr(attemptsKey);

      if (attempts === 1) {
        await this.redis.expire(attemptsKey, 900);
      }

      if (attempts >= 5) {
        await this.redis.set(lockKey, '1', 'EX', 900);
        await this.redis.del(attemptsKey);
      }

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

    await this.redis.del(attemptsKey);

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
  } catch (error) {
    if (
      error instanceof UnauthorizedException ||
      error instanceof ForbiddenException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }

    throw new ServiceUnavailableException(
      'El servicio de autenticación no está disponible temporalmente',
    );
  }
}
}
