import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCollection, type College } from '@/lib/data-api';
import { usePlan } from '@/lib/use-plan';
import { UpgradePrompt } from '@/components/ui/upgrade-prompt';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Image,
  IndianRupee,
  Loader2,
  MapPin,
  Maximize2,
  Play,
  Smile,
  Sparkles,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  Users,
  X,
  type LucideIcon,
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

/** Per-row icon + tint for the Quick Info sidebar — turns a flat key/value list into a
 *  scannable icon rail so every label and value lines up on the same left edge. */
const QUICK_INFO_META: Record<string, { icon: LucideIcon; tint: string }> = {
  Type: { icon: Building2, tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
  Location: { icon: MapPin, tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
  Established: { icon: Calendar, tint: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' },
  Affiliation: { icon: GraduationCap, tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
  'MBBS Seats': { icon: Users, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' },
  'Annual Fees': { icon: IndianRupee, tint: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' },
  'NEET Cutoff': { icon: Award, tint: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
};
const QUICK_INFO_FALLBACK = { icon: Sparkles, tint: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };

function InfoCard({ icon: Icon, label, value, iconColor = 'text-emerald-600 dark:text-emerald-400' }: {
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
  { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
];

function PatientLoadCard({ data }: { data?: string }) {
  const parts = (data ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  const stats: { label: string; value: string }[] = [];
  let description = '';

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) { description = part; continue; }
    const label = part.slice(0, colonIdx).trim();
    let value = part.slice(colonIdx + 1).trim();
    const sentenceBreak = value.search(/\.\s+[A-Z]/);
    if (sentenceBreak !== -1) {
      description = value.slice(sentenceBreak + 2);
      value = value.slice(0, sentenceBreak);
    }
    if (label && value) stats.push({ label, value });
  }

  // Admin-created colleges may not have a patient-load string at all.
  if (!stats.length && !description) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:shadow-lg transition-shadow duration-300">
        <div className="h-[3px] bg-gradient-to-r from-green-500 to-pink-600 opacity-60" />
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-pink-600 flex items-center justify-center shadow-lg shadow-green-500/10"
              whileHover={{ scale: 1.1, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <HeartPulse className="w-5 h-5 text-white" />
            </motion.div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Patient Load
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => {
              const color = STAT_COLORS[i % STAT_COLORS.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                  className={`rounded-xl ${color.bg} px-3.5 py-3.5 border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all duration-300 group/stat`}
                >
                  <p className={`text-lg font-extrabold ${color.text} leading-tight group-hover/stat:scale-105 transition-transform origin-left`}>{s.value}</p>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 leading-snug uppercase tracking-wider">{s.label}</p>
                </motion.div>
              );
            })}
          </div>

          {description && (
            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[1.8] mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Tinder-style Photo Stack ───────────────────────────────

function PhotoStack({
  images,
  onExpand,
}: {
  images: Array<{ url: string; caption: string }>;
  onExpand?: (index: number) => void;
}) {
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
                        {/* Was order.indexOf(imgIdx) + 1 — but the top card is always
                            at index 0, so this read "1 / N" forever. */}
                        {imgIdx + 1} / {images.length}
                      </p>
                    </div>
                  </>
                )}
                {/* The lightbox had close/prev/next but nothing that OPENED it —
                    clicking a photo only cycled the stack. This is the way in. */}
                {isTop && onExpand && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onExpand(imgIdx); }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-10"
                    aria-label="View full size"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
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

function ContentBlock({ icon: Icon, title, text, gradient = 'from-emerald-500 to-green-600', delay = 0 }: {
  icon: LucideIcon; title: string; text?: string; gradient?: string; delay?: number;
}) {
  const body = text ?? '';

  // Nothing to say — an admin-created college may have no prose for this section.
  if (!body.trim()) return null;

  // Split text into sentences for better readability
  const firstSentenceEnd = body.indexOf('. ');
  const highlight = firstSentenceEnd > 0 ? body.slice(0, firstSentenceEnd + 1) : '';
  const rest = firstSentenceEnd > 0 ? body.slice(firstSentenceEnd + 2) : body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:shadow-lg transition-shadow duration-300 group/block">
        <div className={`h-[3px] bg-gradient-to-r ${gradient} opacity-60 group-hover/block:opacity-100 transition-opacity duration-300`} />
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-emerald-500/10`}
              whileHover={{ scale: 1.1, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Icon className="w-5 h-5 text-white" />
            </motion.div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
          </div>
          <div className="space-y-2">
            {highlight && (
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                {highlight}
              </p>
            )}
            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[1.8]">
              {rest}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: colleges, loading, error, reload } = useCollection<College>('colleges');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { canFullData } = usePlan();   // Pro+ unlocks the full college profile (beyond Overview)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // A deactivated college is treated as non-existent on the public site.
  // Legacy rows have no isActive field — treat those as active.
  const college = useMemo(() => {
    const found = colleges.find((c) => c.id === id);
    return found && found.isActive !== false ? found : null;
  }, [colleges, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState icon={AlertTriangle} title="Couldn't load college" description={error}
          action={{ label: 'Try Again', onClick: reload }} />
      </div>
    );
  }

  if (!college) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState icon={AlertTriangle} title="College not found" description="The college you're looking for doesn't exist."
          action={{ label: 'Back to Colleges', onClick: () => navigate('/colleges') }} />
      </div>
    );
  }

  const style = typeStyle[college.type] || typeStyle.Government;

  // Every one of these fields is optional on an admin-created record.
  const courses = college.coursesOffered ?? [];
  const gallery = college.gallery ?? [];
  const videos = college.reviewVideos ?? [];
  const pros = college.pros ?? [];
  const cons = college.cons ?? [];

  const quickInfoRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Type', value: college.type, highlight: true },
    { label: 'Location', value: `${college.city}, ${college.state}` },
    ...(college.established != null ? [{ label: 'Established', value: String(college.established) }] : []),
    ...(college.affiliation ? [{ label: 'Affiliation', value: college.affiliation }] : []),
    ...(college.totalSeats != null ? [{ label: 'MBBS Seats', value: String(college.totalSeats) }] : []),
    ...(college.annualFees ? [{ label: 'Annual Fees', value: college.annualFees }] : []),
    ...(college.neetCutoffRange ? [{ label: 'NEET Cutoff', value: college.neetCutoffRange }] : []),
  ];

  const hasOverview = Boolean(college.about?.trim() || college.facultyQuality?.trim()) || pros.length > 0 || cons.length > 0;
  const hasAcademics = Boolean(college.hospitalFacilities?.trim() || college.clinicalExposure?.trim() || college.patientLoad?.trim());
  const hasCampus = Boolean(college.campusInfrastructure?.trim() || college.hostelFacilities?.trim() || college.studentLife?.trim());
  const hasMedia = gallery.length > 0 || videos.length > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/colleges')} className="flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Colleges
      </Button>

      {/* ═══ Hero ═══ */}
      <div className="relative rounded-2xl overflow-hidden">
        <motion.div className="h-56 sm:h-72 md:h-80 bg-slate-200 dark:bg-slate-800" initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          {college.thumbnail && (
            <img src={college.thumbnail} alt={college.name} className="w-full h-full object-cover" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 md:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${style.badge}`}>{college.type}</span>
              {college.established != null && (
                <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 text-white/90">Est. {college.established}</span>
              )}
              {college.totalSeats != null && (
                <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 text-white/90">{college.totalSeats} Seats</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight max-w-3xl tracking-tight">{college.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{college.city}, {college.state}</span>
              {college.affiliation && (
                <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" />{college.affiliation}</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ Quick Stats ═══ */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { icon: GraduationCap, label: 'Total Seats', value: college.totalSeats != null ? String(college.totalSeats) : '—', color: 'text-blue-600 dark:text-blue-400' },
          { icon: Activity, label: 'NEET Cutoff', value: college.neetCutoffRange ?? '—', color: 'text-emerald-600 dark:text-emerald-400' },
          { icon: IndianRupee, label: 'Annual Fees', value: college.annualFees ?? '—', color: 'text-amber-600 dark:text-amber-400' },
          { icon: Calendar, label: 'Courses', value: courses.length > 0 ? courses.join(', ') : '—', color: 'text-purple-600 dark:text-purple-400' },
        ] as const).map((s) => (
          <StaggerItem key={s.label}>
            <InfoCard icon={s.icon} label={s.label} value={s.value} iconColor={s.color} />
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ═══ Tab Navigation ═══ */}
      {/* Opaque, not backdrop-blurred. A sticky element with `backdrop-blur` forces the
          browser to re-blur everything behind it on every scroll frame — the single
          biggest cause of the scroll jank here. A solid background is just as readable. */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {active && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full"
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

              {(activeTab === 'overview' || canFullData) ? (
              <>
              {activeTab === 'overview' && !hasOverview && (
                <EmptyState title="No overview yet" description="Details for this college haven't been published." />
              )}

              {activeTab === 'overview' && hasOverview && (
                <>
                  <ContentBlock icon={BookOpen} title="About" text={college.about} gradient="from-blue-500 to-indigo-600" delay={0} />
                  <ContentBlock icon={Users} title="Faculty Quality" text={college.facultyQuality} gradient="from-purple-500 to-violet-600" delay={0.1} />

                  {/* Pros & Cons */}
                  {(pros.length > 0 || cons.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pros.length > 0 && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
                      <Card className="overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:shadow-lg transition-all duration-300 h-full group/pros">
                        <div className="h-[3px] bg-gradient-to-r from-emerald-500 to-green-500" />
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <motion.div
                              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-500/15"
                              whileHover={{ scale: 1.1 }}
                            >
                              <ThumbsUp className="w-4 h-4 text-white" />
                            </motion.div>
                            <h4 className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                              Advantages
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {pros.map((p, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.06 }}
                                className="flex gap-2.5 items-start p-2 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-colors"
                              >
                                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 text-[10px] font-bold">{i + 1}</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{p}</p>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    )}

                    {cons.length > 0 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                      <Card className="overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:shadow-lg transition-all duration-300 h-full group/cons">
                        <div className="h-[3px] bg-gradient-to-r from-green-500 to-emerald-500" />
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <motion.div
                              className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/15"
                              whileHover={{ scale: 1.1 }}
                            >
                              <ThumbsDown className="w-4 h-4 text-white" />
                            </motion.div>
                            <h4 className="text-base font-extrabold text-green-700 dark:text-green-400">
                              Considerations
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {cons.map((c, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.35 + i * 0.06 }}
                                className="flex gap-2.5 items-start p-2 rounded-lg hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors"
                              >
                                <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center shrink-0 mt-0.5 text-green-600 text-[10px] font-bold">{i + 1}</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{c}</p>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    )}
                  </div>
                  )}
                </>
              )}

              {activeTab === 'academics' && !hasAcademics && (
                <EmptyState title="No academic details yet" description="Academic and clinical information for this college hasn't been published." />
              )}

              {activeTab === 'academics' && hasAcademics && (
                <>
                  <ContentBlock icon={Stethoscope} title="Hospital Facilities" text={college.hospitalFacilities} gradient="from-emerald-500 to-teal-600" delay={0} />
                  <ContentBlock icon={Activity} title="Clinical Exposure" text={college.clinicalExposure} gradient="from-blue-500 to-cyan-600" delay={0.1} />
                  <PatientLoadCard data={college.patientLoad} />
                </>
              )}

              {activeTab === 'campus' && !hasCampus && (
                <EmptyState title="No campus details yet" description="Campus life information for this college hasn't been published." />
              )}

              {activeTab === 'campus' && hasCampus && (
                <>
                  <ContentBlock icon={Building2} title="Campus Infrastructure" text={college.campusInfrastructure} gradient="from-amber-500 to-orange-600" delay={0} />
                  <ContentBlock icon={Home} title="Hostel Facilities" text={college.hostelFacilities} gradient="from-indigo-500 to-violet-600" delay={0.1} />
                  <ContentBlock icon={Smile} title="Student Life" text={college.studentLife} gradient="from-pink-500 to-green-600" delay={0.2} />
                </>
              )}

              {activeTab === 'gallery' && !hasMedia && (
                <EmptyState icon={Image} title="No photos or videos yet" description="Media for this college hasn't been uploaded." />
              )}

              {activeTab === 'gallery' && hasMedia && (
                <>
                  {/* Tinder-style Photo Stack */}
                  {gallery.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex items-center gap-3 mb-5">
                      <motion.div
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/10"
                        whileHover={{ scale: 1.1, rotate: 3 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      >
                        <Image className="w-5 h-5 text-white" />
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Campus Gallery</h3>
                        <p className="text-[11px] text-muted-foreground">Click to shuffle photos</p>
                      </div>
                    </div>
                    <PhotoStack images={gallery} onExpand={setLightboxIdx} />
                  </motion.div>
                  )}

                  {/* Videos */}
                  {videos.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                      <div className="flex items-center gap-3 mb-5">
                        <motion.div
                          className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/10"
                          whileHover={{ scale: 1.1, rotate: 3 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                        >
                          <Play className="w-5 h-5 text-white" />
                        </motion.div>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Review Videos</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {videos.map((video, idx) => (
                          <Card key={idx} className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                            <div className="aspect-video bg-slate-900 relative">
                              <iframe src={video.embedUrl} title={video.title} className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                            </div>
                            <CardContent className="p-3">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Play className="w-3 h-3 text-emerald-600 shrink-0" /> {video.title}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              </>
              ) : (
                <UpgradePrompt title="Unlock the full college profile" description="Academics, campus life and photos are part of the Pro plan — upgrade to see the complete review." />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="space-y-5">
          <FadeIn delay={0.1}>
            <Card className="sticky top-16 overflow-hidden">
              <div className="h-1 gradient-primary" />
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center shadow-sm shadow-emerald-600/25">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </span>
                  Quick Info
                </h3>

                <div className="space-y-0.5">
                  {quickInfoRows.map((row, idx) => {
                    const meta = QUICK_INFO_META[row.label] ?? QUICK_INFO_FALLBACK;
                    const Icon = meta.icon;
                    return (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.12 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        className="group/row flex items-center gap-3 py-2 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:translate-x-0.5 transition-all duration-200"
                      >
                        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${meta.tint} transition-transform duration-200 group-hover/row:scale-110 group-hover/row:-rotate-3`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{row.label}</p>
                          {row.highlight ? (
                            <span className={`inline-block mt-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                              college.type === 'Government' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                              college.type === 'Deemed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            }`}>{row.value}</span>
                          ) : (
                            <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">{row.value}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Courses */}
                {courses.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Courses</p>
                    <div className="flex flex-wrap gap-1.5">
                      {courses.map((c) => (
                        <span key={c} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 hover:scale-105 transition-all duration-200 cursor-default">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Website */}
                {college.website && (
                  <div className="pt-1">
                    <Button asChild variant="outline" className="group/web w-full gap-2 text-xs rounded-xl h-10 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-950/20 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                      <a href={college.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-3.5 h-3.5 transition-transform duration-200 group-hover/web:rotate-12" /> Official Website <ExternalLink className="w-3 h-3 ml-auto transition-transform duration-200 group-hover/web:translate-x-0.5 group-hover/web:-translate-y-0.5" />
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
        {lightboxIdx !== null && gallery[lightboxIdx] && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setLightboxIdx(null)} />
            <motion.div className="relative max-w-4xl w-full" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
              <img src={gallery[lightboxIdx].url} alt={gallery[lightboxIdx].caption} className="w-full max-h-[80vh] object-contain rounded-2xl" />
              <p className="text-white text-sm font-medium text-center mt-3">{gallery[lightboxIdx].caption}</p>
              <button onClick={() => setLightboxIdx(null)} className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
              {/* Nav arrows */}
              {lightboxIdx > 0 && (
                <button onClick={() => setLightboxIdx(lightboxIdx - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors" aria-label="Previous image">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              {lightboxIdx < gallery.length - 1 && (
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
