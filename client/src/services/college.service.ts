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
  gallery: Array<{ url: string; caption: string }>;
  reviewVideos: Array<{ title: string; embedUrl: string }>;
}
