import { z } from 'zod';

export const phoneLoginSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits')
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format. Use 10 digits or include country code (e.g. +91)'),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

export type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
