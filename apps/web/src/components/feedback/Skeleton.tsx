// ──────────────────────────────────────────────
// Skeleton loader component
// ──────────────────────────────────────────────

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Skeleton({ className, width, height, rounded = 'lg' }: SkeletonProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={clsx('shimmer', roundedClasses[rounded], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Pre-composed skeleton for a card */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-bg-elevated border border-border p-4 space-y-3">
      <Skeleton className="w-full h-48" rounded="xl" />
      <Skeleton className="w-3/4 h-5" />
      <Skeleton className="w-1/2 h-4" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="w-16 h-6" rounded="full" />
        <Skeleton className="w-20 h-6" rounded="full" />
      </div>
    </div>
  );
}
