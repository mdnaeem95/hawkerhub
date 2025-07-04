import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

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
  // Create order with proper authentication
  fastify.post('/orders', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      
      // Manual validation
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
          table: true
        }
      });

      // TODO: Send notification to stall owner
      // TODO: Generate payment QR if PayNow/GrabPay

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
}