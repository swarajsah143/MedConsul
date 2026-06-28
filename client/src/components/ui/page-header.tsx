import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon?: LucideIcon;
  iconClassName?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ icon: Icon, iconClassName, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 page-enter">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          {Icon && (
            <span className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${iconClassName || 'text-red-600 dark:text-red-400'}`} />
            </span>
          )}
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
