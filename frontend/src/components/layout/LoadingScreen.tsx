import AplosLogo from './AplosLogo';
import { cn } from '../../utils/cn';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  variant?: 'fullscreen' | 'inline';
  className?: string;
}

export function LoadingScreen({
  message = 'Loading helpdesk workspace...',
  subMessage = 'Fetching your session, tickets and notifications',
  variant = 'fullscreen',
  className
}: LoadingScreenProps) {
  const isFullscreen = variant === 'fullscreen';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        'flex items-center justify-center px-4',
        isFullscreen ? 'min-h-screen' : 'min-h-[320px] py-10',
        className
      )}
    >
      <div className="animate-loading-fade-up w-full max-w-sm">
        <div className="glass-panel rounded-3xl p-6 text-center sm:p-8">
          <div className="animate-loading-pulse-soft mx-auto w-fit">
            <AplosLogo size="md" align="center" />
          </div>

          <div className="relative mx-auto mt-6 h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800" />
            <div className="loading-spinner-ring absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            </div>
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">
            {message}
            <span className="ml-1 inline-flex gap-1 align-middle" aria-hidden="true">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="loading-dot inline-block h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
                  style={{ animationDelay: `${dot * 0.18}s` }}
                />
              ))}
            </span>
          </p>
          <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{subMessage}</p>

          <div className="loading-bar-track mt-5 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div className="loading-bar-fill h-full w-1/3 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
          </div>

          <div className="mt-6 space-y-2" aria-hidden="true">
            <div className="skeleton-shimmer h-2.5 rounded-full" />
            <div className="skeleton-shimmer mx-auto h-2.5 w-4/5 rounded-full" />
            <div className="skeleton-shimmer mx-auto h-2.5 w-3/5 rounded-full" />
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
          Aplos Helpdesk
        </p>
      </div>
    </div>
  );
}

export function InlineLoader({ message = 'Loading...', className }: { message?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex items-center justify-center gap-3 py-8 text-sm text-slate-500 dark:text-slate-400', className)}>
      <span className="loading-spinner-ring inline-block h-5 w-5 rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('glass-panel animate-loading-fade-up rounded-2xl p-5', className)} aria-hidden="true">
      <div className="skeleton-shimmer h-4 w-2/5 rounded-full" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton-shimmer h-2.5 rounded-full"
            style={{ width: `${92 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('glass-panel animate-loading-fade-up overflow-hidden rounded-2xl p-4', className)} aria-hidden="true">
      <div className="skeleton-shimmer h-8 rounded-xl" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex gap-3">
            <div className="skeleton-shimmer h-10 w-16 shrink-0 rounded-lg" />
            <div className="skeleton-shimmer h-10 flex-1 rounded-lg" />
            <div className="skeleton-shimmer hidden h-10 w-24 shrink-0 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
