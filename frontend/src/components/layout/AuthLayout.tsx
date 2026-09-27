import type { ReactNode } from 'react';
import AplosLogo from './AplosLogo';

interface AuthLayoutProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  icon?: string;
}

export function AuthLayout({ children, eyebrow, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="grid min-h-[640px] lg:grid-cols-[0.95fr_1.05fr]">
            <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_28%),radial-gradient(circle_at_80%_30%,white_0,transparent_22%),radial-gradient(circle_at_50%_80%,white_0,transparent_24%)]" />
              <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl sm:h-40 sm:w-40" />
              <div className="absolute -right-10 bottom-10 h-44 w-44 rounded-full bg-cyan-200/20 blur-3xl sm:h-56 sm:w-56" />

              <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
                <div className="mb-8 flex flex-col items-center gap-3 lg:items-start">
                  <div className="rounded-3xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg shadow-blue-950/20 backdrop-blur-sm">
                    <AplosLogo size="lg" taglineColor="rgba(255,255,255,0.9)" showBackground={false} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100/90">Helpdesk Pro</p>
                    <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-blue-50/90 sm:text-base lg:max-w-md">{description}</p>
                  </div>
                </div>

                <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-4 text-left backdrop-blur-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/90">{eyebrow}</p>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg">🌐</div>
                      <div>
                        <p className="text-sm font-semibold">Website</p>
                        <a href="https://aploslogix.in" target="_blank" rel="noreferrer" className="text-sm text-blue-50/90 hover:text-white">
                          aploslogix.in
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg">✉️</div>
                      <div>
                        <p className="text-sm font-semibold">Email</p>
                        <a href="mailto:info@aploslogix.in" className="text-sm text-blue-50/90 hover:text-white">
                          info@aploslogix.in
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg">💬</div>
                      <div>
                        <p className="text-sm font-semibold">Support</p>
                        <p className="text-sm text-blue-50/80">Need help with access, reset steps, or ticket support? Contact us anytime</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex items-center justify-center bg-white px-4 py-6 dark:bg-slate-900 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
              <div className="w-full max-w-md">{children}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
