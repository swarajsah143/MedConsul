import { Stethoscope } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/8 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-300/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-400/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MedCounsel AI</h1>
              <p className="text-emerald-100 text-xs font-medium">NEET UG Counseling Assistant</p>
            </div>
          </div>

          <div className="space-y-5 max-w-md">
            <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
              Navigate Your Medical Career with Confidence
            </h2>
            <p className="text-emerald-100/90 text-base leading-relaxed">
              AI-powered cutoff analysis, college reviews, fee comparison,
              and document preparation — all in one platform.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                { label: 'Colleges Tracked', value: '600+' },
                { label: 'Cutoff Records', value: '50K+' },
                { label: 'Students Helped', value: '10K+' },
                { label: 'States Covered', value: '36' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10"
                >
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-emerald-200 text-xs font-medium mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">MedCounsel AI</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
