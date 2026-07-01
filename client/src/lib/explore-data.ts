// ────────────────────────────────────────────────────────────────
// Explore feature data — Universities, Courses, Branches, Blogs
// Static/mock dataset used by the Explore pages (UI only).
// ────────────────────────────────────────────────────────────────

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

export type UniversityType = 'Government' | 'Private' | 'Deemed' | 'AIIMS' | 'Central';

export interface University {
  id: string;
  name: string;
  state: string;
  city: string;
  type: UniversityType;
  established: number;
  courses: string[];
  branches: string[];
  website: string;
  image: string;
}

// Curated pool of medical campus / hospital photos (Unsplash). Assigned
// deterministically per university so every result card has a photo.
const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1587556930799-8dca6fad6d41?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1580281658626-ee379f3cce93?w=600&h=360&fit=crop',
  'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=360&fit=crop',
];

export const MEDICAL_COURSES = [
  'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'B.Sc Nursing', 'BPT', 'B.Pharm',
  'MD', 'MS', 'MDS', 'DM', 'MCh', 'DNB', 'M.Sc Nursing',
];

export const MEDICAL_BRANCHES = [
  'General Medicine', 'General Surgery', 'Pediatrics', 'Obstetrics & Gynaecology',
  'Orthopedics', 'Radiodiagnosis', 'Anesthesiology', 'Dermatology', 'Psychiatry',
  'Ophthalmology', 'ENT (Otorhinolaryngology)', 'Pathology', 'Microbiology',
  'Pharmacology', 'Anatomy', 'Physiology', 'Biochemistry', 'Community Medicine',
  'Cardiology', 'Neurology', 'Nephrology', 'Gastroenterology', 'Urology',
  'Cardiothoracic Surgery', 'Neurosurgery', 'Plastic Surgery', 'Medical Oncology',
  'Endocrinology',
];

// Branch pools by institute tier
const CORE_BRANCHES = [
  'General Medicine', 'General Surgery', 'Pediatrics', 'Obstetrics & Gynaecology',
  'Orthopedics', 'Radiodiagnosis', 'Anesthesiology', 'Dermatology', 'Psychiatry',
  'Ophthalmology', 'ENT (Otorhinolaryngology)', 'Pathology', 'Microbiology',
  'Pharmacology', 'Anatomy', 'Physiology', 'Biochemistry', 'Community Medicine',
];
const SUPER_BRANCHES = [
  'Cardiology', 'Neurology', 'Nephrology', 'Gastroenterology', 'Urology',
  'Cardiothoracic Surgery', 'Neurosurgery', 'Plastic Surgery', 'Medical Oncology',
  'Endocrinology',
];

const UG_ONLY = ['MBBS', 'B.Sc Nursing', 'BPT'];
const WITH_PG = ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'B.Sc Nursing', 'M.Sc Nursing', 'DNB'];
const WITH_MD_MS = ['MBBS', 'MD', 'MS', 'B.Sc Nursing', 'DNB'];
const DENTAL = ['BDS', 'MDS'];
const AYUSH = ['BAMS', 'BHMS'];

function uni(
  id: string, name: string, state: string, city: string, type: UniversityType,
  established: number, courses: string[], tier: 'apex' | 'major' | 'basic' | 'dental' | 'ayush', website: string
): University {
  let branches: string[];
  if (tier === 'apex') branches = [...CORE_BRANCHES, ...SUPER_BRANCHES];
  else if (tier === 'major') branches = [...CORE_BRANCHES, ...SUPER_BRANCHES.slice(0, 5)];
  else if (tier === 'basic') branches = CORE_BRANCHES;
  else if (tier === 'dental') branches = ['Oral & Maxillofacial Surgery', 'Orthodontics', 'Periodontics', 'Prosthodontics', 'Conservative Dentistry'];
  else branches = ['Ayurveda / Homeopathy Foundational Sciences'];
  const idx = (parseInt(id.replace(/\D/g, ''), 10) || 1) % IMAGE_POOL.length;
  return { id, name, state, city, type, established, courses, branches, website, image: IMAGE_POOL[idx] };
}

export const MEDICAL_UNIVERSITIES: University[] = [
  uni('u1', 'All India Institute of Medical Sciences (AIIMS), New Delhi', 'Delhi', 'New Delhi', 'AIIMS', 1956, WITH_PG, 'apex', 'https://www.aiims.edu'),
  uni('u2', 'Maulana Azad Medical College', 'Delhi', 'New Delhi', 'Government', 1958, WITH_PG, 'apex', 'https://www.mamc.ac.in'),
  uni('u3', 'University College of Medical Sciences (UCMS)', 'Delhi', 'New Delhi', 'Government', 1971, WITH_MD_MS, 'major', 'https://www.ucms.ac.in'),
  uni('u4', 'Vardhman Mahavir Medical College (VMMC) & Safdarjung Hospital', 'Delhi', 'New Delhi', 'Government', 1965, WITH_MD_MS, 'major', 'https://www.vmmc-sjh.nic.in'),
  uni('u5', 'Lady Hardinge Medical College', 'Delhi', 'New Delhi', 'Government', 1916, WITH_MD_MS, 'major', 'https://lhmc-hosp.gov.in'),

  uni('u6', 'Armed Forces Medical College (AFMC)', 'Maharashtra', 'Pune', 'Government', 1948, WITH_PG, 'apex', 'https://www.afmc.nic.in'),
  uni('u7', 'Seth GS Medical College & KEM Hospital', 'Maharashtra', 'Mumbai', 'Government', 1926, WITH_PG, 'apex', 'https://www.kem.edu'),
  uni('u8', 'Grant Government Medical College', 'Maharashtra', 'Mumbai', 'Government', 1845, WITH_MD_MS, 'major', 'https://www.ggmcjjh.org'),
  uni('u9', 'B.J. Government Medical College', 'Maharashtra', 'Pune', 'Government', 1946, WITH_MD_MS, 'major', 'https://www.bjmcpune.org'),

  uni('u10', 'Christian Medical College (CMC)', 'Tamil Nadu', 'Vellore', 'Deemed', 1900, WITH_PG, 'apex', 'https://www.cmch-vellore.edu'),
  uni('u11', 'Madras Medical College', 'Tamil Nadu', 'Chennai', 'Government', 1835, WITH_PG, 'apex', 'https://www.mmc.tn.gov.in'),
  uni('u12', 'Stanley Medical College', 'Tamil Nadu', 'Chennai', 'Government', 1938, WITH_MD_MS, 'major', 'https://www.stanleymedicalcollege.in'),

  uni('u13', 'JIPMER', 'Puducherry', 'Puducherry', 'Central', 1823, WITH_PG, 'apex', 'https://www.jipmer.edu.in'),

  uni('u14', 'Bangalore Medical College & Research Institute', 'Karnataka', 'Bengaluru', 'Government', 1955, WITH_MD_MS, 'major', 'https://www.bmcri.org'),
  uni('u15', 'Kasturba Medical College', 'Karnataka', 'Manipal', 'Deemed', 1953, WITH_PG, 'apex', 'https://manipal.edu/kmc-manipal.html'),
  uni('u16', 'St. John\'s Medical College', 'Karnataka', 'Bengaluru', 'Private', 1963, WITH_MD_MS, 'major', 'https://www.stjohns.in'),

  uni('u17', 'King George\'s Medical University (KGMU)', 'Uttar Pradesh', 'Lucknow', 'Government', 1911, WITH_PG, 'apex', 'https://www.kgmu.org'),
  uni('u18', 'Institute of Medical Sciences, BHU', 'Uttar Pradesh', 'Varanasi', 'Central', 1960, WITH_PG, 'apex', 'https://www.bhu.ac.in/ims'),
  uni('u19', 'Sanjay Gandhi Postgraduate Institute (SGPGI)', 'Uttar Pradesh', 'Lucknow', 'Government', 1983, ['MD', 'MS', 'DM', 'MCh', 'DNB'], 'apex', 'https://www.sgpgims.org.in'),

  uni('u20', 'AIIMS Bhubaneswar', 'Odisha', 'Bhubaneswar', 'AIIMS', 2012, WITH_MD_MS, 'major', 'https://aiimsbhubaneswar.nic.in'),
  uni('u21', 'SCB Medical College', 'Odisha', 'Cuttack', 'Government', 1944, WITH_MD_MS, 'major', 'https://www.scbmch.ac.in'),

  uni('u22', 'AIIMS Patna', 'Bihar', 'Patna', 'AIIMS', 2012, WITH_MD_MS, 'major', 'https://www.aiimspatna.edu.in'),
  uni('u23', 'Patna Medical College', 'Bihar', 'Patna', 'Government', 1925, WITH_MD_MS, 'major', 'https://pmch.bihar.gov.in'),

  uni('u24', 'B.J. Medical College', 'Gujarat', 'Ahmedabad', 'Government', 1871, WITH_MD_MS, 'major', 'https://www.bjmc.edu'),
  uni('u25', 'AIIMS Rajkot', 'Gujarat', 'Rajkot', 'AIIMS', 2020, ['MBBS', 'B.Sc Nursing'], 'basic', 'https://www.aiimsrajkot.edu.in'),

  uni('u26', 'SMS Medical College', 'Rajasthan', 'Jaipur', 'Government', 1947, WITH_MD_MS, 'major', 'https://www.smsmedicalcollege.in'),
  uni('u27', 'AIIMS Jodhpur', 'Rajasthan', 'Jodhpur', 'AIIMS', 2012, WITH_MD_MS, 'major', 'https://www.aiimsjodhpur.edu.in'),

  uni('u28', 'Gandhi Medical College', 'Madhya Pradesh', 'Bhopal', 'Government', 1955, WITH_MD_MS, 'major', 'https://www.gmcbhopal.net'),
  uni('u29', 'AIIMS Bhopal', 'Madhya Pradesh', 'Bhopal', 'AIIMS', 2012, WITH_MD_MS, 'major', 'https://www.aiimsbhopal.edu.in'),

  uni('u30', 'Government Medical College', 'Kerala', 'Thiruvananthapuram', 'Government', 1951, WITH_MD_MS, 'major', 'https://www.tmc.kerala.gov.in'),
  uni('u31', 'Amrita Institute of Medical Sciences', 'Kerala', 'Kochi', 'Deemed', 1998, WITH_PG, 'apex', 'https://www.amritahospitals.org'),

  uni('u32', 'Osmania Medical College', 'Telangana', 'Hyderabad', 'Government', 1846, WITH_MD_MS, 'major', 'https://www.osmaniamedicalcollege.org'),
  uni('u33', 'Nizam\'s Institute of Medical Sciences (NIMS)', 'Telangana', 'Hyderabad', 'Government', 1964, WITH_PG, 'apex', 'https://www.nims.edu.in'),

  uni('u34', 'Andhra Medical College', 'Andhra Pradesh', 'Visakhapatnam', 'Government', 1923, WITH_MD_MS, 'major', 'https://www.amc.edu.in'),

  uni('u35', 'Medical College Kolkata', 'West Bengal', 'Kolkata', 'Government', 1835, WITH_MD_MS, 'major', 'https://www.medicalcollegekolkata.in'),
  uni('u36', 'Institute of Post Graduate Medical Education & Research (IPGMER)', 'West Bengal', 'Kolkata', 'Government', 1957, WITH_PG, 'apex', 'https://www.ipgmer.gov.in'),

  uni('u37', 'Postgraduate Institute of Medical Education & Research (PGIMER)', 'Chandigarh', 'Chandigarh', 'Central', 1962, WITH_PG, 'apex', 'https://www.pgimer.edu.in'),
  uni('u38', 'Government Medical College & Hospital', 'Chandigarh', 'Chandigarh', 'Government', 1991, WITH_MD_MS, 'major', 'https://www.gmch.gov.in'),

  uni('u39', 'Government Medical College', 'Punjab', 'Patiala', 'Government', 1953, WITH_MD_MS, 'major', 'https://www.gmcpatiala.com'),
  uni('u40', 'Dayanand Medical College & Hospital', 'Punjab', 'Ludhiana', 'Private', 1934, WITH_MD_MS, 'major', 'https://www.dmch.edu'),

  uni('u41', 'Pt. B.D. Sharma PGIMS', 'Haryana', 'Rohtak', 'Government', 1960, WITH_MD_MS, 'major', 'https://www.uhsr.ac.in'),
  uni('u42', 'Government Medical College & Hospital', 'Assam', 'Guwahati', 'Government', 1960, WITH_MD_MS, 'major', 'https://www.gmch.assam.gov.in'),
  uni('u43', 'Indira Gandhi Medical College', 'Himachal Pradesh', 'Shimla', 'Government', 1966, WITH_MD_MS, 'major', 'https://www.igmcshimla.org'),
  uni('u44', 'Government Medical College', 'Jammu and Kashmir', 'Srinagar', 'Government', 1959, WITH_MD_MS, 'major', 'https://www.gmcsrinagar.edu.in'),
  uni('u45', 'Goa Medical College', 'Goa', 'Bambolim', 'Government', 1842, WITH_MD_MS, 'major', 'https://www.gmc.goa.gov.in'),
  uni('u46', 'Rajendra Institute of Medical Sciences (RIMS)', 'Jharkhand', 'Ranchi', 'Government', 1960, WITH_MD_MS, 'major', 'https://www.rimsranchi.org'),
  uni('u47', 'Pt. Jawaharlal Nehru Memorial Medical College', 'Chhattisgarh', 'Raipur', 'Government', 1963, WITH_MD_MS, 'major', 'https://www.cimsraipur.org'),
  uni('u48', 'Government Doon Medical College', 'Uttarakhand', 'Dehradun', 'Government', 2016, ['MBBS', 'B.Sc Nursing'], 'basic', 'https://www.gdmc.ac.in'),
  uni('u49', 'Regional Institute of Medical Sciences (RIMS)', 'Manipur', 'Imphal', 'Government', 1972, WITH_MD_MS, 'major', 'https://www.rims.edu.in'),

  // Dental & AYUSH examples
  uni('u50', 'Maulana Azad Institute of Dental Sciences', 'Delhi', 'New Delhi', 'Government', 1990, DENTAL, 'dental', 'https://maids.ac.in'),
  uni('u51', 'Government Dental College & Hospital', 'Maharashtra', 'Mumbai', 'Government', 1938, DENTAL, 'dental', 'https://gdcmumbai.com'),
  uni('u52', 'National Institute of Ayurveda', 'Rajasthan', 'Jaipur', 'Government', 1976, AYUSH, 'ayush', 'https://www.nia.nic.in'),
  uni('u53', 'National Institute of Homoeopathy', 'West Bengal', 'Kolkata', 'Government', 1975, AYUSH, 'ayush', 'https://www.nih.nic.in'),
];

export function searchUniversities(name: string, state: string): University[] {
  const q = name.trim().toLowerCase();
  return MEDICAL_UNIVERSITIES.filter((u) => {
    const matchName = !q || u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
    const matchState = state === 'All States' || u.state === state;
    return matchName && matchState;
  });
}

export function searchByCourse(course: string, branch: string): University[] {
  return MEDICAL_UNIVERSITIES.filter((u) => {
    const matchCourse = course === 'All Courses' || u.courses.includes(course);
    const matchBranch = branch === 'All Branches' || u.branches.includes(branch);
    return matchCourse && matchBranch;
  });
}

// ────────────────────────────────────────────────────────────────
// Blogs
// ────────────────────────────────────────────────────────────────

export interface Blog {
  id: string;
  title: string;
  excerpt: string;
  category: 'University' | 'Research' | 'Discovery' | 'Admissions' | 'Career';
  author: string;
  date: string;
  readTime: string;
  tags: string[];
  url: string;
}

export const BLOGS: Blog[] = [
  {
    id: 'b1',
    title: 'Inside AIIMS New Delhi: What Makes India\'s #1 Medical Institute Tick',
    excerpt: 'A deep look at the faculty, research output, and clinical exposure that keep AIIMS New Delhi at the top of the NIRF rankings year after year.',
    category: 'University',
    author: 'Dr. Ananya Rao',
    date: '2026-06-18',
    readTime: '7 min',
    tags: ['AIIMS', 'Delhi', 'Rankings', 'Faculty'],
    url: '#',
  },
  {
    id: 'b2',
    title: 'CRISPR Gene Editing Trials Show Promise for Sickle Cell Disease in India',
    excerpt: 'Indian research hospitals join global trials using CRISPR-Cas9 to treat inherited blood disorders — early results are encouraging.',
    category: 'Research',
    author: 'Dr. Vikram Nair',
    date: '2026-06-12',
    readTime: '6 min',
    tags: ['CRISPR', 'Genetics', 'Sickle Cell', 'Clinical Trials'],
    url: '#',
  },
  {
    id: 'b3',
    title: 'New Antibiotic Class Discovered to Combat Drug-Resistant Tuberculosis',
    excerpt: 'Scientists identify a novel compound effective against MDR-TB, a breakthrough for one of India\'s biggest public-health challenges.',
    category: 'Discovery',
    author: 'Dr. Meera Krishnan',
    date: '2026-06-05',
    readTime: '5 min',
    tags: ['Tuberculosis', 'Antibiotics', 'Microbiology', 'Public Health'],
    url: '#',
  },
  {
    id: 'b4',
    title: 'CMC Vellore: A Century of Compassionate Care and Rural Outreach',
    excerpt: 'How Christian Medical College Vellore built one of the most respected medical training and service ecosystems in South Asia.',
    category: 'University',
    author: 'Dr. Joseph Thomas',
    date: '2026-05-28',
    readTime: '8 min',
    tags: ['CMC Vellore', 'Tamil Nadu', 'Rural Health'],
    url: '#',
  },
  {
    id: 'b5',
    title: 'AI in Radiology: How Indian Hospitals Are Deploying Deep Learning for Faster Diagnoses',
    excerpt: 'From chest X-ray triage to CT stroke detection, machine-learning tools are moving from research labs into everyday clinical workflows.',
    category: 'Research',
    author: 'Dr. Sneha Gupta',
    date: '2026-05-20',
    readTime: '6 min',
    tags: ['AI', 'Radiology', 'Deep Learning', 'Diagnostics'],
    url: '#',
  },
  {
    id: 'b6',
    title: 'NEET-PG Counselling 2026: A Step-by-Step Guide for Aspirants',
    excerpt: 'Everything you need to know about registration, choice filling, and seat allotment for postgraduate medical admissions this year.',
    category: 'Admissions',
    author: 'MedCounsel Team',
    date: '2026-05-15',
    readTime: '9 min',
    tags: ['NEET-PG', 'Counselling', 'Admissions', 'MCC'],
    url: '#',
  },
  {
    id: 'b7',
    title: 'Breakthrough in mRNA Vaccines: Indian Labs Scale Up Next-Gen Platforms',
    excerpt: 'Following COVID-era momentum, domestic biotech firms are building mRNA platforms targeting cancer and infectious diseases.',
    category: 'Discovery',
    author: 'Dr. Rohit Menon',
    date: '2026-05-08',
    readTime: '7 min',
    tags: ['mRNA', 'Vaccines', 'Biotech', 'Oncology'],
    url: '#',
  },
  {
    id: 'b8',
    title: 'Choosing Between MD and MS: How to Pick Your PG Specialty',
    excerpt: 'A practical framework for medical graduates weighing clinical interest, lifestyle, and career prospects across specialties.',
    category: 'Career',
    author: 'Dr. Priya Sharma',
    date: '2026-04-30',
    readTime: '5 min',
    tags: ['MD', 'MS', 'Career', 'Specialty'],
    url: '#',
  },
  {
    id: 'b9',
    title: 'PGIMER Chandigarh Leads Multi-Centre Study on Diabetic Retinopathy Screening',
    excerpt: 'A landmark national study uses portable fundus cameras and AI to screen diabetic patients in underserved districts.',
    category: 'Research',
    author: 'Dr. Harpreet Singh',
    date: '2026-04-22',
    readTime: '6 min',
    tags: ['PGIMER', 'Diabetes', 'Ophthalmology', 'Screening'],
    url: '#',
  },
  {
    id: 'b10',
    title: 'KGMU Lucknow Opens Advanced Robotic Surgery Centre',
    excerpt: 'King George\'s Medical University adds a state-of-the-art robotic surgery suite, expanding minimally invasive care in North India.',
    category: 'University',
    author: 'Dr. Aisha Khan',
    date: '2026-04-14',
    readTime: '4 min',
    tags: ['KGMU', 'Robotic Surgery', 'Uttar Pradesh'],
    url: '#',
  },
  {
    id: 'b11',
    title: 'Wearable ECG Patches: Early Detection of Arrhythmias Goes Mainstream',
    excerpt: 'Cardiologists report growing use of consumer-grade wearables to catch atrial fibrillation before it becomes dangerous.',
    category: 'Discovery',
    author: 'Dr. Karthik Reddy',
    date: '2026-04-06',
    readTime: '5 min',
    tags: ['Cardiology', 'Wearables', 'Arrhythmia'],
    url: '#',
  },
  {
    id: 'b12',
    title: 'Life at JIPMER: A Student\'s Honest Take on Academics and Hostel Life',
    excerpt: 'From rigorous clinical postings to affordable fees, a final-year student shares what studying at JIPMER Puducherry is really like.',
    category: 'University',
    author: 'Ravi Subramaniam',
    date: '2026-03-29',
    readTime: '6 min',
    tags: ['JIPMER', 'Student Life', 'Puducherry'],
    url: '#',
  },
];

export const BLOG_CATEGORIES: Blog['category'][] = ['University', 'Research', 'Discovery', 'Admissions', 'Career'];

export function searchBlogs(query: string, category: string): Blog[] {
  const q = query.trim().toLowerCase();
  return BLOGS.filter((b) => {
    const matchCat = category === 'All' || b.category === category;
    const matchQuery =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.excerpt.toLowerCase().includes(q) ||
      b.tags.some((t) => t.toLowerCase().includes(q)) ||
      b.author.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });
}
