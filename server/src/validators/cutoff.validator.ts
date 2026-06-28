import { z } from 'zod';

export const cutoffQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  state: z.string().optional(),
  college: z.string().optional(),
  course: z.string().optional(),
  category: z.string().optional(),
  quota: z.string().optional(),
  seatType: z.string().optional(),
  round: z.coerce.number().optional(),
  airMin: z.coerce.number().optional(),
  airMax: z.coerce.number().optional(),
  scoreMin: z.coerce.number().optional(),
  scoreMax: z.coerce.number().optional(),
  sortBy: z.enum(['air', 'score', 'college', 'fees']).default('air'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const createSavedFilterSchema = z.object({
  name: z.string().min(1, 'Filter name is required').max(100),
  filters: z.record(z.string(), z.any()),
});

export type CutoffQueryInput = z.infer<typeof cutoffQuerySchema>;
export type CreateSavedFilterInput = z.infer<typeof createSavedFilterSchema>;
