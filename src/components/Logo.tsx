// Il segno: il Miliarium Aureum, la colonna del Foro da cui si misuravano le strade.
// Quattro strade, una per ambito, nei colori degli ambiti.
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g strokeWidth="3.2" strokeLinecap="round">
        <path d="M16 16L5 5" stroke="var(--color-sport)" />
        <path d="M16 16L27 5" stroke="var(--color-antenne)" />
        <path d="M16 16L27 27" stroke="var(--color-arte)" />
        <path d="M16 16L5 27" stroke="var(--color-oggetti)" />
      </g>
      <circle cx="16" cy="16" r="7.5" fill="var(--color-amaranto)" />
      <circle cx="16" cy="16" r="3" fill="var(--color-oro)" />
    </svg>
  );
}

export function Wordmark({ className = "text-[21px]" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-[-0.01em] text-ink ${className}`}>
      <span className="text-amaranto">Roma</span>Router
    </span>
  );
}
