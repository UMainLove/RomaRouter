import type { Sezione } from "@/lib/sezioni";

// Icone lineari semplici, decorative: il testo accanto descrive già la sezione.
const PERCORSI: Record<Sezione, React.ReactNode> = {
  "artisti-di-strada": (
    <>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  antenne: (
    <>
      <path d="M12 10v11" />
      <path d="M8 21h8" />
      <circle cx="12" cy="8" r="2" />
      <path d="M7.8 3.8a6 6 0 0 0 0 8.4M16.2 3.8a6 6 0 0 1 0 8.4" />
      <path d="M5 1.5a10 10 0 0 0 0 13M19 1.5a10 10 0 0 1 0 13" />
    </>
  ),
  "oggetti-smarriti": (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.9-4.9" />
      <path d="M8 10.5h5M10.5 8v5" />
    </>
  ),
  "impianti-sportivi": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M3 12h18" />
    </>
  ),
};

export function IconaSezione({ sezione, className }: { sezione: Sezione; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PERCORSI[sezione]}
    </svg>
  );
}
