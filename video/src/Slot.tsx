/*
 * Spazio riservato ai due video degli artisti (arrivano da Google Drive). Finche' il file non c'e' si vede
 * un cartello con il nome e il tempo; quando c'e' (VIDEO_ARTISTI in sorgenti.ts) parte il video con il suo audio.
 */
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { FONT } from "./stile";

export function Slot({ titolo, durata, file, inizio = 0 }: { titolo: string; durata: number; file: string | null; inizio?: number }) {
  const frame = useCurrentFrame();
  if (file) {
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <OffthreadVideo src={staticFile(file)} startFrom={inizio} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 3, background: "#D4691A" }} />
      </div>
    </AbsoluteFill>
  );
}
