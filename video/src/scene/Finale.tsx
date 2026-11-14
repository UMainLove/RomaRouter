/*
 * Finale (19 s). La home si riapre a cerchio dal Colosseo, le quattro strade si ridisegnano:
 * "Quattro strade." "Una città." La camera entra nell'arena e sul colpo (177,0 s) nasce il marchio,
 * con le quattro strade dei capitoli che gli corrono incontro. "Tutte le strade portano a Roma."
 */
import React from "react";
import { AbsoluteFill, Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { arrivo, kf, kfo, tra, uscita } from "../anima";
import home from "../../riprese-dati/home.json";
import { Fondo } from "../Fondo";
import { Lastra, PIENO, type Ripresa } from "../Lastra";
import { Marchio, Parola } from "../Logo";
import { C, FONT } from "../stile";
import { Titolo } from "../Testi";
import { CENTRO_HOME } from "./Lupa";

const R = home as Ripresa;
const LOGO = 240; // fotogramma del colpo sul marchio (169 + 8 = 177 s)

/** Le quattro strade del finale: dagli angoli al marchio, come nella home. */
const STRADE: Array<[string, string]> = [
  [C.oggetti, "M -60 190 L 560 190 L 760 330"],
  [C.sport, "M 1980 190 L 1360 190 L 1160 330"],
  [C.antenne, "M 1980 900 L 1360 900 L 1160 790"],
  [C.arte, "M -60 900 L 560 900 L 760 790"],
];

export function Finale({ durata }: { durata: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. la home si riapre dal centro
  const apre = tra(frame, 0, 26, Easing.bezier(0.55, 0, 0.2, 1));
  const r = apre * 2600;
  const maschera = apre < 1 ? `radial-gradient(circle at ${CENTRO_HOME.x}px ${CENTRO_HOME.y}px, black ${r}px, transparent ${r + 300}px)` : undefined;
  const interno = (t: number) =>
    t < 170
      ? kfo(t, [
          [0, { fx: 720, fy: 380, z: 1.22 }],
          [110, { fx: 720, fy: 392, z: 1.02 }],
        ])
      : kfo(t, [
          [170, { fx: 720, fy: 392, z: 1.02 }],
          [LOGO, { fx: 720, fy: 371, z: 3.4 }],
        ], uscita);

  // 2. il marchio
  const nasce = spring({ frame: frame - LOGO + 6, fps, config: { damping: 14, stiffness: 120, mass: 0.9 } });
  const r2 = tra(frame, LOGO - 4, LOGO + 18, arrivo);
  const punto = spring({ frame: frame - LOGO - 14, fps, config: { damping: 8, stiffness: 180 } });
  const parola = tra(frame, LOGO + 16, LOGO + 46, arrivo);
  const fine = tra(frame, durata - 50, durata - 4, Easing.inOut(Easing.quad));
  const bianco = tra(frame, LOGO - 10, LOGO, uscita) * (1 - tra(frame, LOGO, LOGO + 14));

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {frame < LOGO && (
        <AbsoluteFill style={{ WebkitMaskImage: maschera, maskImage: maschera, background: "#faf9f7" }}>
          <Lastra ripresa={R} pezzi={[{ da: 0, a: 100 }]} esterno={() => PIENO} interno={interno} cursore={false} />
          <Titolo testo="Quattro strade." da={22} a={98} x={960} y={918} larghezza={1600} allinea="center" size={64} />
          <Titolo testo="Una città." da={100} a={176} x={960} y={918} larghezza={1600} allinea="center" size={64} accento={{ parole: ["città"], colore: C.amaranto }} />
        </AbsoluteFill>
      )}
      {frame >= LOGO - 1 && (
        <AbsoluteFill>
          <Fondo />
          <svg width={1920} height={1080} style={{ position: "absolute" }}>
            {STRADE.map(([colore, d], i) => {
              const p = tra(frame, LOGO + 2 + i * 3, LOGO + 40 + i * 3, arrivo);
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke={colore} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={0.95} />
                  <path d={d} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="0.012 0.016" strokeDashoffset={-frame * 0.002} opacity={0.85 * tra(frame, LOGO + 40 + i * 3, LOGO + 52 + i * 3)} />
                </g>
              );
            })}
          </svg>
          {/* il marchio e il nome */}
          <div style={{ position: "absolute", left: 960, top: 492, transform: `translate(-50%, -50%)`, display: "flex", alignItems: "center", gap: 34 * parola }}>
            <div style={{ transform: `scale(${0.4 + 0.6 * nasce})`, filter: "drop-shadow(0 24px 40px rgba(110,0,22,.35))" }}>
              <Marchio size={190} r={r2} punto={Math.max(0, punto)} />
            </div>
            <div style={{ width: 780 * parola, overflow: "hidden", whiteSpace: "nowrap" }}>
              <div style={{ transform: `translateX(${(1 - parola) * -60}px)`, opacity: parola }}>
                <Parola size={132} />
              </div>
            </div>
          </div>
          <Titolo testo="Tutte le strade portano a Roma." da={LOGO + 50} a={durata + 20} x={960} y={636} larghezza={1600} allinea="center" size={52} peso={600} colore={C.inkSoft} sfasamento={3} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 738,
              textAlign: "center",
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: "0.26em",
              color: C.muted,
              opacity: tra(frame, LOGO + 90, LOGO + 120) * kf(frame, [[0, 1]]),
            }}
          >
            OGGETTI · SPORT · ARTISTI · ANTENNE
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: bianco * 0.85 }} />
      <AbsoluteFill style={{ background: "#000", opacity: fine }} />
    </AbsoluteFill>
  );
}
