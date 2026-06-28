import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

export interface CounselingNotification {
  id: string;
  title: string;
  summary: string;
  content?: string | null;
  translationHi?: string | null;
  state: string;
  category: 'Schedule' | 'Seat Matrix' | 'Fee' | 'Document' | 'Result' | 'General';
  counselingBody: string;
  pdfUrl?: string | null;
  pdfOriginalName?: string | null;
  sourceUrl?: string | null;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  isBookmarked?: boolean;
  bookmarkCount?: number;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  category?: string;
  counselingBody?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedNotifications {
  items: CounselingNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const notificationService = {
  /**
   * List notifications with search & filters
   */
  async list(params?: ListNotificationsParams) {
    const res = await api.get<ApiResponse<PaginatedNotifications>>('/notifications', { params });
    return res.data;
  },

  /**
   * Get notification by ID
   */
  async getById(id: string) {
    const res = await api.get<ApiResponse<{ notification: CounselingNotification }>>(`/notifications/${id}`);
    return res.data;
  },

  /**
   * Create notification (Admin)
   */
  async create(formData: FormData) {
    const res = await api.post<ApiResponse<{ notification: CounselingNotification }>>('/notifications', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Update notification (Admin)
   */
  async update(id: string, formData: FormData) {
    const res = await api.put<ApiResponse<{ notification: CounselingNotification }>>(`/notifications/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Delete notification (Admin)
   */
  async delete(id: string) {
    const res = await api.delete<ApiResponse>(`/notifications/${id}`);
    return res.data;
  },

  /**
   * Toggle bookmark status
   */
  async toggleBookmark(id: string) {
    const res = await api.post<ApiResponse<{ bookmarked: boolean; message: string }>>(`/notifications/${id}/bookmark`);
    return res.data;
  },

  /**
   * Get user's bookmarked notifications
   */
  async getBookmarks(page: number = 1, limit: number = 10) {
    const res = await api.get<ApiResponse<PaginatedNotifications>>('/notifications/user/bookmarks', {
      params: { page, limit },
    });
    return res.data;
  },

  /**
   * Fetch distinct filter options from server database
   */
  async getFilters() {
    const res = await api.get<ApiResponse<{ states: string[]; categories: string[]; counselingBodies: string[] }>>(
      '/notifications/filters'
    );
    return res.data;
  },
};

export default notificationService;
