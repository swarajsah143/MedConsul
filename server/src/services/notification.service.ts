import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import type {
  CreateNotificationInput,
  UpdateNotificationInput,
  NotificationQueryInput,
} from '../validators/notification.validator';
import type { Prisma } from '@prisma/client';

export class NotificationService {
  /**
   * Create a new counseling notification (admin)
   */
  async create(data: CreateNotificationInput, pdfUrl?: string, pdfOriginalName?: string) {
    const notification = await prisma.counselingNotification.create({
      data: {
        title: data.title,
        summary: data.summary,
        content: data.content || null,
        translationHi: data.translationHi || null,
        state: data.state,
        category: data.category,
        counselingBody: data.counselingBody,
        sourceUrl: data.sourceUrl || null,
        priority: data.priority,
        isPublished: data.isPublished,
        pdfUrl: pdfUrl || null,
        pdfOriginalName: pdfOriginalName || null,
      },
    });
    return notification;
  }

  /**
   * Update a notification (admin)
   */
  async update(id: string, data: UpdateNotificationInput, pdfUrl?: string, pdfOriginalName?: string) {
    const existing = await prisma.counselingNotification.findUnique({ where: { id } });
    if (!existing) throw new AppError('Notification not found', 404);

    const updateData: any = { ...data };
    if (pdfUrl) {
      updateData.pdfUrl = pdfUrl;
      updateData.pdfOriginalName = pdfOriginalName;
    }

    const notification = await prisma.counselingNotification.update({
      where: { id },
      data: updateData,
    });
    return notification;
  }

  /**
   * Delete a notification (admin)
   */
  async delete(id: string) {
    const existing = await prisma.counselingNotification.findUnique({ where: { id } });
    if (!existing) throw new AppError('Notification not found', 404);

    await prisma.counselingNotification.delete({ where: { id } });
    return { message: 'Notification deleted successfully' };
  }

  /**
   * List notifications with filters, search, and pagination
   */
  async list(query: NotificationQueryInput, userId?: string) {
    const {
      page, limit, search, state, category, counselingBody,
      priority, dateFrom, dateTo, sortBy, sortOrder,
    } = query;

    const where: Prisma.CounselingNotificationWhereInput = {
      isPublished: true,
    };

    // Text search across title and summary
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { counselingBody: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (state) where.state = state;
    if (category) where.category = category;
    if (counselingBody) where.counselingBody = counselingBody;
    if (priority) where.priority = priority;

    // Date range filter
    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) where.publishedAt.gte = new Date(dateFrom);
      if (dateTo) where.publishedAt.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.counselingNotification.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          bookmarks: userId
            ? { where: { userId }, select: { id: true } }
            : false,
          _count: { select: { bookmarks: true } },
        },
      }),
      prisma.counselingNotification.count({ where }),
    ]);

    // Transform to include isBookmarked flag
    const transformedItems = items.map((item: any) => ({
      ...item,
      isBookmarked: userId ? item.bookmarks?.length > 0 : false,
      bookmarkCount: item._count?.bookmarks || 0,
      bookmarks: undefined,
      _count: undefined,
    }));

    return {
      items: transformedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single notification by ID
   */
  async getById(id: string, userId?: string) {
    const notification = await prisma.counselingNotification.findUnique({
      where: { id },
      include: {
        bookmarks: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        _count: { select: { bookmarks: true } },
      },
    });

    if (!notification) throw new AppError('Notification not found', 404);

    return {
      ...notification,
      isBookmarked: userId ? (notification as any).bookmarks?.length > 0 : false,
      bookmarkCount: (notification as any)._count?.bookmarks || 0,
      bookmarks: undefined,
      _count: undefined,
    };
  }

  /**
   * Toggle bookmark on a notification
   */
  async toggleBookmark(notificationId: string, userId: string) {
    const notification = await prisma.counselingNotification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new AppError('Notification not found', 404);

    const existing = await prisma.bookmark.findUnique({
      where: { userId_notificationId: { userId, notificationId } },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false, message: 'Bookmark removed' };
    }

    await prisma.bookmark.create({
      data: { userId, notificationId },
    });
    return { bookmarked: true, message: 'Bookmark added' };
  }

  /**
   * Get user's bookmarked notifications
   */
  async getBookmarks(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId },
        include: {
          notification: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);

    return {
      items: items.map((b) => ({ ...b.notification, isBookmarked: true })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get distinct filter options for the frontend dropdowns
   */
  async getFilterOptions() {
    const [states, categories, bodies] = await Promise.all([
      prisma.counselingNotification.findMany({
        where: { isPublished: true },
        select: { state: true },
        distinct: ['state'],
        orderBy: { state: 'asc' },
      }),
      prisma.counselingNotification.findMany({
        where: { isPublished: true },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      prisma.counselingNotification.findMany({
        where: { isPublished: true },
        select: { counselingBody: true },
        distinct: ['counselingBody'],
        orderBy: { counselingBody: 'asc' },
      }),
    ]);

    return {
      states: states.map((s) => s.state),
      categories: categories.map((c) => c.category),
      counselingBodies: bodies.map((b) => b.counselingBody),
    };
  }
}
