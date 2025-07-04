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

    this.socket.on('error', (error: any) => {
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
    } else if (userRole === 'vendor') {
      // Assuming vendor has stallId
      // this.socket.emit('join:vendor', user.stallId);
    }
  }

  joinTable(hawkerId: string, tableNumber: string) {
    if (!this.socket) return;
    this.socket.emit('join:table', { hawkerId, tableNumber });
  }

  private registerEventHandlers() {
    if (!this.socket) return;

    // Order events
    this.socket.on('order:created', (order: any) => {
      console.log('[Socket] New order created:', order);
      this.emit('order:created', order);
    });

    this.socket.on('order:updated', (order: any) => {
      console.log('[Socket] Order updated:', order);
      this.emit('order:updated', order);
    });

    this.socket.on('order:new', (order: any) => {
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