/*
 * La lupa: il video della copertina, intero. A 5,75 s si apre a cerchio dal centro del Colosseo della home
 * (come sul sito) e sotto c'e' gia' la home.
 */
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Easing } from "remotion";
import { tra } from "../anima";
import { LUPA } from "../sorgenti";
import { f, T } from "../tempi";
import { Occhiello } from "../Testi";

/** Il centro del Colosseo della home sullo schermo (lastra a pieno schermo, zoom 1). */
export const CENTRO_HOME = { x: 960, y: 495 };

export function Lupa() {
  const frame = useCurrentFrame();
  const apre = tra(frame, f(T.rivela), f(T.rivela) + 28, Easing.bezier(0.55, 0, 0.2, 1));
  const r = -500 + apre * 3000;
  const maschera = apre > 0 ? `radial-gradient(circle at ${CENTRO_HOME.x}px ${CENTRO_HOME.y}px, transparent ${r}px, black ${r + 420}px)` : undefined;
  return (
    <AbsoluteFill style={{ WebkitMaskImage: maschera, maskImage: maschera }}>
      <OffthreadVideo src={staticFile(LUPA)} muted style={{ width: "100%", height: "100%" }} />
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(20,12,6,.45) 0%, transparent 30%)", opacity: 1 - tra(frame, 95, 125) }} />
      <Occhiello testo="Roma · Anfiteatro Flavio" da={14} a={105} x={110} y={958} colore="rgba(255,248,236,.92)" />
    </AbsoluteFill>
  );
}
