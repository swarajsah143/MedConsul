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
  // ───────────── NEW COLLEGES ─────────────
  {
    id: 'college-9',
    name: 'JIPMER, Puducherry',
    state: 'Puducherry',
    city: 'Puducherry',
    type: 'Government',
    description:
      'An Institute of National Importance, JIPMER is one of India\'s top-ranked government medical institutions known for affordable world-class education and a beautiful coastal campus.',
    thumbnail: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&h=400&fit=crop',
    established: 1823,
    affiliation: 'JIPMER (Autonomous - Institute of National Importance)',
    website: 'https://jipmer.edu.in',
    totalSeats: 200,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'B.Sc Nursing', 'MPH'],
    neetCutoffRange: 'AIR 100 - 300 (General)',
    annualFees: '~5,750/yr',
    about:
      'Jawaharlal Institute of Postgraduate Medical Education & Research (JIPMER), Puducherry, traces its origins to 1823 as a small dispensary under French colonial rule. Declared an Institute of National Importance by an Act of Parliament in 2008, JIPMER has evolved into one of India\'s foremost medical education and research centers. The 195-acre campus houses a 2200-bed hospital with state-of-the-art diagnostic and therapeutic facilities. JIPMER is known for its emphasis on community medicine and equitable healthcare delivery alongside tertiary specialties.',
    facultyQuality:
      'JIPMER has over 400 faculty members, many holding international fellowships and recognition. The Departments of Gastroenterology, Cardiology, and Community Medicine are nationally acclaimed. Faculty members lead multi-center research trials and contribute significantly to national health policy. The student-to-faculty ratio is among the best in the country.',
    campusInfrastructure:
      'The sprawling 195-acre campus features modern academic blocks, a comprehensive digital library, advanced simulation labs, anatomy museum, and research wings with molecular biology and genomics facilities. The campus includes sports facilities, an auditorium, swimming pool, and well-landscaped green areas. The coastal location adds to the campus ambiance.',
    hospitalFacilities:
      'The 2200-bed tertiary care hospital has advanced departments including a Super Specialty Block with cardiac surgery, neurosurgery, urology, plastic surgery, and endocrinology. Key facilities include a trauma center, NICU, dialysis unit, and a dedicated cancer center. The hospital also operates satellite health centers for community outreach.',
    clinicalExposure:
      'Students benefit from high patient volume with diverse pathology. Clinical rotations are well-structured with emphasis on both specialist and generalist training. The community medicine program includes extensive field training in rural Puducherry villages. Students also participate in the Outreach Program connecting JIPMER with primary health centers across the Union Territory.',
    patientLoad:
      'Annual OPD visits: ~2.8 million | Annual admissions: ~75,000 | Annual surgeries: ~45,000 | Emergency cases: ~180,000/yr. JIPMER draws patients from Puducherry, Tamil Nadu, Andhra Pradesh, and Kerala.',
    hostelFacilities:
      'Well-maintained hostels with single and shared rooms on campus. Separate hostels for men and women with mess facilities serving South Indian and North Indian cuisine. The hostels are close to the beach, and students often enjoy evening walks along the Puducherry promenade. Wi-Fi, sports rooms, and reading areas are available.',
    studentLife:
      'JIPMER has an active extracurricular scene. The annual cultural fest "Melange" is a major event. Students enjoy the unique Franco-Tamil culture of Puducherry, with its blend of French colonial architecture, beaches, and Auroville nearby. Multiple clubs for music, drama, photography, and sports are active. The relaxed Puducherry lifestyle provides a welcome counterbalance to the demanding curriculum.',
    pros: [
      'Institute of National Importance with autonomous status',
      'Near-free education (~Rs 5,750/yr tuition)',
      'Excellent clinical exposure with 2200-bed hospital',
      'Beautiful coastal campus with pleasant climate',
      'Strong community medicine and public health focus',
      'Top NEET rankers consistently prefer JIPMER',
    ],
    cons: [
      'Small-town feel may not appeal to metro-oriented students',
      'Some infrastructure is aging and under renovation',
      'Limited nightlife and shopping options',
      'High humidity during summer months',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&h=500&fit=crop', caption: 'JIPMER Main Building' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'Hospital Corridor' },
      { url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=500&fit=crop', caption: 'Campus Grounds' },
    ],
    reviewVideos: [
      { title: 'JIPMER Campus Life & Hospital Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-10',
    name: 'Seth GS Medical College & KEM Hospital, Mumbai',
    state: 'Maharashtra',
    city: 'Mumbai',
    type: 'Government',
    description:
      'One of Mumbai\'s most prestigious government medical colleges, Seth GS Medical College is associated with the iconic King Edward Memorial (KEM) Hospital, a 1800-bed tertiary care center.',
    thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop',
    established: 1926,
    affiliation: 'Maharashtra University of Health Sciences (MUHS)',
    website: 'https://www.kem.edu',
    totalSeats: 200,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 400 - 1200 (General, State)',
    annualFees: '~35,000/yr',
    about:
      'Seth Gordhandas Sunderdas Medical College, commonly known as Seth GS Medical College, was established in 1926 and is one of Mumbai\'s premier medical institutions. It is affiliated with King Edward Memorial (KEM) Hospital, a sprawling 1800-bed tertiary care center located in Parel, Mumbai. KEM Hospital is one of the busiest municipal hospitals in India and serves as a major trauma and emergency center. The institution has produced several distinguished medical professionals, including former directors of prestigious national hospitals.',
    facultyQuality:
      'The faculty at Seth GS includes renowned specialists across departments. The Departments of Surgery, Medicine, and Pathology have a long tradition of academic excellence. Faculty members are active researchers and many serve on national medical examination boards. The bedside teaching tradition is strong, with emphasis on clinical reasoning and practical skills.',
    campusInfrastructure:
      'The campus in Parel features a blend of heritage architecture and modern additions. The library is well-stocked with digital resources. Anatomy and pathology museums are among the best in Maharashtra. Recent upgrades include smart classrooms, a clinical skills lab, and an upgraded auditorium. The campus is compact but efficiently designed.',
    hospitalFacilities:
      'KEM Hospital has 1800 beds across medicine, surgery, orthopedics, ENT, ophthalmology, pediatrics, obstetrics, and psychiatry. It operates a Level-1 Trauma Center, a neonatal ICU, burns unit, and a dedicated liver transplant program. The hospital is one of Mumbai\'s primary referral centers for complex and critical cases.',
    clinicalExposure:
      'The clinical exposure at KEM is outstanding. Students encounter an immense variety of cases in emergency medicine, trauma, infectious diseases, and surgical subspecialties. The emergency department is one of the busiest in western India. Students participate in ward rounds, OPD clinics, OT procedures, and community outreach activities.',
    patientLoad:
      'Annual OPD visits: ~2.2 million | Annual admissions: ~85,000 | Annual surgeries: ~45,000 | Emergency cases: ~190,000/yr. KEM Hospital is the cornerstone of Mumbai\'s municipal healthcare system.',
    hostelFacilities:
      'On-campus hostels near the hospital. Rooms are basic but adequate. Separate male and female hostels with mess facilities. The Parel location offers good connectivity via suburban rail. Recent renovations have improved amenities including Wi-Fi and refurbished common rooms.',
    studentLife:
      'Seth GS has a rich tradition of medical college culture. The annual festival "Sethfest" features inter-college competitions. The drama society, debate club, and sports teams are active. Living in Mumbai\'s Parel area gives students access to the city\'s cultural richness, restaurants, and entertainment. The strong alumni network hosts regular mentorship and career guidance sessions.',
    pros: [
      'Iconic KEM Hospital with exceptional clinical exposure',
      'Affordable government fees with Mumbai BMC subsidization',
      'Strong surgical and emergency medicine training',
      'Prime Mumbai location with excellent connectivity',
      'Rich heritage and strong alumni network',
    ],
    cons: [
      'Campus space is limited in congested Parel area',
      'Hostel rooms are small and dated',
      'Very high patient load can sometimes overwhelm teaching',
      'Mumbai cost of living is high even with hostel',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop', caption: 'KEM Hospital Facade' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'Clinical Lab' },
      { url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop', caption: 'College Auditorium' },
    ],
    reviewVideos: [
      { title: 'KEM Hospital & Seth GS Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-11',
    name: 'Stanley Medical College, Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Government',
    description:
      'One of the oldest medical colleges in India, Stanley Medical College was established in 1838 and is affiliated with the Government Stanley Hospital in Chennai\'s Royapuram area.',
    thumbnail: 'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=600&h=400&fit=crop',
    established: 1838,
    affiliation: 'Tamil Nadu Dr. MGR Medical University',
    website: 'https://www.stanleymedicalcollege.ac.in',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 2,500 - 5,000 (General, State)',
    annualFees: '~13,500/yr',
    about:
      'Stanley Medical College, established in 1838 during British colonial rule, is one of the oldest medical colleges in India. Located in Royapuram, Chennai, it is affiliated with the Government Stanley Hospital (1100 beds). The college has a distinguished history spanning over 185 years and has contributed significantly to medical education in South India. The campus blends colonial-era heritage architecture with modern medical facilities.',
    facultyQuality:
      'The college has experienced faculty across all major departments. The Departments of General Medicine, Surgery, and Anatomy are well-respected. Faculty members emphasize clinical bedside teaching in the traditional South Indian medical education style. Several professors contribute to state medical board examinations and health policy.',
    campusInfrastructure:
      'The campus features a mix of heritage buildings and newer blocks. The library has both physical and digital collections. Anatomy and pathology labs are well-equipped. Recent government investment has upgraded lecture halls with modern AV systems. The campus includes a student center, canteen, and sports facilities.',
    hospitalFacilities:
      'Government Stanley Hospital is an 1100-bed multispecialty hospital with departments in medicine, surgery, orthopedics, pediatrics, obstetrics, ENT, ophthalmology, and psychiatry. The hospital serves a large urban and semi-urban population from North Chennai. A dedicated trauma unit and an active emergency wing handle significant casualty volumes.',
    clinicalExposure:
      'Students get comprehensive clinical training across all major specialties. The hospital\'s location in North Chennai serves a predominantly working-class population, exposing students to a wide range of conditions including occupational diseases, infectious diseases, and trauma. Obstetrics and pediatrics rotations are particularly robust.',
    patientLoad:
      'Annual OPD visits: ~1.5 million | Annual admissions: ~55,000 | Annual surgeries: ~25,000 | Emergency cases: ~100,000/yr. The hospital serves as a key government healthcare provider for Northern Chennai and surrounding districts.',
    hostelFacilities:
      'On-campus hostels with separate blocks for men and women. Basic but clean rooms with mess facilities serving South Indian meals. The hostel is walking distance from the hospital. Proximity to Marina Beach and Royapuram fishing harbor adds character to the location.',
    studentLife:
      'Stanley Medical College has a strong cultural tradition. The annual "Stanfest" is well-known among Chennai medical colleges. Students enjoy Chennai\'s cultural offerings including music concerts during the December season, beach activities, and a thriving food scene. Active sports and cultural clubs participate in inter-medical college events.',
    pros: [
      'One of India\'s oldest medical colleges with rich heritage',
      'Very affordable government fees',
      'Good clinical exposure with diverse pathology',
      'Chennai location with access to cultural hub of South India',
      'Strong alumni network in Tamil Nadu healthcare',
    ],
    cons: [
      'Some infrastructure needs modernization',
      'North Chennai area can feel congested',
      'Limited hostel space for growing student intake',
      'Research facilities lag behind top-tier institutions',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=500&fit=crop', caption: 'Stanley College Campus' },
      { url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=500&fit=crop', caption: 'Hospital Building' },
      { url: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&h=500&fit=crop', caption: 'Teaching Ward' },
    ],
    reviewVideos: [
      { title: 'Stanley Medical College Heritage Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-12',
    name: 'King George\'s Medical University (KGMU), Lucknow',
    state: 'Uttar Pradesh',
    city: 'Lucknow',
    type: 'Government',
    description:
      'One of the oldest and most prestigious medical institutions in North India, KGMU (formerly King George\'s Medical College) was established during the British era and is a major center for medical education and research in Uttar Pradesh.',
    thumbnail: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&h=400&fit=crop',
    established: 1911,
    affiliation: 'KGMU (State University)',
    website: 'https://www.kgmu.org',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'BDS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 1,500 - 5,000 (General, State)',
    annualFees: '~22,500/yr',
    about:
      'King George\'s Medical University (KGMU), Lucknow, was established in 1911 and upgraded to university status in 2002. It is Uttar Pradesh\'s premier medical institution with a sprawling campus in the heart of Lucknow. The university hospital has over 3800 beds across multiple departments, making it one of the largest teaching hospitals in Asia. KGMU serves as a key referral center for the entire state of Uttar Pradesh (population ~240 million), ensuring enormous clinical volume and diverse case exposure.',
    facultyQuality:
      'KGMU has over 500 faculty members across preclinical, paraclinical, and clinical departments. Many are recognized national experts, particularly in orthopedics, plastic surgery, and gastroenterology. The university houses several Centers of Excellence and actively contributes to national health research. Teaching is predominantly bedside-oriented with strong emphasis on clinical skills.',
    campusInfrastructure:
      'The campus spans over 40 acres in central Lucknow. Heritage buildings coexist with modern additions including a new trauma center, upgraded labs, and smart classrooms. The library houses one of the largest medical literature collections in North India. The anatomy museum is a national treasure. Sports facilities include cricket grounds, basketball courts, and a gymnasium.',
    hospitalFacilities:
      'The KGMU hospital complex has over 3800 beds with comprehensive departments. Key facilities include a state-of-the-art Trauma Centre (one of the busiest in India), a dedicated Burn Unit, a Cancer Treatment Centre, and recently established organ transplant programs. The sheer scale of operations makes it one of Asia\'s largest teaching hospitals.',
    clinicalExposure:
      'KGMU offers unparalleled clinical volume. Students encounter a massive diversity of cases including end-stage disease presentations, rare genetic conditions, tropical infections, trauma, snake bites, and agricultural injuries. The emergency department handles over 300,000 cases annually. Obstetrics exposure is exceptional given UP\'s high birth rate.',
    patientLoad:
      'Annual OPD visits: ~4 million | Annual admissions: ~120,000 | Annual surgeries: ~65,000 | Emergency cases: ~350,000/yr. As the primary referral hospital for UP, KGMU handles possibly the highest patient volume of any single institution in India.',
    hostelFacilities:
      'Multiple hostels on campus for both undergraduate and postgraduate students. Rooms are basic but adequate with mess facilities. Lucknow\'s affordable cost of living is an advantage. Some newer hostel blocks have better amenities. The campus is self-contained with canteens and student shops.',
    studentLife:
      'KGMU has a vibrant student community. The annual cultural fest and sports week are popular events. Lucknow\'s rich Nawabi culture, famous cuisine (Tunday Kebabs, biryani), and heritage sites (Bara Imambara, Rumi Darwaza) enrich student life. The city has a pleasant winter climate and is well-connected by rail and air.',
    pros: [
      'Possibly the highest patient volume of any medical college in India',
      'University-status institution with strong research infrastructure',
      'Very affordable fees for UP residents',
      'State-of-the-art Trauma Centre and burn unit',
      'Lucknow city offers excellent quality of life at low cost',
      'Strong alumni presence across UP healthcare system',
    ],
    cons: [
      'Some departments have overcrowded wards',
      'Infrastructure varies significantly between old and new blocks',
      'Summers in Lucknow can be extremely hot (45+ celsius)',
      'Administrative delays due to state government bureaucracy',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop', caption: 'KGMU Main Entrance' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'Hospital Complex' },
      { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop', caption: 'Trauma Centre' },
    ],
    reviewVideos: [
      { title: 'KGMU Lucknow - Student Life & Hospital', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-13',
    name: 'Madras Medical College (MMC), Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Government',
    description:
      'The second oldest medical college in Asia (est. 1835), Madras Medical College is associated with the massive 2700-bed Rajiv Gandhi Government General Hospital and is Tamil Nadu\'s premier medical institution.',
    thumbnail: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=400&fit=crop',
    established: 1835,
    affiliation: 'Tamil Nadu Dr. MGR Medical University',
    website: 'https://www.mmc.tn.gov.in',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'BDS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 800 - 3,000 (General, State)',
    annualFees: '~13,000/yr',
    about:
      'Madras Medical College (MMC), established in 1835, is the second oldest medical college in Asia after the Calcutta Medical College. Located on EVR Periyar Salai (formerly Poonamallee High Road), it is associated with Rajiv Gandhi Government General Hospital (RGGGH), a 2700-bed tertiary care center that is one of the largest hospitals in Asia. MMC has a legendary heritage of producing top medical professionals for nearly 190 years and continues to be Tamil Nadu\'s most prestigious medical institution.',
    facultyQuality:
      'MMC has a distinguished faculty with deep expertise across all departments. The Department of Plastic Surgery (founded by the legendary Dr. M. Balasundaram) and the Institute of Microbiology are nationally acclaimed. Faculty combine traditional clinical teaching with modern evidence-based approaches. Many serve as examiners for the MGR Medical University.',
    campusInfrastructure:
      'The historic campus features a blend of colonial-era architecture and modern facilities. The renowned anatomy museum, one of the finest in the country, houses rare specimens dating back to the 19th century. The library has an extensive collection. Modern additions include upgraded labs, a new academic block, and smart classrooms. The campus includes the Institute of Anatomy, Institute of Physiology, and Institute of Biochemistry as separate entities.',
    hospitalFacilities:
      'RGGGH is a massive 2700-bed hospital and one of the largest government hospitals in Asia. It houses departments across all medical and surgical specialties. Key facilities include a trauma center, neonatal ICU, dialysis center, and multiple surgical suites. The Institute of Child Health and the Institute of Obstetrics & Gynaecology are attached institutions.',
    clinicalExposure:
      'Clinical exposure at MMC is extraordinary. The 2700-bed RGGGH handles enormous patient volumes with diverse pathology. Students witness rare conditions, advanced surgical procedures, and complex medical management. The emergency department is among the busiest in South India. Rotations through attached institutes provide subspecialty depth.',
    patientLoad:
      'Annual OPD visits: ~3 million | Annual admissions: ~100,000 | Annual surgeries: ~55,000 | Emergency cases: ~220,000/yr. RGGGH serves as the ultimate referral center for Tamil Nadu and receives patients from neighboring states.',
    hostelFacilities:
      'On-campus hostels near the hospital with separate wings for men and women. Rooms are functional with mess facilities serving South Indian cuisine. The location in central Chennai provides easy access to the city. Recent government upgrades have improved basic amenities.',
    studentLife:
      'MMC has one of the most storied campus cultures among Indian medical colleges. The annual culturals, sports events, and alumni reunions are grand affairs. Chennai\'s cultural richness, pleasant winters, Marina Beach, and the December Music Season make student life memorable. The strong alumni network spans continents.',
    pros: [
      'Second oldest medical college in Asia - unmatched heritage',
      'Enormous clinical exposure at 2700-bed RGGGH',
      'Very affordable fees (under Rs 15,000/yr)',
      'Chennai location with excellent cultural and urban amenities',
      'Strong surgical and specialty training',
      'Legendary alumni network across global healthcare',
    ],
    cons: [
      'Some heritage infrastructure needs renovation',
      'Overcrowded wards during peak seasons',
      'Limited parking and campus space in city center',
      'Chennai summers are hot and humid',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop', caption: 'MMC Heritage Building' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'RGGGH Main Block' },
      { url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop', caption: 'Anatomy Museum' },
    ],
    reviewVideos: [
      { title: 'Madras Medical College - 190 Years of Excellence', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-14',
    name: 'Lady Hardinge Medical College (LHMC), New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    description:
      'India\'s premier women-only medical college (now co-ed for PG), LHMC was established in 1916 and is associated with the Smt. Sucheta Kriplani Hospital and Kalawati Saran Children\'s Hospital.',
    thumbnail: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=400&fit=crop',
    established: 1916,
    affiliation: 'University of Delhi',
    website: 'https://www.lhmc-hosp.gov.in',
    totalSeats: 200,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'Diploma'],
    neetCutoffRange: 'AIR 60 - 400 (General, Female)',
    annualFees: '~3,500/yr',
    about:
      'Lady Hardinge Medical College (LHMC) was established in 1916 in memory of Lady Hardinge, wife of the Viceroy of India. Originally founded as a medical college exclusively for women, it remains one of India\'s most prestigious institutions for medical education. Located near Connaught Place in central New Delhi, LHMC is associated with Smt. Sucheta Kriplani Hospital (formerly Lady Hardinge Hospital, 900 beds) and Kalawati Saran Children\'s Hospital (700 beds). The combined bed strength of 1600 provides excellent clinical training in obstetrics, gynecology, and pediatrics.',
    facultyQuality:
      'LHMC has dedicated faculty with particular strength in obstetrics, gynecology, pediatrics, and neonatology. Being a central government institution, faculty appointments attract experienced specialists. Several professors are national experts and contribute to medical education policy. The teaching is heavily clinically oriented with strong emphasis on maternal and child health.',
    campusInfrastructure:
      'The campus in central New Delhi has been progressively modernized while retaining its heritage character. The college has well-equipped labs, a digital library, and modern lecture halls. The anatomy museum is notable. The campus includes hostels, a canteen, and recreational facilities within walking distance of Connaught Place.',
    hospitalFacilities:
      'Smt. Sucheta Kriplani Hospital (900 beds) provides comprehensive medical and surgical care with strong departments in obstetrics, gynecology, and general medicine. Kalawati Saran Children\'s Hospital (700 beds) is one of Delhi\'s premier pediatric facilities with advanced NICU, PICU, and pediatric surgery departments. The combined setup offers exceptional training in women\'s and children\'s health.',
    clinicalExposure:
      'Clinical exposure in obstetrics and pediatrics is among the best in India. Students witness thousands of deliveries, high-risk pregnancies, and complex pediatric cases. The emergency department handles diverse medical and surgical emergencies. Training in general medicine and surgery is solid across the affiliated hospitals.',
    patientLoad:
      'Annual OPD visits: ~1.8 million | Annual admissions: ~60,000 | Annual deliveries: ~22,000 | Annual pediatric admissions: ~30,000. The hospitals serve a large population of Delhi and neighboring states.',
    hostelFacilities:
      'On-campus hostels with decent rooms and mess facilities. The central Delhi location means excellent access to metro, markets, and cultural venues. Security is well-maintained. Recently upgraded amenities include better Wi-Fi and renovated common areas.',
    studentLife:
      'LHMC has a unique campus culture with strong camaraderie among students. Cultural events, annual day celebrations, and sports competitions are enthusiastically organized. The Connaught Place location provides access to Delhi\'s best shopping, dining, and entertainment. The strong sisterhood (given the historical women-only tradition) is a distinctive feature of LHMC life.',
    pros: [
      'One of the top-ranked medical colleges in India',
      'Exceptional obstetrics, gynecology, and pediatrics training',
      'Prime central Delhi location near Connaught Place',
      'Very affordable government fees',
      'Strong tradition of producing eminent women doctors',
      'Excellent proximity to AIIMS and other Delhi hospitals',
    ],
    cons: [
      'Campus is compact with limited expansion space',
      'Some hostel blocks need renovation',
      'MBBS intake limited to female candidates',
      'Administrative processes can be bureaucratic',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=500&fit=crop', caption: 'LHMC Heritage Building' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'Hospital Ward' },
      { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop', caption: 'Pediatric Department' },
    ],
    reviewVideos: [
      { title: 'LHMC Delhi - Campus & Hospital Review', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-15',
    name: 'Government Medical College (GMC), Chandigarh',
    state: 'Chandigarh',
    city: 'Chandigarh',
    type: 'Government',
    description:
      'Affiliated with Panjab University and the 1700-bed Government Multi Specialty Hospital (GMSH), GMC Chandigarh is the premier medical institution for Punjab, Haryana, and Chandigarh.',
    thumbnail: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=400&fit=crop',
    established: 1991,
    affiliation: 'Panjab University, Chandigarh',
    website: 'https://gmch.gov.in',
    totalSeats: 150,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 3,000 - 8,000 (General, UT Quota)',
    annualFees: '~45,000/yr',
    about:
      'Government Medical College and Hospital (GMCH), Chandigarh, was established in 1991 and is affiliated with Panjab University. The college is associated with the 1700-bed Government Multi Specialty Hospital in Sector 16, Chandigarh. It serves as the primary referral center for Chandigarh, Punjab, Haryana, and Himachal Pradesh. The college has rapidly grown to become one of the top medical institutions in North India, benefiting from Chandigarh\'s excellent urban planning and quality of life.',
    facultyQuality:
      'The college has a growing faculty base with several experienced clinicians recruited from PGIMER and AIIMS. Departments of Orthopedics, Medicine, and Radiology are notably strong. Faculty actively participate in research and have a good publication record. The proximity to PGIMER Chandigarh creates opportunities for academic collaboration and cross-learning.',
    campusInfrastructure:
      'Being a relatively new institution, GMCH has modern infrastructure including well-designed lecture halls, spacious labs, a digital library, and contemporary clinical skills center. The campus is in Chandigarh\'s planned Sector 32 with good road connectivity. Sports facilities, a student recreation center, and a canteen are available on campus.',
    hospitalFacilities:
      'The 1700-bed GMSH is a comprehensive multispecialty hospital with departments across all medical and surgical disciplines. Key facilities include a trauma center, cardiac catheterization lab, dialysis unit, and advanced surgical suites. The hospital\'s relatively newer construction means more modern infrastructure compared to many heritage government hospitals.',
    clinicalExposure:
      'Clinical exposure is excellent with good case diversity from the tri-city population (Chandigarh, Mohali, Panchkula) and surrounding states. The emergency department is busy with trauma, medical, and surgical emergencies. Students also benefit from the nearby PGIMER for observational learning and academic events.',
    patientLoad:
      'Annual OPD visits: ~1.6 million | Annual admissions: ~65,000 | Annual surgeries: ~28,000 | Emergency cases: ~120,000/yr. The hospital serves a large catchment area spanning three states.',
    hostelFacilities:
      'Modern hostels on campus with well-furnished rooms. Chandigarh\'s pleasant climate, clean environment, and well-planned infrastructure make hostel life comfortable. Mess facilities serve Punjabi and North Indian cuisine. The city\'s low crime rate and excellent public amenities enhance the living experience.',
    studentLife:
      'Students at GMCH enjoy Chandigarh\'s outstanding quality of life. The city is known for its green spaces, Sukhna Lake, Rock Garden, and vibrant food scene. Cultural events and sports activities are well-organized. The proximity to the Shivalik hills offers weekend trekking opportunities. Chandigarh\'s planned infrastructure makes it one of the most livable cities in India.',
    pros: [
      'Modern infrastructure and well-planned campus',
      'Chandigarh offers excellent quality of life and safety',
      'Good clinical exposure with 1700-bed hospital',
      'Proximity to PGIMER enables academic enrichment',
      'Affordable fees with UT government subsidization',
      'Pleasant climate year-round',
    ],
    cons: [
      'Relatively newer institution compared to historic medical colleges',
      'Limited UT quota seats (Chandigarh is small)',
      'Faculty strength is still growing',
      'Fewer super-specialty departments compared to PGIMER',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&h=500&fit=crop', caption: 'GMCH Campus' },
      { url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=500&fit=crop', caption: 'Hospital Building' },
      { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&h=500&fit=crop', caption: 'Lecture Hall' },
    ],
    reviewVideos: [
      { title: 'GMCH Chandigarh Student Life', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-16',
    name: 'B.J. Medical College, Ahmedabad',
    state: 'Gujarat',
    city: 'Ahmedabad',
    type: 'Government',
    description:
      'Gujarat\'s premier government medical college, B.J. Medical College is associated with the 2500-bed Civil Hospital - one of the largest government hospitals in Asia.',
    thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop',
    established: 1946,
    affiliation: 'Gujarat University',
    website: 'https://bjmcamd.edu.in',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 2,000 - 6,000 (General, State)',
    annualFees: '~15,000/yr',
    about:
      'B.J. Medical College (originally Baroda Medical School, relocated and renamed) was established in 1946 in Ahmedabad, Gujarat. It is affiliated with the massive Civil Hospital, Ahmedabad, which has over 2500 beds making it one of the largest government hospitals in Asia. The college-hospital complex sprawls across a huge area near Asarwa, Ahmedabad. It serves as the primary referral center for the entire state of Gujarat (population ~70 million) and is known for handling mass casualty events and rare diseases.',
    facultyQuality:
      'The faculty includes experienced clinicians and educators with expertise across all departments. The Departments of Surgery, Orthopedics, and Forensic Medicine are particularly well-regarded. Faculty are actively involved in Gujarat University academic programs and state health policy. Teaching methodology emphasizes clinical exposure and practical skills.',
    campusInfrastructure:
      'The campus has a mix of old and modernized buildings. Recent state government funding has upgraded lecture halls, labs, and the library. The anatomy and pathology museums are notable. A new academic block and enhanced simulation center were recently inaugurated. Sports and recreation facilities are available.',
    hospitalFacilities:
      'Civil Hospital, Ahmedabad is a 2500-bed mega-hospital with comprehensive departments. It houses one of India\'s busiest emergency departments, a trauma center, burn unit, nephrology and dialysis unit, and a dedicated cancer treatment facility. The hospital\'s scale and patient volume are comparable to the largest government hospitals in India.',
    clinicalExposure:
      'Clinical exposure is outstanding due to the massive patient volume. Students encounter diverse pathology including tropical diseases, snakebites, agricultural injuries, occupational health issues, and major trauma. The emergency department handles over 200,000 cases annually. Obstetrics and pediatrics exposure is also extensive.',
    patientLoad:
      'Annual OPD visits: ~3 million | Annual admissions: ~100,000 | Annual surgeries: ~50,000 | Emergency cases: ~250,000/yr. Civil Hospital is the backbone of Gujarat\'s public healthcare system.',
    hostelFacilities:
      'On-campus hostels near the hospital. Rooms are functional with mess facilities serving Gujarati and North Indian cuisine. Ahmedabad\'s affordable cost of living is an advantage. Recent renovations have improved hostel amenities including Wi-Fi and common areas.',
    studentLife:
      'B.J. Medical College has a lively student culture with annual festivals and sports events. Ahmedabad\'s rich Gujarati culture, famous street food, riverfront development, and proximity to heritage sites (Sabarmati Ashram, Adalaj Stepwell) make for an interesting student life. The city is well-connected and has a growing metro system.',
    pros: [
      'One of Asia\'s largest hospital complexes with unmatched patient volume',
      'Very affordable government fees',
      'Gujarat\'s premier medical institution with strong reputation',
      'Diverse clinical exposure across all specialties',
      'Ahmedabad is affordable with good connectivity',
    ],
    cons: [
      'Infrastructure in older blocks is aging',
      'Gujarat\'s dry state status limits social scene',
      'Summers are extremely hot (45+ celsius)',
      'Some wards can feel overcrowded',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop', caption: 'Civil Hospital Complex' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'College Building' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'Emergency Ward' },
    ],
    reviewVideos: [
      { title: 'B.J. Medical College Ahmedabad Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-17',
    name: 'Institute of Medical Sciences (IMS-BHU), Varanasi',
    state: 'Uttar Pradesh',
    city: 'Varanasi',
    type: 'Government',
    description:
      'Part of the prestigious Banaras Hindu University (BHU), IMS-BHU combines medical education with one of India\'s premier central universities, offering a unique academic environment in the holy city of Varanasi.',
    thumbnail: 'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=600&h=400&fit=crop',
    established: 1960,
    affiliation: 'Banaras Hindu University (BHU - Central University)',
    website: 'https://www.bhu.ac.in/ims',
    totalSeats: 120,
    coursesOffered: ['MBBS', 'BDS', 'MD', 'MS', 'DM', 'MCh', 'B.Sc Nursing'],
    neetCutoffRange: 'AIR 1,000 - 4,000 (General, AIQ)',
    annualFees: '~8,400/yr',
    about:
      'The Institute of Medical Sciences (IMS), Banaras Hindu University (BHU), was established in 1960 as part of the prestigious BHU founded by Pandit Madan Mohan Malaviya. Located within the sprawling 1,350-acre BHU campus in Varanasi, IMS combines medical education with the resources of one of India\'s largest residential universities. The Sir Sunderlal Hospital (SSH) with 1050 beds serves as the teaching hospital. Being a central university institution, IMS attracts students from across India and offers the unique experience of studying medicine within a comprehensive university setting.',
    facultyQuality:
      'The faculty includes distinguished academicians with strong research credentials. Being a central university, BHU attracts high-caliber faculty through UGC pay scales and research grants. Several professors are nationally recognized in their fields. The inter-departmental collaboration within BHU (engineering, science, humanities) creates unique research opportunities.',
    campusInfrastructure:
      'IMS benefits from BHU\'s massive 1,350-acre campus. The medical school has modern labs, a well-stocked library integrated with BHU\'s central library system, and research facilities. BHU\'s shared infrastructure includes a world-class sports complex, Bharat Kala Bhavan (art museum), and extensive green spaces. The campus is a self-contained township.',
    hospitalFacilities:
      'Sir Sunderlal Hospital (SSH) is a 1050-bed hospital with comprehensive departments. It recently added a super-specialty block with cardiac surgery, neurosurgery, and urology facilities. A new trauma center and dedicated cancer center have been established. The hospital serves eastern UP, parts of Bihar, Jharkhand, and Madhya Pradesh.',
    clinicalExposure:
      'Students receive good clinical training with diverse pathology from the large catchment area. The emergency department handles significant volume. Community medicine exposure includes rural outreach in surrounding villages. Being in Varanasi, students also encounter unique occupational health issues related to the silk weaving, betel, and dairy industries.',
    patientLoad:
      'Annual OPD visits: ~1.8 million | Annual admissions: ~55,000 | Annual surgeries: ~25,000 | Emergency cases: ~110,000/yr. SSH serves as a major referral center for eastern Uttar Pradesh.',
    hostelFacilities:
      'BHU has extensive hostel facilities with dedicated blocks for IMS students. The campus is self-contained with multiple messes, canteens, and shops. The cultural diversity within BHU\'s 30,000-student body creates a vibrant residential experience. Hostels have undergone recent renovations with improved Wi-Fi and amenities.',
    studentLife:
      'Student life at IMS-BHU is enriched by the broader university experience. Festivals like Spardha (sports), Kashi Yatra (cultural fest), and convocations are grand. Varanasi\'s spiritual atmosphere, Ganga aarti at Dashashwamedh Ghat, ancient temples, and the unique cultural character make it a once-in-a-lifetime experience. The city\'s street food scene is legendary.',
    pros: [
      'Central university setting with vast campus resources',
      'Very affordable fees with central government funding',
      'Unique cultural experience in holy city of Varanasi',
      'Inter-disciplinary research opportunities within BHU',
      'Strong all-India admissions ensure diverse student body',
      'BHU alumni network spans government, academia, and industry',
    ],
    cons: [
      'Hospital bed strength is lower than comparable colleges',
      'Varanasi infrastructure outside campus can be chaotic',
      'Hot summers and limited modern entertainment options',
      'Some departments need more faculty recruitment',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=800&h=500&fit=crop', caption: 'BHU Main Gate' },
      { url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=500&fit=crop', caption: 'Sir Sunderlal Hospital' },
      { url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=500&fit=crop', caption: 'BHU Campus View' },
    ],
    reviewVideos: [
      { title: 'IMS-BHU Varanasi - Complete Guide', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-18',
    name: 'Government Medical College, Thiruvananthapuram',
    state: 'Kerala',
    city: 'Thiruvananthapuram',
    type: 'Government',
    description:
      'Kerala\'s premier government medical college, established in 1951 and associated with the SAT Hospital and General Hospital. Known for excellent clinical training in the state with the best health indicators in India.',
    thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop',
    established: 1951,
    affiliation: 'Kerala University of Health Sciences (KUHS)',
    website: 'https://www.tmc.kerala.gov.in',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 5,000 - 15,000 (General, State)',
    annualFees: '~18,500/yr',
    about:
      'Government Medical College, Thiruvananthapuram (commonly known as Trivandrum Medical College or TMC) was established in 1951 and is Kerala\'s oldest and most prestigious government medical institution. The college campus spans over 100 acres and is associated with the 1500-bed General Hospital and the SAT Hospital (Sree Avittom Thirunal Hospital) for obstetrics and gynecology. TMC plays a central role in Kerala\'s healthcare system, which is widely regarded as the most advanced public health system in India.',
    facultyQuality:
      'The faculty is highly experienced with several nationally recognized specialists. Kerala\'s strong healthcare tradition means faculty members are well-trained and committed to teaching. The Departments of Surgery, Cardiology, and Gastroenterology are particularly well-regarded. Faculty actively contribute to Kerala\'s health policy, which has been a model for other states.',
    campusInfrastructure:
      'The 100-acre campus includes modern academic buildings, well-equipped labs, a comprehensive library, and clinical skills center. Kerala\'s government has invested significantly in upgrading medical college infrastructure. The campus has sports facilities, a student center, and canteen. The lush green campus reflects Kerala\'s tropical beauty.',
    hospitalFacilities:
      'The 1500-bed General Hospital provides comprehensive healthcare across all specialties. The SAT Hospital is a dedicated obstetrics and gynecology facility with a large delivery volume. The Regional Cancer Centre (RCC) is located adjacent to the campus and provides additional oncology exposure. A super-specialty block with cardiac surgery and neurosurgery has been added recently.',
    clinicalExposure:
      'Clinical exposure is excellent with good case diversity. Kerala\'s high health awareness means patients present at various stages of disease, from early to advanced. The obstetrics exposure at SAT Hospital is outstanding. Students also benefit from Kerala\'s extensive primary health center network for community medicine training. The proximity to the Regional Cancer Centre adds oncology exposure.',
    patientLoad:
      'Annual OPD visits: ~2 million | Annual admissions: ~70,000 | Annual surgeries: ~35,000 | Annual deliveries (SAT): ~15,000. The hospitals serve as the primary referral center for southern Kerala.',
    hostelFacilities:
      'Well-maintained hostels on the campus with separate blocks for men and women. Kerala\'s pleasant climate and the green campus setting make hostel life comfortable. Mess facilities serve Kerala cuisine including rice, sambar, fish curry, and avial. Proximity to city amenities is convenient.',
    studentLife:
      'Student life at TMC is enriched by Thiruvananthapuram\'s cultural offerings. The annual arts festival, sports meet, and medical exhibitions are popular events. Kerala\'s beautiful beaches (Kovalam, Varkala), backwaters, and hill stations (Ponmudi) are easily accessible. The city has excellent educational infrastructure, museums, and cultural venues. Student organizations are active in health awareness campaigns.',
    pros: [
      'Kerala has the best health indicators in India - unique learning environment',
      'Good clinical exposure with 1500-bed hospital',
      'Beautiful green campus in pleasant tropical climate',
      'Proximity to Regional Cancer Centre for oncology exposure',
      'Affordable fees with Kerala government subsidization',
      'Strong emphasis on primary and preventive care',
    ],
    cons: [
      'Competition for Kerala state quota is very high',
      'Some departments need more super-specialty development',
      'Monsoon season can be intense (June-November)',
      'Limited metro-level entertainment and shopping',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=500&fit=crop', caption: 'TMC Campus' },
      { url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=500&fit=crop', caption: 'General Hospital' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'Teaching Block' },
    ],
    reviewVideos: [
      { title: 'Trivandrum Medical College Life', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-19',
    name: 'Sri Ramachandra Institute of Higher Education and Research (SRIHER), Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Deemed',
    description:
      'A leading deemed university in Chennai with NAAC A++ accreditation. Known for its modern campus, international academic standards, and comprehensive medical education in a technology-forward environment.',
    thumbnail: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=400&fit=crop',
    established: 1985,
    affiliation: 'SRIHER (Deemed to be University)',
    website: 'https://www.sriramachandra.edu.in',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'BDS', 'MD', 'MS', 'DM', 'MCh', 'B.Pharm', 'Physiotherapy'],
    neetCutoffRange: 'AIR 20,000 - 60,000 (Management)',
    annualFees: '~22,50,000/yr',
    about:
      'Sri Ramachandra Institute of Higher Education and Research (SRIHER), formerly Sri Ramachandra Medical College, was established in 1985 in Porur, Chennai. It is a Deemed to be University with NAAC A++ accreditation. The campus houses a 1500-bed multispecialty hospital with NABH accreditation and a dedicated medical research center. SRIHER offers a comprehensive range of healthcare programs from undergraduate to superspecialty levels. The institution is known for its technology-forward approach to medical education.',
    facultyQuality:
      'The faculty includes experienced specialists with strong research credentials. Many hold international fellowships and participate in global academic collaborations. The Departments of Cardiothoracic Surgery, Orthopedics, and Emergency Medicine are well-regarded. Teaching methodology integrates simulation-based learning and early clinical exposure.',
    campusInfrastructure:
      'The modern campus in Porur features state-of-the-art academic blocks, advanced simulation center with mannequins and VR trainers, a fully digital library, and well-equipped research labs. The campus includes hostels, a food court, sports complex, and Wi-Fi-enabled learning spaces. The infrastructure reflects the institution\'s technology-forward approach.',
    hospitalFacilities:
      'The 1500-bed NABH-accredited hospital has comprehensive departments with advanced diagnostic and therapeutic facilities. Key features include a da Vinci robotic surgery system, advanced cardiac cath lab, comprehensive cancer center, and a dedicated emergency department. The hospital attracts patients from across South India and from abroad for specialty treatments.',
    clinicalExposure:
      'Students benefit from well-structured clinical rotations across the 1500-bed hospital. The emergency department, ICU, and surgical suites provide intensive exposure. Community medicine training includes outreach programs in surrounding areas. The integrated curriculum begins clinical exposure early in the MBBS program.',
    patientLoad:
      'Annual OPD visits: ~1.3 million | Annual admissions: ~50,000 | Annual surgeries: ~22,000. The hospital serves patients from across Tamil Nadu and neighboring states, particularly for cardiac, orthopedic, and oncology care.',
    hostelFacilities:
      'Modern hostels with AC single and twin-sharing rooms. Separate blocks for men and women with excellent security. Multiple mess options serving varied cuisine. The campus has a gymnasium, swimming pool, and recreational facilities. Hostels have high-speed Wi-Fi and study rooms.',
    studentLife:
      'SRIHER has a vibrant student life with annual cultural and sports festivals. The campus is modern and well-maintained. Chennai\'s cultural richness, restaurants, beaches, and entertainment options are accessible. Multiple student clubs cover academics, arts, and community service. The institution organizes regular guest lectures and medical conferences.',
    pros: [
      'NAAC A++ accredited with modern infrastructure',
      'NABH-accredited hospital with robotic surgery capabilities',
      'Technology-forward teaching methodology',
      'Good clinical exposure with structured rotations',
      'Chennai location with access to multiple healthcare institutions',
      'Comprehensive range of healthcare programs',
    ],
    cons: [
      'High tuition fees (~22.5 lakh/year)',
      'Location in suburban Porur can be congested',
      'Deemed university tag may carry less prestige than government colleges',
      'Management quota cutoff is more relaxed',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=500&fit=crop', caption: 'SRIHER Campus' },
      { url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop', caption: 'Hospital Entrance' },
      { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&h=500&fit=crop', caption: 'Simulation Lab' },
    ],
    reviewVideos: [
      { title: 'SRIHER Chennai Campus Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-20',
    name: 'Sawai Man Singh (SMS) Medical College, Jaipur',
    state: 'Rajasthan',
    city: 'Jaipur',
    type: 'Government',
    description:
      'Rajasthan\'s premier government medical college established in 1947, associated with the massive 2500-bed SMS Hospital that serves as the primary referral center for the entire state.',
    thumbnail: 'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=600&h=400&fit=crop',
    established: 1947,
    affiliation: 'Rajasthan University of Health Sciences (RUHS)',
    website: 'https://www.smsmedicalcollege.com',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 3,000 - 10,000 (General, State)',
    annualFees: '~27,000/yr',
    about:
      'Sawai Man Singh (SMS) Medical College was established in 1947, coinciding with India\'s independence. Located in the Pink City of Jaipur, it is Rajasthan\'s oldest and most prestigious medical institution. The associated SMS Hospital has over 2500 beds and serves as the primary referral center for Rajasthan (population ~80 million). The college-hospital complex is situated near the historic Rambagh Palace area, blending medical modernity with Jaipur\'s royal heritage. SMS has a strong tradition of producing leading clinicians who staff hospitals across Rajasthan.',
    facultyQuality:
      'The faculty pool includes senior professors with decades of experience in clinical medicine and surgery. The Departments of Cardiology, General Surgery, and Ophthalmology are particularly well-recognized. Faculty members serve on RUHS examination boards and contribute to state health policy. Teaching emphasizes clinical bedside skills and practical competence.',
    campusInfrastructure:
      'The campus spans a large area in central Jaipur with both heritage and modern buildings. The library, lecture halls, and labs have been upgraded in recent years. An anatomy museum and pathology museum are well-maintained. The campus includes sports grounds, a student union building, and canteen. Rajasthan government has invested in infrastructure modernization.',
    hospitalFacilities:
      'SMS Hospital is a 2500-bed mega-hospital with departments across all specialties. Key facilities include a trauma center (handling severe desert-region accidents), a burn unit, a dialysis center, and advanced surgical suites. The hospital operates one of India\'s largest blood banks. A super-specialty block with cardiac surgery, neurosurgery, and urology was recently inaugurated.',
    clinicalExposure:
      'Clinical exposure is exceptional given the massive patient volume from across Rajasthan. Students encounter diverse pathology including desert-specific conditions, snakebites, heat-related illnesses, severe malnutrition, and late-presenting disease. Trauma and emergency exposure is extensive. Obstetrics training handles a high volume of complex deliveries.',
    patientLoad:
      'Annual OPD visits: ~3.5 million | Annual admissions: ~110,000 | Annual surgeries: ~55,000 | Emergency cases: ~280,000/yr. SMS Hospital is the lifeline of Rajasthan\'s public healthcare system.',
    hostelFacilities:
      'On-campus hostels with separate blocks for men and women. Rooms are basic but functional with mess serving Rajasthani and North Indian cuisine. Jaipur\'s relatively affordable living costs and pleasant winter climate (October-March) are advantages. Summers can be harsh.',
    studentLife:
      'SMS Medical College has a vibrant student culture. The annual cultural fest, sports meet, and medical exhibition are popular events. Jaipur\'s rich Rajput heritage, palaces, forts, bazaars, and cuisine create a colorful student experience. Weekend trips to Amber Fort, Nahargarh, and nearby Pushkar are common. The city has good connectivity and is growing rapidly as an educational hub.',
    pros: [
      'Rajasthan\'s premier medical institution with 75+ years of legacy',
      'Massive patient volume ensures unmatched clinical exposure',
      'Affordable fees with state government subsidization',
      'Jaipur offers unique cultural experience and growing urban amenities',
      'Strong alumni network across Rajasthan healthcare',
      'New super-specialty block with modern facilities',
    ],
    cons: [
      'Summers in Jaipur are extremely hot (48+ celsius)',
      'Some older infrastructure needs renovation',
      'High patient volume can sometimes overwhelm resources',
      'Water scarcity issues in the desert region',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?w=800&h=500&fit=crop', caption: 'SMS Hospital Complex' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'College Main Building' },
      { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop', caption: 'New Super-specialty Block' },
    ],
    reviewVideos: [
      { title: 'SMS Medical College Jaipur Tour', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-21',
    name: 'D.Y. Patil Medical College, Pune',
    state: 'Maharashtra',
    city: 'Pune',
    type: 'Deemed',
    description:
      'A leading deemed university medical college in Pune with modern infrastructure, NABH-accredited hospital, and strong placement record. Part of the D.Y. Patil Vidyapeeth educational group.',
    thumbnail: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600&h=400&fit=crop',
    established: 1996,
    affiliation: 'D.Y. Patil Vidyapeeth (Deemed to be University)',
    website: 'https://www.dypatil.edu',
    totalSeats: 200,
    coursesOffered: ['MBBS', 'BDS', 'MD', 'MS', 'DM', 'MCh', 'B.Sc Nursing', 'Physiotherapy'],
    neetCutoffRange: 'AIR 25,000 - 70,000 (Management)',
    annualFees: '~19,00,000/yr',
    about:
      'D.Y. Patil Medical College, Hospital and Research Centre is part of D.Y. Patil Vidyapeeth, a Deemed to be University in Pimpri, Pune. Established in 1996, the institution has grown rapidly to become one of western India\'s leading private medical colleges. The 1500-bed D.Y. Patil Hospital is NABH-accredited and equipped with modern diagnostic and therapeutic facilities. The college is situated on a well-planned campus with excellent infrastructure and a growing research portfolio.',
    facultyQuality:
      'The faculty includes experienced clinicians and researchers. Several departments have faculty with international training and fellowship experience. The medical education unit focuses on innovative teaching methods including problem-based learning and simulation. The institution actively promotes research through funded projects and dedicated research mentors.',
    campusInfrastructure:
      'The modern campus features state-of-the-art lecture halls, advanced simulation labs, digital library, and well-equipped research facilities. The campus includes a sports complex, swimming pool, gymnasium, and student recreation areas. Wi-Fi coverage is campus-wide. The infrastructure is maintained to high standards.',
    hospitalFacilities:
      'The 1500-bed NABH-accredited hospital has comprehensive departments with modern equipment. Key facilities include advanced cardiac cath lab, MRI suite, CT scanner, endoscopy unit, and multiple operation theatres. The hospital has a growing organ transplant program and a dedicated cancer center. Emergency services are available 24/7.',
    clinicalExposure:
      'Students receive structured clinical exposure across the 1500-bed hospital. Clinical rotations are well-planned with emphasis on competency-based training. Community medicine exposure includes urban and rural health center postings. The student-to-bed ratio is favorable for hands-on learning.',
    patientLoad:
      'Annual OPD visits: ~1.2 million | Annual admissions: ~45,000 | Annual surgeries: ~20,000. The hospital serves the Pimpri-Chinchwad industrial belt and surrounding areas of Pune district.',
    hostelFacilities:
      'Modern air-conditioned hostels with single and double-sharing rooms. Separate boys and girls hostels with 24/7 security and CCTV. Mess serves multi-cuisine meals. Recreational facilities include TV rooms, badminton courts, and reading rooms. Laundry and Wi-Fi included.',
    studentLife:
      'Student life at D.Y. Patil is enriched by Pune\'s pleasant climate and vibrant cultural scene. The annual fest, sports competitions, and medical conferences are regular events. Pune is known for its educational institutions, cafes, historical sites, and trekking opportunities in the Western Ghats. The campus atmosphere is youthful and diverse.',
    pros: [
      'Modern infrastructure with NABH-accredited hospital',
      'Pune location offers excellent quality of life and climate',
      'Structured competency-based clinical training',
      'Good hostel and campus amenities',
      'Growing research culture with funded opportunities',
      'Strong placement and PG entrance track record',
    ],
    cons: [
      'High tuition fees (~19 lakh/year)',
      'Less clinical volume compared to large government hospitals',
      'Deemed university tag may carry less prestige',
      'Pimpri location is in the industrial outskirts of Pune',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&h=500&fit=crop', caption: 'D.Y. Patil Campus' },
      { url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=500&fit=crop', caption: 'Hospital Building' },
      { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', caption: 'Simulation Lab' },
    ],
    reviewVideos: [
      { title: 'D.Y. Patil Pune - Student Life', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'college-22',
    name: 'Osmania Medical College, Hyderabad',
    state: 'Telangana',
    city: 'Hyderabad',
    type: 'Government',
    description:
      'One of South India\'s oldest and most prestigious government medical colleges, established in 1846. Associated with Osmania General Hospital and Government Maternity Hospital in the heart of Hyderabad.',
    thumbnail: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&h=400&fit=crop',
    established: 1846,
    affiliation: 'Kaloji Narayana Rao University of Health Sciences (KNRUHS)',
    website: 'https://osmaniamedicalcollege.org',
    totalSeats: 250,
    coursesOffered: ['MBBS', 'MD', 'MS', 'DM', 'MCh'],
    neetCutoffRange: 'AIR 2,000 - 7,000 (General, State)',
    annualFees: '~32,000/yr',
    about:
      'Osmania Medical College (OMC), Hyderabad, was established in 1846 during the reign of the Nizams, making it one of the oldest medical colleges in India. Located in the historic Koti area of Hyderabad, the college is associated with Osmania General Hospital (1200 beds), Government Maternity Hospital (one of the busiest in India), and Niloufer Hospital for children. The combined bed strength exceeds 2800 beds. OMC has a distinguished heritage of medical education spanning over 175 years under both the Nizam\'s rule and post-independence India.',
    facultyQuality:
      'OMC has a strong faculty with deep clinical expertise across departments. The Department of General Surgery and the Department of Obstetrics & Gynaecology are particularly well-regarded nationally. Faculty members are experienced in handling high-volume clinical settings and provide excellent bedside teaching. Several professors serve as examiners for KNRUHS.',
    campusInfrastructure:
      'The campus features a blend of Nizam-era architecture and modern facilities. The college has been progressively upgraded with smart classrooms, digital library resources, and updated labs. The iconic Osmania Hospital building is a heritage landmark. Recent state government investment has improved teaching facilities and added new academic blocks.',
    hospitalFacilities:
      'Osmania General Hospital (1200 beds) is one of Telangana\'s largest government hospitals with comprehensive departments. Government Maternity Hospital handles one of the highest delivery volumes in India (30,000+ deliveries annually). Niloufer Hospital is a dedicated pediatric facility. Combined, these hospitals provide unmatched exposure in obstetrics and pediatrics.',
    clinicalExposure:
      'Clinical exposure is extraordinary, particularly in obstetrics and emergency medicine. Students witness an enormous diversity of surgical and medical cases. The emergency department at OGH is one of the busiest in South India. Maternity and pediatric training at the associated hospitals is among the best in the country.',
    patientLoad:
      'Annual OPD visits: ~2.5 million | Annual admissions: ~85,000 | Annual surgeries: ~40,000 | Annual deliveries: ~32,000 | Emergency cases: ~180,000/yr. The hospitals serve Hyderabad and much of Telangana.',
    hostelFacilities:
      'On-campus hostels near the hospital complex. Rooms are basic with mess facilities. Hyderabad\'s vibrant culture, affordable cost of living, and excellent cuisine make the living experience enjoyable. Recent renovations have improved amenities.',
    studentLife:
      'OMC has a rich cultural tradition with active student organizations. The annual fest is a major event. Hyderabad offers incredible cultural experiences - from Charminar and Golconda Fort to its world-famous biryani and vibrant IT corridor. The city has excellent connectivity and is one of India\'s most cosmopolitan cities. Students enjoy a perfect blend of heritage and modernity.',
    pros: [
      'One of India\'s oldest medical colleges with rich Nizam heritage',
      'Exceptional obstetrics and pediatrics training',
      'Massive patient volume across three associated hospitals',
      'Hyderabad offers excellent quality of life and cuisine',
      'Affordable government fees',
      'Strong surgical training tradition',
    ],
    cons: [
      'Old City location can be congested with traffic',
      'Some infrastructure is heritage-constrained',
      'Competition for Telangana state quota is intense',
      'Limited on-campus recreational facilities',
    ],
    gallery: [
      { url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&h=500&fit=crop', caption: 'Osmania Hospital Heritage Building' },
      { url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=500&fit=crop', caption: 'Hospital Corridor' },
      { url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop', caption: 'College Campus' },
    ],
    reviewVideos: [
      { title: 'Osmania Medical College Heritage & Hospital', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    ],
  },
];
