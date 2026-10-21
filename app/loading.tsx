export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[100dvh] bg-[var(--surface-canvas)]">
      {/* Inject a global style to hide the footer while this loading component is mounted */}
      <style>{`
                footer { display: none !important; }
            `}</style>

      <div className="relative flex flex-col items-center gap-8">
        {/* Minimalist Glowing Ring */}
        <div className="relative w-16 h-16 flex items-center justify-center drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]">
          {/* Background track */}
          <svg className="w-full h-full text-white/5" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
            />
          </svg>
          {/* Animated gradient ring */}
          <svg
            className="absolute w-full h-full animate-spin text-indigo-500"
            viewBox="0 0 100 100"
            style={{ animationDuration: "1.5s" }}
          >
            <defs>
              <linearGradient
                id="spinner-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#spinner-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="120 200"
            />
          </svg>
        </div>

        {/* Elegant Typography */}
        <div className="flex flex-col items-center gap-3">
          <h3 className="text-xl font-medium tracking-[0.25em] text-slate-50 uppercase font-display drop-shadow-md">
            BookGarden
          </h3>
          {/* Minimal progress bar */}
          <div className="w-16 h-[2px] bg-[var(--border-default)] rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 bg-indigo-400 rounded-full w-full animate-pulse opacity-80"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
