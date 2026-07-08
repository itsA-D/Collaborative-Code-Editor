export default function AuthBrandPanel({ footerText }: { footerText: string }) {
  return (
    <section className="auth-panel auth-panel-brand">
      <div className="auth-brand-grid" aria-hidden="true">
        <span className="auth-grid-line auth-grid-vertical" />
        <span className="auth-grid-line auth-grid-horizontal" />
        <span className="auth-grid-line auth-grid-diag-a" />
        <span className="auth-grid-line auth-grid-diag-b" />
        <span className="auth-grid-corner-block" />
      </div>

      <div className="auth-brand-top">
        <span className="auth-brand-wordmark">Collab Editor</span>
      </div>

      <div className="auth-graphic" aria-hidden="true">
        <svg className="auth-mark" viewBox="0 0 120 120" role="presentation">
          <defs>
            <filter id="authMarkGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#authMarkGlow)" stroke="#fff" strokeLinecap="round" fill="none">
            <line x1="60" y1="18" x2="60" y2="50" strokeWidth="5" />
            <line x1="60" y1="70" x2="60" y2="102" strokeWidth="5" />
            <line x1="18" y1="60" x2="50" y2="60" strokeWidth="5" />
            <line x1="70" y1="60" x2="102" y2="60" strokeWidth="5" />

            <line x1="31" y1="31" x2="49" y2="49" strokeWidth="4.5" />
            <line x1="71" y1="71" x2="89" y2="89" strokeWidth="4.5" />
            <line x1="89" y1="31" x2="71" y2="49" strokeWidth="4.5" />
            <line x1="49" y1="71" x2="31" y2="89" strokeWidth="4.5" />

            <line x1="45" y1="22" x2="55" y2="44" strokeWidth="3.5" />
            <line x1="65" y1="76" x2="75" y2="98" strokeWidth="3.5" />
            <line x1="22" y1="45" x2="44" y2="55" strokeWidth="3.5" />
            <line x1="76" y1="65" x2="98" y2="75" strokeWidth="3.5" />
            <line x1="76" y1="45" x2="98" y2="35" strokeWidth="3.5" />
            <line x1="22" y1="75" x2="44" y2="65" strokeWidth="3.5" />
            <line x1="45" y1="98" x2="55" y2="76" strokeWidth="3.5" />
            <line x1="65" y1="44" x2="75" y2="22" strokeWidth="3.5" />
          </g>
          <circle cx="60" cy="60" r="5" fill="#fff" />
        </svg>
      </div>

      <div className="auth-brand-bottom">{footerText}</div>
    </section>
  );
}
