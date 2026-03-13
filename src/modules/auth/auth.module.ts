import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import ms from 'ms';
import { User } from '../../entities/user.entity.js';
import { Website } from '../../entities/website.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Website]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret') || 'fallback-secret',
        signOptions: {
          expiresIn: config.get<ms.StringValue>('app.jwtExpiry') || '24h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, ApiKeyGuard],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard, JwtModule],
})
export class AuthModule {}
