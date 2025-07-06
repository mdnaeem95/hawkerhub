// apps/api/src/modules/payments/sgqr.service.ts
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SGQRData {
  amount: number;
  merchantName: string;
  merchantUEN?: string;
  billNumber: string;
  editable: boolean;
  expiryDate?: string;
}

export class SGQRService {
  // Generate SGQR compliant payment QR code
  async generatePaymentQR(orderId: string): Promise<{ qrDataUrl: string; qrString: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        stall: true,
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Build SGQR data structure
    const sgqrData: SGQRData = {
      amount: Number(order.totalAmount),
      merchantName: order.stall.name.substring(0, 25), // Max 25 chars
      billNumber: order.orderNumber,
      editable: false, // Amount is fixed
    };

    // Generate SGQR string (simplified version - in production, use official SGQR SDK)
    const qrString = this.buildSGQRString(sgqrData);
    
    // Generate QR code image
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return { qrDataUrl, qrString };
  }

  private buildSGQRString(data: SGQRData): string {
    // This is a simplified version. In production, use the official SGQR specifications
    // Real SGQR uses EMV QR Code Specification for Payment Systems
    
    const parts = [
      '00020101', // Payload Format Indicator
      '021126370009SG.PAYNOW', // Point of Initiation Method
      `010212${data.merchantUEN || '201234567M'}`, // Merchant UEN
      '0208SGQR0123', // Merchant Category Code
      '5204581', // Transaction Currency (SGD)
      `5303702`, // Country Code
      `5802SG`, // Merchant Country
      `5925${this.padString(data.merchantName, 25)}`, // Merchant Name
      `6007SINGAPORE`, // Merchant City
      `62${this.buildAdditionalData(data.billNumber)}`, // Additional Data
    ];

    if (!data.editable && data.amount > 0) {
      parts.push(`54${this.formatAmount(data.amount)}`); // Transaction Amount
    }

    // Add CRC placeholder
    const partialString = parts.join('');
    const crc = this.calculateCRC(partialString + '6304');
    
    return partialString + '6304' + crc;
  }

  private buildAdditionalData(billNumber: string): string {
    const referenceLabel = `05${billNumber.length.toString().padStart(2, '0')}${billNumber}`;
    const length = referenceLabel.length.toString().padStart(2, '0');
    return length + referenceLabel;
  }

  private padString(str: string, length: number): string {
    return str.substring(0, length).padEnd(length, ' ');
  }

  private formatAmount(amount: number): string {
    const amountStr = amount.toFixed(2);
    return amountStr.length.toString().padStart(2, '0') + amountStr;
  }

  // CRC16-CCITT calculation for SGQR
  private calculateCRC(str: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < str.length; i++) {
      const byte = str.charCodeAt(i);
      crc ^= byte << 8;

      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
      }
    }

    return ((crc ^ 0) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }

  // Verify payment status (integrate with bank API in production)
  async checkPaymentStatus(orderId: string): Promise<{
    paid: boolean;
    transactionId?: string;
    paidAt?: Date;
  }> {
    // In production, this would check with PayNow API or bank API
    // For now, we'll check if order has been manually marked as paid
    
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });

    if (payment && payment.status === 'COMPLETED') {
      return {
        paid: true,
        transactionId: payment.transactionId,
        paidAt: payment.completedAt || payment.createdAt
      };
    }

    return { paid: false };
  }

  // Record payment
  async recordPayment(orderId: string, transactionId: string) {
    const payment = await prisma.payment.create({
      data: {
        orderId,
        transactionId,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'COMPLETED',
        paidAt: new Date()
      }
    });

    return payment;
  }
}