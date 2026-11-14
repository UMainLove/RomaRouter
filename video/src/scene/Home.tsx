/*
 * Home (da 5,75 s): le quattro strade corrono verso il Colosseo, il cursore passa sui quattro capolinea
 * (l'arena prende il colore di ciascuno), poi la camera si tuffa sulla strada viola degli oggetti.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { kfo, uscita } from "../anima";
import home from "../../riprese-dati/home.json";
import { Lastra, PIENO, segno, type Interno, type Ripresa } from "../Lastra";
import { C } from "../stile";
import { Titolo } from "../Testi";

const R = home as Ripresa;
const OGGETTI = { x: 358, y: 266 }; // il capolinea viola, in punti della pagina

export function Home({ durata }: { durata: number }) {
  const tuffo = durata - 70;
  const interno = (t: number): Interno =>
    t < tuffo
      ? kfo(t, [
          [0, { fx: 720, fy: 405, z: 1 }],
          [110, { fx: 720, fy: 392, z: 1.07 }],
        ])
      : kfo(t, [
          [tuffo, { fx: 720, fy: 392, z: 1.07 }],
          [durata, { fx: OGGETTI.x, fy: OGGETTI.y, z: 2.6 }],
        ], uscita);
  return (
    <AbsoluteFill style={{ background: "#faf9f7" }}>
      <Lastra ripresa={R} pezzi={[{ da: 0, a: R.fotogrammi }]} esterno={() => PIENO} interno={interno} colore={C.oggetti} />
      <Titolo testo="Quattro servizi della città. Una porta sola." da={segno(R, "su-sport") + 8} a={tuffo + 6} x={960} y={930} larghezza={1600} allinea="center" size={46} peso={700} colore={C.inkSoft} />
    </AbsoluteFill>
  );
}
