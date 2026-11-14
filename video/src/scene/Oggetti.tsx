/*
 * 01 Oggetti smarriti (32 s). La mappa dei posti dove riportare un oggetto; chi trova un portafoglio
 * risponde a tre domande e riceve il codice di consegna; chi lo ha perso lo segnala e il sito trova
 * "un oggetto simile". Due persone diverse, due sessioni diverse: non si vedono mai.
 */
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { arrivo, kfo } from "../anima";
import trovatoJ from "../../riprese-dati/oggetti-trovato.json";
import persoJ from "../../riprese-dati/oggetti-perso.json";
import { Lastra, segno, suoniRipresa, type Esterno, type Interno, type Pezzo, type Ripresa } from "../Lastra";
import { COMANDI, INTERA, SCHEDA, SOTTO, TUTTO, VETRINA } from "../inquadrature";
import { Fondo } from "../Fondo";
import { Suoni } from "../Suoni";
import { C } from "../stile";
import { Contatore, Titolo } from "../Testi";
import { Velo } from "../Velo";

const TROVATO = trovatoJ as Ripresa;
const PERSO = persoJ as Ripresa;

export const ENTRA = 40; // la lastra sale mentre il cartello si dissolve
const CUT = 570; // stacco su chi ha perso, sul battere (35,0 s)

export function Oggetti() {
  const pz1: Pezzo[] = [{ da: 0, a: TROVATO.fotogrammi }];
  const s = (n: string) => ENTRA + segno(TROVATO, n); // fotogramma della scena di un segno
  const esterno1 = (t: number): Esterno =>
    t < ENTRA + 38
      ? kfo(t, [
          [ENTRA, SOTTO],
          [ENTRA + 38, VETRINA],
        ], arrivo)
      : kfo(t, [
          [ENTRA + 38, VETRINA],
          [150, VETRINA],
          [180, TUTTO],
        ]);
  const interno1 = (t: number): Interno =>
    kfo(t, [
      [150, INTERA],
      [178, COMANDI()],
      [ENTRA + 140, COMANDI()],
      [ENTRA + 168, SCHEDA()],
      [s("dettaglio") + 8, SCHEDA()],
      [s("dettaglio") + 30, SCHEDA(2, 650)],
      [s("codice") - 6, SCHEDA(2, 650)],
      [s("codice") + 14, SCHEDA(1.75)],
      [CUT, SCHEDA(1.6)],
    ]);

  const pz2: Pezzo[] = [
    { da: 0, a: 112 },
    { da: 190, a: PERSO.fotogrammi },
  ];
  const simile = 112 + (segno(PERSO, "simile") - 190);
  const interno2 = (t: number): Interno =>
    kfo(t, [
      [0, COMANDI(1.85)],
      [30, COMANDI(1.65)],
      [52, SCHEDA()],
      [simile - 4, SCHEDA()],
      [simile + 26, SCHEDA(1.95, 600)],
      [400, SCHEDA(2.05, 600)],
    ]);

  return (
    <AbsoluteFill>
      <Fondo colore={C.oggetti} />
      <Sequence durationInFrames={CUT}>
        <Lastra ripresa={TROVATO} pezzi={pz1} t0={ENTRA} esterno={esterno1} interno={interno1} colore={C.oggetti} />
        <Suoni eventi={suoniRipresa(TROVATO, pz1, ENTRA)} />
        <Titolo testo={"Ogni posto\ndove riportarlo."} da={ENTRA + 24} a={158} x={110} y={300} larghezza={600} size={56} />
        <Contatore valore={246} da={ENTRA + 40} a={158} x={112} y={480} size={108} colore={C.oggetti} etichetta="punti di consegna, 153 aperti giorno e notte" />
        <Velo lato="destra" da={176} a={CUT} />
        <Titolo testo={"Hai trovato\nqualcosa?"} da={196} a={s("dove") + 10} x={1140} y={380} larghezza={720} size={84} />
        <Titolo testo={"Tre domande.\nTre tocchi."} da={s("dove") + 16} a={s("codice") - 4} x={1140} y={380} larghezza={720} size={84} accento={{ parole: ["Tre"], colore: C.oggetti }} />
        <Titolo testo={"Ecco il codice.\nE dove portarlo."} da={s("codice") + 4} a={CUT + 4} x={1140} y={380} larghezza={720} size={84} />
      </Sequence>
      <Sequence from={CUT}>
        <Lastra ripresa={PERSO} pezzi={pz2} esterno={() => TUTTO} interno={interno2} colore={C.oggetti} />
        <Suoni eventi={suoniRipresa(PERSO, pz2, 0)} />
        <Velo lato="destra" da={-20} a={420} />
        <Titolo testo={"Hai perso\nqualcosa?"} da={12} a={120} x={1140} y={380} larghezza={720} size={84} />
        <Titolo testo={"Ti avvisiamo noi."} da={126} a={simile} x={1140} y={410} larghezza={720} size={84} />
        <Titolo testo={"Chi perde e chi trova\nnon si vedono mai."} da={simile + 6} a={420} x={1140} y={380} larghezza={740} size={70} accento={{ parole: ["mai"], colore: C.oggetti }} />
      </Sequence>
    </AbsoluteFill>
  );
}
