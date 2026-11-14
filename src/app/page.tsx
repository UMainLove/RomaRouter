import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Copertina } from "@/components/copertina/Copertina";
import { CLASSI_FORMA } from "@/components/ui/Varie";
import { Colosseo } from "@/components/home/Colosseo";
import { GuardaVideo } from "@/components/home/GuardaVideo";
import { AMBITI, ORDINE_AMBITI, type AmbitoId } from "@/lib/ambiti";

/*
 * Home: tutte le strade portano a Roma. Al centro il Colosseo visto dall'alto; quattro strade nei
 * colori degli ambiti partono dai capolinea e corrono verso di lui, e quando arrivano l'arena si accende.
 * Desktop: diagramma in SVG (decorativo) con i capolinea come link sopra. Telefono: una linea
 * verticale con le diramazioni. Interazioni solo in CSS (globals.css, sezione .mg).
 */
const LARGO = 1200;
const ALTO = 560;
const CENTRO = { x: 600, y: 225 };

// Le etichette stanno sotto il capolinea: sopra le strade resta spazio per il titolo.
const STRADE: Record<AmbitoId, { d: string; x: number; y: number; lato: "sx" | "dx"; ritardo: number }> = {
  oggetti: { d: `M150 95 L470 95 L${CENTRO.x} ${CENTRO.y}`, x: 150, y: 95, lato: "sx", ritardo: 0 },
  sport: { d: `M1050 95 L730 95 L${CENTRO.x} ${CENTRO.y}`, x: 1050, y: 95, lato: "dx", ritardo: 110 },
  antenne: { d: `M1050 355 L730 355 L${CENTRO.x} ${CENTRO.y}`, x: 1050, y: 355, lato: "dx", ritardo: 220 },
  arte: { d: `M150 355 L470 355 L${CENTRO.x} ${CENTRO.y}`, x: 150, y: 355, lato: "sx", ritardo: 330 },
};
/** Una riga per ambito: niente slogan, solo un motivo per entrare. */
const INVITO: Record<AmbitoId, string> = {
  oggetti: "Roma restituisce quasi tutto",
  sport: "C'è un campo che ti aspetta",
  antenne: "Che cosa c'è sopra i tetti",
  arte: "La città è un palcoscenico",
};
// anelli a distanza fissa dal miliario, come le miglia
const ANELLI = [112, 224, 336];

type Variabili = CSSProperties & Record<`--${string}`, string>;

export default function Home() {
  return (
    <>
      <Copertina />
      <main className="mg flex flex-1 flex-col items-center px-4 pt-10 pb-12 sm:px-8 lg:pt-8 lg:pb-10">
        <div className="flex w-full max-w-[1100px] flex-col items-center gap-2 text-center">
          <p className="mg-occhiello">Tutte le strade portano a Roma</p>
          <h1 className="mg-titolo text-[40px] leading-[44px] font-bold tracking-[-0.03em] sm:text-[60px] sm:leading-[62px]">Da dove partiamo?</h1>
        </div>

        <div className="mg-diagramma">
          <svg className="mg-mappa" viewBox={`0 0 ${LARGO} ${ALTO}`} aria-hidden="true" focusable="false">
            {ANELLI.map((r) => (
              <circle key={r} className="mg-anello" cx={CENTRO.x} cy={CENTRO.y} r={r} />
            ))}
            {ORDINE_AMBITI.map((id) => {
              const s = STRADE[id];
              const stile: Variabili = { "--mg-ritardo": `${s.ritardo}ms`, stroke: `var(--color-${id})` };
              return (
                <g key={id}>
                  <path className="mg-strada" data-ambito={id} d={s.d} pathLength={1} style={stile} />
                  <path className="mg-flusso" data-ambito={id} d={s.d} pathLength={1} />
                </g>
              );
            })}
            <Colosseo cx={CENTRO.x} cy={CENTRO.y} />
          </svg>

          <span aria-hidden="true" className="mg-miliario-telefono" />
          <ol className="mg-stazioni" aria-label="Ambiti">
            {ORDINE_AMBITI.map((id) => {
              const a = AMBITI[id];
              const s = STRADE[id];
              const forma = CLASSI_FORMA[a.forma];
              const stile: Variabili = {
                "--x": `${(s.x / LARGO) * 100}%`,
                "--y": `${(s.y / ALTO) * 100}%`,
                "--mg-colore": `var(--color-${id})`,
                "--mg-ritardo": `${s.ritardo}ms`,
              };
              return (
                <li key={id} className={`mg-stazione mg-${s.lato}`} style={stile}>
                  <Link href={a.href} className="mg-link" data-ambito={id}>
                    <span className="mg-segno-box">
                      <span className={`mg-segno ${forma.esterno} ${a.classi.segno}`}>
                        <span className={forma.interno}>
                          <Icon name={a.icona} size={20} strokeWidth={2.1} />
                        </span>
                      </span>
                    </span>
                    <span className="mg-testo">
                      <span className="mg-nome">{a.nome}</span>
                      <span className="mg-breve">{INVITO[id]}</span>
                      <span className="mg-vai">
                        Entra
                        <Icon name="freccia" size={16} strokeWidth={2.2} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <GuardaVideo />
      </main>
    </>
  );
}
