// apps/api/src/modules/orders/orders.controller.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { emitNewOrder, emitOrderUpdate } from '../../plugins/socket.plugin';

const prisma = new PrismaClient();

const CreateOrderSchema = z.object({
  tableId: z.string(),
  stallId: z.string(),
  paymentMode: z.enum(['CASH', 'PAYNOW', 'GRABPAY', 'PAYLAH']),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().positive(),
    specialInstructions: z.string().optional(),
  })).min(1),
  totalAmount: z.number().positive(),
});

export async function orderRoutes(fastify: FastifyInstance) {
  // Create order
  fastify.post('/orders', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      
      // Validation
      if (!body.tableId || !body.stallId || !body.paymentMode || !body.items || !body.totalAmount) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields'
        });
      }
      
      if (!['CASH', 'PAYNOW', 'GRABPAY', 'PAYLAH'].includes(body.paymentMode)) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid payment mode'
        });
      }
      
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'Items must be a non-empty array'
        });
      }
      
      const { tableId, stallId, paymentMode, items, totalAmount } = body;
      const customerId = request.user?.id;

      // Generate order number
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNumber = `${dateStr}${random}`;

      // Get actual table ID from table number
      const table = await prisma.table.findFirst({
        where: { 
          number: tableId,
          hawker: {
            stalls: {
              some: { id: stallId }
            }
          }
        }
      });

      if (!table) {
        return reply.code(400).send({ 
          success: false, 
          message: 'Invalid table or stall combination' 
        });
      }

      // Create order with items
      const order = await prisma.order.create({
        data: {
          orderNumber,
          tableId: table.id,
          stallId,
          customerId,
          status: 'PENDING',
          totalAmount,
          paymentMode,
          items: {
            create: await Promise.all(items.map(async (item: any) => {
              const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId }
              });
              
              if (!menuItem) {
                throw new Error(`Menu item ${item.menuItemId} not found`);
              }

              return {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                price: menuItem.price,
                specialInstructions: item.specialInstructions,
              };
            }))
          }
        },
        include: {
          items: {
            include: {
              menuItem: true
            }
          },
          stall: true,
          table: {
            include: {
              hawker: true
            }
          }
        }
      });

      // Try to emit socket event
      try {
        if (fastify.io) {
          emitNewOrder(fastify.io, order);
        }
      } catch (socketError) {
        fastify.log.error('Socket emission error:', socketError);
      }

      return reply.send({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: Number(order.totalAmount),
        },
        message: 'Order placed successfully'
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: error.message || 'Failed to create order' 
      });
    }
  });

  // Get customer orders
  fastify.get('/orders/my-orders', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const customerId = request.user?.id;

      if (!customerId) {
        return reply.code(401).send({
          success: false,
          message: 'User not authenticated'
        });
      }

      const orders = await prisma.order.findMany({
        where: { customerId },
        include: {
          items: {
            include: {
              menuItem: true
            }
          },
          stall: true,
          table: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return reply.send({
        success: true,
        orders: orders.map(order => ({
          ...order,
          totalAmount: Number(order.totalAmount),
          items: order.items.map(item => ({
            ...item,
            price: Number(item.price)
          }))
        }))
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch orders' 
      });
    }
  });

  // Update order status
  fastify.patch('/orders/:orderId/status', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      const { status } = request.body as { status: string };
      const userId = request.user?.id;

      console.log('[Orders] Update status request:', { orderId, status, userId });

      // Validate status
      const validStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
      if (!status || !validStatuses.includes(status)) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }

      // Get the order first
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

      // Check permissions
      const isCustomer = order.customerId === userId;
      const isStallOwner = order.stall.owner?.id === userId;

      console.log('[Orders] Permission check:', { 
        isCustomer, 
        isStallOwner, 
        customerId: order.customerId,
        stallOwnerId: order.stall.owner?.id 
      });

      if (!isCustomer && !isStallOwner) {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized to update this order'
        });
      }

      // Customers can only mark as COMPLETED
      if (isCustomer && status !== 'COMPLETED') {
        return reply.code(403).send({
          success: false,
          message: 'Customers can only mark orders as completed'
        });
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: status as any,
          updatedAt: new Date()
        },
        include: {
          items: {
            include: {
              menuItem: true
            }
          },
          stall: true,
          table: {
            include: {
              hawker: true
            }
          },
          customer: true
        }
      });

      // Try to emit socket event
      try {
        if (fastify.io) {
          emitOrderUpdate(fastify.io, updatedOrder);
        }
      } catch (socketError) {
        console.error('[Orders] Socket emission error:', socketError);
      }

      console.log('[Orders] Order status updated successfully');

      return reply.send({
        success: true,
        order: {
          ...updatedOrder,
          totalAmount: Number(updatedOrder.totalAmount),
          items: updatedOrder.items.map(item => ({
            ...item,
            price: Number(item.price)
          }))
        }
      });
    } catch (error) {
      fastify.log.error('[Orders] Status update error:', error);
      console.error('[Orders] Full error:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to update order status'
      });
    }
  });
}