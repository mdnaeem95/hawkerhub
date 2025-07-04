import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service';

const SendOTPSchema = z.object({
  phoneNumber: z.string().regex(/^[689]\d{7}$/),
  userType: z.enum(['customer', 'vendor'])
});

const VerifyOTPSchema = z.object({
  phoneNumber: z.string().regex(/^[689]\d{7}$/),
  otp: z.string().length(6),
  userType: z.enum(['customer', 'vendor'])
});

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // Send OTP endpoint
  fastify.post('/auth/send-otp', {
    schema: {
      body: SendOTPSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { phoneNumber, userType } = request.body as z.infer<typeof SendOTPSchema>;
      const result = await authService.sendOTP(phoneNumber, userType);
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(400).send({ 
        success: false, 
        message: error.message 
      });
    }
  });

  // Verify OTP endpoint
  fastify.post('/auth/verify-otp', {
    schema: {
      body: VerifyOTPSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { phoneNumber, otp, userType } = request.body as z.infer<typeof VerifyOTPSchema>;
      const result = await authService.verifyOTP(phoneNumber, otp, userType);
      return reply.code(200).send({
        success: true,
        ...result
      });
    } catch (error: any) {
      return reply.code(401).send({ 
        success: false, 
        message: error.message 
      });
    }
  });

  // Get current user - Note: authenticate middleware is applied in preHandler
  fastify.get('/auth/me', {
    preHandler: [fastify.authenticate] // Changed from preHandler to onRequest
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      user: request.user
    });
  });
}