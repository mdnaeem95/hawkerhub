import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function hawkerRoutes(fastify: FastifyInstance) {
  // Get all stalls for a hawker center
  fastify.get('/hawkers/:hawkerId/stalls', async (request: FastifyRequest, reply: FastifyReply) => {
    const { hawkerId } = request.params as { hawkerId: string };
    
    try {
      const hawker = await prisma.hawker.findUnique({
        where: { id: hawkerId },
        include: {
          stalls: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              isActive: true,
            },
          },
        },
      });
      
      if (!hawker) {
        return reply.code(404).send({ error: 'Hawker center not found' });
      }
      
      return reply.send({
        hawker: {
          id: hawker.id,
          name: hawker.name,
          address: hawker.address,
        },
        stalls: hawker.stalls,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}