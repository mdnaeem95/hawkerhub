// apps/api/src/plugins/socket.plugin.ts
import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import fastifySocketIO from 'fastify-socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

export async function socketPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySocketIO, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  fastify.ready().then(() => {
    // Socket.io connection handler
    fastify.io.on('connection', (socket: any) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // Join customer to their personal room
      socket.on('join:customer', (customerId: string) => {
        socket.join(`customer:${customerId}`);
        console.log(`[Socket] Customer ${customerId} joined their room`);
      });

      // Join vendor to their stall room
      socket.on('join:vendor', (stallId: string) => {
        socket.join(`stall:${stallId}`);
        console.log(`[Socket] Vendor joined stall room: ${stallId}`);
      });

      // Join table room (for table-specific updates)
      socket.on('join:table', ({ hawkerId, tableNumber }: { hawkerId: any, tableNumber: any}) => {
        socket.join(`table:${hawkerId}:${tableNumber}`);
        console.log(`[Socket] Joined table room: ${hawkerId}:${tableNumber}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  });
}

// Helper functions to emit events
export const emitOrderUpdate = (io: Server, order: any) => {
  // Emit to customer
  if (order.customerId) {
    io.to(`customer:${order.customerId}`).emit('order:updated', order);
  }
  
  // Emit to stall vendor
  io.to(`stall:${order.stallId}`).emit('order:updated', order);
  
  // Emit to table
  if (order.table) {
    io.to(`table:${order.table.hawkerId}:${order.table.number}`).emit('order:updated', order);
  }
};

export const emitNewOrder = (io: Server, order: any) => {
  // Emit to stall vendor
  io.to(`stall:${order.stallId}`).emit('order:new', order);
  
  // Emit to customer
  if (order.customerId) {
    io.to(`customer:${order.customerId}`).emit('order:created', order);
  }
};