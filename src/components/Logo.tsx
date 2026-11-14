// Il segno di Roma Router: uno scudo araldico nei colori civici di Roma, porpora e oro, con dentro le quattro
// strade del Miliarium Aureum (la colonna del Foro da cui si misuravano le strade) che portano al centro.
// E' un disegno originale: non e' lo stemma di Roma Capitale, che resta riservato all'ente.
export function LogoMark({ size = 30 }: { size?: number }) {
  const id = `rr-scudo-${size}`;
  return (
    <svg width={size * 0.86} height={size} viewBox="0 0 32 37" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A3122E" />
          <stop offset="1" stopColor="#6E0016" />
        </linearGradient>
        <linearGradient id={`${id}-o`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9CB7A" />
          <stop offset=".55" stopColor="#C9A24A" />
          <stop offset="1" stopColor="#A9832F" />
        </linearGradient>
      </defs>
      {/* scudo: bordo d'oro, campo porpora */}
      <path d="M2 2.5h28v14.2c0 9.6-6.6 15.9-14 18.8C8.6 32.6 2 26.3 2 16.7Z" fill={`url(#${id}-o)`} />
      <path d="M4.4 4.9h23.2v11.7c0 8.1-5.4 13.4-11.6 16-6.2-2.6-11.6-7.9-11.6-16Z" fill={`url(#${id}-p)`} />
      {/* capo dello scudo: una fascia d'oro sottile */}
      <path d="M4.4 4.9h23.2v2.3H4.4Z" fill={`url(#${id}-o)`} opacity=".9" />
      {/* le quattro strade che portano al centro */}
      <g stroke="#F7E9C4" strokeWidth="1.9" strokeLinecap="round" opacity=".95">
        <path d="M16 18.2 8.4 11M16 18.2 23.6 11M16 18.2 9.6 26.4M16 18.2 22.4 26.4" />
      </g>
      <circle cx="16" cy="18.2" r="3.6" fill={`url(#${id}-o)`} stroke="#6E0016" strokeWidth=".8" />
      <circle cx="16" cy="18.2" r="1.2" fill="#6E0016" />
    </svg>
  );
}

/** Il nome, nel carattere dei siti della Pubblica Amministrazione italiana (Titillium Web). */
export function Wordmark({ className = "text-[22px]" }: { className?: string }) {
  return (
    <span className={`leading-none font-bold tracking-[-0.005em] text-ink ${className}`} style={{ fontFamily: "var(--font-titillium), 'Titillium Web', var(--font-montserrat), sans-serif" }}>
      <span className="text-amaranto">Roma</span> Router
    </span>
  );
}
