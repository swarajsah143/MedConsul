import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemCount?: number;
  totalItems?: number;
}

export function Pagination({ page, totalPages, onPageChange, itemCount, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(page - 1, 1))}
        disabled={page === 1}
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground font-semibold">
        {itemCount !== undefined && totalItems !== undefined
          ? `Showing ${itemCount} of ${totalItems} entries (Page ${page} of ${totalPages})`
          : `Page ${page} of ${totalPages}`}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(page + 1, totalPages))}
        disabled={page === totalPages}
      >
        Next
      </Button>
    </div>
  );
}
