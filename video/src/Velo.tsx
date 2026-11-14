// Velo color travertino dietro i titoli che stanno sopra la mappa a pieno schermo.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { tra } from "./anima";

type Lato = "destra" | "sinistra" | "basso" | "alto";

export function Velo({ lato, da, a, forza = 0.95 }: { lato: Lato; da: number; a: number; forza?: number }) {
  const frame = useCurrentFrame();
  const p = tra(frame, da, da + 16) * (1 - tra(frame, a - 14, a));
  if (p <= 0) return null;
  const c = (o: number) => `rgba(243,237,227,${(o * forza).toFixed(3)})`;
  const verso = { destra: "left", sinistra: "right", basso: "top", alto: "bottom" }[lato];
  const g =
    lato === "basso" || lato === "alto"
      ? `linear-gradient(to ${verso}, ${c(0.96)} 0%, ${c(0.8)} 22%, ${c(0)} 46%)`
      : `linear-gradient(to ${verso}, ${c(0.97)} 0%, ${c(0.9)} 30%, ${c(0.55)} 44%, ${c(0)} 60%)`;
  return <AbsoluteFill style={{ background: g, opacity: p }} />;
}
