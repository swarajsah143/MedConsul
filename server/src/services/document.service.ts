import { prisma } from '@/config/prisma';
import { Prisma } from '@prisma/client';
import type { ListDocumentsInput } from '../validators/document.validator';

export class DocumentService {
  async list(params: ListDocumentsInput) {
    const { page, limit, search, state, category, isRequired } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (state && state !== 'All') {
      where.OR = [
        ...(where.OR || []),
        { state },
        { state: null }
      ];
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (isRequired && isRequired !== 'all') {
      where.isRequired = isRequired === 'true';
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isRequired: 'desc' },
          { name: 'asc' }
        ],
      }),
      prisma.document.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilterOptions() {
    const [states, categories] = await Promise.all([
      prisma.document.findMany({
        select: { state: true },
        where: { state: { not: null } },
        distinct: ['state'],
        orderBy: { state: 'asc' },
      }),
      prisma.document.findMany({
        select: { category: true },
        where: { category: { not: null } },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);

    return {
      states: states.map((s) => s.state).filter(Boolean) as string[],
      categories: categories.map((c) => c.category).filter(Boolean) as string[],
    };
  }
}

export const documentService = new DocumentService();
