'use client';

interface SkeletonProps {
  className?: string;
}

/** Single skeleton block — add className for width/height overrides. */
export function SkeletonBlock({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Full absensi form skeleton — resembles the 3-tab form layout. */
export function AbsensiFormSkeleton() {
  return (
    <div className="tech-card p-6 space-y-5" aria-label="Memuat form..." aria-busy="true">
      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        <div className="skeleton h-10 flex-1" />
        <div className="skeleton h-10 flex-1" />
        <div className="skeleton h-10 flex-1" />
      </div>
      {/* Fields skeleton */}
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-11" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-36" />
          <div className="skeleton h-11" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-20" />
        </div>
      </div>
      {/* Submit button skeleton */}
      <div className="skeleton h-12 mt-2" />
    </div>
  );
}

/** Member profile header skeleton. */
export function ProfileCardSkeleton() {
  return (
    <div className="tech-card p-5 sm:p-7 space-y-4" aria-label="Memuat profil..." aria-busy="true">
      <div className="flex items-center gap-4">
        <div className="skeleton skeleton-rounded w-14 h-14 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-56" />
        </div>
        <div className="skeleton h-9 w-32 rounded-xl" />
      </div>
    </div>
  );
}
