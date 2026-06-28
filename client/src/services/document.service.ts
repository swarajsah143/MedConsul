import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

export interface DocumentEntry {
  id: string;
  name: string;
  description?: string | null;
  state?: string | null;
  category?: string | null;
  isRequired: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  category?: string;
  isRequired?: string; // 'true', 'false', 'all'
}

export interface PaginatedDocuments {
  items: DocumentEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentFilterOptions {
  states: string[];
  categories: string[];
}

export const documentService = {
  async list(params?: ListDocumentsParams) {
    const res = await api.get<ApiResponse<PaginatedDocuments>>('/documents', { params });
    return res.data;
  },

  async getFilterOptions() {
    const res = await api.get<ApiResponse<DocumentFilterOptions>>('/documents/filters');
    return res.data;
  },
};

export default documentService;
