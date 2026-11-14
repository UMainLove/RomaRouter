"use client";

import { useEffect, useRef, useState } from "react";
import { CHIAVE_VISTA, FETTA_INIZIALE, PESO_SCENA, T_DISSOLVENZA, T_FERMA, URL_SCENA } from "./costanti";
import type { Scena } from "./scena";

/*
 * Copertina della home, solo alla prima visita (o con ?copertina=1).
 * 0–2 s: il Colosseo fermo (prima il poster, poi la scena 3D identica) e il contatore.
 * 2–4 s: la lupa fa lo slalom tra gli archi e la camera la segue con una panoramica che parte
 * piano. Poi la copertina si apre a cerchio dal Miliarium della home, con il bordo sfumato.
 * La home e' gia' sotto e completa: chi usa un lettore di schermo non aspetta, e qualsiasi
 * tasto, clic o scroll salta l'introduzione.
 */

type Fase = "attesa" | "uscita" | "finita";

const LIMITE_CARICAMENTO = 9; // s: oltre, si esce col solo poster
const LIMITE_TOTALE = 12; // s
const DURATA_USCITA = 950; // ms, come l'animazione CSS .copertina[data-fase="uscita"]
const DURATA_USCITA_BREVE = 600;
const TASTI_SALTA = new Set(["Escape", "Enter", " ", "Tab", "ArrowDown", "PageDown", "End"]);

declare global {
  interface Window {
    __rrCopertina?: number;
  }
}

function supportaWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function connessioneLeggera() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || c.effectiveType === "slow-2g" || c.effectiveType === "2g");
}

/** Centro del Miliarium nella home (cerchio su desktop, pallino su telefono). */
function centroMiliario(): [number, number] | null {
  for (const sel of [".mg-miliario circle", ".mg-miliario-telefono"]) {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    if (r && r.width > 0 && r.height > 0) return [r.left + r.width / 2, r.top + r.height / 2];
  }
  return null;
}

export function Copertina() {
  const radice = useRef<HTMLDivElement>(null);
  const contenitore = useRef<HTMLDivElement>(null);
  const esciRef = useRef<(rapida: boolean) => void>(() => {});
  const [fase, setFase] = useState<Fase>("attesa");
  const [percento, setPercento] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    const nodo = radice.current;
    const box = contenitore.current;
    if (!html.hasAttribute("data-copertina") || !nodo || !box) return;
    const el: HTMLDivElement = nodo; // non nullo anche dentro le funzioni qui sotto
    // una tela nuova a ogni avvio: in sviluppo (StrictMode) l'effetto parte due volte e due
    // renderer sulla stessa tela si spegnerebbero a vicenda
    const canvas = document.createElement("canvas");
    canvas.className = "copertina-tela";
    box.appendChild(canvas);

    const t0 = window.__rrCopertina ?? performance.now();
    const secondi = () => (performance.now() - t0) / 1000;
    const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const soloPoster = ridotto || connessioneLeggera() || !supportaWebGL();

    let scena: Scena | null = null;
    let raf = 0;
    let pronta = false;
    let tClip = 0; // secondi della clip: fermi col poster fino a T_FERMA, poi lo slalom
    let ultimo = 0;
    let uscita = false;
    let chiuso = false;
    const timer: number[] = [];

    function esci(rapida: boolean) {
      if (uscita || chiuso) return;
      uscita = true;
      const centro = centroMiliario();
      if (centro) {
        el.style.setProperty("--cx", `${centro[0]}px`);
        el.style.setProperty("--cy", `${centro[1]}px`);
      }
      try {
        localStorage.setItem(CHIAVE_VISTA, "1");
      } catch {}
      // la home riparte da qui: strade e capolinea si disegnano mentre la copertina si apre
      html.removeAttribute("data-copertina");
      el.dataset.uscita = rapida ? "breve" : "piena";
      setFase("uscita");
      let finita = false;
      const fine = () => {
        if (finita) return;
        finita = true;
        cancelAnimationFrame(raf);
        scena?.distruggi();
        scena = null;
        setFase("finita");
      };
      // fine dell'animazione CSS di apertura; il timer copre i browser che non la eseguono
      el.addEventListener("animationend", (e) => e.target === el && fine());
      timer.push(window.setTimeout(fine, (rapida ? DURATA_USCITA_BREVE : DURATA_USCITA) + 400));
    }
    esciRef.current = esci;

    function salta(e: Event) {
      if (e instanceof KeyboardEvent && !TASTI_SALTA.has(e.key)) return;
      esci(true);
    }

    function ciclo(adesso: number) {
      if (!scena || chiuso) return;
      // fase ferma: orologio reale (se la scena arriva dopo i 2 s lo slalom parte subito).
      // Slalom: al massimo 50 ms per fotogramma, cosi' su un telefono lento rallenta ma non salta.
      if (tClip < T_FERMA) tClip = Math.min(secondi(), T_FERMA);
      else tClip += Math.min((adesso - ultimo) / 1000, 0.05);
      ultimo = adesso;
      scena.disegna(tClip);
      if (!el.dataset.pronta) el.dataset.pronta = "1";
      if (tClip >= T_FERMA && !el.dataset.corsa) el.dataset.corsa = "1";
      // su un dispositivo lentissimo la copertina non trattiene comunque la home oltre i 12 s
      if (tClip >= T_DISSOLVENZA || secondi() > LIMITE_TOTALE) esci(false);
      raf = requestAnimationFrame(ciclo);
    }

    window.addEventListener("keydown", salta);
    window.addEventListener("wheel", salta, { passive: true });
    el.addEventListener("pointerdown", salta);
    el.addEventListener("touchmove", salta, { passive: true });

    if (soloPoster) {
      timer.push(window.setTimeout(() => setPercento(100), 250));
      timer.push(window.setTimeout(() => esci(ridotto), ridotto ? 1500 : T_FERMA * 1000 + 500));
    } else {
      timer.push(window.setTimeout(() => !pronta && esci(false), LIMITE_CARICAMENTO * 1000));
      import("./scena")
        .then(({ creaScena }) =>
          creaScena(canvas, URL_SCENA, {
            pesoStimato: PESO_SCENA,
            suProgresso: (f) => setPercento((p) => Math.max(p, Math.round(f * 100))),
          }),
        )
        .then((s) => {
          if (uscita || chiuso) {
            s.distruggi();
            return;
          }
          scena = s;
          pronta = true;
          raf = requestAnimationFrame((adesso) => {
            ultimo = adesso;
            ciclo(adesso);
          });
        })
        .catch(() => esci(false));
    }

    return () => {
      chiuso = true;
      cancelAnimationFrame(raf);
      timer.forEach((id) => clearTimeout(id));
      window.removeEventListener("keydown", salta);
      window.removeEventListener("wheel", salta);
      el.removeEventListener("pointerdown", salta);
      el.removeEventListener("touchmove", salta);
      scena?.distruggi();
      scena = null;
      canvas.remove();
    };
  }, []);

  if (fase === "finita") return null;

  return (
    <>
      <div
        ref={radice}
        className="copertina"
        data-fase={fase}
        aria-hidden="true"
        style={{ backgroundPosition: `${FETTA_INIZIALE * 100}% 50%` }}
      >
        <div ref={contenitore} className="copertina-scena" />
        <div className="copertina-velo" />
        <p className="copertina-marchio">RomaRouter</p>
        <div className="copertina-testo">
          <p className="copertina-luogo">Roma · Anfiteatro Flavio</p>
          <p className="copertina-contatore">
            <span>{percento}</span>%
          </p>
          <p className="copertina-motto">Tutte le strade partono da qui</p>
        </div>
      </div>
      {fase === "attesa" && (
        <button type="button" className="copertina-salta" onClick={() => esciRef.current(true)}>
          Salta l&apos;introduzione
        </button>
      )}
    </>
  );
}
