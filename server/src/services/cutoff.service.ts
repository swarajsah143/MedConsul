import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import type {
  CutoffQueryInput,
  CreateSavedFilterInput,
} from '../validators/cutoff.validator';
import type { Prisma } from '@prisma/client';

export class CutoffService {
  /**
   * List cutoff entries with filters, search, and pagination
   */
  async list(query: CutoffQueryInput) {
    const {
      page, limit, search, state, college, course, category,
      quota, seatType, round, airMin, airMax, scoreMin, scoreMax,
      sortBy, sortOrder
    } = query;

    const where: Prisma.CutoffEntryWhereInput = {};

    // Relations filter
    const collegeFilter: Prisma.CollegeWhereInput = {};
    if (state) {
      collegeFilter.state = state;
    }
    if (college) {
      // Check if it's an ID or name
      if (college.length === 36 && college.includes('-')) {
        where.collegeId = college;
      } else {
        collegeFilter.name = { contains: college, mode: 'insensitive' };
      }
    }

    if (Object.keys(collegeFilter).length > 0) {
      where.college = collegeFilter;
    }

    // Search filter across college name or course
    if (search) {
      where.OR = [
        { college: { name: { contains: search, mode: 'insensitive' } } },
        { course: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Direct filters
    if (course) where.course = course;
    if (category) where.category = category;
    if (quota) where.quota = quota;
    if (seatType) where.seatType = seatType;
    if (round) where.round = round;

    // AIR Range
    if (airMin !== undefined || airMax !== undefined) {
      where.air = {};
      if (airMin !== undefined) where.air.gte = airMin;
      if (airMax !== undefined) where.air.lte = airMax;
    }

    // Score Range
    if (scoreMin !== undefined || scoreMax !== undefined) {
      where.score = {};
      if (scoreMin !== undefined) where.score.gte = scoreMin;
      if (scoreMax !== undefined) where.score.lte = scoreMax;
    }

    const skip = (page - 1) * limit;

    // Build orderBy
    let orderBy: Prisma.CutoffEntryOrderByWithRelationInput = {};
    if (sortBy === 'college') {
      orderBy = { college: { name: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [items, total] = await Promise.all([
      prisma.cutoffEntry.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          college: true,
        },
      }),
      prisma.cutoffEntry.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get distinct filter options and range bounds for Cutoff Analysis System
   */
  async getFilterOptions() {
    const [states, courses, categories, quotas, seatTypes, rounds, bounds] = await Promise.all([
      // States from College table
      prisma.college.findMany({
        select: { state: true },
        distinct: ['state'],
        orderBy: { state: 'asc' },
      }),
      // Courses from CutoffEntry table
      prisma.cutoffEntry.findMany({
        select: { course: true },
        distinct: ['course'],
        orderBy: { course: 'asc' },
      }),
      // Categories from CutoffEntry table
      prisma.cutoffEntry.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      // Quotas from CutoffEntry table
      prisma.cutoffEntry.findMany({
        select: { quota: true },
        distinct: ['quota'],
        orderBy: { quota: 'asc' },
      }),
      // Seat types from CutoffEntry table
      prisma.cutoffEntry.findMany({
        where: { NOT: { seatType: null } },
        select: { seatType: true },
        distinct: ['seatType'],
        orderBy: { seatType: 'asc' },
      }),
      // Rounds from CutoffEntry table
      prisma.cutoffEntry.findMany({
        select: { round: true },
        distinct: ['round'],
        orderBy: { round: 'asc' },
      }),
      // Min/Max bounds for AIR and Score
      prisma.$queryRaw`
        SELECT 
          MIN(air)::integer as "minAir", 
          MAX(air)::integer as "maxAir", 
          MIN(score)::integer as "minScore", 
          MAX(score)::integer as "maxScore"
        FROM cutoff_entries
      ` as Promise<any[]>,
    ]);

    // Fallback bounds if database is empty/raw query fails to return valid numbers
    const boundsObj = bounds && bounds[0] ? bounds[0] : { minAir: 1, maxAir: 200000, minScore: 100, maxScore: 720 };

    return {
      states: states.map((s) => s.state),
      courses: courses.map((c) => c.course),
      categories: categories.map((c) => c.category),
      quotas: quotas.map((q) => q.quota),
      seatTypes: seatTypes.map((s) => s.seatType).filter(Boolean) as string[],
      rounds: rounds.map((r) => r.round),
      bounds: {
        minAir: boundsObj.minAir ?? 1,
        maxAir: boundsObj.maxAir ?? 250000,
        minScore: boundsObj.minScore ?? 100,
        maxScore: boundsObj.maxScore ?? 720,
      },
    };
  }

  /**
   * Export filtered cutoff records as a CSV string
   */
  async exportCsv(query: Omit<CutoffQueryInput, 'page' | 'limit'>) {
    // Override page/limit to retrieve all matching items (cap at 10,000 for safety)
    const fullQuery = {
      ...query,
      page: 1,
      limit: 10000,
    };

    const result = await this.list(fullQuery);
    
    // CSV Header matching columns exactly
    const headers = [
      'Institute',
      'College Type',
      'Course',
      'State',
      'Quota',
      'Category',
      'Subcategory',
      'Seat Type',
      'Round',
      'AIR',
      'Score',
      'Fees'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = result.items.map((item) => [
      escapeCsv(item.college.name),
      escapeCsv(item.college.type),
      escapeCsv(item.course),
      escapeCsv(item.college.state),
      escapeCsv(item.quota),
      escapeCsv(item.category),
      escapeCsv(item.subcategory || 'N/A'),
      escapeCsv(item.seatType || 'General Seat'),
      escapeCsv(item.round),
      escapeCsv(item.air),
      escapeCsv(item.score || 'N/A'),
      escapeCsv(item.fees || 0),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Saved filter / bookmark filters methods
   */
  async saveFilter(userId: string, data: CreateSavedFilterInput) {
    return prisma.savedFilter.create({
      data: {
        userId,
        name: data.name,
        filters: data.filters as any,
      },
    });
  }

  async listSavedFilters(userId: string) {
    return prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSavedFilter(id: string, userId: string) {
    const filter = await prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!filter) throw new AppError('Filter bookmark not found', 404);
    if (filter.userId !== userId) throw new AppError('Unauthorized', 403);

    await prisma.savedFilter.delete({ where: { id } });
    return { success: true, message: 'Filter deleted successfully' };
  }
}
