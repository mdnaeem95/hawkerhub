import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import { randomInt } from 'crypto';
import { redis } from '../../lib/redis';

export class AuthService {
  private prisma: PrismaClient;
  private twilioClient?: twilio.Twilio;
  
  constructor() {
    this.prisma = new PrismaClient();
    // Only initialize Twilio if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  // Check if phone exists without creating user
  async checkPhoneExists(phoneNumber: string, userType: 'customer' | 'vendor') {
    const normalizedPhone = phoneNumber.startsWith('+65') 
      ? phoneNumber 
      : `+65${phoneNumber}`;

    if (userType === 'customer') {
      const customer = await this.prisma.customer.findUnique({
        where: { phoneNumber: normalizedPhone }
      });
      return { exists: !!customer, user: customer };
    } else {
      const vendor = await this.prisma.stallOwner.findUnique({
        where: { phoneNumber: normalizedPhone },
        include: { stall: true }
      });
      return { exists: !!vendor, user: vendor };
    }
  }

  async sendOTP(phoneNumber: string, userType: 'customer' | 'vendor') {
    // Validate Singapore phone number
    const sgPhoneRegex = /^(\+65)?[689]\d{7}$/;
    if (!sgPhoneRegex.test(phoneNumber)) {
      throw new Error('Invalid Singapore phone number');
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.startsWith('+65') ? phoneNumber : `+65${phoneNumber}`;

    // check if user exists
    const { exists, user } = await this.checkPhoneExists(phoneNumber, userType)

    // for vendors, must exist
    if (userType === 'vendor' && !exists) {
      throw new Error('Vendor not found. Please contact support to register your stall.');
    }

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    // Store OTP in Redis with 5-minute expiry
    await redis.setEx(
      `otp:${normalizedPhone}:${userType}`,
      300, // 5 minutes
      JSON.stringify({ otp, attempts: 0, timestamp: Date.now() })
    );

    console.log(`[OTP] Saved to Redis: otp:${normalizedPhone}:${userType} = ${otp}`);

    // Send OTP via SMS (Twilio)
    if (process.env.NODE_ENV === 'production' && this.twilioClient) {
      await this.twilioClient.messages.create({
        body: `Your HawkerHub OTP is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: normalizedPhone
      });
    } else {
      // For development, log OTP
      console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      isNewUser: userType === 'customer' && !exists
    };
  }

  async verifyOTP(
    phoneNumber: string, 
    otp: string, 
    userType: 'customer' | 'vendor',
    name?: string
  ) {
    const normalizedPhone = phoneNumber.startsWith('+65') 
      ? phoneNumber 
      : `+65${phoneNumber}`;

    // Get OTP from Redis
    const otpData = await redis.get(`otp:${normalizedPhone}:${userType}`);
    console.log(`[OTP] Redis value for ${normalizedPhone}:`, otpData);
    console.log('[OTP] Provided by user:', otp);
    
    if (!otpData) {
      throw new Error('OTP expired or not found');
    }

    const { otp: storedOtp, attempts } = JSON.parse(otpData);

    // Check attempts
    if (attempts >= 3) {
      await redis.del(`otp:${normalizedPhone}:${userType}`);
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (otp !== storedOtp) {
      // Increment attempts
      console.log(`[OTP] Comparing entered ${otp} to stored ${storedOtp}`);
      await redis.setEx(
        `otp:${normalizedPhone}:${userType}`,
        300,
        JSON.stringify({ otp: storedOtp, attempts: attempts + 1 })
      );
      throw new Error('Invalid OTP');
    }

    // Delete OTP after successful verification
    await redis.del(`otp:${normalizedPhone}:${userType}`);

    // Get or create user
    let user;
    if (userType === 'customer') {
      // check if customer exists
      user = await this.prisma.customer.findUnique({
        where: { phoneNumber: normalizedPhone }
      });

      // create new customer if doesnt exist
      if (!user) {
        if (!name) {
          throw new Error('Name is required for new customers.');
        }

        user = await this.prisma.customer.create({
          data: {
            phoneNumber: normalizedPhone,
            name: name,
            joinedAt: new Date()
          }
        });
      }
    } else {
      // vendor must exist
      user = await this.prisma.stallOwner.findUnique({
        where: { phoneNumber: normalizedPhone },
        include: { stall: true }
      });
      
      if (!user) {
        throw new Error('Vendor not found. Please contact support.');
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        phoneNumber: normalizedPhone,
        userType,
        role: userType
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return {
      token,
      user: {
        id: user.id,
        phoneNumber: normalizedPhone,
        name: user.name,
        userType
      }
    };
  }

  private async findOrCreateCustomer(phoneNumber: string) {
    let customer = await this.prisma.customer.findUnique({
      where: { phoneNumber }
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          phoneNumber,
          name: 'Guest User',
          joinedAt: new Date()
        }
      });
    }

    return customer;
  }

  private async findVendor(phoneNumber: string) {
    return await this.prisma.stallOwner.findUnique({
      where: { phoneNumber },
      include: {
        stall: true
      }
    });
  }
}