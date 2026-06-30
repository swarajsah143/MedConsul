export interface AllotmentEntry {
  id: number;
  allIndiaRank: number;
  stateRank: number | null;
  neetScore: number;
  category: string;
  subcategory: string;
  instituteName: string;
  state: string;
  seatType: 'Government' | 'Private' | 'Deemed';
  counselling: string;
  round: number;
  course: string;
}

export const ALL_STATES = [
  'All India Quota - MCC',
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

// Named institute pools for major states; smaller states get generated names
const NAMED_INSTITUTES: Record<string, string[]> = {
  'All India Quota - MCC': [
    'AIIMS, New Delhi', 'Maulana Azad Medical College, New Delhi',
    'VMMC & Safdarjung Hospital, New Delhi', 'Lady Hardinge Medical College, New Delhi',
    'University College Of Medical Sciences (UCMS) & GTB Hospital, Delhi',
    'Armed Forces Medical College (AFMC), Pune', 'JIPMER, Puducherry',
    'Grant Medical College & Sir JJ Hospital, Mumbai',
    'Seth G.S. Medical College & KEM Hospital, Mumbai',
    'B.J. Medical College, Ahmedabad', 'Stanley Medical College, Chennai',
    'Institute Of Medical Sciences, BHU, Varanasi',
    'King George\'s Medical University, Lucknow', 'SMS Medical College, Jaipur',
    'Government Medical College, Chandigarh',
  ],
  'Bihar': [
    'Government Medical College, Bettiah', 'Patna Medical College, Patna',
    'Nalanda Medical College, Patna', 'Darbhanga Medical College, Darbhanga',
    'Sri Krishna Medical College, Muzaffarpur', 'Anugrah Narayan Magadh Medical College, Gaya',
    'Jawaharlal Nehru Medical College, Bhagalpur', 'Government Medical College, Purnia',
  ],
  'Karnataka': [
    'Bangalore Medical College (BMCRI), Bengaluru', 'Mysore Medical College, Mysuru',
    'JSS Medical College, Mysuru', 'Kasturba Medical College (KMC), Manipal',
    'Kasturba Medical College (KMC), Mangalore', 'St. John\'s Medical College, Bengaluru',
    'M.S. Ramaiah Medical College, Bengaluru', 'Kempegowda Institute Of Medical Sciences, Bengaluru',
  ],
  'Maharashtra': [
    'Grant Medical College & Sir JJ Hospital, Mumbai', 'Seth G.S. Medical College & KEM Hospital, Mumbai',
    'Lokmanya Tilak Municipal Medical College, Mumbai', 'B.J. Medical College, Pune',
    'Government Medical College, Nagpur', 'Government Medical College, Aurangabad',
    'Dr. V.M. Government Medical College, Solapur', 'Indira Gandhi Government Medical College, Nagpur',
  ],
  'Tamil Nadu': [
    'Madras Medical College, Chennai', 'Stanley Medical College, Chennai',
    'Kilpauk Medical College, Chennai', 'Thanjavur Medical College, Thanjavur',
    'Coimbatore Medical College, Coimbatore', 'Government Medical College, Vellore',
    'Tirunelveli Medical College, Tirunelveli', 'Christian Medical College (CMC), Vellore',
  ],
  'Delhi': [
    'Maulana Azad Medical College, New Delhi', 'VMMC & Safdarjung Hospital, New Delhi',
    'Lady Hardinge Medical College, New Delhi',
    'University College Of Medical Sciences (UCMS) & GTB Hospital, Delhi',
    'Hamdard Institute Of Medical Sciences, New Delhi', 'Army College Of Medical Sciences, New Delhi',
  ],
  'Gujarat': [
    'B.J. Medical College, Ahmedabad', 'Government Medical College, Surat',
    'Government Medical College, Vadodara', 'Government Medical College, Bhavnagar',
    'Government Medical College, Rajkot', 'GMERS Medical College, Gandhinagar',
    'NHL Municipal Medical College, Ahmedabad',
  ],
  'Uttar Pradesh': [
    'King George\'s Medical University, Lucknow', 'Institute Of Medical Sciences, BHU, Varanasi',
    'S.N. Medical College, Agra', 'GSVM Medical College, Kanpur',
    'MLN Medical College, Prayagraj', 'Government Medical College, Gorakhpur',
    'Subharti Medical College, Meerut',
  ],
  'Rajasthan': [
    'SMS Medical College, Jaipur', 'Dr. S.N. Medical College, Jodhpur',
    'RNT Medical College, Udaipur', 'SP Medical College, Bikaner',
    'JLN Medical College, Ajmer', 'Government Medical College, Kota',
    'RUHS College Of Medical Sciences, Jaipur',
  ],
  'Andhra Pradesh': [
    'Andhra Medical College, Visakhapatnam', 'Guntur Medical College, Guntur',
    'Rangaraya Medical College, Kakinada', 'Siddhartha Medical College, Vijayawada',
    'Kurnool Medical College, Kurnool', 'S.V. Medical College, Tirupati',
  ],
  'Kerala': [
    'Government Medical College, Thiruvananthapuram', 'Government Medical College, Kottayam',
    'Government Medical College, Thrissur', 'Government Medical College, Kozhikode',
    'Government Medical College, Ernakulam', 'Amrita Institute Of Medical Sciences, Kochi',
  ],
  'Madhya Pradesh': [
    'Gandhi Medical College, Bhopal', 'G.R. Medical College, Gwalior',
    'M.G.M. Medical College, Indore', 'S.S. Medical College, Rewa',
    'Bundelkhand Medical College, Sagar', 'Government Medical College, Jabalpur',
  ],
  'West Bengal': [
    'Medical College Kolkata', 'R.G. Kar Medical College, Kolkata',
    'N.R.S. Medical College, Kolkata', 'Calcutta National Medical College, Kolkata',
    'Burdwan Medical College, Burdwan', 'North Bengal Medical College, Siliguri',
  ],
  'Telangana': [
    'Osmania Medical College, Hyderabad', 'Gandhi Medical College, Hyderabad',
    'Kakatiya Medical College, Warangal', 'Government Medical College, Nizamabad',
    'Government Medical College, Mahabubnagar',
  ],
  'Punjab': [
    'Government Medical College, Patiala', 'Government Medical College, Amritsar',
    'Dayanand Medical College, Ludhiana', 'Christian Medical College, Ludhiana',
    'Government Medical College, Faridkot',
  ],
  'Haryana': [
    'Pt. B.D. Sharma PGIMS, Rohtak', 'BPS Government Medical College, Khanpur Kalan',
    'Maharaja Agrasen Medical College, Agroha', 'ESIC Medical College, Faridabad',
    'Government Medical College, Karnal',
  ],
  'Odisha': [
    'SCB Medical College, Cuttack', 'MKCG Medical College, Berhampur',
    'VIMSAR, Burla', 'Government Medical College, Koraput',
  ],
  'Jharkhand': [
    'Rajendra Institute Of Medical Sciences, Ranchi', 'MGM Medical College, Jamshedpur',
    'PMCH, Dhanbad', 'Government Medical College, Hazaribagh',
  ],
  'Assam': [
    'Gauhati Medical College, Guwahati', 'Assam Medical College, Dibrugarh',
    'Silchar Medical College, Silchar', 'Jorhat Medical College, Jorhat',
  ],
  'Chhattisgarh': [
    'Pt. J.N.M. Medical College, Raipur', 'Government Medical College, Rajnandgaon',
    'Cims Medical College, Bilaspur', 'Late Shri B.R.K.M. Government Medical College, Jagdalpur',
  ],
  'Uttarakhand': [
    'Government Medical College, Haldwani', 'AIIMS Rishikesh',
    'Government Doon Medical College, Dehradun', 'SGRRIM&HS, Dehradun',
  ],
  'Himachal Pradesh': [
    'IGMC, Shimla', 'Dr. RPGMC, Kangra at Tanda',
    'SLBSGMC, Mandi', 'Government Medical College, Hamirpur',
  ],
};

// For states without named institutes, generate generic ones
function getInstitutesForState(state: string): string[] {
  if (NAMED_INSTITUTES[state]) return NAMED_INSTITUTES[state];
  // Generate 3-5 generic institutes
  const count = 3 + (state.length % 3);
  const cities = ['Capital City', 'District HQ', 'Regional Center', 'University Town', 'Medical Hub'];
  return Array.from({ length: count }, (_, i) =>
    `Government Medical College, ${state} - ${cities[i % cities.length]}`
  );
}

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const SUBCATEGORIES: Record<string, string[]> = {
  'General': ['GENERAL', 'GENERAL-PH'],
  'OBC': ['OBC-NCL', 'OBC-NCL-PH'],
  'SC': ['SC', 'SC-PH'],
  'ST': ['ST', 'ST-PH'],
  'EWS': ['EWS', 'EWS-PH'],
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateAllotments(counselling: string): AllotmentEntry[] {
  const institutes = getInstitutesForState(counselling);
  const rand = seededRandom(counselling.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 17 + 42);
  const entries: AllotmentEntry[] = [];
  let id = 0;

  for (let roundNum = 1; roundNum <= 3; roundNum++) {
    for (const institute of institutes) {
      for (const cat of CATEGORIES) {
        const sub = SUBCATEGORIES[cat][0];
        const count = Math.floor(rand() * 3) + 1;
        for (let k = 0; k < count; k++) {
          id++;
          const baseRank = cat === 'General' ? 1 : cat === 'EWS' ? 5000 : cat === 'OBC' ? 3000 : cat === 'SC' ? 15000 : 25000;
          const rankSpread = cat === 'General' ? 50000 : cat === 'EWS' ? 80000 : cat === 'OBC' ? 60000 : 120000;
          const rank = baseRank + Math.floor(rand() * rankSpread);
          const score = Math.max(113, Math.min(720, Math.round(720 - (rank / 1000) * 3.5 + (rand() - 0.5) * 20)));
          const stateRank = counselling === 'All India Quota - MCC' ? null : Math.floor(rand() * (rank / 2)) + 1;
          const isDeemedName = /KMC|CMC|JSS|Amrita|Ramaiah|Hamdard|Subharti|St\. John|Dayanand|Christian/i.test(institute);
          const isPrivateName = /Private|Ramaiah|Hamdard|Subharti|St\. John|SGRRIM/i.test(institute);
          const seatType: AllotmentEntry['seatType'] = isDeemedName ? 'Deemed' : isPrivateName ? 'Private' : 'Government';

          entries.push({
            id,
            allIndiaRank: rank,
            stateRank,
            neetScore: score,
            category: cat,
            subcategory: sub,
            instituteName: institute,
            state: counselling === 'All India Quota - MCC'
              ? (institute.includes('Delhi') || institute.includes('New Delhi') ? 'Delhi' :
                 institute.includes('Mumbai') || institute.includes('Pune') ? 'Maharashtra' :
                 institute.includes('Chennai') ? 'Tamil Nadu' :
                 institute.includes('Ahmedabad') ? 'Gujarat' :
                 institute.includes('Varanasi') || institute.includes('Lucknow') ? 'Uttar Pradesh' :
                 institute.includes('Jaipur') ? 'Rajasthan' :
                 institute.includes('Chandigarh') ? 'Chandigarh' :
                 institute.includes('Puducherry') ? 'Puducherry' : 'Delhi')
              : counselling,
            seatType,
            counselling,
            round: roundNum,
            course: 'MBBS',
          });
        }
      }
    }
  }

  return entries.sort((a, b) => a.allIndiaRank - b.allIndiaRank);
}

const cache: Record<string, AllotmentEntry[]> = {};

export function getAllotmentsForCounselling(counselling: string): AllotmentEntry[] {
  if (!cache[counselling]) {
    cache[counselling] = generateAllotments(counselling);
  }
  return cache[counselling];
}

// Search across ALL states by rank range
export function searchAllotmentsByRank(minRank: number, maxRank: number): AllotmentEntry[] {
  const results: AllotmentEntry[] = [];
  for (const state of ALL_STATES) {
    const entries = getAllotmentsForCounselling(state);
    for (const e of entries) {
      if (e.allIndiaRank >= minRank && e.allIndiaRank <= maxRank) {
        results.push(e);
      }
    }
  }
  return results.sort((a, b) => a.allIndiaRank - b.allIndiaRank);
}

export const ALLOTMENT_FILTER_OPTIONS = {
  categories: CATEGORIES,
  seatTypes: ['Government', 'Private', 'Deemed'] as const,
  rounds: [1, 2, 3],
};
