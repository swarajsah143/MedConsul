import { z } from 'zod';

export const createNotificationSchema = z.object({
  title: z.string({ message: 'Title is required' }).min(3, 'Title must be at least 3 characters').max(200),
  summary: z.string({ message: 'Summary is required' }).min(10, 'Summary must be at least 10 characters'),
  content: z.string().optional(),
  translationHi: z.string().optional(),
  state: z.string({ message: 'State is required' }).min(2),
  category: z.enum(['Schedule', 'Seat Matrix', 'Fee', 'Document', 'Result', 'General'], {
    message: 'Category must be one of: Schedule, Seat Matrix, Fee, Document, Result, General',
  }),
  counselingBody: z.string({ message: 'Counseling body is required' }).min(2),
  sourceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  isPublished: z.boolean().default(true),
});

export const updateNotificationSchema = createNotificationSchema.partial();

export const notificationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
  state: z.string().optional(),
  category: z.string().optional(),
  counselingBody: z.string().optional(),
  priority: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['publishedAt', 'title', 'priority', 'createdAt']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
