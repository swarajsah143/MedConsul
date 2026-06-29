export interface College {
  id: string;
  name: string;
  state: string;
  city: string;
  type: 'Government' | 'Private' | 'Deemed';
  totalSeats: number;
  website: string | null;
  isActive: boolean;
}
