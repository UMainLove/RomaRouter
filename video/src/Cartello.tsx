/*
 * Cartello del capitolo: la strada del suo colore attraversa lo schermo (come le strade della home) e lascia
 * il colore pieno, con numero, nome e l'invito. Alla fine si dissolve sulla scena che c'e' sotto.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrivo, morbida, tra, uscita } from "./anima";
import { AMBITI, FONT, type Ambito } from "./stile";
import { Titolo } from "./Testi";

const INCLINA = 290; // px di inclinazione del bordo (alto piu' avanti del basso)

/** Il bordo della strada che passa: x del bordo in alto al tempo p (0→1). */
const bordo = (p: number) => -INCLINA - 160 + p * (1920 + INCLINA * 2 + 320);

export function Strada({ p, colore, ink }: { p: number; colore: string; ink: string }) {
  // la strada: una fascia scura con la linea di mezzeria tratteggiata, lungo il bordo inclinato
  const x = bordo(p);
  const ang = (Math.atan2(INCLINA, 1080) * 180) / Math.PI;
  return (
    <div
      style={{
        position: "absolute",
        left: x - INCLINA / 2 - 70,
        top: -120,
        width: 140,
        height: 1320,
        transform: `rotate(${ang}deg)`,
        background: ink,
        boxShadow: `0 0 0 10px ${colore}55, 0 0 60px ${ink}88`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 0,
          width: 12,
          height: "100%",
          backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,.95) 0 46px, transparent 46px 86px)",
          backgroundPositionY: `${p * 400}px`,
          borderRadius: 6,
        }}
      />
    </div>
  );
}

const ORDINE: Ambito[] = ["oggetti", "sport", "arte", "antenne"];

/** In basso, i quattro capitoli come tappe di una strada: questo acceso, gli altri in filigrana. */
function Percorso({ ambito, frame }: { ambito: Ambito; frame: number }) {
  return (
    <div style={{ position: "absolute", left: 140, right: 140, top: 900, display: "flex", gap: 18, fontFamily: FONT }}>
      {ORDINE.map((id, i) => {
        const p = tra(frame, i * 3, i * 3 + 18, arrivo);
        const qui = id === ambito;
        return (
          <div key={id} style={{ flex: 1, opacity: p * (qui ? 1 : 0.42) }}>
            <div style={{ height: 6, borderRadius: 3, background: "#fff", transformOrigin: "left", transform: `scaleX(${p})` }} />
            <div style={{ marginTop: 14, fontSize: 22, fontWeight: qui ? 800 : 600, letterSpacing: "0.04em", color: "#fff" }}>
              {AMBITI[id].n} {AMBITI[id].nome}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Cartello({ ambito, durata, entrata = 18 }: { ambito: Ambito; durata: number; entrata?: number }) {
  const frame = useCurrentFrame();
  const a = AMBITI[ambito];
  const p = tra(frame, 0, entrata, morbida);
  const x = bordo(p);
  const via = tra(frame, durata - 14, durata, uscita);
  const clip = p >= 1 ? undefined : `polygon(0 0, ${x}px 0, ${x - INCLINA}px 100%, 0 100%)`;
  const t0 = entrata - 6;
  const numero = tra(frame, t0, t0 + 40, arrivo);
  return (
    <AbsoluteFill style={{ opacity: 1 - via }}>
      <AbsoluteFill style={{ clipPath: clip, background: `radial-gradient(120% 140% at 30% 40%, ${a.colore} 0%, ${a.ink} 100%)`, transform: `scale(${1 + frame * 0.00035 + via * 0.04})` }}>
        {/* il numero, grande e in filigrana */}
        <div
          style={{
            position: "absolute",
            right: 90,
            top: 70 + (1 - numero) * 60,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 560,
            lineHeight: 1,
            letterSpacing: "-0.06em",
            color: "transparent",
            WebkitTextStroke: "3px rgba(255,255,255,.28)",
            opacity: numero,
          }}
        >
          {a.n}
        </div>
        <div style={{ position: "absolute", left: 140, top: 392, fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: "0.24em", color: "rgba(255,255,255,.8)", opacity: tra(frame, t0, t0 + 16) }}>
          {a.n} / 04
        </div>
        <Titolo testo={a.nome} da={t0 + 2} a={durata + 30} x={140} y={440} larghezza={1500} size={150} colore="#fff" sfasamento={4} />
        <Percorso ambito={ambito} frame={frame - t0 - 16} />
        <Titolo testo={a.invito} da={t0 + 12} a={durata + 30} x={144} y={622} larghezza={1400} size={52} peso={600} colore="rgba(255,255,255,.88)" sfasamento={2} />
      </AbsoluteFill>
      {p > 0 && p < 1 && <Strada p={p} colore={a.colore} ink={a.ink} />}
    </AbsoluteFill>
  );
}
