import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded-3xl border border-white/70 bg-white/80 p-10 text-center shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-500">404</p>
        <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">The page you requested is not available.</p>
        <Link className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-blue-500 dark:hover:bg-blue-400" to="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
