import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchBarProps {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Reusable search field. The focus treatment lives on the wrapper (via `focus-within`)
 * with a border-hugging ring and NO ring-offset — the offset ring used to render outside
 * the input where neighbouring elements clipped it, leaving stray green bars at each end.
 * Hover/focus add a soft emerald glow + icon animation so the control feels alive.
 */
export function SearchBar({
  value,
  onValueChange,
  onClear,
  placeholder,
  className,
  'aria-label': ariaLabel,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'group relative flex items-center rounded-2xl bg-white dark:bg-slate-900',
        'ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm',
        'transition-all duration-300 ease-out',
        'hover:ring-slate-300 dark:hover:ring-slate-600 hover:shadow-md hover:-translate-y-px',
        'focus-within:ring-2 focus-within:ring-emerald-500 dark:focus-within:ring-emerald-400',
        'focus-within:shadow-lg focus-within:shadow-emerald-500/20 focus-within:-translate-y-px',
        className
      )}
    >
      <Search
        className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400 transition-all duration-300 group-hover:text-slate-500 group-focus-within:scale-110 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          'h-12 w-full rounded-2xl bg-transparent pl-12 pr-11 text-sm sm:h-14 sm:text-base',
          'text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500',
          'border-0 outline-none focus:outline-none focus-visible:outline-none',
          'focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 hover:rotate-90 hover:bg-emerald-100 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
