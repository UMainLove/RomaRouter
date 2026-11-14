// Il segno di RomaRouter: una tessera porpora (il colore civico di Roma) con una R bianca la cui gamba
// diventa una strada che arriva a un punto d'oro, la destinazione. Tutte le strade portano al servizio giusto.
const PATH_R = "M9.2 7.4h7.4c3.6 0 6.1 2.3 6.1 5.6 0 2.5-1.4 4.4-3.7 5.2l3.1 4.6";
export function LogoMark({ size = 30 }: { size?: number }) {
  const id = `rr-logo-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B0183A" />
          <stop offset="1" stopColor="#6E0016" />
        </linearGradient>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1D58A" />
          <stop offset="1" stopColor="#C29A3E" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill={`url(#${id}-p)`} />
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill="none" stroke="#fff" strokeOpacity=".14" />
      {/* la R: asta, occhiello e gamba che prosegue come una strada */}
      <g fill="none" stroke="#fff" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.2 7.4v17.2" />
        <path d={PATH_R} />
      </g>
      {/* la destinazione */}
      <circle cx="23.4" cy="24.6" r="3.1" fill={`url(#${id}-o)`} />
    </svg>
  );
}

/** Il nome, nel carattere dei siti della Pubblica Amministrazione italiana (Titillium Web). */
export function Wordmark({ className = "text-[23px]" }: { className?: string }) {
  return (
    <span className={`leading-none font-bold tracking-[-0.01em] text-ink ${className}`} style={{ fontFamily: "var(--font-titillium), 'Titillium Web', var(--font-montserrat), sans-serif" }}>
      <span className="text-amaranto">Roma</span>Router
    </span>
  );
}
