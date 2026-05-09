import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  SQUAD_SECRET_KEY: Joi.string().default(''),
  SQUAD_PUBLIC_KEY: Joi.string().default(''),
  SQUAD_REDIRECT_URL: Joi.string().uri().default('https://localhost/redirect'),
  SQUAD_WEBHOOK_URL: Joi.string().uri().default('https://localhost/webhook'),
  SQUAD_ENV: Joi.string().valid('sandbox', 'production').default('sandbox'),
});
