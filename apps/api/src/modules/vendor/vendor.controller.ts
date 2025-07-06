// apps/api/src/modules/vendor/vendor.controller.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function vendorRoutes(fastify: FastifyInstance) {
  // Get vendor profile
  fastify.get('/vendor/profile', {
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

      const vendor = await prisma.stallOwner.findUnique({
        where: { id: vendorId },
        include: { 
          stall: {
            include: {
              hawker: true
            }
          } 
        }
      });

      if (!vendor?.stall) {
        return reply.code(404).send({
          success: false,
          message: 'Vendor stall not found'
        });
      }

      return reply.send({
        success: true,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
          phoneNumber: vendor.phoneNumber
        },
        stall: {
          id: vendor.stall.id,
          name: vendor.stall.name,
          phoneNumber: vendor.stall.phoneNumber,
          isActive: vendor.stall.isActive,
          hawkerName: vendor.stall.hawker.name
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch vendor profile' 
      });
    }
  });

  // Update vendor profile
  fastify.patch('/vendor/profile', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      const { phoneNumber } = request.body as { phoneNumber?: string };

      if (!vendorId || request.user?.userType !== 'vendor') {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized - vendor access only'
        });
      }

      // Update vendor phone number
      if (phoneNumber) {
        await prisma.stallOwner.update({
          where: { id: vendorId },
          data: { phoneNumber }
        });

        // Also update stall phone number
        const vendor = await prisma.stallOwner.findUnique({
          where: { id: vendorId }
        });

        if (vendor) {
          await prisma.stall.update({
            where: { id: vendor.stallId },
            data: { phoneNumber }
          });
        }
      }

      return reply.send({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to update profile' 
      });
    }
  });

  // Toggle stall status
  fastify.patch('/vendor/stall/status', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      const { isActive } = request.body as { isActive: boolean };

      if (!vendorId || request.user?.userType !== 'vendor') {
        return reply.code(403).send({
          success: false,
          message: 'Unauthorized - vendor access only'
        });
      }

      const vendor = await prisma.stallOwner.findUnique({
        where: { id: vendorId }
      });

      if (!vendor) {
        return reply.code(404).send({
          success: false,
          message: 'Vendor not found'
        });
      }

      const updatedStall = await prisma.stall.update({
        where: { id: vendor.stallId },
        data: { isActive }
      });

      return reply.send({
        success: true,
        stall: updatedStall
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to update stall status' 
      });
    }
  });

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

  // Get vendor's menu items
  fastify.get('/vendor/menu', {
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

      // Get menu items for the vendor's stall
      const menuItems = await prisma.menuItem.findMany({
        where: { stallId: vendor.stall.id },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      return reply.send({
        success: true,
        menu: menuItems.map(item => ({
          ...item,
          price: Number(item.price)
        }))
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch menu items' 
      });
    }
  });

  // Add new menu item
  fastify.post('/vendor/menu', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      const { name, nameZh, nameMy, nameTa, description, price, category, imageUrl } = request.body as any;
      
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

      // Create menu item
      const menuItem = await prisma.menuItem.create({
        data: {
          stallId: vendor.stall.id,
          name,
          nameZh,
          nameMy,
          nameTa,
          description,
          price,
          category,
          imageUrl,
          isAvailable: true
        }
      });

      return reply.send({
        success: true,
        menuItem: {
          ...menuItem,
          price: Number(menuItem.price)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to create menu item' 
      });
    }
  });

  // Update menu item
  fastify.put('/vendor/menu/:itemId', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      const { itemId } = request.params as { itemId: string };
      const { name, nameZh, nameMy, nameTa, description, price, category, imageUrl } = request.body as any;
      
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

      // Verify menu item belongs to vendor's stall
      const existingItem = await prisma.menuItem.findFirst({
        where: {
          id: itemId,
          stallId: vendor.stall.id
        }
      });

      if (!existingItem) {
        return reply.code(404).send({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Update menu item
      const updatedItem = await prisma.menuItem.update({
        where: { id: itemId },
        data: {
          name,
          nameZh,
          nameMy,
          nameTa,
          description,
          price,
          category,
          imageUrl
        }
      });

      return reply.send({
        success: true,
        menuItem: {
          ...updatedItem,
          price: Number(updatedItem.price)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to update menu item' 
      });
    }
  });

  // Delete menu item
  fastify.delete('/vendor/menu/:itemId', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      const { itemId } = request.params as { itemId: string };
      
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

      // Verify menu item belongs to vendor's stall
      const existingItem = await prisma.menuItem.findFirst({
        where: {
          id: itemId,
          stallId: vendor.stall.id
        }
      });

      if (!existingItem) {
        return reply.code(404).send({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Delete menu item
      await prisma.menuItem.delete({
        where: { id: itemId }
      });

      return reply.send({
        success: true,
        message: 'Menu item deleted successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to delete menu item' 
      });
    }
  });

  // Toggle menu item availability
  fastify.patch('/vendor/menu/:itemId/availability', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      const { itemId } = request.params as { itemId: string };
      const { isAvailable } = request.body as { isAvailable: boolean };
      
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

      // Verify menu item belongs to vendor's stall
      const existingItem = await prisma.menuItem.findFirst({
        where: {
          id: itemId,
          stallId: vendor.stall.id
        }
      });

      if (!existingItem) {
        return reply.code(404).send({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Update availability
      const updatedItem = await prisma.menuItem.update({
        where: { id: itemId },
        data: { isAvailable }
      });

      return reply.send({
        success: true,
        menuItem: {
          ...updatedItem,
          price: Number(updatedItem.price)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to update item availability' 
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