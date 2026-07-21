import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * App-wide toast/notification system. Before this, every mutation flow invented its own
 * inline flash (and one page used a blocking native alert()). This gives a single
 * standardized channel: `const { toast } = useToast(); toast.success('Saved')`.
 */

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<{ toast: ToastApi } | null>(null);

const VARIANT_META: Record<ToastVariant, { icon: typeof Info; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'border-l-success', iconColor: 'text-success' },
  error: { icon: AlertCircle, ring: 'border-l-destructive', iconColor: 'text-destructive' },
  warning: { icon: AlertTriangle, ring: 'border-l-warning', iconColor: 'text-warning' },
  info: { icon: Info, ring: 'border-l-info', iconColor: 'text-info' },
};

const DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, variant, title, description }]);
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss]
  );

  const toast: ToastApi = {
    success: (t, d) => push('success', t, d),
    error: (t, d) => push('error', t, d),
    warning: (t, d) => push('warning', t, d),
    info: (t, d) => push('info', t, d),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
          role="region"
          aria-label="Notifications"
        >
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const meta = VARIANT_META[t.variant];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'pointer-events-auto flex items-start gap-3 rounded-xl border border-l-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg p-3.5',
                    meta.ring
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', meta.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): { toast: ToastApi } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
