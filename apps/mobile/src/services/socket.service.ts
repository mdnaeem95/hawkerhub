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

  private async joinUserRooms() {
      const { user, userRole } = useAuthStore.getState();
      
      if (!user || !this.socket) return;

      if (userRole === 'customer') {
        this.socket.emit('join:customer', user.id);
        console.log(`[Socket] Joined customer room: ${user.id}`);
      } else if (userRole === 'vendor') {
        // For vendor, we need to get their stall ID
        try {
          const stallInfo = await this.fetchVendorStallInfo();
          if (stallInfo?.stallId && this.socket) {
            this.socket.emit('join:vendor', stallInfo.stallId);
            console.log(`[Socket] Joined vendor stall room: ${stallInfo.stallId}`);
          } else {
            console.error('[Socket] Could not get vendor stall ID');
          }
        } catch (error) {
          console.error('[Socket] Error joining vendor room:', error);
        }
      }
  }

  private async fetchVendorStallInfo(): Promise<{ stallId: string } | null> {
    try {
      const { api } = await import('./api');
      
      const response = await api.get('/vendor/profile');
      
      if (response.data.success && response.data.stall) {
        return { stallId: response.data.stall.id };
      }
      return null;
    } catch (error) {
      console.error('[Socket] Error fetching vendor stall info:', error);
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
      console.log('[Socket] New order for vendor (order:new):', order);
      this.emit('order:new', order);
    });

    this.socket.on('new-order', (order) => {
      console.log('[Socket] New order for vendor (new-order):', order);
      this.emit('new-order', order);
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