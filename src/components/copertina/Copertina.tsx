"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { CHIAVE_VISTA, FETTA_INIZIALE, T_DISSOLVENZA, T_FERMA, VIDEO, fettaAl } from "./costanti";

/*
 * Copertina della home, solo alla prima visita (o con ?copertina=1).
 * 0–0,75 s: il Colosseo al tramonto, fermo (il poster è il primo fotogramma del video), e il contatore.
 * 0,75–5,75 s: la lupa di bronzo fa lo slalom tra gli archi e la camera la segue con una panoramica che
 * parte piano; poi salta verso di noi sul capitello dove la aspettano Romolo e Remo (la camera allarga
 * l'inquadratura) e si ferma nella posa della Lupa Capitolina. Poi la copertina si apre a cerchio dal
 * Miliarium della home, con il bordo sfumato.
 * Il video si scarica solo quando la copertina parte. La home è già sotto e completa: chi usa un
 * lettore di schermo non aspetta, e qualsiasi tasto, clic o scroll salta l'introduzione.
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

/** Video muto in linea: gli attributi servono a iOS per farlo partire da solo. */
function creaVideo() {
  const v = document.createElement("video");
  v.className = "copertina-video";
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.preload = "auto";
  v.disablePictureInPicture = true;
  v.disableRemotePlayback = true;
  v.tabIndex = -1;
  for (const { src, tipo } of VIDEO) {
    const s = document.createElement("source");
    s.src = src;
    s.type = tipo;
    v.appendChild(s);
  }
  return v;
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

    const t0 = window.__rrCopertina ?? performance.now();
    const secondi = () => (performance.now() - t0) / 1000;
    const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const soloPoster = ridotto || connessioneLeggera();

    // un video nuovo a ogni avvio (in sviluppo l'effetto parte due volte)
    const video: HTMLVideoElement | null = soloPoster ? null : creaVideo();
    let raf = 0;
    let partito = false;
    let uscita = false;
    let chiuso = false;
    const timer: number[] = [];

    function fermaVideo() {
      if (!video) return;
      video.pause();
      // libera subito il decoder (sui telefoni ce n'e' uno solo)
      video.querySelectorAll("source").forEach((s) => s.remove());
      video.removeAttribute("src");
      video.load();
    }

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
        fermaVideo();
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

    function ciclo() {
      if (!video || chiuso) return;
      const t = video.currentTime;
      if (t >= T_FERMA && !el.dataset.corsa) el.dataset.corsa = "1";
      // sugli schermi stretti la fetta visibile segue la lupa (sul 16:9 e piu' larghi non cambia nulla)
      video.style.objectPosition = `${(fettaAl(t) * 100).toFixed(2)}% 50%`;
      // su un dispositivo lentissimo la copertina non trattiene comunque la home oltre i 12 s
      if (t >= T_DISSOLVENZA || video.ended || secondi() > LIMITE_TOTALE) esci(false);
      raf = requestAnimationFrame(ciclo);
    }

    window.addEventListener("keydown", salta);
    window.addEventListener("wheel", salta, { passive: true });
    el.addEventListener("pointerdown", salta);
    el.addEventListener("touchmove", salta, { passive: true });

    if (!video) {
      timer.push(window.setTimeout(() => setPercento(100), 250));
      timer.push(window.setTimeout(() => esci(ridotto), ridotto ? 1500 : T_FERMA * 1000 + 500));
    } else {
      const v: HTMLVideoElement = video;
      box.appendChild(v);
      const progresso = () => {
        const b = v.buffered;
        if (!b.length || !Number.isFinite(v.duration) || v.duration <= 0) return;
        const f = b.end(b.length - 1) / v.duration;
        setPercento((p) => Math.max(p, Math.min(99, Math.round(f * 100))));
      };
      const pronto = () => {
        if (partito || uscita || chiuso) return;
        partito = true;
        // il video riparte da dove sarebbe la copertina: fermo fino a T_FERMA, poi lo slalom
        // (se arriva tardi la corsa parte subito)
        const t = Math.min(secondi(), T_FERMA);
        if (Math.abs(v.currentTime - t) > 0.15) v.currentTime = t;
        setPercento(100);
        el.dataset.pronta = "1";
        raf = requestAnimationFrame(ciclo);
      };
      v.addEventListener("progress", progresso);
      v.addEventListener("loadedmetadata", progresso);
      v.addEventListener("playing", pronto);
      v.lastElementChild?.addEventListener("error", () => !partito && esci(false));
      timer.push(window.setTimeout(() => !partito && esci(false), LIMITE_CARICAMENTO * 1000));
      // play() subito: su iOS e' anche quello che fa partire il download. Se il browser nega la
      // riproduzione automatica (es. risparmio energetico) resta il poster per il tempo della pausa.
      v.play().catch(() => {
        if (partito || chiuso) return;
        timer.push(window.setTimeout(() => esci(false), Math.max(0, T_FERMA * 1000 + 500 - secondi() * 1000)));
      });
    }

    return () => {
      chiuso = true;
      cancelAnimationFrame(raf);
      timer.forEach((id) => clearTimeout(id));
      window.removeEventListener("keydown", salta);
      window.removeEventListener("wheel", salta);
      el.removeEventListener("pointerdown", salta);
      el.removeEventListener("touchmove", salta);
      fermaVideo();
      video?.remove();
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
        style={
          {
            "--fetta-iniziale": `${FETTA_INIZIALE * 100}%`,
          } as CSSProperties
        }
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
