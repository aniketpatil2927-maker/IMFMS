import companyLogo from '../assets/company-logo.png';

const COMPANY_NAME = 'IMMACULATE MASTERS';
const COMPANY_TAGLINE = 'Facility Management Services';

/** Branded opening screen shown for a few seconds after login. */
export function OpeningSplash({ userName }: { userName?: string }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 animate-pulse rounded-full bg-teal-500/25 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="splash-logo flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white p-2.5 shadow-2xl shadow-teal-950/50 ring-1 ring-white/25">
          <img src={companyLogo} alt="Immaculate Masters" className="h-full w-full object-contain" />
        </div>

        <p className="splash-fade mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300">
          Welcome
        </p>
        <h1 className="splash-fade-delay mt-2 text-2xl font-extrabold tracking-wide text-white sm:text-3xl">
          {COMPANY_NAME}
        </h1>
        <p className="splash-fade-delay mt-1.5 text-sm font-medium text-teal-200/90">{COMPANY_TAGLINE}</p>

        {userName ? (
          <p className="splash-fade-late mt-6 text-sm text-slate-300">
            Hello, <span className="font-semibold text-white">{userName}</span>
          </p>
        ) : null}

        <div className="splash-fade-late mt-8 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400 [animation-delay:300ms]" />
        </div>
        <p className="splash-fade-late mt-3 text-xs text-slate-500">Opening your workspace…</p>
      </div>
    </div>
  );
}
