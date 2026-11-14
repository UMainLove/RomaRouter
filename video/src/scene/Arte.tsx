/*
 * 03 Artisti di strada, come funziona (36 s, fra le due parti del video degli artisti).
 * Dove posso suonare? La mappa delle zone per ogni arte; il verdetto (Trevi no, Lungotevere si');
 * il Pass Artista (preavviso, SIAE e nulla osta li manda il sito); un turno sul palco di Piazza Navona;
 * "Voglio guardare": chi suona adesso. Finisce con uno stacco netto sulla ragazza che canta.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { kfo } from "../anima";
import arteJ from "../../riprese-dati/arte.json";
import { Lastra, inquadra, inScena, segno, suoniRipresa, type Interno, type Pezzo, type Ripresa } from "../Lastra";
import { INTERA, SCHEDA, TUTTO } from "../inquadrature";
import { Fondo } from "../Fondo";
import { Suoni } from "../Suoni";
import { C } from "../stile";
import { Titolo } from "../Testi";
import { Velo } from "../Velo";

const R = arteJ as Ripresa;
const ROSSO = "#C62828";
const VERDE = "#1B8F4E";

export function Arte({ durata }: { durata: number }) {
  const g = (n: string) => segno(R, n);
  const pz: Pezzo[] = [
    { da: 30, a: g("si") + 64 },
    { da: g("pass-1") - 14, a: g("pass-2") + 20 },
    { da: g("pass-3") - 10, a: g("pass") + 66 },
    { da: g("palco") - 26, a: g("palco") + 34 },
    { da: g("turno") - 8, a: g("prenotato") + 46 },
  ];
  const usati = pz.reduce((s, p) => s + (p.a - p.da), 0);
  pz.push({ da: g("guardare") - 4, a: Math.min(R.fotogrammi, g("guardare") - 4 + Math.max(60, durata - usati)) });
  const s = (n: string) => {
    const q = inScena(g(n), pz);
    if (q === null) throw new Error(`segno ${n} tagliato`);
    return q;
  };
  const FILTRI = inquadra(226, 220, 560, 360, 1.5);
  const interno = (t: number): Interno =>
    kfo(t, [
      [0, { fx: 760, fy: 420, z: 1.22 }],
      [s("filtri") - 10, INTERA],
      [s("filtri") + 18, FILTRI],
      [s("musica") + 8, FILTRI],
      [s("no") - 4, { fx: 800, fy: 420, z: 1.12 }],
      [s("no") + 16, SCHEDA(1.6, 630)],
      [s("pass-2"), SCHEDA(1.7, 600)],
      [s("pass") + 4, SCHEDA(1.7, 600)],
      [s("pass") + 26, SCHEDA(1.85, 600)],
      [s("palco") - 2, INTERA],
      [s("palco") + 30, { fx: 820, fy: 470, z: 1.15 }],
      [s("turno") + 6, SCHEDA(1.7, 640)],
      [s("prenotato") + 40, SCHEDA(1.75, 640)],
      [s("guardare") + 4, INTERA],
      [durata, { fx: 760, fy: 430, z: 1.1 }],
    ]);
  return (
    <AbsoluteFill>
      <Fondo colore={C.arte} />
      <Lastra ripresa={R} pezzi={pz} esterno={() => TUTTO} interno={interno} colore={C.arte} />
      <Suoni eventi={suoniRipresa(R, pz, 0)} />

      <Velo lato="sinistra" da={-20} a={s("filtri") + 4} />
      <Titolo testo={"Dove posso\nsuonare?"} da={6} a={s("filtri")} x={110} y={360} larghezza={760} size={96} accento={{ parole: ["suonare"], colore: C.arte }} />

      <Velo lato="basso" da={s("filtri") + 10} a={s("no")} />
      <Titolo testo="Ogni arte ha la sua mappa." da={s("filtri") + 18} a={s("no") - 2} x={110} y={880} larghezza={1600} size={76} />

      <Velo lato="destra" da={s("no") + 6} a={s("palco")} />
      <Titolo testo="Qui no." da={s("no") + 14} a={s("si") - 2} x={1140} y={400} larghezza={720} size={120} accento={{ parole: ["no"], colore: ROSSO }} />
      <Titolo testo="Qui sì." da={s("si") + 8} a={s("pass-1")} x={1140} y={400} larghezza={720} size={120} accento={{ parole: ["sì"], colore: VERDE }} />
      <Titolo testo={"Un pass.\nUna volta sola."} da={s("pass-1") + 6} a={s("pass") - 2} x={1140} y={380} larghezza={720} size={84} accento={{ parole: ["pass"], colore: C.arte }} />
      <Titolo testo={"Preavviso, SIAE,\npermessi:\nli mandiamo noi."} da={s("pass") + 4} a={s("palco")} x={1140} y={330} larghezza={740} size={70} />

      <Velo lato="destra" da={s("turno")} a={s("guardare") + 4} />
      <Titolo testo={"Il tuo turno\nsul palco."} da={s("turno") + 8} a={s("guardare")} x={1140} y={380} larghezza={720} size={84} accento={{ parole: ["palco"], colore: C.arte }} />

      <Velo lato="basso" da={s("guardare") + 10} a={durata + 20} />
      <Titolo testo="E chi vuole ascoltare, sa dove andare." da={s("guardare") + 20} a={durata + 20} x={110} y={880} larghezza={1700} size={70} accento={{ parole: ["ascoltare"], colore: C.arte }} />
    </AbsoluteFill>
  );
}
