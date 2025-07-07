import { PrismaClient, Order, OrderStatus, Prisma } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

// === Type Definitions ===
interface StoreHubCredentials {
  apiKey: string;
  storeId: string;
  webhookSecret?: string;
}

interface SquareCredentials {
  accessToken: string;
  locationId: string;
  environment: 'sandbox' | 'production';
}

interface SpreadsheetCredentials {
  fileUrl: string;
  phoneNumber: string;
}

type POSConfig = 
  | { type: 'storehub'; credentials: StoreHubCredentials }
  | { type: 'square'; credentials: SquareCredentials }
  | { type: 'spreadsheet'; credentials: SpreadsheetCredentials }
  | { type: 'none' };

interface POSMenuItem {
  externalId?: string;
  name: string;
  nameZh?: string;
  nameMy?: string;
  nameTa?: string;
  price: number;
  category: string;
  available: boolean;
  imageUrl?: string;
}

// Extended Order type with relations
type OrderWithRelations = Order & {
  table: {
    id: string;
    number: string;
    hawkerId: string;
  };
  items: Array<{
    id: string;
    menuItemId: string;
    quantity: number;
    price: Prisma.Decimal;
    specialInstructions: string | null;
    menuItem: {
      id: string;
      externalId: string | null;
      name: string;
      stallId: string;
    };
  }>;
  stall: {
    id: string;
    name: string;
    phoneNumber: string;
  };
};

interface POSAdapter {
  name: string;
  connect(): Promise<void>;
  syncMenu(): Promise<POSMenuItem[]>;
  pushOrder(order: OrderWithRelations): Promise<void>;
  onOrderUpdate(callback: (orderId: string, status: string) => void): void;
}

// === StoreHub Integration ===
export class StoreHubAdapter implements POSAdapter {
  name = 'StoreHub';
  private apiKey: string;
  private storeId: string;
  private baseUrl = 'https://api.storehub.com/v2';
  
  constructor(credentials: StoreHubCredentials) {
    this.apiKey = credentials.apiKey;
    this.storeId = credentials.storeId;
  }
  
  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/stores/${this.storeId}`, {
        headers: { 
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid StoreHub credentials');
      }
      
      const data = await response.json();
      console.log(`Connected to StoreHub store: ${data.name}`);
    } catch (error) {
      console.error('StoreHub connection error:', error);
      throw new Error('Failed to connect to StoreHub');
    }
  }
  
  async syncMenu(): Promise<POSMenuItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stores/${this.storeId}/items`, {
        headers: { 
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch StoreHub menu');
      }
      
      const data = await response.json() as any;
      
      // Map StoreHub format to our format
      return data.data.map((item: any) => ({
        externalId: item.id,
        name: item.name,
        nameZh: item.name_zh || undefined,
        nameMy: item.name_ms || undefined,
        price: item.price / 100, // Convert cents to dollars
        category: item.category?.name || 'Others',
        available: item.in_stock && item.is_available,
        imageUrl: item.image_url || undefined
      }));
    } catch (error) {
      console.error('StoreHub menu sync error:', error);
      throw error;
    }
  }
  
  async pushOrder(order: OrderWithRelations): Promise<void> {
    try {
      // Map order to StoreHub format
      const storeHubOrder = {
        order_type: 'dine_in',
        table_number: order.table.number,
        items: order.items.map(item => ({
          item_id: item.menuItem.externalId || item.menuItemId,
          quantity: item.quantity,
          price: Number(item.price) * 100, // Convert to cents
          special_instructions: item.specialInstructions || undefined
        })),
        payment_method: this.mapPaymentMethod(order.paymentMode),
        total_amount: Number(order.totalAmount) * 100, // Convert to cents
        customer_notes: `HawkerHub Order #${order.orderNumber}`,
        status: 'new'
      };
      
      const response = await fetch(`${this.baseUrl}/stores/${this.storeId}/orders`, {
        method: 'POST',
        headers: { 
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(storeHubOrder)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`StoreHub order push failed: ${error}`);
      }
      
      const result = await response.json();
      console.log(`Order pushed to StoreHub: ${result.id}`);
      
      // Store external order ID for tracking
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          metadata: {
            storeHubOrderId: result.id
          }
        }
      });
    } catch (error) {
      console.error('StoreHub order push error:', error);
      throw error;
    }
  }
  
  onOrderUpdate(callback: (orderId: string, status: string) => void): void {
    // StoreHub webhook handler
    // This would be implemented as a webhook endpoint
    console.log('StoreHub webhook listener registered');
  }
  
  private mapPaymentMethod(paymentMode: string): string {
    const mapping: Record<string, string> = {
      'CASH': 'cash',
      'PAYNOW': 'paynow',
      'GRABPAY': 'grabpay',
      'PAYLAH': 'dbs_paylah'
    };
    return mapping[paymentMode] || 'other';
  }
}

// === Square Integration ===
export class SquareAdapter implements POSAdapter {
  name = 'Square';
  private accessToken: string;
  private locationId: string;
  private baseUrl: string;
  
  constructor(credentials: SquareCredentials) {
    this.accessToken = credentials.accessToken;
    this.locationId = credentials.locationId;
    this.baseUrl = credentials.environment === 'sandbox' 
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';
  }
  
  async connect(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/locations/${this.locationId}`, {
      headers: { 
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Invalid Square credentials');
    }
    
    const data = await response.json();
    console.log(`Connected to Square location: ${data.location.name}`);
  }
  
  async syncMenu(): Promise<POSMenuItem[]> {
    const response = await fetch(
      `${this.baseUrl}/catalog/list?types=ITEM&location_ids=${this.locationId}`,
      {
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch Square catalog');
    }
    
    const data = await response.json() as any;
    const items: POSMenuItem[] = [];
    
    for (const object of data.objects || []) {
      if (object.type === 'ITEM' && object.item_data) {
        const itemData = object.item_data;
        
        // Get price from first variation
        const variation = itemData.variations?.[0];
        if (!variation) continue;
        
        const price = variation.item_variation_data?.price_money?.amount;
        if (!price) continue;
        
        items.push({
          externalId: object.id,
          name: itemData.name,
          price: price / 100, // Convert cents to dollars
          category: itemData.category?.name || 'Others',
          available: !itemData.is_deleted && itemData.available_online,
          imageUrl: itemData.image_ids?.[0] 
            ? `${this.baseUrl}/catalog/object/${itemData.image_ids[0]}`
            : undefined
        });
      }
    }
    
    return items;
  }
  
  async pushOrder(order: OrderWithRelations): Promise<void> {
    // Create Square order
    const squareOrder = {
      order: {
        location_id: this.locationId,
        reference_id: order.orderNumber,
        line_items: order.items.map(item => ({
          catalog_object_id: item.menuItem.externalId || undefined,
          name: item.menuItem.name,
          quantity: item.quantity.toString(),
          base_price_money: {
            amount: Math.round(Number(item.price) * 100),
            currency: 'SGD'
          },
          note: item.specialInstructions || undefined
        })),
        fulfillments: [{
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            note: `Table ${order.table.number}`
          }
        }]
      }
    };
    
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(squareOrder)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Square order creation failed: ${error}`);
    }
    
    const result = await response.json();
    console.log(`Order pushed to Square: ${result.order.id}`);
  }
  
  onOrderUpdate(callback: (orderId: string, status: string) => void): void {
    // Square webhook implementation
    console.log('Square webhook listener registered');
  }
}

// === Spreadsheet/Manual Integration ===
export class SpreadsheetAdapter implements POSAdapter {
  name = 'Spreadsheet';
  private fileUrl: string;
  private phoneNumber: string;
  
  constructor(credentials: SpreadsheetCredentials) {
    this.fileUrl = credentials.fileUrl;
    this.phoneNumber = credentials.phoneNumber;
  }
  
  async connect(): Promise<void> {
    // Validate file is accessible
    try {
      const response = await fetch(this.fileUrl);
      if (!response.ok) {
        throw new Error('Cannot access spreadsheet file');
      }
      console.log('Spreadsheet connection validated');
    } catch (error) {
      throw new Error('Invalid spreadsheet URL');
    }
  }
  
  async syncMenu(): Promise<POSMenuItem[]> {
    try {
      const response = await fetch(this.fileUrl);
      const text = await response.text();
      
      // Parse CSV (simplified - use proper CSV parser in production)
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const items: POSMenuItem[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const item: any = {};
        
        headers.forEach((header, index) => {
          item[header] = values[index];
        });
        
        if (item.name && item.price) {
          items.push({
            name: item.name,
            nameZh: item.name_zh || item.chinese_name,
            nameMy: item.name_my || item.malay_name,
            nameTa: item.name_ta || item.tamil_name,
            price: parseFloat(item.price),
            category: item.category || 'Others',
            available: item.available?.toLowerCase() !== 'no',
            imageUrl: item.image_url
          });
        }
      }
      
      return items;
    } catch (error) {
      console.error('Spreadsheet sync error:', error);
      throw error;
    }
  }
  
  async pushOrder(order: OrderWithRelations): Promise<void> {
    // For manual systems, send WhatsApp notification
    const message = this.formatOrderMessage(order);
    
    // In production, use actual WhatsApp API
    console.log(`Sending WhatsApp to ${this.phoneNumber}:`, message);
    
    // Store that we've sent the notification
    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: {
          whatsappSent: true,
          whatsappSentAt: new Date()
        }
      }
    });
  }
  
  onOrderUpdate(callback: (orderId: string, status: string) => void): void {
    // For manual systems, updates come via WhatsApp replies
    console.log('WhatsApp reply listener registered');
  }
  
  private formatOrderMessage(order: OrderWithRelations): string {
    const items = order.items.map(item => 
      `${item.quantity}x ${item.menuItem.name}${
        item.specialInstructions ? `\n   Note: ${item.specialInstructions}` : ''
      }`
    ).join('\n');
    
    return `
🆕 NEW ORDER #${order.orderNumber}
📍 Table: ${order.table.number}
⏰ Time: ${new Date().toLocaleTimeString()}

ITEMS:
${items}

💰 Total: $${Number(order.totalAmount).toFixed(2)}
💳 Payment: ${order.paymentMode}

Reply:
✅ or ACCEPT - to confirm
❌ or REJECT - to cancel
⏰ DELAY [minutes] - if need more time
✓ READY - when ready for collection
    `.trim();
  }
}

// === Main POS Integration Service ===
export class POSIntegrationService {
  private adapters = new Map<string, POSAdapter>();
  private syncIntervals = new Map<string, NodeJS.Timer>();
  
  async connectStallPOS(stallId: string, posConfig: POSConfig): Promise<void> {
    // Clean up existing connection if any
    await this.disconnectStallPOS(stallId);
    
    if (posConfig.type === 'none') {
      console.log(`Stall ${stallId} using manual entry`);
      return;
    }
    
    let adapter: POSAdapter;
    
    switch (posConfig.type) {
      case 'storehub':
        adapter = new StoreHubAdapter(posConfig.credentials);
        break;
      case 'square':
        adapter = new SquareAdapter(posConfig.credentials);
        break;
      case 'spreadsheet':
        adapter = new SpreadsheetAdapter(posConfig.credentials);
        break;
      default:
        throw new Error(`Unsupported POS type`);
    }
    
    try {
      // Connect to POS
      await adapter.connect();
      
      // Store adapter
      this.adapters.set(stallId, adapter);
      
      // Store POS config in database
      await prisma.stall.update({
        where: { id: stallId },
        data: {
          posType: posConfig.type,
          posConfig: posConfig as any // Store encrypted in production
        }
      });
      
      // Initial sync
      await this.syncStallMenu(stallId);
      
      // Set up periodic sync (every 30 minutes)
      const interval = setInterval(() => {
        this.syncStallMenu(stallId).catch(error => {
          console.error(`Periodic sync failed for stall ${stallId}:`, error);
        });
      }, 30 * 60 * 1000);
      
      this.syncIntervals.set(stallId, interval);
      
      // Listen for order updates
      adapter.onOrderUpdate(async (externalOrderId, status) => {
        await this.handlePOSOrderUpdate(stallId, externalOrderId, status);
      });
      
      console.log(`POS integration successful for stall ${stallId}`);
    } catch (error) {
      // Clean up on failure
      this.adapters.delete(stallId);
      throw error;
    }
  }
  
  async disconnectStallPOS(stallId: string): Promise<void> {
    // Clear interval
    const interval = this.syncIntervals.get(stallId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(stallId);
    }
    
    // Remove adapter
    this.adapters.delete(stallId);
    
    console.log(`Disconnected POS for stall ${stallId}`);
  }
  
  async syncStallMenu(stallId: string): Promise<void> {
    const adapter = this.adapters.get(stallId);
    if (!adapter) {
      throw new Error(`No POS adapter found for stall ${stallId}`);
    }
    
    try {
      console.log(`Starting menu sync for stall ${stallId}`);
      
      // Get menu from POS
      const posItems = await adapter.syncMenu();
      
      // Get existing menu items
      const existingItems = await prisma.menuItem.findMany({
        where: { stallId }
      });
      
      // Create map for efficient lookup
      const existingMap = new Map(
        existingItems
          .filter(item => item.externalId)
          .map(item => [item.externalId!, item])
      );
      
      const syncedIds = new Set<string>();
      
      // Sync items
      for (const posItem of posItems) {
        if (posItem.externalId) {
          syncedIds.add(posItem.externalId);
        }
        
        const existing = posItem.externalId 
          ? existingMap.get(posItem.externalId)
          : null;
        
        if (existing) {
          // Update existing item
          await prisma.menuItem.update({
            where: { id: existing.id },
            data: {
              name: posItem.name,
              nameZh: posItem.nameZh,
              nameMy: posItem.nameMy,
              nameTa: posItem.nameTa,
              price: posItem.price,
              category: posItem.category,
              isAvailable: posItem.available,
              imageUrl: posItem.imageUrl || existing.imageUrl,
              updatedAt: new Date()
            }
          });
        } else {
          // Create new item
          await prisma.menuItem.create({
            data: {
              stallId,
              externalId: posItem.externalId,
              name: posItem.name,
              nameZh: posItem.nameZh,
              nameMy: posItem.nameMy,
              nameTa: posItem.nameTa,
              price: posItem.price,
              category: posItem.category,
              isAvailable: posItem.available,
              imageUrl: posItem.imageUrl
            }
          });
        }
      }
      
      // Mark items not in POS as unavailable
      const toDisable = existingItems.filter(
        item => item.externalId && !syncedIds.has(item.externalId)
      );
      
      if (toDisable.length > 0) {
        await prisma.menuItem.updateMany({
          where: {
            id: { in: toDisable.map(item => item.id) }
          },
          data: { isAvailable: false }
        });
      }
      
      console.log(`Menu sync completed for stall ${stallId}: ${posItems.length} items synced`);
      
      // Update last sync time
      await prisma.stall.update({
        where: { id: stallId },
        data: {
          lastMenuSync: new Date()
        }
      });
    } catch (error) {
      console.error(`Menu sync failed for stall ${stallId}:`, error);
      
      // Notify vendor of sync error
      await this.notifyVendorOfSyncError(stallId, error as Error);
      
      throw error;
    }
  }
  
  async pushOrderToPOS(orderId: string): Promise<void> {
    // Fetch order with all relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true
          }
        },
        stall: true
      }
    }) as OrderWithRelations | null;
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const adapter = this.adapters.get(order.stallId);
    
    if (!adapter) {
      // No POS integration - send WhatsApp notification
      console.log(`No POS adapter for stall ${order.stallId}, sending WhatsApp`);
      await this.sendManualOrderNotification(order);
      return;
    }
    
    try {
      await adapter.pushOrder(order);
      console.log(`Order ${orderId} pushed to POS successfully`);
    } catch (error) {
      console.error(`Failed to push order to POS:`, error);
      
      // Fallback to WhatsApp notification
      await this.sendManualOrderNotification(order);
      
      // Log the error
      await prisma.order.update({
        where: { id: orderId },
        data: {
          metadata: {
            posError: (error as Error).message,
            posErrorAt: new Date()
          }
        }
      });
    }
  }
  
  private async sendManualOrderNotification(order: OrderWithRelations): Promise<void> {
    // Send via WhatsApp
    const adapter = new SpreadsheetAdapter({
      fileUrl: '', // Not needed for sending
      phoneNumber: order.stall.phoneNumber
    });
    
    await adapter.pushOrder(order);
  }
  
  private async notifyVendorOfSyncError(stallId: string, error: Error): Promise<void> {
    const stall = await prisma.stall.findUnique({
      where: { id: stallId },
      include: { owner: true }
    });
    
    if (!stall?.owner) return;
    
    // Send notification about sync error
    const message = `
⚠️ Menu Sync Error

Your menu could not be synced from your POS system.

Error: ${error.message}

Your existing menu is still available for customers to order.

Reply HELP for assistance.
    `.trim();
    
    // In production, send via WhatsApp/SMS
    console.log(`Notifying vendor ${stall.phoneNumber}: ${message}`);
  }
  
  private async handlePOSOrderUpdate(
    stallId: string, 
    externalOrderId: string, 
    status: string
  ): Promise<void> {
    // Find order by external ID
    const order = await prisma.order.findFirst({
      where: {
        stallId,
        metadata: {
          path: ['storeHubOrderId'],
          equals: externalOrderId
        }
      }
    });
    
    if (!order) {
      console.warn(`Order not found for external ID: ${externalOrderId}`);
      return;
    }
    
    // Map POS status to our status
    const statusMap: Record<string, OrderStatus> = {
      'confirmed': 'PREPARING',
      'ready': 'READY',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED'
    };
    
    const newStatus = statusMap[status.toLowerCase()];
    if (!newStatus) {
      console.warn(`Unknown POS status: ${status}`);
      return;
    }
    
    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus }
    });
    
    console.log(`Order ${order.orderNumber} status updated to ${newStatus} from POS`);
  }
}

// === Webhook Handlers ===
export function setupPOSWebhooks(fastify: any, posService: POSIntegrationService) {
  // StoreHub webhook
  fastify.post('/webhooks/storehub', async (request: any, reply: any) => {
    const { event, data } = request.body;
    
    if (event === 'order.updated') {
      // Handle order update
      // Implementation depends on StoreHub webhook format
    }
    
    return { received: true };
  });
  
  // Square webhook
  fastify.post('/webhooks/square', async (request: any, reply: any) => {
    const { type, data } = request.body;
    
    if (type === 'order.updated') {
      // Handle order update
      // Implementation depends on Square webhook format
    }
    
    return { received: true };
  });
}