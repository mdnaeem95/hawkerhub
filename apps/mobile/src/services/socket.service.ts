// apps/mobile/src/services/socket.service.ts
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    
    this.socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      this.joinUserRooms();
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    // Register global event handlers
    this.registerEventHandlers();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private joinUserRooms() {
    const { user, userRole } = useAuthStore.getState();
    
    if (!user || !this.socket) return;

    if (userRole === 'customer') {
      this.socket.emit('join:customer', user.id);
      console.log(`[Socket] Joined customer room: ${user.id}`);
    } else if (userRole === 'vendor') {
      // For vendor, we need to get their stall ID
      // This assumes the vendor user object has a stallId property
      // You might need to fetch this from the API or store it in auth
      this.fetchVendorStallId().then(stallId => {
        if (stallId && this.socket) {
          this.socket.emit('join:vendor', stallId);
          console.log(`[Socket] Joined vendor stall room: ${stallId}`);
        }
      });
    }
  }

  private async fetchVendorStallId(): Promise<string | null> {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const token = useAuthStore.getState().token; // Get auth token
      
      const response = await fetch(`${API_URL}/vendor/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return data.stall?.id || null;
    } catch (error) {
      console.error('[Socket] Error fetching vendor stall ID:', error);
      return null;
    }
  }

  joinTable(hawkerId: string, tableNumber: string) {
    if (!this.socket) return;
    this.socket.emit('join:table', { hawkerId, tableNumber });
  }

  private registerEventHandlers() {
    if (!this.socket) return;

    // Order events
    this.socket.on('order:created', (order) => {
      console.log('[Socket] New order created:', order);
      this.emit('order:created', order);
    });

    this.socket.on('order:updated', (order) => {
      console.log('[Socket] Order updated:', order);
      this.emit('order:updated', order);
    });

    this.socket.on('order:new', (order) => {
      console.log('[Socket] New order for vendor:', order);
      this.emit('order:new', order);
    });
  }

  // Event emitter functionality
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const socketService = new SocketService();