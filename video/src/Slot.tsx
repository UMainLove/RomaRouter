/*
 * I due video degli artisti, con il loro audio (la musica li' si ferma).
 * - tuffo: negli ultimi fotogrammi la camera entra nello schermo del telefono che l'artista mostra
 *   (punto x, y in frazioni del quadro) e sotto c'e' gia' la mappa vera del sito: si esce dal telefono.
 * - coda: dopo la fine il video resta fermo sull'ultimo fotogramma (per la strada che lo attraversa).
 * Senza file si vede un cartello con il nome e il tempo.
 */
import React from "react";
import { AbsoluteFill, Easing, Freeze, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { tra } from "./anima";
import { FONT } from "./stile";

export function Slot({
  titolo,
  durata,
  file,
  inizio = 0,
  tuffo,
  coda = 0,
}: {
  titolo: string;
  /** fotogrammi del video */
  durata: number;
  file: string | null;
  inizio?: number;
  tuffo?: { x: number; y: number };
  /** fotogrammi dopo la fine: col tuffo il video sfuma sulla scena sotto, senza resta fermo */
  coda?: number;
}) {
  const frame = useCurrentFrame();
  if (file) {
    const fermo = frame >= durata;
    const video = <OffthreadVideo src={staticFile(file)} startFrom={inizio} muted={fermo} volume={0.7} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
    let trasforma: string | undefined;
    let filtro: string | undefined;
    let opacita = 1;
    if (tuffo) {
      const p = tra(frame, durata - 18, durata + coda, Easing.in(Easing.cubic));
      trasforma = `scale(${1 + p * 4.2})`;
      filtro = p > 0.35 ? `blur(${(p - 0.35) * 10}px)` : undefined;
      opacita = 1 - tra(frame, durata - 3, durata + coda, Easing.inOut(Easing.quad));
    }
    return (
      <AbsoluteFill style={{ background: "#000", opacity: opacita }}>
        <AbsoluteFill style={{ transform: trasforma, transformOrigin: tuffo ? `${tuffo.x * 100}% ${tuffo.y * 100}%` : undefined, filter: filtro }}>
          {fermo ? <Freeze frame={durata - 1}>{video}</Freeze> : video}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const p = frame / durata;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(90% 90% at 50% 50%, #2a201c 0%, #120d0b 100%)", fontFamily: FONT, color: "#f3ede3", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 40, border: "2px dashed rgba(243,237,227,.25)", borderRadius: 24 }} />
      <div style={{ fontSize: 26, letterSpacing: "0.3em", opacity: 0.6, fontWeight: 700 }}>SPAZIO RISERVATO</div>
      <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 18 }}>{titolo}</div>
      <div style={{ fontSize: 30, opacity: 0.7, marginTop: 14, fontWeight: 600 }}>
        {(frame / 30).toFixed(1).replace(".", ",")} / {(durata / 30).toFixed(1).replace(".", ",")} s · con il suo audio, senza musica
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, bottom: 110, height: 6, borderRadius: 3, background: "rgba(243,237,227,.15)" }}>
        <div style={{ width: `${Math.min(1, p) * 100}%`, height: "100%", borderRadius: 3, background: "#D4691A" }} />
      </div>
    </AbsoluteFill>
  );
}

/**
 * L'onda: la scena sopra si apre a cerchio dal punto (cx, cy) con un anello arancio sul bordo, come
 * l'onda intorno agli artisti in scena sulla mappa. Nessuna dissolvenza: il video sotto si vede subito pieno.
 */
export function Onda({ da, durata = 12, cx, cy, colore, children }: { da: number; durata?: number; cx: number; cy: number; colore: string; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const p = tra(frame, da, da + durata, Easing.bezier(0.55, 0, 0.25, 1));
  if (p <= 0) return <>{children}</>;
  if (p >= 1) return null;
  const r = p * 2300;
  const m = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, black ${r + 1.5}px)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ WebkitMaskImage: m, maskImage: m }}>{children}</AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: cx - r - 7,
          top: cy - r - 7,
          width: (r + 7) * 2,
          height: (r + 7) * 2,
          borderRadius: "50%",
          border: `14px solid ${colore}`,
          boxShadow: `0 0 0 5px rgba(255,255,255,.9), 0 0 60px 10px ${colore}aa`,
          opacity: 1 - p * 0.4,
        }}
      />
    </AbsoluteFill>
  );
}
