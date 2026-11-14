/*
 * 02 Impianti sportivi (32 s). Roma piena di campi; i filtri per sport e "gioca gratis"; poi l'eroe:
 * scrivi un indirizzo, la mappa vola al Foro Italico, tocchi i campi da tennis, la camera si inclina e
 * gira piano attorno allo Stadio Olimpico.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { arrivo, kfo } from "../anima";
import sportJ from "../../riprese-dati/sport.json";
import { Lastra, inquadra, segno, suoniRipresa, type Esterno, type Interno, type Pezzo, type Ripresa } from "../Lastra";
import { COMANDI, INTERA, SOTTO, TUTTO, VETRINA } from "../inquadrature";
import { Fondo } from "../Fondo";
import { Suoni } from "../Suoni";
import { C } from "../stile";
import { Contatore, Titolo } from "../Testi";
import { Velo } from "../Velo";
import { ENTRA } from "./Oggetti";

const R = sportJ as Ripresa;

export function Sport() {
  const taglio = segno(R, "gratis") + 20; // via lo spegnimento dei filtri
  const ripresa = segno(R, "cerca") + 10;
  const pz: Pezzo[] = [
    { da: 0, a: taglio },
    { da: ripresa, a: R.fotogrammi },
  ];
  const s = (n: string) => {
    const src = segno(R, n);
    return ENTRA + (src < taglio ? src : taglio + (src - ripresa));
  };
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
  const FILTRI = inquadra(226, 235, 520, 330, 1.35);
  const CERCA = COMANDI(2.1, 107);
  const interno = (t: number): Interno =>
    kfo(t, [
      [s("filtri") - 6, INTERA],
      [s("filtri") + 24, FILTRI],
      [s("gratis") + 4, FILTRI],
      [ENTRA + taglio, CERCA],
      [s("invio") + 2, CERCA],
      [s("invio") + 34, INTERA],
      [s("giro"), INTERA],
      [s("giro") + 30, { fx: 1000, fy: 400, z: 1.32 }],
      [s("giro") + 240, { fx: 1010, fy: 395, z: 1.42 }],
    ]);
  return (
    <AbsoluteFill>
      <Fondo colore={C.sport} />
      <Lastra ripresa={R} pezzi={pz} t0={ENTRA} esterno={esterno} interno={interno} colore={C.sport} />
      <Suoni eventi={suoniRipresa(R, pz, ENTRA, 2)} />
      <Titolo testo={"Ogni campo\ndi Roma."} da={ENTRA + 24} a={s("filtri")} x={110} y={300} larghezza={600} size={56} />
      <Contatore valore={4248} da={ENTRA + 40} a={s("filtri")} durata={44} x={112} y={480} size={108} colore={C.sport} etichetta="campi e spazi, in 2.296 luoghi" />
      <Velo lato="basso" da={s("filtri") + 20} a={ENTRA + taglio + 4} />
      <Titolo testo="Lo sport che vuoi." da={s("filtri") + 26} a={s("gratis") - 30} x={110} y={860} larghezza={1300} size={76} />
      <Titolo testo="Anche dove si gioca gratis." da={s("gratis") - 24} a={ENTRA + taglio + 4} x={110} y={860} larghezza={1500} size={76} accento={{ parole: ["gratis"], colore: C.sport }} />
      <Velo lato="destra" da={ENTRA + taglio - 4} a={s("invio") + 16} />
      <Titolo testo={"Scrivi\ndove sei."} da={ENTRA + taglio + 4} a={s("invio") + 10} x={1140} y={380} larghezza={720} size={92} />
      <Velo lato="alto" da={s("arrivo")} a={1000} forza={0.85} />
      <Titolo testo="Il campo è lì." da={s("arrivo") + 6} a={1000} x={960} y={118} larghezza={1600} allinea="center" size={84} accento={{ parole: ["lì"], colore: C.sport }} />
    </AbsoluteFill>
  );
}
