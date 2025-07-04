import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';

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

export async function authPlugin(fastify: FastifyInstance) {
  // Register JWT plugin
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this'
  });

  // Add authenticate decorator
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}