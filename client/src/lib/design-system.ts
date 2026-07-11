/**
 * MedCounsel AI — Design System
 *
 * Inspired by: Apple (clarity), Linear (density), Vercel (contrast),
 * Perplexity (warmth), Cursor IDE (spatial rhythm).
 *
 * This file is the single source of truth for every visual decision.
 * Import constants from here. Never hardcode design values in pages.
 *
 * ────────────────────────────────────────────────────────────────────
 *
 * 1. COLOR PALETTE
 * ────────────────────────────────────────────────────────────────────
 *
 * Primary brand: Crimson red (#dc2626 / red-600).
 * Used sparingly — hero gradients, active states, primary CTAs.
 * Everything else is neutral. Let content breathe.
 *
 * Semantic accent tones (for categories, tags, status):
 *   blue    — informational, links, "Deemed" badge
 *   emerald — success, positive trend, "Government" badge
 *   amber   — warning, fees, "Private" badge
 *   purple  — highlight, premium, category pills
 *   cyan    — AI, assistant, interactive
 *   rose    — error, destructive
 *   indigo  — allotment, mapping, location
 *
 * Neutral scale: slate (NOT gray).
 * Slate carries a subtle blue undertone that feels more refined.
 *
 * Background hierarchy (light):
 *   Page bg   — #fafafa  (slate-50)
 *   Card bg   — #ffffff  (white)
 *   Inset bg  — #f8fafc  (slate-50)  — for stat grids inside cards
 *   Hover bg  — #f1f5f9  (slate-100)
 *
 * Background hierarchy (dark):
 *   Page bg   — #020617  (slate-950)
 *   Card bg   — #0f172a  (slate-900)
 *   Inset bg  — #1e293b  (slate-800)
 *   Hover bg  — #1e293b  (slate-800)
 *
 * Text hierarchy:
 *   Heading   — slate-900 / dark:slate-100   (near-black, max contrast)
 *   Body      — slate-700 / dark:slate-300   (readable, not harsh)
 *   Secondary — slate-500 / dark:slate-400   (muted-foreground)
 *   Tertiary  — slate-400 / dark:slate-500   (timestamps, hints)
 *   Disabled  — slate-300 / dark:slate-600
 *
 * Border: slate-200 / dark:slate-800 — barely visible, structural only.
 *
 *
 * 2. TYPOGRAPHY
 * ────────────────────────────────────────────────────────────────────
 *
 * Font: Inter (variable weight, 300-900).
 * Fallback: system-ui, -apple-system, sans-serif.
 *
 * Scale (Tailwind classes):
 *   Hero heading     — text-3xl sm:text-4xl  font-extrabold  tracking-tight  leading-[1.1]
 *   Page heading     — text-2xl              font-bold        tracking-tight
 *   Section heading  — text-lg               font-bold
 *   Card title       — text-sm               font-bold        leading-snug
 *   Body             — text-sm               font-normal      leading-relaxed
 *   Small / caption  — text-xs               font-medium
 *   Micro label      — text-[10px]           font-semibold    uppercase tracking-wider
 *   Stat number      — text-2xl              font-extrabold   tabular-nums leading-none
 *
 * Rules:
 *   - Never use font-black (too heavy for Inter).
 *   - Use tracking-tight on headings only. Body text stays default.
 *   - Use tabular-nums on any number that changes or aligns in columns.
 *   - Use leading-relaxed on multi-line body text.
 *   - Use text-balance on hero descriptions (prevents orphans).
 *   - Use line-clamp-2 on card descriptions to keep grids even.
 *
 *
 * 3. BORDER RADIUS
 * ────────────────────────────────────────────────────────────────────
 *
 *   Page sections / hero banners  — rounded-2xl  (16px)
 *   Cards                         — rounded-xl   (12px)
 *   Buttons / inputs              — rounded-xl   (12px)
 *   Tags / pills / badges         — rounded-full (9999px)
 *   Icon containers               — rounded-xl   (12px)
 *   Avatars                       — rounded-full
 *   Tooltips / dropdowns          — rounded-xl   (12px)
 *   Modals                        — rounded-2xl  (16px)
 *   Progress bars                 — rounded-full
 *
 * Rule: no sharp corners anywhere. Minimum is rounded-lg (8px).
 *
 *
 * 4. SHADOWS
 * ────────────────────────────────────────────────────────────────────
 *
 * Elevation scale (Tailwind):
 *   Rest         — shadow-sm          (cards at rest)
 *   Hover        — shadow-lg          (cards on hover)
 *   Elevated     — shadow-xl          (modals, dropdowns)
 *   Dramatic     — shadow-2xl         (hero floating elements)
 *
 * Rules:
 *   - Cards have shadow-sm at rest, shadow-lg on hover.
 *   - Never use shadow-md — skip from sm to lg for perceptible change.
 *   - Modals use shadow-2xl + backdrop blur.
 *   - Use colored shadows sparingly: shadow-red-500/25 on primary CTAs only.
 *   - Dark mode: shadows are invisible; rely on border contrast instead.
 *
 *
 * 5. GLASSMORPHISM
 * ────────────────────────────────────────────────────────────────────
 *
 * Used only in these contexts:
 *   - Hero banner badges/chips       → bg-white/15 backdrop-blur-sm border border-white/10
 *   - Hero inline cards (progress)   → bg-white/10 backdrop-blur-sm border border-white/10
 *   - Modal backdrop                 → bg-black/50 backdrop-blur-sm
 *   - Floating toolbar (if any)      → bg-white/80 backdrop-blur-xl border border-slate-200/60
 *
 * Rules:
 *   - Glass is ONLY on top of gradients or images. Never on a solid bg.
 *   - Max opacity for glass bg: 80% on light surfaces, 15% on dark/gradient.
 *   - Always pair with a subtle border (white/10 or slate-200/60).
 *   - Blur: sm for small elements, xl for large panels.
 *
 *
 * 6. ICON STYLE
 * ────────────────────────────────────────────────────────────────────
 *
 * Library: Lucide React (stroke-based, 24px grid).
 *
 * Size scale:
 *   In-text / inline      — w-3.5 h-3.5  (14px)
 *   Button / nav item     — w-4 h-4      (16px) or w-[18px] h-[18px]
 *   Card icon container   — w-5 h-5      (20px) inside a w-11 h-11 box
 *   Hero / empty state    — w-7 h-7      (28px) inside a w-14 h-14 box
 *
 * Icon container:
 *   Small   — w-9 h-9   rounded-lg
 *   Medium  — w-11 h-11 rounded-xl
 *   Large   — w-14 h-14 rounded-2xl
 *
 * Icon container bg follows the semantic color:
 *   bg-{color}-50 dark:bg-{color}-950/30
 * Icon color:
 *   text-{color}-600 dark:text-{color}-400
 *
 * Rules:
 *   - Never use filled icons. Always stroke (Lucide default).
 *   - Icon containers scale up on hover: group-hover:scale-110.
 *   - Icons in nav are 18px. Icons in cards are 20px. Icons in hero are 28px.
 *
 *
 * 7. GRID SYSTEM
 * ────────────────────────────────────────────────────────────────────
 *
 * Max width: max-w-7xl (1280px), centered with mx-auto.
 * Page padding: p-4 sm:p-6.
 * Section gap: space-y-8 (dashboard), space-y-6 (inner pages).
 *
 * Common grids:
 *   Stats row       — grid-cols-2 sm:grid-cols-3 lg:grid-cols-6  gap-3 sm:gap-4
 *   Control panel   — grid-cols-1 sm:grid-cols-2 lg:grid-cols-4  gap-4
 *   Feature cards   — grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  gap-4
 *   Content + side  — grid-cols-1 lg:grid-cols-3                 gap-6
 *   Full-width list — grid-cols-1                                 gap-3
 *
 * Rules:
 *   - Gap is always 3 (12px) or 4 (16px). Never 2 or 5.
 *   - Cards in a grid must be equal height (h-full on Link/Card).
 *   - Use gap-6 only between major sections (content + sidebar).
 *
 *
 * 8. CARD STYLES
 * ────────────────────────────────────────────────────────────────────
 *
 * Base card:
 *   rounded-xl border border-slate-200 dark:border-slate-800
 *   bg-white dark:bg-slate-900 shadow-sm
 *
 * Hover card (interactive):
 *   hover:shadow-lg hover:-translate-y-1 transition-all duration-300
 *   border-transparent hover:border-slate-200 dark:hover:border-slate-700
 *
 * Accent-on-hover card:
 *   + absolute top-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100
 *
 * Inset area inside card:
 *   bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3
 *
 * Card padding:
 *   Content  — p-5 (standard), p-4 (compact/stats)
 *   Header   — p-5 pb-2
 *
 * Rules:
 *   - Every interactive card is wrapped in a group for group-hover.
 *   - Cards lift on hover (-translate-y-1), NEVER scale.
 *   - Accent bar is 0.5px (h-0.5), gradient, top edge only.
 *   - Dividers inside cards: divide-slate-100 dark:divide-slate-800.
 *
 *
 * 9. BUTTON STYLES
 * ────────────────────────────────────────────────────────────────────
 *
 * Primary CTA:
 *   gradient-primary text-white shadow-md hover:shadow-lg
 *   rounded-xl h-11 px-6 font-semibold
 *   hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
 *
 * Secondary / outline:
 *   border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
 *   hover:border-red-300 hover:text-red-600 transition-all duration-200
 *   rounded-xl h-11 px-6 font-semibold
 *
 * Ghost:
 *   bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800
 *   rounded-xl text-sm font-medium
 *
 * Pill toggle (filter buttons):
 *   px-4 py-2 rounded-full text-xs font-semibold border-2
 *   Active: gradient-primary text-white border-transparent shadow-md
 *   Inactive: border-slate-200 bg-white hover:border-red-300
 *   hover:scale-[1.03] active:scale-[0.97]
 *
 * Icon button:
 *   w-9 h-9 rounded-full flex items-center justify-center
 *   hover:bg-slate-100 transition-colors
 *
 * Rules:
 *   - Primary buttons are rare. Max 1-2 per visible viewport.
 *   - All buttons have transition-all duration-200.
 *   - Scale micro-animations only on pills and primary CTAs.
 *   - Never use rounded-md on buttons. Always rounded-xl or rounded-full.
 *
 *
 * 10. ANIMATION LANGUAGE
 * ────────────────────────────────────────────────────────────────────
 *
 * Philosophy: "Perceived performance." Animations communicate state
 * changes, not decorate. Every animation must answer "what just changed?"
 *
 * Motion types:
 *   Page enter    — translateY(8px) + opacity 0→1, 300ms ease-out
 *   Card hover    — translateY(-4px) + shadow increase, 300ms ease
 *   Icon hover    — scale(1.1), 300ms ease
 *   Button press  — scale(0.98), instant
 *   Modal enter   — translateY(-16px) + scale(0.98) + opacity, 300ms spring
 *   Fade in       — opacity 0→1, 200ms ease-out
 *   Slide in text — translateX(8px) + opacity, 300ms ease-out
 *   Progress ring — strokeDasharray transition, 700ms ease
 *
 * Rules:
 *   - Default duration: 200ms for color/opacity, 300ms for transform/layout.
 *   - Spring easing for modals: cubic-bezier(0.16, 1, 0.3, 1).
 *   - Standard easing for everything else: ease-out or ease.
 *   - No animation longer than 700ms (except looping indicators).
 *   - Stagger children by 40-50ms max (cards in a grid).
 *   - No bouncing, wobbling, or playful motion. Movement is crisp and direct.
 *
 *
 * 11. MOTION DURATIONS (Tailwind)
 * ────────────────────────────────────────────────────────────────────
 *
 *   Instant    — duration-100   (active press feedback)
 *   Fast       — duration-150   (color changes, border)
 *   Normal     — duration-200   (most transitions)
 *   Smooth     — duration-300   (card lift, layout shifts)
 *   Slow       — duration-500   (image zoom on hover)
 *   Dramatic   — duration-700   (progress ring, chart animations)
 *
 *
 * 12. HOVER BEHAVIOR
 * ────────────────────────────────────────────────────────────────────
 *
 * Interactive cards:
 *   1. Card lifts:       -translate-y-1
 *   2. Shadow increases: shadow-sm → shadow-lg
 *   3. Accent bar:       opacity 0 → 1 (gradient at top)
 *   4. Icon scales:      scale-110
 *   5. Title color:      slate-900 → red-600
 *   6. CTA slides in:    opacity 0 + translateX(8px) → visible
 *   7. Chevron moves:    translateX(2px)
 *
 * Table rows:
 *   bg-red-50/30 dark:bg-red-950/10 (subtle tint, no lift)
 *   Name text → red-600 on hover
 *   Chevron → red-600 + translateX(2px)
 *
 * Nav items:
 *   bg-slate-50 on hover, bg-red-50 + text-red-700 when active.
 *   No scale. No shadow. Just color.
 *
 * Buttons:
 *   Primary: shadow increase + scale(1.02)
 *   Pills: scale(1.03) on hover, scale(0.97) on active
 *   Ghost: bg-slate-100 only
 *
 * Rules:
 *   - Never change more than 4 properties on hover simultaneously.
 *   - translateY for cards, translateX for arrows/CTAs. Never both.
 *   - No hover effects on mobile (use active states instead).
 *
 *
 * 13. RESPONSIVE SPACING
 * ────────────────────────────────────────────────────────────────────
 *
 * Page padding:
 *   Mobile  — p-4  (16px)
 *   Desktop — p-6  (24px)
 *
 * Section spacing:
 *   Dashboard sections    — space-y-8  (32px)
 *   Inner page sections   — space-y-6  (24px)
 *   Card internal spacing — space-y-3  (12px)
 *
 * Card padding:
 *   Mobile  — p-4  (16px)
 *   Desktop — p-5  (20px)
 *
 * Hero padding:
 *   Mobile  — p-6
 *   Tablet  — p-8
 *   Desktop — p-10
 *
 * Grid gaps:
 *   Stat cards     — gap-3 sm:gap-4
 *   Feature cards  — gap-4
 *   Major sections — gap-6
 *
 * Breakpoints (Tailwind defaults):
 *   sm: 640px   — 2-column grids kick in
 *   md: 768px   — sidebar becomes visible
 *   lg: 1024px  — 3-4 column grids
 *   xl: 1280px  — max content width reached
 *
 * Rules:
 *   - Minimum touch target: 44x44px (h-11 w-11).
 *   - On mobile, all grids collapse to 1 or 2 columns.
 *   - Hero images/banners are full-width on mobile (no side padding).
 *   - Tables scroll horizontally on mobile (overflow-x-auto).
 *   - Modals are full-width on mobile with mx-4.
 *
 *
 * 14. TAG / BADGE SYSTEM
 * ────────────────────────────────────────────────────────────────────
 *
 * College type:
 *   Government — bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400
 *   Private    — bg-amber-50  text-amber-700  dark:bg-amber-950/30  dark:text-amber-400
 *   Deemed     — bg-blue-50   text-blue-700   dark:bg-blue-950/30   dark:text-blue-400
 *
 * Category:
 *   General — bg-slate-100  text-slate-700
 *   OBC     — bg-amber-50   text-amber-700
 *   SC      — bg-blue-50    text-blue-700
 *   ST      — bg-emerald-50 text-emerald-700
 *   EWS     — bg-purple-50  text-purple-700
 *
 * Size: text-[10px] font-bold px-2 py-0.5 rounded-full
 *
 * Filter tag (removable):
 *   bg-red-50 text-red-700 border border-red-200 rounded-full
 *   text-[11px] font-semibold px-2.5 py-1
 *   X button: w-3.5 h-3.5 rounded-full hover:bg-red-200
 *
 *
 * 15. HERO BANNER PATTERN
 * ────────────────────────────────────────────────────────────────────
 *
 * Structure:
 *   <div className="relative rounded-2xl overflow-hidden">
 *     <div className="gradient-primary p-6 sm:p-8 lg:p-10">
 *       {/* Decorative blurs *\/}
 *       <div className="absolute ... bg-white/5 rounded-full blur-3xl" />
 *       {/* Content *\/}
 *       <div className="relative z-10">
 *         <Badge />  — bg-white/15 backdrop-blur-sm rounded-full
 *         <h1 />     — text-2xl sm:text-3xl font-extrabold text-white
 *         <p />      — text-red-100/90 text-sm max-w-xl
 *       </div>
 *     </div>
 *   </div>
 *
 * Rules:
 *   - Every page has a hero banner at the top.
 *   - Gradient is always gradient-primary (red-600 → rose-500).
 *   - 2-3 decorative blur circles (bg-white/5, blur-3xl).
 *   - Badge pill at top. Title below. Description below. Actions on the right.
 *   - Hero content is always z-10 (above decorative elements).
 *
 *
 * 16. MODAL PATTERN
 * ────────────────────────────────────────────────────────────────────
 *
 * Structure:
 *   Backdrop: fixed inset-0 bg-black/50 backdrop-blur-sm z-50
 *   Container: max-w-3xl mt-8 rounded-2xl shadow-2xl z-50
 *   Header: gradient-primary px-6 py-5
 *   Body: bg-white overflow-y-auto p-6 space-y-7
 *   Footer: bg-white border-t px-6 py-4, Clear All left, "Show N Results" right
 *
 * Section pattern inside modal:
 *   <h3> with colored left-bar indicator (w-1 h-5 rounded-full bg-{color}-500)
 *   Content in tinted card (bg-{color}-50/50 rounded-xl border p-5)
 *
 * Body scroll lock when open: document.body.style.overflow = 'hidden'
 * Close on backdrop click. Close on X button.
 */

// ── Exported constants for programmatic use ──────────────────────

export const DS = {
  // Transition classes
  transition: {
    fast: 'transition-all duration-150',
    normal: 'transition-all duration-200',
    smooth: 'transition-all duration-300',
    slow: 'transition-all duration-500',
  },

  // Card hover pattern
  cardHover: 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
  cardHoverSubtle: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-300',

  // Icon container sizes
  iconBox: {
    sm: 'w-9 h-9 rounded-lg',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
  },

  // Semantic colors for college types
  collegeType: {
    Government: {
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600',
    },
    Private: {
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-950/40',
      iconColor: 'text-amber-600',
    },
    Deemed: {
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-950/40',
      iconColor: 'text-blue-600',
    },
  },

  // Category badge colors
  category: {
    General: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    OBC: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
    SC: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    ST: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    EWS: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400',
  },

  // Z-index scale
  z: {
    sidebar: 'z-30',
    header: 'z-30',
    dropdown: 'z-[60]',
    modalBackdrop: 'z-50',
    modal: 'z-50',
    mobileMenu: 'z-40',
    mobileMenuPanel: 'z-50',
  },
} as const;
