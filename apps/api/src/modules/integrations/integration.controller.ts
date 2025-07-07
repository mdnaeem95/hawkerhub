// apps/api/src/modules/integrations/integration.controller.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { POSIntegrationService } from './pos-adapter.service';
import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const ConnectPOSSchema = z.object({
  type: z.enum(['storehub', 'square', 'spreadsheet', 'none']),
  credentials: z.any().optional(),
});

const TestConnectionSchema = z.object({
  type: z.enum(['storehub', 'square', 'spreadsheet']),
  credentials: z.any(),
});

export async function integrationRoutes(
  fastify: FastifyInstance,
  posService: POSIntegrationService
) {
  // Get available POS systems
  fastify.get('/integrations/pos/available', async (request, reply) => {
    return {
      success: true,
      systems: [
        {
          id: 'storehub',
          name: 'StoreHub',
          description: 'Popular POS system in Singapore',
          logo: '/images/pos/storehub.png',
          features: ['Real-time sync', 'Inventory tracking', 'Order management'],
          setupGuide: 'https://help.hawkerhub.sg/storehub-setup'
        },
        {
          id: 'square',
          name: 'Square',
          description: 'Simple and powerful POS',
          logo: '/images/pos/square.png',
          features: ['Menu sync', 'Payment processing', 'Analytics'],
          setupGuide: 'https://help.hawkerhub.sg/square-setup'
        },
        {
          id: 'spreadsheet',
          name: 'Excel/Google Sheets',
          description: 'Import menu from spreadsheet',
          logo: '/images/pos/excel.png',
          features: ['One-time import', 'WhatsApp orders', 'Manual updates'],
          setupGuide: 'https://help.hawkerhub.sg/spreadsheet-setup'
        },
        {
          id: 'none',
          name: 'Manual Entry',
          description: 'Manage menu directly in HawkerHub',
          logo: '/images/pos/manual.png',
          features: ['Full control', 'No sync needed', 'WhatsApp orders'],
          setupGuide: null
        }
      ]
    };
  });

  // Test POS connection - Fixed schema
  fastify.post('/integrations/pos/test', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'credentials'],
        properties: {
          type: { 
            type: 'string', 
            enum: ['storehub', 'square', 'spreadsheet'] 
          },
          credentials: { 
            type: 'object'
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as z.infer<typeof TestConnectionSchema>;
      
      // Validate with Zod for additional validation
      const validatedData = TestConnectionSchema.parse(body);
      const { type, credentials } = validatedData;
      
      // Create temporary adapter to test connection
      let adapter: any;
      const { StoreHubAdapter, SquareAdapter, SpreadsheetAdapter } = await import('./pos-adapter.service');
      
      switch (type) {
        case 'storehub':
          adapter = new StoreHubAdapter(credentials);
          break;
        case 'square':
          adapter = new SquareAdapter(credentials);
          break;
        case 'spreadsheet':
          adapter = new SpreadsheetAdapter(credentials);
          break;
      }
      
      await adapter.connect();
      
      // Try to fetch menu to verify full access
      const items = await adapter.syncMenu();
      
      return {
        success: true,
        message: 'Connection successful',
        menuItemsFound: items.length
      };
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        message: error.message || 'Connection failed'
      });
    }
  });

  // Connect POS to stall - Fixed schema
  fastify.post('/integrations/pos/connect', {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { 
            type: 'string', 
            enum: ['storehub', 'square', 'spreadsheet', 'none'] 
          },
          credentials: { 
            type: 'object',
            nullable: true
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as z.infer<typeof ConnectPOSSchema>;
      
      // Validate with Zod
      const validatedData = ConnectPOSSchema.parse(body);
      const { type, credentials } = validatedData;
      const vendorId = request.user?.id;
      
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
      
      // Connect POS
      const posConfig = type === 'none' 
        ? { type: 'none' as const }
        : {
            type: type as 'storehub' | 'square' | 'spreadsheet',
            credentials: credentials
          };
      
      await posService.connectStallPOS(vendor.stall.id, posConfig);
      
      return {
        success: true,
        message: `${type === 'none' ? 'Manual entry' : type} connected successfully`,
        stallId: vendor.stall.id
      };
    } catch (error: any) {
      fastify.log.error('POS connection error:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to connect POS'
      });
    }
  });

  // Disconnect POS
  fastify.delete('/integrations/pos/disconnect', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      
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
      
      await posService.disconnectStallPOS(vendor.stall.id);
      
      // Clear POS config from database
      await prisma.stall.update({
        where: { id: vendor.stall.id },
        data: {
          posType: null,
          posConfig: Prisma.JsonNull,
          lastMenuSync: null
        }
      });
      
      return {
        success: true,
        message: 'POS disconnected successfully'
      };
    } catch (error: any) {
      fastify.log.error('POS disconnection error:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to disconnect POS'
      });
    }
  });

  // Manual sync trigger
  fastify.post('/integrations/pos/sync', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      
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
      
      if (!vendor.stall.posType || vendor.stall.posType === 'none') {
        return reply.code(400).send({
          success: false,
          message: 'No POS system connected'
        });
      }
      
      // Start sync
      const syncLog = await prisma.pOSSyncLog.create({
        data: {
          stallId: vendor.stall.id,
          syncType: 'menu',
          status: 'in_progress'
        }
      });
      
      try {
        await posService.syncStallMenu(vendor.stall.id);
        
        // Update sync log
        await prisma.pOSSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'success',
            completedAt: new Date()
          }
        });
        
        // Get updated menu count
        const menuItemCount = await prisma.menuItem.count({
          where: { stallId: vendor.stall.id }
        });
        
        return {
          success: true,
          message: 'Menu synced successfully',
          itemsSynced: menuItemCount,
          lastSync: new Date()
        };
      } catch (syncError: any) {
        // Update sync log with error
        await prisma.pOSSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'failed',
            errors: { message: syncError.message },
            completedAt: new Date()
          }
        });
        
        throw syncError;
      }
    } catch (error: any) {
      fastify.log.error('Manual sync error:', error);
      return reply.code(500).send({
        success: false,
        message: error.message || 'Sync failed'
      });
    }
  });

  // Get sync history
  fastify.get('/integrations/pos/sync-history', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      
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
      
      const syncLogs = await prisma.pOSSyncLog.findMany({
        where: { stallId: vendor.stall.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      
      return {
        success: true,
        syncHistory: syncLogs,
        currentPOS: vendor.stall.posType,
        lastSync: vendor.stall.lastMenuSync
      };
    } catch (error: any) {
      fastify.log.error('Error fetching sync history:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch sync history'
      });
    }
  });

  // Get integration status
  fastify.get('/integrations/pos/status', {
    preHandler: fastify.authenticate
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const vendorId = request.user?.id;
      
      const vendor = await prisma.stallOwner.findUnique({
        where: { id: vendorId },
        include: { 
          stall: {
            include: {
              _count: {
                select: {
                  menu: true,
                  orders: {
                    where: {
                      createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                      }
                    }
                  }
                }
              }
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
      
      const lastSync = await prisma.pOSSyncLog.findFirst({
        where: { 
          stallId: vendor.stall.id,
          status: 'success'
        },
        orderBy: { completedAt: 'desc' }
      });
      
      return {
        success: true,
        integration: {
          connected: !!vendor.stall.posType && vendor.stall.posType !== 'none',
          type: vendor.stall.posType,
          lastSync: vendor.stall.lastMenuSync,
          lastSuccessfulSync: lastSync?.completedAt,
          menuItems: vendor.stall._count.menu,
          todayOrders: vendor.stall._count.orders,
          autoSync: true, // Always true if connected
          syncInterval: 30 // minutes
        }
      };
    } catch (error: any) {
      fastify.log.error('Error fetching integration status:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch integration status'
      });
    }
  });
}

// Helper function to encrypt credentials
function encryptCredentials(credentials: any): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here', 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}

// Helper function to decrypt credentials
function decryptCredentials(encryptedData: string): any {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here', 'hex');
  
  const { encrypted, authTag, iv } = JSON.parse(encryptedData);
  
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}