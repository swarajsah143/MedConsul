import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

export interface CollegeReview {
  id: string;
  name: string;
  state: string;
  city: string;
  type: 'Government' | 'Private' | 'Deemed';
  description: string;
  thumbnail: string;
  established: number;
  affiliation: string;
  website: string;
  totalSeats: number;
  coursesOffered: string[];
  neetCutoffRange: string;
  annualFees: string;
  about: string;
  facultyQuality: string;
  campusInfrastructure: string;
  hospitalFacilities: string;
  clinicalExposure: string;
  patientLoad: string;
  hostelFacilities: string;
  studentLife: string;
  pros: string[];
  cons: string[];
  gallery: { url: string; caption: string }[];
  reviewVideos: { title: string; embedUrl: string }[];
}

export interface CollegeListParams {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  type?: string;
}

export interface PaginatedColleges {
  items: CollegeReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CollegeFilterOptions {
  states: string[];
  types: string[];
}

export const collegeService = {
  async list(params?: CollegeListParams) {
    const res = await api.get<ApiResponse<PaginatedColleges>>('/colleges', { params });
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get<ApiResponse<{ college: CollegeReview }>>(`/colleges/${id}`);
    return res.data;
  },

  async getFilterOptions() {
    const res = await api.get<ApiResponse<CollegeFilterOptions>>('/colleges/filters');
    return res.data;
  },
};
