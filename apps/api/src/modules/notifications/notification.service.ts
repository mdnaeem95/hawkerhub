// apps/api/src/modules/notifications/notification.service.ts
import { Expo, ExpoPushMessage, ExpoPushSuccessTicket } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const expo = new Expo();

export class NotificationService {
  // Send push notification to a user
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
    userType: 'customer' | 'vendor' = 'customer'
  ) {
    try {
      // Get user's push tokens
      const tokens = await prisma.pushToken.findMany({
        where: {
          userId,
          userType,
          isActive: true
        }
      });

      if (tokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return;
      }

      // Create messages
      const messages: ExpoPushMessage[] = tokens
        .filter((token: any) => Expo.isExpoPushToken(token.token))
        .map((token: any) => ({
          to: token.token,
          sound: 'default',
          title,
          body,
          data,
          priority: 'high',
          channelId: data?.channelId || 'orders',
        }));

      if (messages.length === 0) {
        console.log('No valid push tokens to send to');
        return;
      }

      // Send notifications in chunks
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Store tickets for later receipt checking
      const ticketRecords = tickets
      .filter((ticket): ticket is ExpoPushSuccessTicket => ticket.status === 'ok')
      .map((ticket, index) => ({
        ticketId: ticket.id,
        userId,
        status: ticket.status,
        message: messages[index],
        createdAt: new Date()
      }));

      if (ticketRecords.length > 0) {
        await prisma.notificationTicket.createMany({
            data: ticketRecords as any
        })
      }

      // Log any immediate errors
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'error') {
          console.error(`Push notification error for user ${userId}:`, ticket.message, ticket.details);
        }
      });

      console.log(`Sent ${tickets.length} push notifications for user ${userId}`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send order status update notification
  async sendOrderStatusNotification(order: any) {
    const messages = {
      PREPARING: {
        title: '👨‍🍳 Order Being Prepared',
        body: `Your order #${order.orderNumber} is now being prepared!`
      },
      READY: {
        title: '✅ Order Ready!',
        body: `Your order #${order.orderNumber} is ready for collection at ${order.stall.name}!`
      },
      COMPLETED: {
        title: '🎉 Order Completed',
        body: `Thank you for your order #${order.orderNumber}!`
      },
      CANCELLED: {
        title: '❌ Order Cancelled',
        body: `Your order #${order.orderNumber} has been cancelled.`
      }
    };

    const message = messages[order.status as keyof typeof messages];
    if (!message) return;

    await this.sendPushNotification(
      order.customerId,
      message.title,
      message.body,
      {
        type: 'order_status_update',
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    );
  }

  // Send new order notification to vendor
  async sendNewOrderNotification(order: any) {
    const stallOwner = await prisma.stallOwner.findUnique({
      where: { stallId: order.stallId }
    });

    if (!stallOwner) return;

    await this.sendPushNotification(
      stallOwner.id,
      '🆕 New Order!',
      `New order #${order.orderNumber} from Table ${order.table.number}`,
      {
        type: 'new_order',
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.table.number,
        channelId: 'orders'
      },
      'vendor'
    );
  }

  // Send payment confirmation notification
  async sendPaymentNotification(order: any) {
    await this.sendPushNotification(
      order.customerId,
      '💰 Payment Confirmed',
      `Payment received for order #${order.orderNumber}`,
      {
        type: 'payment_confirmed',
        orderId: order.id,
        orderNumber: order.orderNumber
      }
    );
  }

  // Check notification receipts (run periodically)
  async checkNotificationReceipts() {
    const tickets = await prisma.notificationTicket.findMany({
      where: {
        status: 'ok',
        receiptChecked: false,
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      }
    });

    if (tickets.length === 0) return;

    const receiptIds = tickets.map(ticket => ticket.ticketId);
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        
        for (const [receiptId, receipt] of Object.entries(receipts)) {
          const ticket = tickets.find(t => t.ticketId === receiptId);
          if (!ticket) continue;

          if (receipt.status === 'error') {
            console.error(`Notification receipt error:`, receipt);
            
            // Handle the error appropriately
            if (receipt.details?.error === 'DeviceNotRegistered') {
              // Mark the push token as inactive
              await prisma.pushToken.updateMany({
                where: { userId: ticket.userId },
                data: { isActive: false }
              });
            }
          }

          // Mark receipt as checked
          await prisma.notificationTicket.update({
            where: { id: ticket.id },
            data: { 
              receiptChecked: true,
              receiptStatus: receipt.status
            }
          });
        }
      } catch (error) {
        console.error('Error checking receipts:', error);
      }
    }
  }
}