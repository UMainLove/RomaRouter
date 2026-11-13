import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { CLASSI_FORMA } from "@/components/ui/Varie";
import { ALTRO, AMBITI, ORDINE_AMBITI, type AmbitoId } from "@/lib/ambiti";

/*
 * Home «Il miglio d'oro»: il logo diventa la pagina. Al centro il Miliarium Aureum, la colonna
 * del Foro da cui si misuravano le strade; quattro strade nei colori degli ambiti arrivano ai
 * loro capolinea, la quinta (tratteggiata) porta a «Non è tra questi?».
 * Desktop: diagramma in SVG (decorativo) con i capolinea come link sopra. Telefono: una linea
 * verticale con le diramazioni. Interazioni solo in CSS (globals.css, sezione .mg).
 */
const LARGO = 1200;
const ALTO = 560;
const CENTRO = { x: 600, y: 225 };

// Le etichette stanno sotto il capolinea: sopra le strade resta spazio per il titolo.
const STRADE: Record<AmbitoId, { d: string; x: number; y: number; lato: "sx" | "dx"; ritardo: number }> = {
  oggetti: { d: `M${CENTRO.x} ${CENTRO.y} L470 95 L150 95`, x: 150, y: 95, lato: "sx", ritardo: 0 },
  sport: { d: `M${CENTRO.x} ${CENTRO.y} L730 95 L1050 95`, x: 1050, y: 95, lato: "dx", ritardo: 110 },
  antenne: { d: `M${CENTRO.x} ${CENTRO.y} L730 355 L1050 355`, x: 1050, y: 355, lato: "dx", ritardo: 220 },
  arte: { d: `M${CENTRO.x} ${CENTRO.y} L470 355 L150 355`, x: 150, y: 355, lato: "sx", ritardo: 330 },
};
const PIAZZA = 84;
const STRADA_ALTRO = `M${CENTRO.x} ${CENTRO.y + PIAZZA} L${CENTRO.x} ${ALTO}`;
// anelli a distanza fissa dal miliario, come le miglia
const ANELLI = [112, 224, 336];

type Variabili = CSSProperties & Record<`--${string}`, string>;

export default function Home() {
  return (
    <main className="mg flex flex-1 flex-col items-center px-4 pt-10 pb-12 sm:px-8 lg:pt-8 lg:pb-10">
      <div className="flex w-full max-w-[1100px] flex-col items-center gap-2 text-center">
        <p className="mg-occhiello">Tutte le strade portano al servizio giusto</p>
        <h1 className="mg-titolo text-[40px] leading-[44px] font-bold tracking-[-0.03em] sm:text-[60px] sm:leading-[62px]">Scegli un ambito</h1>
        <p className="mg-sottotitolo max-w-[560px] text-base leading-6 text-ink-soft sm:text-lg sm:leading-7">
          Per ognuno trovi la mappa e una barra dove chiedere quello che ti serve, a parole tue.
        </p>
      </div>

      <div className="mg-diagramma">
        <svg className="mg-mappa" viewBox={`0 0 ${LARGO} ${ALTO}`} aria-hidden="true" focusable="false">
          <defs>
            <path id="mg-iscrizione" d={`M${CENTRO.x - 64} ${CENTRO.y} a64 64 0 1 1 128 0 a64 64 0 1 1 -128 0`} />
          </defs>
          {ANELLI.map((r) => (
            <circle key={r} className="mg-anello" cx={CENTRO.x} cy={CENTRO.y} r={r} />
          ))}
          <path className="mg-strada mg-strada-altro" data-ambito="altro" d={STRADA_ALTRO} />
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
          <g className="mg-miliario">
            {/* la piazza del Foro: le strade partono dal suo bordo e l'iscrizione resta pulita */}
            <circle cx={CENTRO.x} cy={CENTRO.y} r={PIAZZA} className="mg-piazza" />
            <circle cx={CENTRO.x} cy={CENTRO.y} r={52} className="mg-miliario-alone" />
            <circle cx={CENTRO.x} cy={CENTRO.y} r={38} fill="var(--color-amaranto)" />
            <circle cx={CENTRO.x} cy={CENTRO.y} r={15} fill="var(--color-oro)" />
            <text className="mg-iscrizione" textLength={396} lengthAdjust="spacing">
              <textPath href="#mg-iscrizione" startOffset="0" textLength={396} lengthAdjust="spacing">
                MILIARIUM AUREUM · ROMA · TUTTE LE STRADE ·
              </textPath>
            </text>
          </g>
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
                    <span className="mg-breve">{a.breve}</span>
                    <span className="mg-vai">
                      Apri mappa e assistente
                      <Icon name="freccia" size={16} strokeWidth={2.2} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      <Link href={ALTRO.href} className="mg-altro group" data-ambito="altro">
        <Icon name="cerca" size={22} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[17px] leading-6 font-bold">{ALTRO.nome}</span>
          <span className="block truncate text-sm leading-5 text-ink-soft">{ALTRO.breve}</span>
        </span>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amaranto text-white group-hover:bg-amaranto-scuro">
          <Icon name="freccia" size={20} strokeWidth={2} />
        </span>
      </Link>
    </main>
  );
}
