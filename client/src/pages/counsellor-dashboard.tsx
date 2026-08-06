import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, ChevronRight } from 'lucide-react';

/**
 * The counsellor's home — where /counsellor lands them after login. Kept deliberately
 * small: it exists so the role has a real destination distinct from the student
 * dashboard and the admin dashboard, not to duplicate either. Counsellor-specific
 * work happens on the tools it links to (Counsellor Lookup today; more as they land).
 */
export default function CounsellorDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Counsellor Dashboard"
        description="Your home for counselling tools."
      />

      <Card>
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Counsellor Lookup</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Type a student's All India Rank and get a shortlist grouped Safe / Good / Reach / Tough, with fees, printing and CSV export.
            </p>
          </div>
          <Button asChild>
            <Link to="/counsellor-lookup">
              Open <ChevronRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
