import { api } from '@/lib/api';

export interface College {
  id: string;
  name: string;
  state: string;
  city: string;
  type: string;
  totalSeats: number | null;
  website: string | null;
  isActive: boolean;
}

export interface CutoffEntry {
  id: string;
  collegeId: string;
  college: College;
  year: number;
  round: number;
  category: string;
  subcategory: string | null;
  quota: string;
  seatType: string | null;
  course: string;
  air: number;
  score: number | null;
  fees: number | null;
}

export interface CutoffListResponse {
  items: CutoffEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterBounds {
  minAir: number;
  maxAir: number;
  minScore: number;
  maxScore: number;
}

export interface FilterOptionsResponse {
  states: string[];
  courses: string[];
  categories: string[];
  quotas: string[];
  seatTypes: string[];
  rounds: number[];
  bounds: FilterBounds;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: any;
  createdAt: string;
}

export const cutoffService = {
  /**
   * List cutoff entries with filters
   */
  async list(params: any): Promise<{ success: boolean; data: CutoffListResponse }> {
    const res = await api.get('/cutoffs', { params });
    return res.data;
  },

  /**
   * Get dynamic filter options lists
   */
  async getFilterOptions(): Promise<{ success: boolean; data: FilterOptionsResponse }> {
    const res = await api.get('/cutoffs/filters');
    return res.data;
  },

  /**
   * Build export url
   */
  getExportUrl(params: any): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const baseUrl = api.defaults.baseURL || '/api';
    return `${baseUrl}/cutoffs/export?${query.toString()}`;
  },

  /**
   * Save filter
   */
  async saveFilter(name: string, filters: any): Promise<{ success: boolean; data: SavedFilter }> {
    const res = await api.post('/cutoffs/saved-filters', { name, filters });
    return res.data;
  },

  /**
   * Get bookmarked filters
   */
  async listSavedFilters(): Promise<{ success: boolean; data: SavedFilter[] }> {
    const res = await api.get('/cutoffs/saved-filters');
    return res.data;
  },

  /**
   * Delete saved filter
   */
  async deleteSavedFilter(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/cutoffs/saved-filters/${id}`);
    return res.data;
  },
};
