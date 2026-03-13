import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '8080', 10),
  env: process.env.APP_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ],
}));
