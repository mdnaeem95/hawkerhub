import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { authPlugin } from './plugins/auth.plugin';
import { authRoutes } from './modules/auth/auth.controller';
import dotenv from 'dotenv';
import { authModule } from './modules/auth/auth.module';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true
    });
    
    await fastify.register(helmet);
    
    // Register auth plugin (this adds JWT and authenticate decorator)
    await fastify.register(authModule, { prefix: '/api' });
    
    // Start server
    await fastify.listen({ 
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0' 
    });
    
    console.log('Server running on port', process.env.PORT || 3000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();