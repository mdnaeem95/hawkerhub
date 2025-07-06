// apps/api/src/modules/payments/payment.controller.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SGQRService } from './sgqr.service';
import { PrismaClient } from '@prisma/client';

const sgqrService = new SGQRService();
const prisma = new PrismaClient();

export async function paymentRoutes(fastify: FastifyInstance) {
  // Generate payment QR for an order
  fastify.get('/payments/qr/:orderId', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      const userId = request.user?.id;

      // Verify user owns this order or is the vendor
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          stall: {
            include: { owner: true }
          }
        }
      });

      if (!order) {
        return reply.code(404).send({
          success: false,
          message: 'Order not found'
        });
      }

      const isCustomer = order.customerId === userId;
      const isVendor = order.stall.owner?.id === userId;

      if (!isCustomer && !isVendor) {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized to view payment QR'
        });
      }

      // Generate QR code
      const { qrDataUrl, qrString } = await sgqrService.generatePaymentQR(orderId);

      return reply.send({
        success: true,
        qrCode: qrDataUrl,
        qrString,
        amount: Number(order.totalAmount),
        orderNumber: order.orderNumber,
        merchantName: order.stall.name
      });
    } catch (error: any) {
      fastify.log.error('Payment QR generation error:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to generate payment QR'
      });
    }
  });

  // Check payment status
  fastify.get('/payments/status/:orderId', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      
      const paymentStatus = await sgqrService.checkPaymentStatus(orderId);
      
      return reply.send({
        success: true,
        ...paymentStatus
      });
    } catch (error: any) {
      fastify.log.error('Payment status check error:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to check payment status'
      });
    }
  });

  // Webhook for payment confirmation (called by payment provider)
  fastify.post('/payments/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId, transactionId, status } = request.body as any;
      
      // In production, verify webhook signature here
      
      if (status === 'SUCCESS') {
        await sgqrService.recordPayment(orderId, transactionId);
        
        // Emit socket event for real-time update
        if (fastify.io) {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              stall: true,
              customer: true
            }
          });
          
          if (order) {
            fastify.io.to(`customer:${order.customerId}`).emit('payment:completed', {
              orderId,
              transactionId
            });
            
            fastify.io.to(`stall:${order.stallId}`).emit('payment:completed', {
              orderId,
              transactionId
            });
          }
        }
      }
      
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Payment webhook error:', error);
      return reply.code(500).send({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  });

  // Manual payment confirmation (for cash payments)
  fastify.post('/payments/confirm-cash/:orderId', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      const userId = request.user?.id;
      
      // Only vendors can confirm cash payments
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          stall: {
            include: { owner: true }
          }
        }
      });

      if (!order) {
        return reply.code(404).send({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.stall.owner?.id !== userId) {
        return reply.code(403).send({
          success: false,
          message: 'Only vendors can confirm cash payments'
        });
      }

      if (order.paymentMode !== 'CASH') {
        return reply.code(400).send({
          success: false,
          message: 'This order is not a cash payment'
        });
      }

      // Record cash payment
      await sgqrService.recordPayment(orderId, `CASH-${Date.now()}`);
      
      return reply.send({
        success: true,
        message: 'Cash payment confirmed'
      });
    } catch (error: any) {
      fastify.log.error('Cash payment confirmation error:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to confirm cash payment'
      });
    }
  });
}