import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/providers/theme-provider';
import { cn } from '@/lib/utils';

/**
 * Theme toggle. `variant="segmented"` shows a light/dark/system pill group (used in
 * settings-like surfaces); the default `variant="icon"` is a single cycling button for
 * headers and top nav.
 */
export function ThemeToggle({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'segmented';
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'segmented') {
    const options: { value: Theme; icon: typeof Sun; label: string }[] = [
      { value: 'light', icon: Sun, label: 'Light' },
      { value: 'dark', icon: Moon, label: 'Dark' },
      { value: 'system', icon: Monitor, label: 'System' },
    ];
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn(
          'inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800',
          className
        )}
      >
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            role="radio"
            aria-checked={theme === value}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors',
              theme === value
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;
  const nextLabel = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch theme (currently ${theme}). Next: ${nextLabel}`}
      title={`Theme: ${theme}`}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
}
