/** MinervaAI owl mark. Inherits `currentColor`; eyes and beak are cut out so it sits on any background. */
export default function MinervaLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="8 6 48 56" className={className} fill="currentColor" aria-hidden="true">
      <defs>
        <mask id="minerva-logo-cut">
          <rect x="0" y="0" width="64" height="64" fill="#fff" />
          <circle cx="22.5" cy="31" r="9.5" fill="#000" />
          <circle cx="41.5" cy="31" r="9.5" fill="#000" />
          <path d="M29 39 L35 39 L32 46 Z" fill="#000" />
        </mask>
      </defs>
      <path mask="url(#minerva-logo-cut)" d="M10 8 L22 17 Q32 13 42 17 L54 8 L51 30 Q53 50 32 60 Q11 50 13 30 Z" />
      <circle cx="22.5" cy="31" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="41.5" cy="31" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="22.5" cy="31" r="2.8" />
      <circle cx="41.5" cy="31" r="2.8" />
    </svg>
  );
}
