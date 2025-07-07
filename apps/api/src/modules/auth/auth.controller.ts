// apps/api/src/modules/auth/auth.controller.ts
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
  userType: z.enum(['customer', 'vendor']),
  name: z.string().optional()
});

const CheckPhoneSchema = z.object({
  phoneNumber: z.string().regex(/^[689]\d{7}$/),
  userType: z.enum(['customer', 'vendor'])
});

// Type definitions
type SendOTPBody = z.infer<typeof SendOTPSchema>;
type VerifyOTPBody = z.infer<typeof VerifyOTPSchema>;
type CheckPhoneBody = z.infer<typeof CheckPhoneSchema>;

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // Check if phone exists - using plain Fastify validation
  fastify.post<{ Body: CheckPhoneBody }>('/auth/check-phone', {
    schema: {
      body: {
        type: 'object',
        required: ['phoneNumber', 'userType'],
        properties: {
          phoneNumber: { 
            type: 'string', 
            pattern: '^[689]\\d{7}$' 
          },
          userType: { 
            type: 'string', 
            enum: ['customer', 'vendor'] 
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Manual validation with Zod
      const validatedData = CheckPhoneSchema.parse(request.body);
      const result = await authService.checkPhoneExists(validatedData.phoneNumber, validatedData.userType);
      return reply.send({ success: true, exists: result.exists });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        });
      }
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Send OTP endpoint
  fastify.post<{ Body: SendOTPBody }>('/auth/send-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['phoneNumber', 'userType'],
        properties: {
          phoneNumber: { 
            type: 'string', 
            pattern: '^[689]\\d{7}$' 
          },
          userType: { 
            type: 'string', 
            enum: ['customer', 'vendor'] 
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const validatedData = SendOTPSchema.parse(request.body);
      const result = await authService.sendOTP(validatedData.phoneNumber, validatedData.userType);
      return reply.code(200).send(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        });
      }
      return reply.code(400).send({ 
        success: false, 
        message: error.message 
      });
    }
  });

  // Verify OTP endpoint
  fastify.post<{ Body: VerifyOTPBody }>('/auth/verify-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['phoneNumber', 'otp', 'userType'],
        properties: {
          phoneNumber: { 
            type: 'string', 
            pattern: '^[689]\\d{7}$' 
          },
          otp: { 
            type: 'string', 
            pattern: '^\\d{6}$' 
          },
          userType: { 
            type: 'string', 
            enum: ['customer', 'vendor'] 
          },
          name: { 
            type: 'string',
            nullable: true 
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const validatedData = VerifyOTPSchema.parse(request.body);
      const result = await authService.verifyOTP(
        validatedData.phoneNumber, 
        validatedData.otp, 
        validatedData.userType, 
        validatedData.name
      );
      return reply.code(200).send({
        success: true,
        ...result
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        });
      }
      return reply.code(401).send({ 
        success: false, 
        message: error.message 
      });
    }
  });

  // Get current user
  fastify.get('/auth/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return reply.send({
      success: true,
      user: request.user
    });
  });
}