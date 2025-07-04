// apps/api/src/index.ts
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';
import fastifyJwt from '@fastify/jwt';
import { socketPlugin } from './plugins/socket.plugin';
import { stallRoutes } from './modules/stalls/stalls.controller';
import { hawkerRoutes } from './modules/hawkers/hawker.controller';
import { orderRoutes } from './modules/orders/orders.controller';
import { vendorRoutes } from './modules/vendor/vendor.controller';
import { AuthService } from './modules/auth/auth.service';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true
});

// JWT type declarations
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      phoneNumber: string;
      userType: 'customer' | 'vendor';
      role: 'customer' | 'vendor';
    };
    user: {
      id: string;
      phoneNumber: string;
      userType: 'customer' | 'vendor';
      role: 'customer' | 'vendor';
    };
  }
}

// Declare authenticate decorator at the root level
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true
    });
    
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Disable for Socket.io
    });
    
    // Register Socket.io plugin
    await fastify.register(socketPlugin);
    
    // Register JWT plugin at the root level
    await fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'your-secret-key'
    });

    // Add authenticate decorator at the root level
    fastify.decorate('authenticate', async function (
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      try {
        await request.jwtVerify();
        console.log('[Auth] JWT verified, user:', request.user);
      } catch (err) {
        console.error('[Auth] JWT verification failed:', err);
        reply.code(401).send({ 
          success: false,
          message: 'Invalid or expired token' 
        });
      }
    });

    // Register auth routes
    const authService = new AuthService();
    
    // Auth routes - without plugin encapsulation
    fastify.post('/api/auth/send-otp', async (request, reply) => {
      try {
        const { phoneNumber, userType } = request.body as any;
        const result = await authService.sendOTP(phoneNumber, userType);
        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ 
          success: false, 
          message: error.message 
        });
      }
    });

    fastify.post('/api/auth/verify-otp', async (request, reply) => {
      try {
        const { phoneNumber, otp, userType } = request.body as any;
        const result = await authService.verifyOTP(phoneNumber, otp, userType);
        return reply.send({ success: true, ...result });
      } catch (error: any) {
        return reply.code(401).send({ 
          success: false, 
          message: error.message 
        });
      }
    });

    fastify.get('/api/auth/me', {
      preHandler: fastify.authenticate,
    }, async (request, reply) => {
      console.log('[Auth/me] request.user:', request.user);
      return reply.send({ 
        success: true, 
        user: request.user 
      });
    });
    
    // Register other routes with shared context
    await fastify.register(async function (fastify) {
      await fastify.register(stallRoutes, { prefix: '/api' });
      await fastify.register(hawkerRoutes, { prefix: '/api' });
      await fastify.register(orderRoutes, { prefix: '/api' });
      await fastify.register(vendorRoutes, { prefix: '/api' });
    });
    
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