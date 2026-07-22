import { cn } from '@/lib/utils';

/**
 * Standard page hero banner — a rich, animated "bumpy" gradient surface
 * (color mesh + grain + soft floating blobs + a subtle light sheen).
 * Children are the hero's own content (badge / title / description / actions)
 * and should carry their own `relative z-10` so they sit above the decor.
 */
export function HeroBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group/hero relative rounded-3xl overflow-hidden shadow-xl shadow-emerald-500/20 ring-1 ring-white/10',
        className
      )}
    >
      <div className="relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 p-6 sm:p-8 lg:p-10 overflow-hidden">
        {/* Animated color mesh */}
        <div className="absolute inset-0 gradient-mesh opacity-70" />

        {/* Grainy noise texture — tactile "bumpy" surface */}
        <div
          className="absolute inset-0 opacity-[0.35] mix-blend-soft-light pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Dotted texture with radial fade */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
            backgroundSize: '22px 22px',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 90% at 25% 35%, black, transparent 78%)',
            maskImage: 'radial-gradient(ellipse 70% 90% at 25% 35%, black, transparent 78%)',
          }}
        />

        {/* Floating glow blobs — lumpy, uneven surface */}
        <div className="absolute -top-20 -right-10 w-80 h-80 rounded-full bg-emerald-300/20 blur-3xl float-slow" />
        <div className="absolute top-1/2 right-1/4 w-44 h-44 rounded-full bg-teal-300/20 blur-2xl float-medium" />
        <div className="absolute -bottom-24 left-8 w-64 h-64 rounded-full bg-lime-300/15 blur-3xl float-fast" />
        <div className="absolute top-6 left-1/3 w-32 h-32 rounded-full bg-emerald-200/15 blur-2xl float-slow" />
        <div className="absolute bottom-4 right-1/3 w-36 h-36 rounded-full bg-teal-200/15 blur-2xl float-fast" />
        <div className="absolute top-1/3 left-2/3 w-24 h-24 rounded-full bg-green-300/15 blur-2xl float-medium" />

        {/* Subtle light sheen + gentle hover sweep */}
        <div className="absolute inset-0 hero-sheen pointer-events-none" />
        <div className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-40 group-hover/hero:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none" />

        {children}
      </div>
    </div>
  );
}
