import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'pulse' | 'shimmer';
}

export function Skeleton({ className, variant = 'shimmer' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl',
        variant === 'shimmer' ? 'skeleton-shimmer' : 'animate-pulse bg-slate-200/80 dark:bg-slate-800',
        className
      )}
    />
  );
}
