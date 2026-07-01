import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_COLLEGES } from '@/lib/college-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn, StaggerContainer, StaggerItem, CardElevation } from '@/components/ui/motion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Building2, Globe, GraduationCap, Users, BookOpen,
  Stethoscope, Activity, HeartPulse, Home, Smile, ThumbsUp, ThumbsDown,
  Image, Play, ExternalLink, Calendar, IndianRupee, Award, AlertTriangle,
  X, ChevronRight, Sparkles, type LucideIcon,
} from 'lucide-react';

type Tab = 'overview' | 'academics' | 'campus' | 'gallery';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'academics', label: 'Academics & Clinical', icon: Activity },
  { id: 'campus', label: 'Campus Life', icon: Home },
  { id: 'gallery', label: 'Gallery & Videos', icon: Image },
];

const typeStyle: Record<string, { badge: string; color: string }> = {
  Government: { badge: 'bg-emerald-500/20 text-emerald-200', color: 'text-emerald-600 dark:text-emerald-400' },
  Private: { badge: 'bg-amber-500/20 text-amber-200', color: 'text-amber-600 dark:text-amber-400' },
  Deemed: { badge: 'bg-blue-500/20 text-blue-200', color: 'text-blue-600 dark:text-blue-400' },
};

function InfoCard({ icon: Icon, label, value, iconColor = 'text-red-600 dark:text-red-400' }: {
  icon: LucideIcon; label: string; value: string; iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 group/info hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0">
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  );
}

const STAT_COLORS = [
  { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
  { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
];

function PatientLoadCard({ data }: { data: string }) {
  // Parse "Label: Value | Label: Value | ... trailing sentence."
  const parts = data.split('|').map((s) => s.trim());
  const stats: { label: string; value: string }[] = [];
  let description = '';

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) { description = part; continue; }
    const label = part.slice(0, colonIdx).trim();
    let value = part.slice(colonIdx + 1).trim();
    // If value contains a sentence (period followed by space + uppercase), split it
    const sentenceBreak = value.search(/\.\s+[A-Z]/);
    if (sentenceBreak !== -1) {
      description = value.slice(sentenceBreak + 2);
      value = value.slice(0, sentenceBreak);
    }
    if (label && value) stats.push({ label, value });
  }

  return (
    <FadeIn>
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
            <HeartPulse className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </div>
          Patient Load
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pl-9">
          {stats.map((s, i) => {
            const color = STAT_COLORS[i % STAT_COLORS.length];
            return (
              <div key={i} className={`rounded-xl ${color.bg} px-3 py-3`}>
                <p className={`text-base font-extrabold ${color.text} leading-tight`}>{s.value}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-snug">{s.label}</p>
              </div>
            );
          })}
        </div>

        {description && (
          <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-[1.7] pl-9">{description}</p>
        )}
      </div>
    </FadeIn>
  );
}

// ── Tinder-style Photo Stack ───────────────────────────────

function PhotoStack({ images }: { images: Array<{ url: string; caption: string }> }) {
  const [order, setOrder] = useState(() => images.map((_, i) => i));

  const sendToBack = useCallback(() => {
    setOrder((prev) => {
      const next = [...prev];
      const top = next.shift()!;
      next.push(top);
      return next;
    });
  }, []);

  // Rotation angles for zigzag stacking
  const rotations = useMemo(() => images.map((_, i) => {
    const seed = (i * 7 + 3) % 11;
    return (seed - 5) * 1.2; // range: -6 to +6 degrees
  }), [images]);

  const VISIBLE = Math.min(images.length, 4); // show max 4 in stack

  return (
    <div className="flex justify-center">
      <div
        className="relative cursor-pointer select-none"
        style={{ width: '100%', maxWidth: 420, aspectRatio: '4/3' }}
        onClick={sendToBack}
        role="button"
        tabIndex={0}
        aria-label="Click to see next photo"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sendToBack(); } }}
      >
        <AnimatePresence initial={false}>
          {order.slice(0, VISIBLE).map((imgIdx, stackPos) => {
            const img = images[imgIdx];
            const isTop = stackPos === 0;
            const depth = stackPos;
            const scale = 1 - depth * 0.04;
            const yOffset = depth * 8;
            const rotate = isTop ? 0 : rotations[imgIdx];

            return (
              <motion.div
                key={imgIdx}
                className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg"
                style={{ zIndex: VISIBLE - stackPos, originX: 0.5, originY: 0.5 }}
                initial={false}
                animate={{
                  scale,
                  y: yOffset,
                  rotate,
                  opacity: 1,
                }}
                exit={{
                  y: 400,
                  rotate: 15,
                  opacity: 0,
                  scale: 0.8,
                  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8,
                }}
                whileHover={isTop ? { scale: 1.015, y: -3 } : undefined}
                whileTap={isTop ? { scale: 0.97 } : undefined}
              >
                <img
                  src={img.url}
                  alt={img.caption}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                  draggable={false}
                />
                {/* Gradient + caption only on top card */}
                {isTop && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-4">
                      <p className="text-white text-sm font-bold drop-shadow leading-snug">{img.caption}</p>
                      <p className="text-white/60 text-[10px] mt-1 font-medium">
                        {order.indexOf(imgIdx) + 1} / {images.length}
                      </p>
                    </div>
                  </>
                )}
                {/* Shadow overlay on stacked cards */}
                {!isTop && (
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ContentBlock({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <FadeIn>
      <div className="space-y-2.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </div>
          {title}
        </h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-[1.7] pl-9">
          {text}
        </p>
      </div>
    </FadeIn>
  );
}

export default function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const college = useMemo(() => MOCK_COLLEGES.find((c) => c.id === id) ?? null, [id]);

  if (!college) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState icon={AlertTriangle} title="College not found" description="The college you're looking for doesn't exist."
          action={{ label: 'Back to Colleges', onClick: () => navigate('/colleges') }} />
      </div>
    );
  }

  const style = typeStyle[college.type] || typeStyle.Government;

  return (
    <div className="space-y-6 pb-12">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/colleges')} className="flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Colleges
      </Button>

      {/* ═══ Hero ═══ */}
      <div className="relative rounded-2xl overflow-hidden">
        <motion.div className="h-56 sm:h-72 md:h-80" initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <img src={college.thumbnail} alt={college.name} className="w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 md:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${style.badge}`}>{college.type}</span>
              <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90">Est. {college.established}</span>
              <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90">{college.totalSeats} Seats</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight max-w-3xl tracking-tight">{college.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{college.city}, {college.state}</span>
              <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" />{college.affiliation}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ Quick Stats ═══ */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { icon: GraduationCap, label: 'Total Seats', value: String(college.totalSeats), color: 'text-blue-600 dark:text-blue-400' },
          { icon: Activity, label: 'NEET Cutoff', value: college.neetCutoffRange, color: 'text-red-600 dark:text-red-400' },
          { icon: IndianRupee, label: 'Annual Fees', value: college.annualFees, color: 'text-amber-600 dark:text-amber-400' },
          { icon: Calendar, label: 'Courses', value: college.coursesOffered.join(', '), color: 'text-purple-600 dark:text-purple-400' },
        ] as const).map((s) => (
          <StaggerItem key={s.label}>
            <InfoCard icon={s.icon} label={s.label} value={s.value} iconColor={s.color} />
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ═══ Tab Navigation ═══ */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  active ? 'text-red-600 dark:text-red-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {active && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-red-600 dark:bg-red-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Tab Content ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">

              {activeTab === 'overview' && (
                <>
                  <ContentBlock icon={BookOpen} title="About" text={college.about} />
                  <ContentBlock icon={Users} title="Faculty Quality" text={college.facultyQuality} />

                  {/* Pros & Cons */}
                  <FadeIn>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10">
                        <CardContent className="p-4 space-y-2.5">
                          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ThumbsUp className="w-3.5 h-3.5" /> Advantages
                          </h4>
                          {college.pros.map((p, i) => (
                            <p key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
                              <span className="text-emerald-500 mt-0.5 shrink-0">+</span> {p}
                            </p>
                          ))}
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/10">
                        <CardContent className="p-4 space-y-2.5">
                          <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ThumbsDown className="w-3.5 h-3.5" /> Considerations
                          </h4>
                          {college.cons.map((c, i) => (
                            <p key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed">
                              <span className="text-rose-500 mt-0.5 shrink-0">-</span> {c}
                            </p>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </FadeIn>
                </>
              )}

              {activeTab === 'academics' && (
                <>
                  <ContentBlock icon={Stethoscope} title="Hospital Facilities" text={college.hospitalFacilities} />
                  <ContentBlock icon={Activity} title="Clinical Exposure" text={college.clinicalExposure} />

                  {/* Patient Load */}
                  <PatientLoadCard data={college.patientLoad} />
                </>
              )}

              {activeTab === 'campus' && (
                <>
                  <ContentBlock icon={Building2} title="Campus Infrastructure" text={college.campusInfrastructure} />
                  <ContentBlock icon={Home} title="Hostel Facilities" text={college.hostelFacilities} />
                  <ContentBlock icon={Smile} title="Student Life" text={college.studentLife} />
                </>
              )}

              {activeTab === 'gallery' && (
                <>
                  {/* Tinder-style Photo Stack */}
                  <FadeIn>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                      <Image className="w-4 h-4 text-red-600" /> Campus Gallery
                      <span className="text-[10px] font-medium text-muted-foreground ml-auto">Click to shuffle</span>
                    </h3>
                    <PhotoStack images={college.gallery} />
                  </FadeIn>

                  {/* Videos */}
                  {college.reviewVideos.length > 0 && (
                    <FadeIn>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                        <Play className="w-4 h-4 text-red-600" /> Review Videos
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {college.reviewVideos.map((video, idx) => (
                          <Card key={idx} className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                            <div className="aspect-video bg-slate-900 relative">
                              <iframe src={video.embedUrl} title={video.title} className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                            </div>
                            <CardContent className="p-3">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Play className="w-3 h-3 text-red-600 shrink-0" /> {video.title}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </FadeIn>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="space-y-5">
          <FadeIn delay={0.1}>
            <Card className="sticky top-16 overflow-hidden">
              <div className="h-1 gradient-primary" />
              <CardContent className="p-5 space-y-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-600" /> Quick Info
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { label: 'Type', value: college.type, highlight: true },
                    { label: 'Location', value: `${college.city}, ${college.state}` },
                    { label: 'Established', value: String(college.established) },
                    { label: 'Affiliation', value: college.affiliation },
                    { label: 'MBBS Seats', value: String(college.totalSeats) },
                    { label: 'Annual Fees', value: college.annualFees },
                    { label: 'NEET Cutoff', value: college.neetCutoffRange },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2.5 text-xs group/row hover:bg-slate-50 dark:hover:bg-slate-800/30 -mx-2 px-2 rounded-lg transition-colors">
                      <span className="text-slate-400 font-medium">{row.label}</span>
                      {row.highlight ? (
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                          college.type === 'Government' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                          college.type === 'Deemed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                          'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>{row.value}</span>
                      ) : (
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[55%] leading-snug">{row.value}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Courses */}
                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Courses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {college.coursesOffered.map((c) => (
                      <span key={c} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-semibold text-slate-600 dark:text-slate-400">{c}</span>
                    ))}
                  </div>
                </div>

                {/* Website */}
                {college.website && (
                  <div className="pt-3 mt-1">
                    <Button asChild variant="outline" className="w-full gap-2 text-xs rounded-xl h-10 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 transition-colors">
                      <a href={college.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-3.5 h-3.5" /> Official Website <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>

      {/* ═══ Lightbox ═══ */}
      <AnimatePresence>
        {lightboxIdx !== null && college.gallery[lightboxIdx] && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setLightboxIdx(null)} />
            <motion.div className="relative max-w-4xl w-full" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
              <img src={college.gallery[lightboxIdx].url} alt={college.gallery[lightboxIdx].caption} className="w-full max-h-[80vh] object-contain rounded-2xl" />
              <p className="text-white text-sm font-medium text-center mt-3">{college.gallery[lightboxIdx].caption}</p>
              <button onClick={() => setLightboxIdx(null)} className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
              {/* Nav arrows */}
              {lightboxIdx > 0 && (
                <button onClick={() => setLightboxIdx(lightboxIdx - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors" aria-label="Previous image">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              {lightboxIdx < college.gallery.length - 1 && (
                <button onClick={() => setLightboxIdx(lightboxIdx + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors" aria-label="Next image">
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
