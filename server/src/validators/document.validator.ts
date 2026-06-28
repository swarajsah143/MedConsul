import { z } from 'zod';

export const listDocumentsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 50)),
    search: z.string().optional(),
    state: z.string().optional(),
    category: z.string().optional(),
    isRequired: z.enum(['true', 'false', 'all']).optional(),
  }),
});

export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>['query'];
