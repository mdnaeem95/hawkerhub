import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function stallRoutes(fastify: FastifyInstance) {
  // Get menu items for a stall
  fastify.get('/stalls/:stallId/menu', async (request: FastifyRequest, reply: FastifyReply) => {
    const { stallId } = request.params as { stallId: string };
    
    try {
      const stall = await prisma.stall.findUnique({
        where: { id: stallId },
      });
      
      if (!stall) {
        return reply.code(404).send({ error: 'Stall not found' });
      }
      
      const menuItems = await prisma.menuItem.findMany({
        where: { 
          stallId: stallId,
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ],
      });
      
      return reply.send({
        stall: {
          id: stall.id,
          name: stall.name,
          description: stall.description,
        },
        menuItems,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}