export interface StateInfo {
  id: string;
  name: string;
}

export const STATES: StateInfo[] = [
  { id: 'MCC', name: 'All India Quota - MCC' },
  { id: '29', name: 'Andaman and Nicobar Islands' },
  { id: '1', name: 'Andhra Pradesh' },
  { id: '2', name: 'Arunachal Pradesh' },
  { id: '3', name: 'Assam' },
  { id: '4', name: 'Bihar' },
  { id: '30', name: 'Chandigarh' },
  { id: '5', name: 'Chhattisgarh' },
  { id: '2184', name: 'Dadra and Nagar Haveli' },
  { id: '32', name: 'Delhi' },
  { id: '6', name: 'Goa' },
  { id: '7', name: 'Gujarat' },
  { id: '8', name: 'Haryana' },
  { id: '9', name: 'Himachal Pradesh' },
  { id: '33', name: 'Jammu and Kashmir' },
  { id: '10', name: 'Jharkhand' },
  { id: '11', name: 'Karnataka' },
  { id: '12', name: 'Kerala' },
  { id: '34', name: 'Ladakh' },
  { id: '13', name: 'Madhya Pradesh' },
  { id: '14', name: 'Maharashtra' },
  { id: '15', name: 'Manipur' },
  { id: '16', name: 'Meghalaya' },
  { id: '17', name: 'Mizoram' },
  { id: '18', name: 'Nagaland' },
  { id: '19', name: 'Odisha' },
  { id: '36', name: 'Puducherry' },
  { id: '20', name: 'Punjab' },
  { id: '21', name: 'Rajasthan' },
  { id: '22', name: 'Sikkim' },
  { id: '23', name: 'Tamil Nadu' },
  { id: '24', name: 'Telangana' },
  { id: '25', name: 'Tripura' },
  { id: '26', name: 'Uttar Pradesh' },
  { id: '27', name: 'Uttarakhand' },
  { id: '28', name: 'West Bengal' },
];

export const STATE_NAMES = STATES.filter((s) => s.id !== 'MCC').map((s) => s.name).sort();
