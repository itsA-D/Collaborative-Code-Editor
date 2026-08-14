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
        <span className="auth-brand-wordmark">Collab Coder</span>
      </div>

      <div className="auth-graphic" aria-hidden="true">
        <svg className="auth-mark" viewBox="0 0 140 140" role="presentation">
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
            {/* Main asterisk shape - 8 points */}
            <line x1="70" y1="0" x2="70" y2="52" strokeWidth="5" />
            <line x1="70" y1="88" x2="70" y2="140" strokeWidth="5" />
            <line x1="0" y1="70" x2="52" y2="70" strokeWidth="5" />
            <line x1="88" y1="70" x2="140" y2="70" strokeWidth="5" />

            {/* Diagonal lines */}
            <line x1="30" y1="30" x2="58" y2="58" strokeWidth="4.5" />
            <line x1="82" y1="82" x2="110" y2="110" strokeWidth="4.5" />
            <line x1="114.8" y1="25" x2="70" y2="71" strokeWidth="4.5" />
            <line x1="58" y1="82" x2="30" y2="110" strokeWidth="4.5" />

            {/* Inner shorter lines for asterisk effect */}
            <line x1="70" y1="28" x2="70" y2="48" strokeWidth="3.5" />
            <line x1="70" y1="92" x2="70" y2="112" strokeWidth="3.5" />
            <line x1="28" y1="70" x2="48" y2="70" strokeWidth="3.5" />
            <line x1="92" y1="70" x2="112" y2="70" strokeWidth="3.5" />
          </g>
        </svg>
      </div>

      <div className="auth-brand-bottom">{footerText}</div>
    </section>
  );
}
