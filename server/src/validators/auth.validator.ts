import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z
    .string({ message: 'Phone number is required' })
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits')
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format. Use 10 digits or international format (e.g., +919999999999)'),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string({ message: 'Phone number is required' })
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits')
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
  otp: z
    .string({ message: 'OTP is required' })
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  neetScore: z.number().min(0).max(720).optional().nullable(),
  neetRank: z.number().min(1).optional().nullable(),
  category: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
