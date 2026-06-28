import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon = SearchX, title, description, action }: EmptyStateProps) {
  return (
    <Card className="py-16 text-center animate-fade-in">
      <CardContent className="space-y-4 flex flex-col items-center pt-0">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{description}</p>
          )}
        </div>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm" className="mt-2">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
