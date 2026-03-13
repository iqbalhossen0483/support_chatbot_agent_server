import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity.js';
import { Website } from '../../entities/website.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Website]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret') || 'fallback-secret',
        signOptions: { expiresIn: (config.get<string>('app.jwtExpiry') || '24h') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, ApiKeyGuard],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard, JwtModule],
})
export class AuthModule {}
