// apps/api/src/index.ts - UPDATED VERSION
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';
import fastifyJwt from '@fastify/jwt';
import { socketPlugin } from './plugins/socket.plugin';
import { authRoutes } from './modules/auth/auth.controller';
import { stallRoutes } from './modules/stalls/stalls.controller';
import { hawkerRoutes } from './modules/hawkers/hawker.controller';
import { orderRoutes } from './modules/orders/orders.controller';
import { vendorRoutes } from './modules/vendor/vendor.controller';
import { paymentRoutes } from './modules/payments/payment.controller';
import { notificationRoutes } from './modules/notifications/notification.controller';

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

    // REMOVE THE MANUAL AUTH ROUTES AND USE authRoutes INSTEAD
    // Register all routes with shared context
    await fastify.register(async function (fastify) {
      // Register auth routes from controller
      await fastify.register(authRoutes, { prefix: '/api' });
      
      // Register other routes
      await fastify.register(stallRoutes, { prefix: '/api' });
      await fastify.register(hawkerRoutes, { prefix: '/api' });
      await fastify.register(orderRoutes, { prefix: '/api' });
      await fastify.register(vendorRoutes, { prefix: '/api' });
      await fastify.register(paymentRoutes, { prefix: '/api' });
      await fastify.register(notificationRoutes, { prefix: '/api' });
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