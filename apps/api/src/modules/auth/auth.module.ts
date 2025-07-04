// apps/api/src/modules/auth/auth.module.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { z } from 'zod';
import { AuthService } from './auth.service';
import fromZodSchema from 'zod-to-json-schema';

export async function authModule(fastify: FastifyInstance) {
  // JWT setup
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  });

  // Decorate authenticate
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
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
  fastify.post('/auth/send-otp', {
    schema: { body: fromZodSchema(SendOTPSchema) },
  }, async (request, reply) => {
    const { phoneNumber, userType } = request.body as z.infer<typeof SendOTPSchema>;
    const result = await authService.sendOTP(phoneNumber, userType);
    return reply.send(result);
  });

  fastify.post('/auth/verify-otp', {
    schema: { body: fromZodSchema(VerifyOTPSchema) },
  }, async (request, reply) => {
    const { phoneNumber, otp, userType } = request.body as z.infer<typeof VerifyOTPSchema>;
    const result = await authService.verifyOTP(phoneNumber, otp, userType);
    return reply.send({ success: true, ...result });
  });

  fastify.get('/auth/me', {
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    return reply.send({ success: true, user: request.user });
  });
}
