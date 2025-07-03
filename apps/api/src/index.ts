import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@hawkerhub/database';

const prisma = new PrismaClient();

async function buildApp() {
  const fastify = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://admin.hawkerhub.sg', 'https://hawkerhub.sg']
      : true,
  });

  await fastify.register(helmet);
  
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
  });

  // Health check
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };
  });

  // Database check
  fastify.get('/health/db', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      return { status: 'error', database: 'disconnected' };
    }
  });

  return fastify;
}

async function start() {
  const app = await buildApp();
  
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();