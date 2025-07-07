// apps/mobile/src/services/orders.api.ts
import { api } from './api';

export const ordersApi = {
  // Get customer's orders
  getMyOrders: () => 
    api.get('/orders/my-orders'),
    
  // Get order details
  getOrderDetails: (orderId: string) =>
    api.get(`/orders/${orderId}`),
    
  // Create new order
  createOrder: (data: {
    tableId: string;
    stallId: string;
    paymentMode: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      specialInstructions?: string;
    }>;
    totalAmount: number;
  }) =>
    api.post('/orders', data),
    
  // Update order status
  updateOrderStatus: (orderId: string, status: string) =>
    api.patch(`/orders/${orderId}/status`, { status }),
};