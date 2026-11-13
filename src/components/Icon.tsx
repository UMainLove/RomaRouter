import type { ReactNode } from "react";

// Icone a tratto 24×24 (currentColor). Decorative: aria-hidden; il testo accanto dà il significato.
const TRACCIATI = {
  palla: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8" />
    </>
  ),
  antenna: (
    <>
      <path d="M12 11v10M8.5 21h7M12 11l-3.5 10M12 11l3.5 10" />
      <circle cx="12" cy="8.5" r="2" />
      <path d="M7.8 4.8a6 6 0 0 0 0 7.4M16.2 4.8a6 6 0 0 1 0 7.4" />
    </>
  ),
  chiave: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11.2 11.8L20 3M16.5 6.5l2.5 2.5M14 9l2 2" />
    </>
  ),
  nota: (
    <>
      <path d="M9 18V5.5l11-2.5v12.5" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="15.5" r="2.5" />
    </>
  ),
  microfono: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  freccia: <path d="M5 12h14M13 6l6 6-6 6" />,
  indietro: <path d="M15 6l-6 6 6 6" />,
  avanti: <path d="M9 6l6 6-6 6" />,
  giu: <path d="M6 9l6 6 6-6" />,
  chiudi: <path d="M7 7l10 10M17 7L7 17" />,
  piu: <path d="M12 5v14M5 12h14" />,
  meno: <path d="M5 12h14" />,
  cerca: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6v.4" />
    </>
  ),
  scudo: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  spunta: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  attenzione: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  segnaposto: (
    <>
      <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  posizione: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
      <circle cx="12" cy="12" r="7" />
    </>
  ),
  mappa: (
    <>
      <path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  elenco: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </>
  ),
  livelli: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  filtri: <path d="M4 6h16M7 12h10M10 18h4" />,
  orologio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  accessibile: (
    <>
      <circle cx="10" cy="4.5" r="1.6" />
      <path d="M10 7.5v5.5h5.5l2 5.5M10 10h5" />
      <path d="M7.5 10.8a5.5 5.5 0 1 0 7.3 7.7" />
    </>
  ),
  scuola: (
    <>
      <path d="M3 9.5L12 5l9 4.5-9 4.5z" />
      <path d="M7 11.5v4.5c3 2 7 2 10 0v-4.5" />
    </>
  ),
  ospedale: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  altalena: (
    <>
      <path d="M4 20L8 4h8l4 16" />
      <path d="M10 4v9M14 4v9M9 13h6" />
    </>
  ),
  utente: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </>
  ),
  persone: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c1-3.6 3.5-5.5 6.5-5.5s5.5 1.9 6.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.5c2.4 0 4.2 1.4 5 4" />
    </>
  ),
  bandiera: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  lucchetto: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  euro: <path d="M17.5 6.5a6.5 6.5 0 1 0 0 11M4.5 10h9M4.5 14h9" />,
  zaino: (
    <>
      <path d="M8 7V5.5a4 4 0 0 1 8 0V7" />
      <rect x="5" y="7" width="14" height="14" rx="3.5" />
      <path d="M9 14h6v3H9z" />
    </>
  ),
  fotocamera: (
    <>
      <path d="M4 8h3.2L9 5.5h6L16.8 8H20v11H4z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  scarica: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4 19.5h16" />,
  condividi: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4" />
    </>
  ),
  bussola: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  matita: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  silenzio: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M17 9l4 6M21 9l-4 6" />
    </>
  ),
  esterno: <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v6H4V6h6" />,
  casa: <path d="M4 10.5L12 4l8 6.5V20h-5v-6H9v6H4z" />,
  documento: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  telefono: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  ombrello: (
    <>
      <path d="M3 12a9 9 0 0 1 18 0z" />
      <path d="M12 12v6.5a2 2 0 0 0 4 0" />
    </>
  ),
  maglia: <path d="M8 4l4 2 4-2 4 3-2.5 3.5L16 9.5V20H8V9.5L6.5 10.5 4 7z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof TRACCIATI;

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {TRACCIATI[name]}
    </svg>
  );
}
