import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ALL_STATES } from '@/lib/allotment-data';
import { Card, CardContent } from '@/components/ui/card';
import {
  ScrollText,
  ClipboardList,
  Home,
  Users,
  ChevronDown,
  Check,
  Sparkles,
  Building2,
  ShieldCheck,
  Info,
} from 'lucide-react';

type SectionKey = 'eligibility' | 'application' | 'domicile' | 'counselling';

const SECTIONS: { key: SectionKey; label: string; icon: typeof ScrollText; blurb: string }[] = [
  { key: 'eligibility', label: 'Eligibility', icon: ShieldCheck, blurb: 'Who can apply' },
  { key: 'application', label: 'Application', icon: ClipboardList, blurb: 'How to register' },
  { key: 'domicile', label: 'Domicile', icon: Home, blurb: 'Home-state rules' },
  { key: 'counselling', label: 'Counselling', icon: Users, blurb: 'Allotment flow' },
];

interface Block {
  heading: string;
  intro?: string;
  note?: string;
  items?: string[];
  ordered?: boolean;
}

const CONTENT: Record<SectionKey, { authority: string; blocks: Block[] }> = {
  eligibility: {
    authority:
      'The Directorate General of Health Services (DGHS), Ministry of Health & Family Welfare, conducts online counselling for the 15% All India Quota seats for UG courses.',
    blocks: [
      {
        heading: 'A. Domicile / Home-State Candidates',
        intro:
          'For the purpose of AIQ counselling, there is no domicile or home-state requirement — NEET-qualified candidates across India compete on equal merit for AIQ seats.',
        items: [
          'The candidate must be an Indian citizen, an NRI, an OCI, a PIO or a foreign national.',
          'The candidate must have qualified NEET-UG in the same academic year as the counselling.',
          'The candidate must have attained, or will attain, 17 years of age on or before 31 December of the admission year.',
          'There is no upper age limit for appearing in NEET-UG or for participating in counselling.',
        ],
        note:
          'Foundational note: counselling for 15% AIQ is open to all qualified candidates regardless of the state they belong to.',
      },
      {
        heading: 'B. Qualifying Marks (Category-wise NEET Percentile)',
        items: [
          'General / EWS — 50th percentile',
          'OBC / SC / ST — 40th percentile',
          'General-PwBD — 45th percentile',
          'SC / ST / OBC-PwBD — 40th percentile',
        ],
      },
    ],
  },
  application: {
    authority:
      'Registration for AIQ counselling is done exclusively through the official MCC portal — mcc.nic.in. Submissions made through any other route are not accepted.',
    blocks: [
      {
        heading: 'Step-by-Step Registration Process',
        ordered: true,
        items: [
          'Visit the official MCC website at mcc.nic.in and open the UG Medical Counselling section for the current academic year.',
          'Click on "New Registration" and enter your NEET-UG roll number, application number, and registered mobile and email ID.',
          'Complete the full registration form with personal details, NEET score card details, and the required communication address.',
          'Upload a recent passport-size photograph and signature in the prescribed format and file size.',
          'Pay the non-refundable registration fee and the refundable security deposit online for your chosen quota.',
          'Proceed to choice filling: search, add, and reorder your preferred colleges and courses during the open window.',
          'Lock your choices before the deadline — un-locked choices are auto-locked at the end of the window.',
          'After provisional allotment is published, download the allotment letter and report to the allotted institute for admission.',
        ],
        note:
          'Keep your registered mobile number and email active throughout — all OTPs and result notifications are sent there.',
      },
    ],
  },
  domicile: {
    authority:
      'AIQ seats carry no domicile restriction. State quota (85%) seats, however, are governed by the respective State counselling authority and require a valid domicile certificate.',
    blocks: [
      {
        heading: 'AIQ is Domicile-Free',
        intro:
          'There are no domicile conditions for 15% AIQ seats in government medical colleges, 100% Deemed University seats, AFMS, ESIC and central institutions. Any NEET-qualified Indian candidate can apply regardless of the state they belong to.',
        items: [
          'Candidates do not need a domicile or residence certificate from any state to participate in AIQ / MCC counselling.',
          'Reservation benefits (SC/ST/OBC/EWS) follow the central list, not the state list, for AIQ seats.',
        ],
      },
      {
        heading: 'Institutional / Internal Quota of Central Universities',
        intro:
          'Some central institutions reserve a share of seats for their own internal-quota candidates, with state-specific eligibility:',
        items: [
          'Delhi University (UCMS, MAMC, LHMC and others) — seats reserved for candidates who passed Class 12 from a recognised school in NCT of Delhi.',
          'BHU (Institute of Medical Sciences) — internal and state-specific eligibility typically apply per institution rules.',
          'AMU (Aligarh Muslim University) — internal-quota seats reserved under AMU internal eligibility norms.',
        ],
        note:
          'Always verify the latest internal-quota and domicile criteria from the official prospectus of each institution.',
      },
    ],
  },
  counselling: {
    authority:
      'All four rounds of AIQ online counselling — Round 1, Round 2, Mop-up and the Stray Vacancy round — are conducted in online mode through the MCC portal.',
    blocks: [
      {
        heading: 'Mode of Counselling',
        items: [
          'All counselling is conducted entirely online; candidates physically report to their allotted college only for document verification and final admission.',
          'All admissions and resignations are made through online mode — no offline surrender of seat is permitted.',
          'Candidates can download the provisional allotment letter directly from the MCC website.',
        ],
      },
      {
        heading: 'Basis of Seat Allotment',
        ordered: true,
        items: [
          'Seat allotment is based on the candidate\'s NEET-UG All India Rank, choices filled, category and seat availability.',
          'The allotment algorithm matches candidates to the highest-ranked available choice when their AIR qualifies.',
          'MCC publishes a seat matrix before each round; the seat matrix and result are released as per the published schedule.',
          'A candidate can be upgraded in a later round if a higher-preference choice becomes available, subject to round rules.',
        ],
        note:
          'Conversion algorithm: free-exit, upgrade and resignation rules differ by round — read the round-wise business rules carefully before locking choices.',
      },
    ],
  },
};

export default function CounsellingConditionsPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();

  const active = (SECTIONS.find((s) => s.key === section)?.key ?? 'eligibility') as SectionKey;

  const stateOptions = useMemo(() => ['All India Quota - MCC', ...ALL_STATES.filter((s) => s !== 'All India Quota - MCC')], []);
  const [selectedState, setSelectedState] = useState('All India Quota - MCC');

  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) setStateMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const activeSection = SECTIONS.find((s) => s.key === active)!;
  const content = CONTENT[active];

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8 lg:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-rose-400/10 rounded-full blur-2xl" />

          <div className="relative z-10 space-y-4 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Counselling Conditions
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Counselling Conditions
            </h1>
            <p className="text-red-100/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Review eligibility, application rules, counselling flow, and domicile conditions by state.
            </p>

            {/* Selector */}
            <div className="flex justify-center pt-2">
              {/* State dropdown */}
              <div className="relative w-full max-w-2xl" ref={stateRef}>
                <button
                  onClick={() => setStateMenuOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 bg-white/15 backdrop-blur-sm text-white font-semibold px-5 py-3 rounded-xl border border-white/25 hover:bg-white/25 transition-all duration-200"
                  aria-haspopup="listbox"
                  aria-expanded={stateMenuOpen}
                >
                  <span className="truncate">{selectedState}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${stateMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {stateMenuOpen && (
                  <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-fade-in text-left max-h-72 overflow-y-auto">
                    {stateOptions.map((st) => {
                      const isOn = st === selectedState;
                      return (
                        <button
                          key={st}
                          onClick={() => { setSelectedState(st); setStateMenuOpen(false); }}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                            isOn
                              ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate text-left">{st}</span>
                          {isOn && <Check className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs (quick switch) */}
      <div className="flex flex-wrap justify-center gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isOn = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => navigate(`/counselling-conditions/${s.key}`)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                isOn
                  ? 'gradient-primary text-white border-transparent shadow-md shadow-red-500/25'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Selected-state context badge */}
      <div className="flex items-center justify-center">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full">
          <Building2 className="w-3.5 h-3.5" />
          Showing <span className="font-bold text-slate-700 dark:text-slate-200">{activeSection.label}</span> conditions for
          <span className="font-bold text-red-600 dark:text-red-400">{selectedState}</span>
        </span>
      </div>

      {/* Content */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
        <CardContent className="p-5 sm:p-7 space-y-7">
          {/* Governing authority */}
          <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4">
            <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
              <ScrollText className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Governing Authority</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{content.authority}</p>
            </div>
          </div>

          {/* Blocks */}
          {content.blocks.map((block, bi) => (
            <div key={bi} className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{block.heading}</h3>
              {block.intro && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{block.intro}</p>
              )}
              {block.items && (
                <ul className="space-y-2.5">
                  {block.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-3">
                      {block.ordered ? (
                        <span className="shrink-0 w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center mt-0.5">
                          {ii + 1}
                        </span>
                      ) : (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </span>
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {block.note && (
                <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{block.note}</p>
                </div>
              )}
            </div>
          ))}

          <p className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
            Conditions shown are indicative and based on the latest published counselling scheme. Always confirm details on the official MCC / State counselling portal before acting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
