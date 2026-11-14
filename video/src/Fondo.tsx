/*
 * Il fondo: travertino caldo, un alone del colore del capitolo, grana leggera e vignettatura.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "./stile";

const GRANA = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .55 0'/></filter><rect width='300' height='300' filter='url(#n)'/></svg>`,
)}")`;

export function Fondo({ colore, intensita = 1 }: { colore?: string; intensita?: number }) {
  return (
    <AbsoluteFill style={{ background: C.fondo }}>
      {colore && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(60% 70% at 72% 55%, ${colore}${Math.round(46 * intensita).toString(16).padStart(2, "0")} 0%, transparent 70%), radial-gradient(50% 60% at 10% 90%, ${colore}${Math.round(22 * intensita).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          }}
        />
      )}
      <AbsoluteFill style={{ backgroundImage: GRANA, opacity: 0.16, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 120% at 50% 45%, transparent 55%, rgba(90,60,30,.16) 100%)" }} />
    </AbsoluteFill>
  );
}
