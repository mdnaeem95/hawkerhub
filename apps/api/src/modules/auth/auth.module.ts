// apps/api/src/modules/auth/auth.module.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { z } from 'zod';
import { AuthService } from './auth.service';

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

export async function authModule(fastify: FastifyInstance) {
  // JWT setup
  await fastify.register(fastifyJwt as any, {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  });

  // Decorate authenticate
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      // The decoded token should now be in request.user automatically
      console.log('Authenticated user:', request.user);
      
      if (!request.user) {
        console.error('No user found after JWT verification');
        return reply.code(401).send({ 
          success: false,
          message: 'Authentication failed - no user data' 
        });
      }
    } catch (err) {
      console.error('Authentication failed:', err);
      reply.code(401).send({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }
  });

  // Zod schemas
  const SendOTPSchema = z.object({
    phoneNumber: z.string().regex(/^[689]\d{7}$/),
    userType: z.enum(['customer', 'vendor']),
  });

  const VerifyOTPSchema = z.object({
    phoneNumber: z.string().regex(/^[689]\d{7}$/),
    otp: z.string().length(6),
    userType: z.enum(['customer', 'vendor']),
  });

  const authService = new AuthService();

  // Routes
  fastify.post('/auth/send-otp', async (request, reply) => {
    try {
      const { phoneNumber, userType } = request.body as z.infer<typeof SendOTPSchema>;
      const result = await authService.sendOTP(phoneNumber, userType);
      return reply.send(result);
    } catch (error: any) {
      return reply.code(400).send({ 
        success: false, 
        message: error.message 
      });
    }
  });

  fastify.post('/auth/verify-otp', async (request, reply) => {
    try {
      const { phoneNumber, otp, userType } = request.body as z.infer<typeof VerifyOTPSchema>;
      const result = await authService.verifyOTP(phoneNumber, otp, userType);
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      return reply.code(401).send({ 
        success: false, 
        message: error.message 
      });
    }
  });

  fastify.get('/auth/me', {
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    console.log('Auth/me - request.user:', request.user);
    return reply.send({ 
      success: true, 
      user: request.user 
    });
  });

  // Debug endpoint
  fastify.get('/auth/debug', {
    preHandler: async (request, reply) => {
      console.log('[Debug] Headers:', request.headers);
      console.log('[Debug] Authorization:', request.headers.authorization);
      
      try {
        await request.jwtVerify();
        console.log('[Debug] JWT verified successfully');
        console.log('[Debug] request.user after verify:', request.user);
      } catch (err: any) {
        console.error('[Debug] JWT verify failed:', err);
        return reply.code(401).send({ 
          success: false, 
          message: 'JWT verification failed',
          error: err.message 
        });
      }
    }
  }, async (request, reply) => {
    return reply.send({ 
      success: true,
      message: 'Debug endpoint',
      user: request.user,
      jwtPayload: (request as any).jwtPayload,
      decodedToken: (request as any).decodedToken
    });
  });
}