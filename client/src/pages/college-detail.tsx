import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_COLLEGES } from '@/lib/college-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Globe,
  GraduationCap,
  Users,
  BookOpen,
  Stethoscope,
  Activity,
  HeartPulse,
  Home,
  Smile,
  ThumbsUp,
  ThumbsDown,
  Image,
  Play,
  ExternalLink,
  Calendar,
  IndianRupee,
  Award,
  AlertTriangle,
} from 'lucide-react';

type SectionId =
  | 'about'
  | 'faculty'
  | 'infrastructure'
  | 'hospital'
  | 'clinical'
  | 'patients'
  | 'hostel'
  | 'studentlife'
  | 'proscons'
  | 'gallery'
  | 'videos';

const sections: { id: SectionId; label: string; icon: typeof BookOpen }[] = [
  { id: 'about', label: 'About', icon: BookOpen },
  { id: 'faculty', label: 'Faculty', icon: Users },
  { id: 'infrastructure', label: 'Campus', icon: Building2 },
  { id: 'hospital', label: 'Hospital', icon: Stethoscope },
  { id: 'clinical', label: 'Clinical', icon: Activity },
  { id: 'patients', label: 'Patients', icon: HeartPulse },
  { id: 'hostel', label: 'Hostel', icon: Home },
  { id: 'studentlife', label: 'Life', icon: Smile },
  { id: 'proscons', label: 'Pros & Cons', icon: ThumbsUp },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'videos', label: 'Videos', icon: Play },
];

const typeColors: Record<string, string> = {
  Government: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400',
  Private: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400',
  Deemed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400',
};

function InfoSection({
  icon: Icon,
  title,
  children,
  id,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionId>('about');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const college = useMemo(() => MOCK_COLLEGES.find((c) => c.id === id) ?? null, [id]);

  if (!college) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="College not found"
          description="The college you're looking for doesn't exist or has been removed."
          action={{ label: 'Back to Colleges', onClick: () => navigate('/colleges') }}
        />
      </div>
    );
  }

  const scrollToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/colleges')} className="flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> Back to Colleges
      </Button>

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="h-48 sm:h-64 md:h-72">
          <img
            src={college.thumbnail}
            alt={college.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 md:p-8 text-white">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${typeColors[college.type]}`}>
              {college.type}
            </span>
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              Est. {college.established}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight max-w-3xl">
            {college.name}
          </h1>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {college.city}, {college.state}
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> {college.affiliation}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: GraduationCap, label: 'Total Seats', value: String(college.totalSeats) },
          { icon: Activity, label: 'NEET Cutoff', value: college.neetCutoffRange },
          { icon: IndianRupee, label: 'Annual Fees', value: college.annualFees },
          { icon: Calendar, label: 'Courses', value: college.coursesOffered.join(', ') },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <stat.icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{stat.label}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-2">
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Section Navigation */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <section.icon className="w-3.5 h-3.5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          <InfoSection icon={BookOpen} title="About the College" id="about">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.about}
            </p>
          </InfoSection>

          <InfoSection icon={Users} title="Faculty Quality" id="faculty">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.facultyQuality}
            </p>
          </InfoSection>

          <InfoSection icon={Building2} title="Campus Infrastructure" id="infrastructure">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.campusInfrastructure}
            </p>
          </InfoSection>

          <InfoSection icon={Stethoscope} title="Hospital Facilities" id="hospital">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.hospitalFacilities}
            </p>
          </InfoSection>

          <InfoSection icon={Activity} title="Clinical Exposure" id="clinical">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.clinicalExposure}
            </p>
          </InfoSection>

          <InfoSection icon={HeartPulse} title="Patient Load" id="patients">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.patientLoad}
            </p>
          </InfoSection>

          <InfoSection icon={Home} title="Hostel Facilities" id="hostel">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.hostelFacilities}
            </p>
          </InfoSection>

          <InfoSection icon={Smile} title="Student Life" id="studentlife">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {college.studentLife}
            </p>
          </InfoSection>

          {/* Pros & Cons */}
          <Card id="proscons" className="scroll-mt-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <ThumbsUp className="w-4 h-4" />
                </div>
                Pros & Cons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5" /> Advantages
                  </h4>
                  <ul className="space-y-2">
                    {college.pros.map((pro, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 mt-0.5">
                          <ThumbsUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <ThumbsDown className="w-3.5 h-3.5" /> Considerations
                  </h4>
                  <ul className="space-y-2">
                    {college.cons.map((con, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center shrink-0 mt-0.5">
                          <ThumbsDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        </span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery */}
          <Card id="gallery" className="scroll-mt-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <Image className="w-4 h-4" />
                </div>
                Gallery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {college.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(selectedImage === idx ? null : idx)}
                    className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <img
                      src={img.url}
                      alt={img.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="absolute bottom-2 left-2 right-2 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
                      {img.caption}
                    </span>
                  </button>
                ))}
              </div>

              {/* Expanded Image */}
              {selectedImage !== null && college.gallery[selectedImage] && (
                <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img
                    src={college.gallery[selectedImage].url}
                    alt={college.gallery[selectedImage].caption}
                    className="w-full max-h-[500px] object-cover"
                  />
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {college.gallery[selectedImage].caption}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Videos */}
          <Card id="videos" className="scroll-mt-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <Play className="w-4 h-4" />
                </div>
                Review Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {college.reviewVideos.map((video, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {video.title}
                    </h4>
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <iframe
                        src={video.embedUrl}
                        title={video.title}
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <Card className="glass sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">College Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Type</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border ${typeColors[college.type]}`}>
                    {college.type}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Location</span>
                  <span className="font-semibold text-right">{college.city}, {college.state}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Established</span>
                  <span className="font-semibold">{college.established}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Affiliation</span>
                  <span className="font-semibold text-right max-w-[160px] truncate">{college.affiliation}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">MBBS Seats</span>
                  <span className="font-semibold">{college.totalSeats}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Annual Fees</span>
                  <span className="font-semibold text-red-600">{college.annualFees}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">NEET Cutoff</span>
                  <span className="font-semibold text-right max-w-[160px]">{college.neetCutoffRange}</span>
                </div>
                <div className="py-2">
                  <span className="text-slate-400 block mb-1.5">Courses Offered</span>
                  <div className="flex flex-wrap gap-1.5">
                    {college.coursesOffered.map((course) => (
                      <span
                        key={course}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-400"
                      >
                        {course}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {college.website && (
                <Button asChild variant="outline" className="w-full gap-2 text-xs">
                  <a href={college.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-3.5 h-3.5" /> Visit Official Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
