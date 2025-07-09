// apps/api/src/modules/directory/directory.controller.ts
// This controller provides read-only access to hawker centers and stalls
// for browsing purposes. Orders can only be placed through QR code scanning.
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const SearchQuerySchema = z.object({
  q: z.string().optional(),
  cuisine: z.string().optional(),
  hawkerId: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

export async function directoryRoutes(fastify: FastifyInstance) {
  // Get all hawker centers
  fastify.get('/directory/hawkers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const hawkers = await prisma.hawker.findMany({
        include: {
          _count: {
            select: {
              stalls: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return reply.send({
        success: true,
        hawkers: hawkers.map(hawker => ({
          id: hawker.id,
          name: hawker.name,
          address: hawker.address,
          imageUrl: hawker.imageUrl,
          activeStallCount: hawker._count.stalls
        }))
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch hawker centers' 
      });
    }
  });

  // Get hawker details with all stalls
  fastify.get('/directory/hawkers/:hawkerId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { hawkerId } = request.params as { hawkerId: string };
      
      const hawker = await prisma.hawker.findUnique({
        where: { id: hawkerId },
        include: {
          stalls: {
            where: { isActive: true },
            include: {
              _count: {
                select: {
                  menu: {
                    where: { isAvailable: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!hawker) {
        return reply.code(404).send({
          success: false,
          message: 'Hawker center not found'
        });
      }

      // Get unique cuisines from stalls
      const cuisines = new Set<string>();
      for (const stall of hawker.stalls) {
        const menuItems = await prisma.menuItem.findMany({
          where: { stallId: stall.id },
          select: { category: true }
        });
        menuItems.forEach(item => cuisines.add(item.category));
      }

      return reply.send({
        success: true,
        hawker: {
          ...hawker,
          stalls: hawker.stalls.map(stall => ({
            id: stall.id,
            name: stall.name,
            description: stall.description,
            imageUrl: stall.imageUrl,
            phoneNumber: stall.phoneNumber,
            isActive: stall.isActive,
            menuItemCount: stall._count.menu
          })),
          cuisines: Array.from(cuisines)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch hawker details' 
      });
    }
  });

  // Get stall details with menu (view only)
  fastify.get('/directory/stalls/:stallId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { stallId } = request.params as { stallId: string };
      
      const stall = await prisma.stall.findUnique({
        where: { id: stallId },
        include: {
          hawker: true,
          menu: {
            where: { isAvailable: true },
            orderBy: [
              { category: 'asc' },
              { name: 'asc' }
            ]
          }
        }
      });

      if (!stall) {
        return reply.code(404).send({
          success: false,
          message: 'Stall not found'
        });
      }

      // Group menu items by category
      const menuByCategory = stall.menu.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push({
          id: item.id,
          name: item.name,
          nameZh: item.nameZh,
          nameMy: item.nameMy,
          nameTa: item.nameTa,
          description: item.description,
          price: Number(item.price),
          imageUrl: item.imageUrl
        });
        return acc;
      }, {} as Record<string, any[]>);

      return reply.send({
        success: true,
        stall: {
          id: stall.id,
          name: stall.name,
          description: stall.description,
          imageUrl: stall.imageUrl,
          phoneNumber: stall.phoneNumber,
          hawker: {
            id: stall.hawker.id,
            name: stall.hawker.name,
            address: stall.hawker.address
          },
          menuByCategory
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch stall details' 
      });
    }
  });

  // Search stalls and menu items
  fastify.get('/directory/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = SearchQuerySchema.parse(request.query);
      const page = parseInt(query.page);
      const limit = parseInt(query.limit);
      const skip = (page - 1) * limit;

      const where: any = {};

      // Search conditions
      if (query.q) {
        where.OR = [
          { name: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
          {
            menu: {
              some: {
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { description: { contains: query.q, mode: 'insensitive' } }
                ]
              }
            }
          }
        ];
      }

      if (query.hawkerId) {
        where.hawkerId = query.hawkerId;
      }

      if (query.cuisine) {
        where.menu = {
          some: {
            category: query.cuisine
          }
        };
      }

      where.isActive = true;

      // Get total count
      const total = await prisma.stall.count({ where });

      // Get stalls with pagination
      const stalls = await prisma.stall.findMany({
        where,
        include: {
          hawker: true,
          _count: {
            select: {
              menu: {
                where: { isAvailable: true }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          name: 'asc'
        }
      });

      // If searching by query, also find matching menu items
      let menuItems: any[] = [];
      if (query.q) {
        menuItems = await prisma.menuItem.findMany({
          where: {
            AND: [
              { isAvailable: true },
              {
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { description: { contains: query.q, mode: 'insensitive' } }
                ]
              },
              query.hawkerId ? {
                stall: { hawkerId: query.hawkerId }
              } : {},
              query.cuisine ? {
                category: query.cuisine
              } : {}
            ]
          },
          include: {
            stall: {
              include: {
                hawker: true
              }
            }
          },
          take: 10
        });
      }

      return reply.send({
        success: true,
        results: {
          stalls: stalls.map(stall => ({
            id: stall.id,
            name: stall.name,
            description: stall.description,
            imageUrl: stall.imageUrl,
            hawker: {
              id: stall.hawker.id,
              name: stall.hawker.name
            },
            menuItemCount: stall._count.menu
          })),
          menuItems: menuItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            category: item.category,
            stall: {
              id: item.stall.id,
              name: item.stall.name,
              hawker: {
                id: item.stall.hawker.id,
                name: item.stall.hawker.name
              }
            }
          }))
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Search failed' 
      });
    }
  });

  // Get popular stalls
  fastify.get('/directory/popular', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get stalls with most orders in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const popularStalls = await prisma.stall.findMany({
        where: {
          isActive: true,
          orders: {
            some: {
              createdAt: {
                gte: thirtyDaysAgo
              }
            }
          }
        },
        include: {
          hawker: true,
          _count: {
            select: {
              orders: {
                where: {
                  createdAt: {
                    gte: thirtyDaysAgo
                  }
                }
              }
            }
          }
        },
        orderBy: {
          orders: {
            _count: 'desc'
          }
        },
        take: 10
      });

      return reply.send({
        success: true,
        stalls: popularStalls.map(stall => ({
          id: stall.id,
          name: stall.name,
          description: stall.description,
          imageUrl: stall.imageUrl,
          orderCount: stall._count.orders,
          hawker: {
            id: stall.hawker.id,
            name: stall.hawker.name
          }
        }))
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch popular stalls' 
      });
    }
  });

  // Get all available cuisines
  fastify.get('/directory/cuisines', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cuisines = await prisma.menuItem.findMany({
        where: { isAvailable: true },
        select: { category: true },
        distinct: ['category']
      });

      const cuisineStats = await Promise.all(
        cuisines.map(async ({ category }) => {
          const count = await prisma.stall.count({
            where: {
              isActive: true,
              menu: {
                some: {
                  category,
                  isAvailable: true
                }
              }
            }
          });
          return { name: category, stallCount: count };
        })
      );

      return reply.send({
        success: true,
        cuisines: cuisineStats.sort((a, b) => b.stallCount - a.stallCount)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false,
        message: 'Failed to fetch cuisines' 
      });
    }
  });
}