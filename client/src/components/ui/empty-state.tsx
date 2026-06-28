import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
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

export function EmptyState({ icon: Icon = AlertTriangle, title, description, action }: EmptyStateProps) {
  return (
    <Card className="p-8 text-center glass">
      <CardContent className="space-y-3 pt-6">
        <Icon className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold">{title}</h3>
        {description && (
          <p className="text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} className="w-full">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
