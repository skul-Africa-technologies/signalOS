import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
}));

export const squadConfig = registerAs('squad', () => ({
  secretKey: process.env.SQUAD_SECRET_KEY,
  publicKey: process.env.SQUAD_PUBLIC_KEY,
  redirectUrl: process.env.SQUAD_REDIRECT_URL,
  webhookUrl: process.env.SQUAD_WEBHOOK_URL,
  env: process.env.SQUAD_ENV ?? 'sandbox',
}));
