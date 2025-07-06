// apps/api/src/modules/notifications/notification.controller.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notification.service';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

export async function notificationRoutes(fastify: FastifyInstance) {
  // Register push token
  fastify.post('/notifications/register', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, platform } = request.body as { token: string; platform: string };
      const userId = request.user?.id;
      const userType = request.user?.userType;

      if (!token || !userId) {
        return reply.code(400).send({
          success: false,
          message: 'Token and user ID required'
        });
      }

      // Check if token already exists
      const existingToken = await prisma.pushToken.findUnique({
        where: { token }
      });

      if (existingToken) {
        // Update existing token
        await prisma.pushToken.update({
          where: { token },
          data: {
            userId,
            userType,
            platform,
            isActive: true,
            lastUsed: new Date()
          }
        });
      } else {
        // Create new token
        await prisma.pushToken.create({
          data: {
            token,
            userId,
            userType,
            platform,
            isActive: true
          }
        });
      }

      return reply.send({
        success: true,
        message: 'Push token registered successfully'
      });
    } catch (error: any) {
      console.error('Error registering push token:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to register push token'
      });
    }
  });

  // Unregister push token
  fastify.delete('/notifications/unregister', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = request.body as { token: string };
      
      await prisma.pushToken.update({
        where: { token },
        data: { isActive: false }
      });

      return reply.send({
        success: true,
        message: 'Push token unregistered'
      });
    } catch (error: any) {
      console.error('Error unregistering push token:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to unregister push token'
      });
    }
  });

  // Send test notification
  fastify.post('/notifications/test', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id;
      const userType = request.user?.userType;

      if (!userId) {
        return reply.code(400).send({
          success: false,
          message: 'User ID required'
        });
      }

      await notificationService.sendPushNotification(
        userId,
        '🔔 Test Notification',
        'This is a test notification from HawkerHub!',
        { type: 'test' },
        userType
      );

      return reply.send({
        success: true,
        message: 'Test notification sent'
      });
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  });

  // Get user's notification preferences
  fastify.get('/notifications/preferences', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id;

      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId }
      });

      return reply.send({
        success: true,
        preferences: preferences || {
          orderUpdates: true,
          promotions: true,
          newFeatures: true
        }
      });
    } catch (error: any) {
      console.error('Error getting notification preferences:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get preferences'
      });
    }
  });

  // Update notification preferences
  fastify.put('/notifications/preferences', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id;
      const { orderUpdates, promotions, newFeatures } = request.body as any;

      const preferences = await prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          orderUpdates,
          promotions,
          newFeatures
        },
        create: {
          userId,
          orderUpdates: orderUpdates ?? true,
          promotions: promotions ?? true,
          newFeatures: newFeatures ?? true
        }
      });

      return reply.send({
        success: true,
        preferences
      });
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to update preferences'
      });
    }
  });
}