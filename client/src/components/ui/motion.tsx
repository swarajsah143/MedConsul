/**
 * Reusable Framer Motion primitives for MedCounsel AI.
 */

import {
  motion,
  useInView,
  useMotionValue,
  animate,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion';
import { useRef, useEffect, useState, memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ── Shared easing ──────────────────────────────────────────

const EASE = [0.16, 1, 0.3, 1] as const;

// ── FadeIn ─────────────────────────────────────────────────

interface FadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  once?: boolean;
}

export function FadeIn({ children, delay = 0, duration = 0.4, once = true, className, ...props }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration, delay, ease: EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── SlideIn ────────────────────────────────────────────────

interface SlideInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  distance?: number;
  once?: boolean;
}

export function SlideIn({ children, direction = 'up', delay = 0, distance = 20, once = true, className, ...props }: SlideInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-40px' });

  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const value = direction === 'up' || direction === 'left' ? distance : -distance;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, [axis]: value }}
      animate={inView ? { opacity: 1, [axis]: 0 } : undefined}
      transition={{ duration: 0.4, delay, ease: EASE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerContainer + StaggerItem ─────────────────────────

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

export function StaggerContainer({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      variants={staggerContainerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ delayChildren: delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ── CountUp (optimized — no setState per frame) ────────────

interface CountUpProps {
  to: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const CountUp = memo(function CountUp({ to, duration = 1.2, className, prefix = '', suffix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const motionVal = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionVal, to, {
      duration,
      ease: EASE,
    });
    const unsub = motionVal.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`;
    });
    return () => { controls.stop(); unsub(); };
  }, [inView, to, duration, prefix, suffix, motionVal]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
});

// ── AnimatedProgress ───────────────────────────────────────

interface ProgressProps {
  value: number;
  color?: string;
  height?: string;
  className?: string;
  label?: string;
}

export function AnimatedProgress({ value, color = 'bg-emerald-500', height = 'h-1.5', className, label }: ProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden', height, className)}
    >
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={inView ? { width: `${Math.min(value, 100)}%` } : undefined}
        transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
      />
    </div>
  );
}

// ── CardElevation ──────────────────────────────────────────

export function CardElevation({ children, className, lift = -4, ...props }: HTMLMotionProps<'div'> & { lift?: number }) {
  return (
    <motion.div
      whileHover={{ y: lift, transition: { duration: 0.3, ease: EASE } }}
      whileTap={{ scale: 0.985, transition: { duration: 0.1 } }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── RippleButton ───────────────────────────────────────────

interface RippleButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  'aria-label'?: string;
}

export function RippleButton({ children, className, onClick, type = 'button', disabled, 'aria-label': ariaLabel }: RippleButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    onClick?.(e);
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn('relative overflow-hidden', className)}
      aria-label={ariaLabel}
    >
      {children}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          className="absolute rounded-full bg-white/25 pointer-events-none"
          style={{ left: r.x, top: r.y, width: 10, height: 10, x: '-50%', y: '-50%' }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 15, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </motion.button>
  );
}

// ── Skeleton ───────────────────────────────────────────────

export function Skeleton({ className, 'aria-label': ariaLabel = 'Loading' }: { className?: string; 'aria-label'?: string }) {
  return (
    <motion.div
      className={cn('rounded-xl bg-slate-200 dark:bg-slate-800', className)}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      role="status"
      aria-label={ariaLabel}
    />
  );
}

// ── smoothScrollTo ─────────────────────────────────────────

export function smoothScrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
