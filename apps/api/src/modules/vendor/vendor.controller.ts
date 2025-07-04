// apps/api/src/modules/vendor/vendor.controller.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function vendorRoutes(fastify: FastifyInstance) {
  // Get vendor's orders
  fastify.get('/vendor/orders', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      const userType = request.user?.userType;

      if (!vendorId || userType !== 'vendor') {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized - vendor access only'
        });
      }

      // Get vendor's stall
      const vendor = await prisma.stallOwner.findUnique({
        where: { id: vendorId },
        include: { stall: true }
      });

      if (!vendor?.stall) {
        return reply.code(404).send({
          success: false,
          message: 'Vendor stall not found'
        });
      }

      // Get orders for the vendor's stall
      const orders = await prisma.order.findMany({
        where: { 
          stallId: vendor.stall.id,
          // Optionally filter by date for today's orders
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        include: {
          items: {
            include: {
              menuItem: true
            }
          },
          table: true,
          customer: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          }
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
        message: 'Failed to fetch vendor orders' 
      });
    }
  });

  // Get vendor dashboard stats
  fastify.get('/vendor/dashboard-stats', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      
      if (!vendorId || request.user?.userType !== 'vendor') {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized - vendor access only'
        });
      }

      // Get vendor's stall
      const vendor = await prisma.stallOwner.findUnique({
        where: { id: vendorId },
        include: { stall: true }
      });

      if (!vendor?.stall) {
        return reply.code(404).send({
          success: false,
          message: 'Vendor stall not found'
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's orders
      const todayOrders = await prisma.order.findMany({
        where: {
          stallId: vendor.stall.id,
          createdAt: { gte: today }
        },
        include: {
          items: {
            include: {
              menuItem: true
            }
          }
        }
      });

      // Calculate stats
      const stats = {
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, order) => 
          sum + Number(order.totalAmount), 0
        ),
        pendingOrders: todayOrders.filter(o => o.status === 'PENDING').length,
        completedOrders: todayOrders.filter(o => o.status === 'COMPLETED').length,
        averageOrderValue: todayOrders.length > 0 
          ? todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / todayOrders.length 
          : 0,
        popularItems: getPopularItems(todayOrders)
      };

      return reply.send({
        success: true,
        stats
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch dashboard stats' 
      });
    }
  });
}

function getPopularItems(orders: any[]) {
  const itemCounts = new Map<string, { name: string, count: number }>();
  
  orders.forEach(order => {
    order.items.forEach((item: any) => {
      const key = item.menuItem.id;
      if (itemCounts.has(key)) {
        itemCounts.get(key)!.count += item.quantity;
      } else {
        itemCounts.set(key, {
          name: item.menuItem.name,
          count: item.quantity
        });
      }
    });
  });

  return Array.from(itemCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}