/*
 * 04 Antenne (30 s, dopo la ragazza che canta). La citta' con tutte le antenne in funzione e le richieste;
 * le nuove; poi l'eroe: un indirizzo, i cerchi a 100, 250 e 500 metri, il tocco su un'antenna e il radar.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { arrivo, kfo } from "../anima";
import antenneJ from "../../riprese-dati/antenne.json";
import { Lastra, inquadra, segno, suoniRipresa, type Esterno, type Interno, type Pezzo, type Ripresa } from "../Lastra";
import { COMANDI, INTERA, SCHEDA, SOTTO, TUTTO, VETRINA } from "../inquadrature";
import { Fondo } from "../Fondo";
import { Suoni } from "../Suoni";
import { C } from "../stile";
import { Contatore, Titolo } from "../Testi";
import { Velo } from "../Velo";
import { ENTRA } from "./Oggetti";

const R = antenneJ as Ripresa;

export function Antenne() {
  const pz: Pezzo[] = [{ da: 0, a: R.fotogrammi }];
  const s = (n: string) => ENTRA + segno(R, n);
  const esterno = (t: number): Esterno =>
    t < ENTRA + 38
      ? kfo(t, [
          [ENTRA, SOTTO],
          [ENTRA + 38, VETRINA],
        ], arrivo)
      : kfo(t, [
          [ENTRA + 38, VETRINA],
          [s("filtri") - 6, VETRINA],
          [s("filtri") + 24, TUTTO],
        ]);
  const CHIP = inquadra(226, 175, 560, 330, 1.6);
  const CERCA = COMANDI(2.1, 107);
  const RADAR = { fx: 860, fy: 420, z: 1.35 };
  const interno = (t: number): Interno =>
    kfo(t, [
      [s("filtri") - 6, INTERA],
      [s("filtri") + 24, CHIP],
      [s("cerca") - 4, CHIP],
      [s("cerca") + 20, CERCA],
      [s("invio") + 2, CERCA],
      [s("invio") + 34, INTERA],
      [s("intorno") - 10, INTERA],
      [s("intorno") + 14, SCHEDA(1.6, 640)],
      [s("antenna") - 26, SCHEDA(1.6, 640)],
      [s("antenna") - 4, INTERA],
      [s("antenna") + 30, RADAR],
      [s("antenna") + 56, RADAR],
      [s("antenna") + 80, SCHEDA(1.6, 640)],
      [s("sensibili") + 6, SCHEDA(1.6, 640)],
      [s("sensibili") + 60, SCHEDA(1.85, 680)],
      [920, SCHEDA(1.92, 690)],
    ]);
  return (
    <AbsoluteFill>
      <Fondo colore={C.antenne} />
      <Lastra ripresa={R} pezzi={pz} t0={ENTRA} esterno={esterno} interno={interno} colore={C.antenne} />
      <Suoni eventi={suoniRipresa(R, pz, ENTRA, 2)} />
      <Titolo testo={"Ogni antenna.\nOgni richiesta."} da={ENTRA + 24} a={s("filtri")} x={110} y={300} larghezza={600} size={56} />
      <Contatore valore={3448} da={ENTRA + 40} a={s("filtri")} durata={44} x={112} y={480} size={108} colore={C.antenne} etichetta="antenne in funzione, 192 richieste" />
      <Velo lato="basso" da={s("filtri") + 20} a={s("cerca") + 8} />
      <Titolo testo="Anche quelle appena richieste." da={s("filtri") + 26} a={s("cerca") + 4} x={110} y={880} larghezza={1600} size={76} accento={{ parole: ["richieste"], colore: C.antenne }} />
      <Velo lato="destra" da={s("cerca") + 4} a={s("invio") + 30} />
      <Titolo testo={"Che cosa c'è\nsopra casa tua?"} da={s("cerca") + 12} a={s("invio") + 26} x={1140} y={380} larghezza={740} size={84} accento={{ parole: ["casa"], colore: C.antenne }} />
      <Velo lato="destra" da={s("intorno") + 6} a={s("antenna") - 6} />
      <Titolo testo={"Nel raggio\ndi 500 metri."} da={s("intorno") + 14} a={s("antenna") - 8} x={1140} y={380} larghezza={720} size={92} accento={{ parole: ["500"], colore: C.antenne }} />
      <Velo lato="destra" da={s("antenna") + 70} a={940} />
      <Titolo testo={"Chi la gestisce,\ncome trasmette."} da={s("antenna") + 78} a={s("sensibili") + 4} x={1140} y={380} larghezza={740} size={80} />
      <Titolo testo={"E quanto è vicina\na scuole e ospedali."} da={s("sensibili") + 10} a={940} x={1140} y={380} larghezza={760} size={74} accento={{ parole: ["scuole", "ospedali"], colore: C.antenne }} />
    </AbsoluteFill>
  );
}
