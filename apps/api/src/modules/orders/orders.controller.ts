import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { emitNewOrder, emitOrderUpdate } from '../../plugins/socket.plugin';
import { NotificationService } from '../notifications/notification.service';
import { POSIntegrationService } from '../integrations/pos-adapter.service';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

// Helper functions
function calculateEstimatedReadyTime(order: any): Date {
  const baseTime = new Date();
  const itemCount = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  
  // Base preparation time: 10 minutes + 2 minutes per item
  const prepMinutes = 10 + (itemCount * 2);
  
  baseTime.setMinutes(baseTime.getMinutes() + prepMinutes);
  return baseTime;
}

function generateCollectionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function orderRoutes(fastify: FastifyInstance, options?: { posService?: POSIntegrationService }) {
  const posService = options?.posService;
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

      // Generate collection code
      const collectionCode = generateCollectionCode();

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

      // Calculate estimated ready time
      const estimatedReadyTime = calculateEstimatedReadyTime(order);

      // Enrich order object for response
      const enrichedOrder = {
        ...order,
        estimatedReadyTime,
        collectionCode,
        hawker: order.table.hawker,
        stall: {
          ...order.stall,
          location: `Stall ${order.stall.id.slice(-2)}` // Mock location - in production, this would come from the database
        }
      };

      // Try to emit socket event
      try {
        if (fastify.io) {
          emitNewOrder(fastify.io, enrichedOrder);
        }
      } catch (socketError) {
        fastify.log.error('Socket emission error:', socketError);
      }

      // Send push notification to vendor
      try {
        await notificationService.sendNewOrderNotification(order);
      } catch (notifError) {
        fastify.log.error('Push notification error:', notifError);
      }

      // Push order to POS system if integrated
      if (posService) {
        try {
          await posService.pushOrderToPOS(order.id);
          fastify.log.info(`Order ${order.id} pushed to POS system`);
        } catch (posError) {
          fastify.log.error('POS push error:', posError);
          // Don't fail the order if POS push fails
          // The vendor will still receive WhatsApp/notification
        }
      }

      return reply.send({
        success: true,
        order: {
          id: enrichedOrder.id,
          orderNumber: enrichedOrder.orderNumber,
          status: enrichedOrder.status,
          totalAmount: Number(enrichedOrder.totalAmount),
          estimatedReadyTime: enrichedOrder.estimatedReadyTime,
          collectionCode: enrichedOrder.collectionCode,
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
          table: {
            include: {
              hawker: true  // Include hawker info
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Enrich orders with additional data
      const enrichedOrders = orders.map(order => {
        const estimatedReadyTime = order.status === 'PENDING' || order.status === 'PREPARING' 
          ? calculateEstimatedReadyTime(order) 
          : null;

        return {
          ...order,
          totalAmount: Number(order.totalAmount),
          estimatedReadyTime,
          collectionCode: generateCollectionCode(), // In production, this should be stored in DB
          hawker: order.table.hawker,
          stall: {
            ...order.stall,
            location: `Stall ${order.stall.id.slice(-2)}` // Mock location
          },
          items: order.items.map(item => ({
            ...item,
            price: Number(item.price)
          }))
        };
      });

      return reply.send({
        success: true,
        orders: enrichedOrders
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
          },
          table: {
            include: {
              hawker: true
            }
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

      // Calculate new estimated time if needed
      const estimatedReadyTime = status === 'PENDING' || status === 'PREPARING' 
        ? calculateEstimatedReadyTime(updatedOrder) 
        : null;

      // Enrich the updated order
      const enrichedOrder = {
        ...updatedOrder,
        totalAmount: Number(updatedOrder.totalAmount),
        estimatedReadyTime,
        collectionCode: generateCollectionCode(), // In production, this should be persistent
        hawker: updatedOrder.table.hawker,
        stall: {
          ...updatedOrder.stall,
          location: `Stall ${updatedOrder.stall.id.slice(-2)}`
        },
        items: updatedOrder.items.map(item => ({
          ...item,
          price: Number(item.price)
        }))
      };

      // Try to emit socket event
      try {
        if (fastify.io) {
          emitOrderUpdate(fastify.io, enrichedOrder);
        }
      } catch (socketError) {
        console.error('[Orders] Socket emission error:', socketError);
      }

      // Send push notification for order status update
      try {
        await notificationService.sendOrderStatusNotification(updatedOrder);
      } catch (notifError) {
        console.error('[Orders] Push notification error:', notifError);
      }

      console.log('[Orders] Order status updated successfully');

      return reply.send({
        success: true,
        order: enrichedOrder
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

  // Get order details
  fastify.get('/orders/:orderId', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      const userId = request.user?.id;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              menuItem: true
            }
          },
          stall: {
            include: { owner: true }
          },
          table: {
            include: {
              hawker: true
            }
          },
          customer: true
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

      if (!isCustomer && !isStallOwner) {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized to view this order'
        });
      }

      // Calculate estimated ready time if applicable
      const estimatedReadyTime = order.status === 'PENDING' || order.status === 'PREPARING' 
        ? calculateEstimatedReadyTime(order) 
        : null;

      // Enrich order
      const enrichedOrder = {
        ...order,
        totalAmount: Number(order.totalAmount),
        estimatedReadyTime,
        collectionCode: generateCollectionCode(),
        hawker: order.table.hawker,
        stall: {
          ...order.stall,
          location: `Stall ${order.stall.id.slice(-2)}`
        },
        items: order.items.map(item => ({
          ...item,
          price: Number(item.price)
        }))
      };

      return reply.send({
        success: true,
        order: enrichedOrder
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch order details'
      });
    }
  });
}