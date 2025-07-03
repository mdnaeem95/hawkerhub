import { z } from 'zod';

// Order schemas
export const CreateOrderSchema = z.object({
  tableId: z.string().cuid(),
  stallId: z.string().cuid(),
  items: z.array(z.object({
    menuItemId: z.string().cuid(),
    quantity: z.number().int().positive(),
    specialInstructions: z.string().optional(),
  })).min(1),
  paymentMode: z.enum(['CASH', 'PAYNOW', 'GRABPAY', 'PAYLAH']),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
});

// Menu schemas
export const CreateMenuItemSchema = z.object({
  name: z.string().min(1),
  nameZh: z.string().optional(),
  nameMy: z.string().optional(),
  nameTa: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterStallOwnerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^[89]\d{7}$/), // Singapore phone format
  password: z.string().min(6),
  stallId: z.string().cuid(),
});

// Type exports
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterStallOwnerInput = z.infer<typeof RegisterStallOwnerSchema>;