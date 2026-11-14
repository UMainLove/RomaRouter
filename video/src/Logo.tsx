// Il marchio del sito (src/components/Logo.tsx), qui in grande.
import React from "react";
import { FONT_MARCHIO } from "./stile";

const PATH_R = "M9.2 7.4h7.4c3.6 0 6.1 2.3 6.1 5.6 0 2.5-1.4 4.4-3.7 5.2l3.1 4.6";

export function Marchio({ size, r = 1, punto = 1 }: { size: number; /** quanto della R e' disegnato */ r?: number; /** il punto d'oro */ punto?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="lp" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B0183A" />
          <stop offset="1" stopColor="#6E0016" />
        </linearGradient>
        <linearGradient id="lo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1D58A" />
          <stop offset="1" stopColor="#C29A3E" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill="url(#lp)" />
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill="none" stroke="#fff" strokeOpacity=".14" />
      <g fill="none" stroke="#fff" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.2 7.4v17.2" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, r * 2)} />
        <path d={PATH_R} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.max(0, r * 2 - 1)} />
      </g>
      <circle cx="23.4" cy="24.6" r={3.1 * punto} fill="url(#lo)" />
    </svg>
  );
}

export function Parola({ size, colore = "#251D1C" }: { size: number; colore?: string }) {
  return (
    <span style={{ fontFamily: FONT_MARCHIO, fontWeight: 700, fontSize: size, letterSpacing: "-0.01em", lineHeight: 1, color: colore }}>
      <span style={{ color: "#8E001C" }}>Roma</span>Router
    </span>
  );
}
