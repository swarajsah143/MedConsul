import type { CollegeReview } from '@/services/college.service';

export const MOCK_COLLEGES: CollegeReview[] = [
  {
    id: 'college-1',
    name: 'All India Institute of Medical Sciences (AIIMS), New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    description:
      'India\'s premier medical institute, AIIMS New Delhi consistently ranks #1 nationally. Known for world-class faculty, cutting-edge research, and a 2400-bed hospital with massive clinical exposure.',
    thumbnail: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&h=400&fit=crop',
    established: 1956,
    affiliation: 'AIIMS (Autonomous)',
    website: 'https://www.aiims.edu',
    totalSeats: 125,
    coursesOffered: ['MBBS', 'B.Sc Nursing', 'B.Sc (Hons) Nursing'],
    neetCutoffRange: 'AIR 1 - 57 (General)',
    annualFees: '~1,628/yr',
    about:
      'All India Institute of Medical Sciences (AIIMS), New Delhi is an autonomous public medical university established by an Act of Parliament in 1956. It was designated as an Institute of National Importance under the AIIMS Act. AIIMS New Delhi serves as the apex body guiding national health policy and medical education standards. The institute has a sprawling 110-acre campus in the heart of New Delhi with state-of-the-art facilities for teaching, research, and patient care. Over 1 million outpatients and 80,000 inpatients are served annually across its departments.',
    facultyQuality:
      'AIIMS boasts some of the finest medical educators in the country, with over 700 faculty members. Most hold MD/MS/DM/MCh degrees from top institutions. Many are nationally and internationally recognized researchers who have published extensively in high-impact journals. Faculty members actively participate in formulating national health guidelines and protocols. The student-to-faculty ratio is exceptionally favorable, allowing personalized mentorship and hands-on guidance during clinical rotations.',
    campusInfrastructure:
      'The 110-acre campus houses ultramodern lecture theatres equipped with AV and teleconferencing, a well-stocked medical library with 24/7 digital access to journals, advanced simulation labs for clinical skill training, and dedicated research wings with BSL-3 laboratories. The campus also features an Olympic-size swimming pool, gymnasium, tennis courts, cricket and football grounds. Wi-Fi connectivity covers the entire campus including hostels.',
    hospitalFacilities:
      'AIIMS Hospital is a 2,478-bed tertiary care referral center with 60+ clinical departments. Key facilities include the Cardiothoracic Centre, National Cancer Institute (Jhajjar campus), Dr. R.P. Centre for Ophthalmic Sciences, Jai Prakash Narayan Apex Trauma Centre, and the new Mother & Child Block. The hospital operates multiple OTs equipped with robotic surgery platforms, hybrid catheterization labs, and radiation therapy bunkers. It serves as the ultimate referral point for complex cases from across India.',
    clinicalExposure:
      'Students get unparalleled clinical exposure from the 3rd year onward. With over 3 million OPD visits, 80,000+ admissions, and 60,000+ surgeries annually, students encounter a vast spectrum of diseases including rare tropical conditions. Every department runs daily rounds, grand rounds, case presentations, and mortality-morbidity conferences. Students actively participate in emergency management, ICU rotations, and subspecialty clinics.',
    patientLoad:
      'Annual OPD visits: ~3.5 million | Annual admissions: ~80,000 | Annual surgeries: ~60,000 | Emergency cases: ~250,000/yr. The massive patient load from across India ensures students witness rare pathologies, end-stage disease presentations, and diverse demographic profiles that few other institutions can match.',
    hostelFacilities:
      'Separate hostels for male and female students on campus with single-occupancy rooms for senior batches and shared rooms for juniors. Each hostel has common rooms, dining halls serving subsidized meals, laundry facilities, and indoor recreation areas. The hostel premises are secured with CCTV and round-the-clock security staff. Married accommodation is available for PG residents.',
    studentLife:
      'AIIMS fosters a vibrant campus culture. Pulse, the annual cultural festival, attracts students from across the nation. Multiple student-run clubs cover music, dance, drama, literary arts, and debate. Sports activities are well-organized with inter-AIIMS tournaments. The Students\' Union plays an active role in campus governance. Various research interest groups and community health outreach programs provide avenues beyond academics. Being located in central Delhi, students have easy access to cultural landmarks, markets, and public transport.',
    pros: [
      'Top-ranked medical institute in India with global recognition',
      'Virtually free education with minimal tuition fees',
      'Unmatched clinical exposure from massive patient volume',
      'World-class research infrastructure and funding opportunities',
      'Central Delhi location with excellent connectivity',
      'Strong alumni network in top global hospitals',
    ],
    cons: [
      'Extremely competitive admission (AIR < 60 for General)',
      'High academic pressure and workload can be stressful',
      'Hostel rooms can be small and dated in older blocks',
      'Bureaucratic processes for administrative tasks',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=500&fit=crop', caption: 'Main Hospital Building' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'Advanced Simulation Lab' },
      { url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop', caption: 'Lecture Hall' },
      { url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=500&fit=crop', caption: 'Campus Gardens' },
    ],
    reviewVideos: [
      { title: 'AIIMS Delhi Campus Tour 2025', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { title: 'Life as an MBBS Student at AIIMS', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-2',
    name: 'Maulana Azad Medical College (MAMC), New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    description:
      'One of India\'s oldest and most reputed government medical colleges, MAMC is affiliated with three major hospitals including the 2800-bed Lok Nayak Hospital.',
    thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop',
    established: 1958,
    affiliation: 'University of Delhi',
    website: 'https://mamc.delhi.gov.in',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 60 - 150 (General)',
    annualFees: '~4,445/yr',
    about:
      'Maulana Azad Medical College (MAMC) was established in 1958 and is affiliated with the University of Delhi. Located in central New Delhi near Delhi Gate, MAMC is associated with three teaching hospitals: Lok Nayak Hospital (2800 beds), G.B. Pant Hospital (1000 beds specializing in cardiology and neurosciences), and Guru Nanak Eye Centre. The combined bed strength of over 4000 makes it one of the highest clinical exposure institutions in India. MAMC has consistently produced top medical professionals who occupy leadership positions globally.',
    facultyQuality:
      'MAMC has a dedicated faculty pool of over 300 professors and associate professors, many of whom are recognized national experts. The Department of Cardiology at GB Pant Hospital is considered among the best in Asia. Faculty members are actively involved in multi-center clinical trials and national guideline development. Teaching methodology balances traditional bedside teaching with modern case-based learning.',
    campusInfrastructure:
      'The campus includes modern lecture halls, a digital medical library with access to international databases, well-equipped anatomy and physiology labs, and a clinical skills center. The campus is compact but well-maintained with a dedicated cafeteria, student lounges, and an auditorium. Recent renovations have modernized several teaching facilities.',
    hospitalFacilities:
      'Lok Nayak Hospital is a 2800-bed mega-hospital with comprehensive specialties. GB Pant Hospital houses one of India\'s premier cardiology and cardiothoracic surgery programs. Guru Nanak Eye Centre is a specialized ophthalmic facility. Combined, these hospitals handle over 2 million OPD visits annually and serve as key trauma and emergency centers for the Delhi government health system.',
    clinicalExposure:
      'With over 4000 combined beds and massive OPD footfall from Delhi\'s population, students receive outstanding clinical exposure. Emergency rotations at Lok Nayak are particularly intensive, handling major trauma, burns, and mass casualty events. Cardiology and cardiac surgery exposure at GB Pant is exceptional and rarely matched elsewhere.',
    patientLoad:
      'Annual OPD visits: ~2.5 million | Annual admissions: ~90,000 | Annual surgeries: ~50,000 | Emergency cases: ~200,000/yr. Being a government hospital in the capital, the patient load is consistently high with diverse pathology from surrounding states.',
    hostelFacilities:
      'On-campus hostels with single and shared rooms. Separate boys and girls hostels with mess facilities. The hostels are located adjacent to the hospital, making it convenient for early morning ward duties and emergency calls. Basic amenities including Wi-Fi, laundry, and common rooms are available.',
    studentLife:
      'MAMC hosts "Astitva" - one of the most celebrated medical college cultural fests in India. Active sports teams participate in inter-medical college tournaments. Several student-led academic societies organize workshops and guest lectures. The college\'s Delhi location provides access to cultural events, historical monuments, and a vibrant social scene.',
    pros: [
      'Among the highest clinical exposure in India (4000+ combined beds)',
      'Minimal fees with Delhi government subsidization',
      'Premier cardiology program at GB Pant Hospital',
      'Strong alumni network and placement record',
      'Central Delhi location with metro connectivity',
    ],
    cons: [
      'Campus is relatively small and crowded',
      'Hostel infrastructure could use modernization',
      'High patient load sometimes limits structured teaching time',
      'Limited on-campus recreational facilities',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop', caption: 'College Main Entrance' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'Hospital Ward' },
      { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop', caption: 'Operating Theatre' },
    ],
    reviewVideos: [
      { title: 'MAMC Campus & Hospital Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-3',
    name: 'Grant Medical College & Sir JJ Group of Hospitals, Mumbai',
    state: 'Maharashtra',
    city: 'Mumbai',
    type: 'Government',
    description:
      'Established in 1845, Grant Medical College is one of the oldest medical schools in Asia. Its associated JJ Hospital is a major trauma center and tertiary care facility in Mumbai.',
    thumbnail: 'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=600&h=400&fit=crop',
    established: 1845,
    affiliation: 'Maharashtra University of Health Sciences (MUHS)',
    website: 'https://gmcjjh.org',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 500 - 2500 (General, State)',
    annualFees: '~28,000/yr',
    about:
      'Grant Medical College, established in 1845, is one of the earliest medical colleges in Asia. Located in the Byculla area of Mumbai, it is affiliated with the Sir JJ Group of Hospitals, which includes the 1350-bed Sir JJ Hospital, St. George Hospital, Cama and Albless Hospital, and GT Hospital. The college has a rich heritage of medical education spanning over 175 years and has produced several prominent medical professionals and researchers.',
    facultyQuality:
      'The college has experienced faculty members across all departments. Many professors are known for their expertise in tropical medicine, surgery, and orthopedics. The teaching approach emphasizes hands-on clinical learning given the high patient volume. Several faculty members have published in reputed national and international journals.',
    campusInfrastructure:
      'The campus features historic Gothic architecture alongside modern teaching facilities. The college has updated its laboratories, added a digital library, and equipped lecture halls with audiovisual aids. A new academic block with simulation labs was recently inaugurated. The heritage buildings are heritage-protected and lend a distinctive character to the campus.',
    hospitalFacilities:
      'Sir JJ Hospital is a 1350-bed government hospital and is one of Mumbai\'s busiest tertiary care centers. It houses a Level-1 trauma center, burn unit, NICU, dialysis unit, and comprehensive surgical suites. The hospital handles a significant volume of accident and emergency cases given its location in central Mumbai. Associated hospitals add approximately 1000 additional beds across specialties.',
    clinicalExposure:
      'Students benefit from enormous case diversity in surgery, medicine, orthopedics, and emergency medicine. The hospital is a designated trauma center and receives cases from across Mumbai and surrounding districts. Obstetrics and gynecology exposure at Cama Hospital is excellent. Students see conditions ranging from industrial accidents to tropical infections.',
    patientLoad:
      'Annual OPD visits: ~1.8 million | Annual admissions: ~70,000 | Annual surgeries: ~40,000 | Emergency cases: ~150,000/yr. The hospital is a primary referral center for underprivileged communities in Mumbai.',
    hostelFacilities:
      'On-campus hostels with basic amenities. Separate male and female accommodations with mess facilities. Given the Mumbai location, space is limited but functional. Recent renovations have improved living conditions. Hostel is walking distance from the hospital and college buildings.',
    studentLife:
      'The college has active cultural and sports committees. The annual fest "Aescupalian" is a highlight. Proximity to Mumbai\'s vibrant cultural scene, including Gateway of India, Marine Drive, and various entertainment options, enriches student life. Multiple student clubs cover everything from debate to community service.',
    pros: [
      'One of Asia\'s oldest medical colleges with a rich heritage',
      'Excellent trauma and emergency medicine exposure',
      'Prime Mumbai location with good connectivity',
      'Strong surgical training tradition',
      'Affordable government college fees',
    ],
    cons: [
      'Infrastructure in some blocks is aging',
      'Limited hostel space due to Mumbai real estate constraints',
      'Can feel overwhelming due to patient volume',
      'Administrative processes can be slow',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&h=500&fit=crop', caption: 'Heritage College Building' },
      { url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=500&fit=crop', caption: 'Hospital Wing' },
      { url: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&h=500&fit=crop', caption: 'Medical Lab' },
    ],
    reviewVideos: [
      { title: 'Grant Medical College Campus Review', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-4',
    name: 'Bangalore Medical College and Research Institute (BMCRI)',
    state: 'Karnataka',
    city: 'Bengaluru',
    type: 'Government',
    description:
      'Established in 1955, BMCRI is Karnataka\'s premier government medical college with its teaching hospital Victoria Hospital being one of the largest government hospitals in South India.',
    thumbnail: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=400&fit=crop',
    established: 1955,
    affiliation: 'Rajiv Gandhi University of Health Sciences (RGUHS)',
    website: 'https://bmcri.karnataka.gov.in',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 400 - 1500 (General, State)',
    annualFees: '~70,150/yr',
    about:
      'Bangalore Medical College and Research Institute was established in 1955 and is one of Karnataka\'s most prestigious medical institutions. Located in the heart of Bengaluru on KR Road, the college is associated with multiple teaching hospitals including Victoria Hospital (900 beds), Vani Vilas Hospital (500 beds for women and children), Bowring and Lady Curzon Hospital (600 beds), and Minto Ophthalmic Hospital. The combined teaching bed strength exceeds 2500, providing excellent clinical training.',
    facultyQuality:
      'The faculty includes highly experienced professors and researchers. The Department of General Surgery and Orthopedics are particularly well-regarded. Several faculty members serve as examiners for RGUHS and national board examinations. Teaching combines traditional ward-based learning with modern simulation-based techniques.',
    campusInfrastructure:
      'The campus is centrally located in Bengaluru, featuring updated lecture halls, a comprehensive medical library, new anatomy and pathology museums, and clinical skill labs. Recent government funding has modernized several teaching blocks. The campus includes sports facilities and a student activity center.',
    hospitalFacilities:
      'Victoria Hospital is the primary teaching hospital with 900 beds and comprehensive specialties. Vani Vilas Hospital is one of the largest women\'s and children\'s hospitals in South India with high delivery rates. Bowring Hospital serves as an additional teaching facility. Combined surgical capacity is significant with multiple OT complexes and a busy emergency wing.',
    clinicalExposure:
      'Clinical exposure is extensive thanks to the diverse hospital network. Victoria Hospital\'s emergency department is one of the busiest in Karnataka. Obstetrics training at Vani Vilas is exceptional with thousands of deliveries annually. Students rotate through all associated hospitals, gaining broad exposure across specialties.',
    patientLoad:
      'Annual OPD visits: ~2 million | Annual admissions: ~85,000 | Annual deliveries (Vani Vilas): ~18,000 | Annual surgeries: ~35,000. The hospitals serve as referral centers for surrounding districts of Karnataka.',
    hostelFacilities:
      'Separate men\'s and women\'s hostels near the campus with mess facilities. The hostels are basic but functional. Being in the city center, students also have access to nearby food and shopping. Recent improvements include better Wi-Fi and refurbished common areas.',
    studentLife:
      'BMCRI has a lively campus culture with the annual cultural fest "Spandana" being a major event. The college cricket and football teams are competitive. Bengaluru\'s cosmopolitan character, pleasant climate, and thriving IT hub culture make student life enjoyable. Multiple student organizations cover academic, cultural, and social activities.',
    pros: [
      'Premier government medical college in Karnataka',
      'Outstanding obstetrics training at Vani Vilas Hospital',
      'Central Bengaluru location with great quality of life',
      'Multiple associated hospitals providing diverse exposure',
      'Moderate fees for government students',
    ],
    cons: [
      'Victoria Hospital infrastructure is aging in some wings',
      'High competition for state quota seats',
      'Hostel facilities are basic',
      'City center location means campus space is limited',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop', caption: 'Victoria Hospital' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'Teaching Lab' },
      { url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop', caption: 'College Campus' },
    ],
    reviewVideos: [
      { title: 'BMCRI Student Experience', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-5',
    name: 'Kasturba Medical College (KMC), Manipal',
    state: 'Karnataka',
    city: 'Manipal',
    type: 'Deemed',
    description:
      'One of India\'s premier private medical schools under Manipal Academy of Higher Education. Known for international curriculum standards, modern infrastructure, and a vibrant campus town.',
    thumbnail: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=400&fit=crop',
    established: 1953,
    affiliation: 'Manipal Academy of Higher Education (MAHE)',
    website: 'https://manipal.edu/kmc-manipal.html',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'MPH'],
    neetCutoffRange: 'AIR 15,000 - 45,000 (Management)',
    annualFees: '~17,80,000/yr',
    about:
      'Kasturba Medical College (KMC), Manipal, established in 1953 by Dr. T.M.A. Pai, is one of the flagship institutions under Manipal Academy of Higher Education (MAHE), a Deemed University. Located in the university town of Manipal in coastal Karnataka, KMC has earned a global reputation for quality medical education. The campus is self-contained with the Kasturba Hospital (2000 beds), multiple research centers, and residential areas forming a mini-city. KMC Manipal has a large international student cohort and has produced thousands of medical professionals practicing worldwide.',
    facultyQuality:
      'KMC Manipal has a robust faculty of over 500 members, many with international training and research credentials. The medical education unit actively implements innovative teaching methods including problem-based learning, flipped classrooms, and OSCE-based assessments. Several departments have active research collaborations with institutions in the US, UK, and Europe.',
    campusInfrastructure:
      'The Manipal campus is a self-sufficient university town spanning over 600 acres. KMC has state-of-the-art anatomy and simulation labs, fully digital lecture theatres, a massive central library, and advanced research facilities including a genomics center. Recreational facilities include a swimming pool, gym, multiple sports fields, an amphitheatre, and a food court with diverse cuisine options.',
    hospitalFacilities:
      'Kasturba Hospital is a 2000-bed multispecialty teaching hospital with NABH accreditation. It features advanced facilities including a PET-CT scanner, da Vinci robotic surgery system, bone marrow transplant unit, cardiac catheterization labs, and a comprehensive cancer center. The hospital attracts patients from across Karnataka, Goa, and Kerala.',
    clinicalExposure:
      'Students benefit from structured clinical rotations beginning in the 3rd semester itself. The integrated curriculum ensures early clinical exposure. With 2000 beds and comprehensive specialties, students see a wide range of cases. International elective rotations are available at partner institutions in over 20 countries.',
    patientLoad:
      'Annual OPD visits: ~1.5 million | Annual admissions: ~65,000 | Annual surgeries: ~30,000. While the patient load is slightly lower than major government hospitals, the structured clinical teaching and smaller batch sizes ensure quality learning per student.',
    hostelFacilities:
      'Modern hostels with single and twin-sharing AC rooms. Each hostel block has Wi-Fi, laundry, a gym, and common recreation areas. Multiple messes offer varied cuisine including South Indian, North Indian, and Continental options. The hostels are well-maintained and frequently renovated. Separate international student housing is available.',
    studentLife:
      'Manipal is often called a "student paradise." The annual tech fest TechTatva and cultural fest Utsav draw national participation. Over 100 student clubs cover everything from robotics to music to social outreach. The campus has a vibrant nightlife with cafes, restaurants, and student hangout zones. Beach towns like Malpe are just 8 km away. The diverse international student body creates a multicultural environment.',
    pros: [
      'International curriculum standards with global elective opportunities',
      'Modern 2000-bed NABH-accredited teaching hospital',
      'Beautiful self-contained campus town with excellent quality of life',
      'Strong international alumni network and global recognition',
      'Innovative teaching methodology and structured clinical training',
      'Vibrant student culture with 100+ clubs and societies',
    ],
    cons: [
      'High tuition fees (~18 lakh/year)',
      'Located in a small town, far from major metros',
      'NEET cutoff is more relaxed, leading to variable student motivation',
      'Humid coastal climate may not suit everyone',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=500&fit=crop', caption: 'Manipal University Campus' },
      { url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop', caption: 'Kasturba Hospital Entrance' },
      { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=500&fit=crop', caption: 'Campus Library' },
      { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&h=500&fit=crop', caption: 'Student Center' },
    ],
    reviewVideos: [
      { title: 'KMC Manipal Full Campus Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { title: 'Day in the Life of a KMC Student', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-6',
    name: 'Christian Medical College (CMC), Vellore',
    state: 'Tamil Nadu',
    city: 'Vellore',
    type: 'Private',
    description:
      'A pioneer in Indian medical education since 1900, CMC Vellore is renowned for its mission-driven approach, exceptional clinical care, and compassionate healthcare model.',
    thumbnail: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=400&fit=crop',
    established: 1900,
    affiliation: 'Tamil Nadu Dr. MGR Medical University',
    website: 'https://www.cmcvellore.ac.in',
    totalSeats: 100,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'Allied Health Sciences'],
    neetCutoffRange: 'AIR 2,000 - 6,000 (General)',
    annualFees: '~52,000/yr',
    about:
      'Christian Medical College (CMC), Vellore, was founded in 1900 by Dr. Ida S. Scudder, an American medical missionary. The institution has grown from a small clinic to one of India\'s most respected medical centers. CMC is unique in its integration of medical education with a strong service mission, prioritizing care for underprivileged communities. The main campus in Vellore houses a 2700-bed hospital, and the Chittoor campus (Ranipet) adds another 1500 beds. CMC was the first in India to perform a renal transplant, open-heart surgery, and bone marrow transplant.',
    facultyQuality:
      'CMC Vellore\'s faculty is considered among the best in India. Many department heads are international authority figures in their fields. The institution emphasizes a culture of service and academic excellence. Research output is prolific, with CMC consistently ranking among the top medical institutions in India for publications. The faculty-to-student ratio is excellent, allowing personalized attention.',
    campusInfrastructure:
      'The campus includes modern teaching blocks, a comprehensive medical library, research laboratories with BSL-3 facilities, and a new academic center. The simulation center houses advanced mannequins and VR-based surgical trainers. Despite its age, the institution has continuously modernized its facilities while preserving its historic architecture.',
    hospitalFacilities:
      'The 2700-bed main hospital is a NABH and JCI-accredited facility with advanced departments in cardiology, nephrology, neurosurgery, orthopedics, and pediatrics. Specialized centers include the Bone Marrow Transplant Unit, Retinoblastoma Center, Developmental Pediatrics, and Rehabilitation Institute. The campus hospital in Ranipet adds 1500 beds focused on community health and primary care.',
    clinicalExposure:
      'CMC provides outstanding clinical training with a strong emphasis on primary care and community medicine alongside tertiary specialties. The Rural Unit for Health and Social Affairs (RUHSA) in Kaniyambadi provides unique community health exposure. Students participate in outreach camps and rural health programs. The patient mix includes complex referred cases and routine community healthcare, providing a balanced clinical experience.',
    patientLoad:
      'Annual OPD visits: ~3 million | Annual admissions: ~90,000 | Annual surgeries: ~55,000 | Annual deliveries: ~8,000. CMC draws patients from across India and neighboring countries, particularly for complex surgical procedures.',
    hostelFacilities:
      'Well-maintained hostels with a strong community feel. Rooms are basic but comfortable. The hostel system follows a residential college model with dining halls, chapel, and recreation areas. Wardens and mentors ensure pastoral care. The community-oriented hostel culture is a defining feature of CMC campus life.',
    studentLife:
      'Student life at CMC revolves around a close-knit community. The annual "Medical College Day" celebrations, sports events, and Christmas programs are highlights. Student Christian Movement and various volunteering groups are active. The town of Vellore, while smaller than metros, has adequate amenities. The institution places strong emphasis on holistic development and ethical values alongside academics.',
    pros: [
      'World-class clinical care with JCI accreditation',
      'Strong emphasis on values-based medical education',
      'Exceptional faculty-to-student ratio',
      'Pioneer in multiple surgical firsts in India',
      'Affordable fees for a private institution',
      'Unique community health and rural medicine exposure',
    ],
    cons: [
      'Limited seats (100 MBBS) making admission very competitive',
      'Small-town location with limited nightlife/entertainment',
      'Admission process has additional steps beyond NEET',
      'Can be culturally conservative compared to metro campuses',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=500&fit=crop', caption: 'CMC Hospital Campus' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'Patient Care Ward' },
      { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop', caption: 'Surgery Suite' },
    ],
    reviewVideos: [
      { title: 'CMC Vellore - A Medical Legacy', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-7',
    name: 'Armed Forces Medical College (AFMC), Pune',
    state: 'Maharashtra',
    city: 'Pune',
    type: 'Government',
    description:
      'India\'s military medical school, AFMC trains medical officers for the Indian Armed Forces. Known for exceptional discipline, camaraderie, and all-round development alongside top-tier medical education.',
    thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop',
    established: 1948,
    affiliation: 'Maharashtra University of Health Sciences (MUHS)',
    website: 'https://afmc.nic.in',
    totalSeats: 150,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'M.Sc Nursing'],
    neetCutoffRange: 'AIR 100 - 800 (General, separate selection)',
    annualFees: 'Fully funded (service bond applies)',
    about:
      'Armed Forces Medical College (AFMC) was established in 1948 in Pune to train medical officers for the Indian Armed Forces. Located on a sprawling 110-acre campus in Pune Cantonment, AFMC provides a unique blend of military discipline and medical education. Graduates serve as commissioned officers in the Army Medical Corps (AMC). The college is associated with the 1200-bed Command Hospital (Southern Command). AFMC admission involves NEET qualification followed by a separate interview and personality assessment.',
    facultyQuality:
      'Faculty members are serving or retired military medical officers with extensive field experience, including deployment in conflict zones, disaster relief, and peacekeeping missions. This provides a unique perspective on emergency medicine, tropical diseases, and field surgery. Many faculty hold fellowships from international military medical institutions.',
    campusInfrastructure:
      'The 110-acre campus is impeccably maintained with modern classrooms, laboratories, a central library, indoor and outdoor sports complexes, shooting range, swimming pool, equestrian facilities, and parade grounds. The campus is self-contained with residential quarters, officers\' mess, canteens, and recreational clubs. Infrastructure standards reflect military precision and maintenance.',
    hospitalFacilities:
      'Command Hospital (Southern Command) is a 1200-bed tertiary care military hospital with advanced facilities across all medical and surgical specialties. The hospital serves armed forces personnel, veterans, and their families. Specialized units include a burns center, rehabilitation wing, and nuclear medicine department. The hospital adheres to strict protocols and quality standards.',
    clinicalExposure:
      'Clinical training is rigorous and well-structured. Students train at Command Hospital and rotate through military field postings. Exposure includes field surgery, aviation medicine, submarine medicine, and high-altitude medicine - experiences unique to AFMC. Disaster medicine and mass casualty management are integral parts of the curriculum.',
    patientLoad:
      'Annual OPD visits: ~800,000 | Annual admissions: ~35,000 | Annual surgeries: ~15,000. While the patient volume is lower than large government hospitals, the diversity of military-specific conditions and field medicine exposure compensates.',
    hostelFacilities:
      'Cadets live in well-maintained barracks-style hostels with strict daily routines including morning physical training. Rooms are shared in junior years and single-occupancy for seniors. Meals are served in a common mess with nutritious military-standard cuisine. The structured lifestyle builds discipline, time management, and camaraderie.',
    studentLife:
      'Life at AFMC is a unique blend of military and medical college culture. Physical fitness, drill, and outdoor activities are integral. The annual "Tattoo" cultural program and sports meet are major events. Strong bonds formed during training often last a lifetime. Students participate in adventure activities like rock climbing, trekking, and river crossing. The Pune location offers a pleasant climate and access to the city\'s cultural scene.',
    pros: [
      'Fully funded education with stipend during training',
      'Unique military medicine and field surgery exposure',
      'Exceptional campus infrastructure and quality of life',
      'Strong discipline, fitness, and leadership development',
      'Guaranteed career as a commissioned medical officer',
      'Lifelong bonds and alumni network across armed forces',
    ],
    cons: [
      'Mandatory service bond (7-14 years post-graduation)',
      'Limited freedom compared to civilian medical colleges',
      'Strict daily routine and military discipline',
      'Separate interview process adds complexity beyond NEET',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=500&fit=crop', caption: 'AFMC Campus' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'Training Facility' },
      { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&h=500&fit=crop', caption: 'Sports Complex' },
    ],
    reviewVideos: [
      { title: 'Life at AFMC Pune - Cadet Experience', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { title: 'AFMC Admission Process Explained', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-8',
    name: 'St. John\'s Medical College, Bengaluru',
    state: 'Karnataka',
    city: 'Bengaluru',
    type: 'Private',
    description:
      'A Minority Institution under the Catholic Bishops\' Conference of India, St. John\'s is known for community-focused medical education, strong research output, and compassionate healthcare.',
    thumbnail: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600&h=400&fit=crop',
    established: 1963,
    affiliation: 'Rajiv Gandhi University of Health Sciences (RGUHS)',
    website: 'https://www.stjohns.in',
    totalSeats: 150,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'MPH'],
    neetCutoffRange: 'AIR 8,000 - 25,000 (General)',
    annualFees: '~6,25,000/yr',
    about:
      'St. John\'s Medical College was established in 1963 on Sarjapur Road in Bengaluru. It is a unit of the St. John\'s National Academy of Health Sciences, run by the Catholic Bishops\' Conference of India. The institution combines quality medical education with a strong emphasis on community health, ethics, and service to marginalized populations. The 1200-bed St. John\'s Medical College Hospital is a NABH-accredited multispecialty teaching hospital.',
    facultyQuality:
      'The faculty is highly qualified with many professors holding international fellowships. The Department of Community Health is particularly renowned and serves as a WHO Collaborating Centre. Research output in public health, epidemiology, and clinical medicine is significant. Teaching emphasizes ethical practice, empathy, and evidence-based medicine.',
    campusInfrastructure:
      'The campus spans a green 135-acre area in Bengaluru with modern academic blocks, well-equipped laboratories, a central library with digital access, and comfortable student facilities. The campus includes a chapel, sports grounds, gymnasium, and cafeteria. The serene, green setting provides a conducive learning environment.',
    hospitalFacilities:
      'The 1200-bed NABH-accredited hospital has comprehensive departments including a renowned Poison Control Centre, cardiac center, cancer institute, and mother-child health wing. Advanced diagnostic equipment includes MRI, CT, PET-CT, and nuclear medicine facilities. The hospital is known for providing quality care at subsidized rates to economically weaker sections.',
    clinicalExposure:
      'Students receive balanced clinical exposure across tertiary specialties and primary care. The Department of Community Health runs rural health centers where students spend significant time. This combination of hospital-based and community-based training produces well-rounded physicians. The student-to-patient ratio is favorable for hands-on learning.',
    patientLoad:
      'Annual OPD visits: ~1.2 million | Annual admissions: ~45,000 | Annual surgeries: ~20,000. The hospital serves patients from across Karnataka and neighboring states, with a particular focus on underserved communities.',
    hostelFacilities:
      'Clean, well-maintained hostels within the campus with single and shared rooms. Separate boys and girls hostels with 24/7 security. Mess facilities serve quality multi-cuisine meals. The campus is residential in nature, fostering a close-knit community. Wi-Fi, laundry, and common recreation areas are available.',
    studentLife:
      'St. John\'s has a warm, community-oriented campus culture. Annual events include the cultural fest "Renaissance" and sports week. Student organizations are active in community health outreach, blood donation drives, and health awareness camps. The campus\' Bengaluru location provides access to the city\'s cultural and recreational offerings. Peer mentorship programs help juniors settle in.',
    pros: [
      'Strong community health focus with WHO Collaborating Centre',
      'NABH-accredited hospital with good clinical training',
      'Beautiful 135-acre green campus in Bengaluru',
      'Moderate fees compared to other private colleges',
      'Emphasis on ethics and compassionate medical practice',
      'Good research opportunities, especially in public health',
    ],
    cons: [
      'Admission process includes institutional selection criteria',
      'More conservative campus culture',
      'Clinical exposure slightly lower than top government colleges',
      'Some departments need infrastructure upgrades',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=500&fit=crop', caption: 'Campus Green Grounds' },
      { url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=500&fit=crop', caption: 'Hospital Building' },
      { url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop', caption: 'Academic Block' },
    ],
    reviewVideos: [
      { title: 'St. John\'s Medical College Overview', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
];
