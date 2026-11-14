"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

/*
 * «Guarda il video»: il film di presentazione (video/, render di Remotion) in una finestra sopra la home.
 * Leggero: finche' non si preme il pulsante la pagina non scarica nulla del video; il file arriva in
 * streaming (moov all'inizio) e parte subito, con l'audio.
 * La finestra sta in un portale su <body>: fuori dal contenitore che scorre, quindi ne' l'apertura,
 * ne' il focus, ne' l'uscita dallo schermo intero spostano la pagina sotto.
 */
const SORGENTI = [{ src: "/video/romarouter.mp4", tipo: "video/mp4" }] as const;
const POSTER = "/video/romarouter.jpg";

// la posizione e' anche in linea: la finestra resta sopra la pagina anche con un CSS vecchio in cache
const FISSO: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000 };

export function GuardaVideo() {
  const [aperto, setAperto] = useState(false);
  const chiudi = useRef<HTMLButtonElement>(null);
  const apri = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aperto) return;
    const pulsante = apri.current;
    // la pagina sotto resta esattamente dov'era, qualunque cosa succeda nella finestra
    const scorrevoli = Array.from(document.querySelectorAll<HTMLElement>("body, body *")).filter((el) => el.scrollTop > 0);
    const posizioni = scorrevoli.map((el) => [el, el.scrollTop] as const);
    const corpo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    chiudi.current?.focus({ preventScroll: true });
    const tasto = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.fullscreenElement) return;
      setAperto(false);
    };
    window.addEventListener("keydown", tasto);
    return () => {
      window.removeEventListener("keydown", tasto);
      document.body.style.overflow = corpo;
      for (const [el, y] of posizioni) el.scrollTop = y;
      pulsante?.focus({ preventScroll: true });
    };
  }, [aperto]);

  const esci = () => setAperto(false);

  return (
    <>
      <button ref={apri} type="button" className="mg-rivedi" onClick={() => setAperto(true)}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M5 3.2v9.6c0 .5.5.8.9.5l7.1-4.8c.4-.3.4-.8 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z" fill="currentColor" />
        </svg>
        Guarda il video
      </button>
      {aperto &&
        createPortal(
          <div className="film" style={FISSO} role="dialog" aria-modal="true" aria-label="Video di presentazione di RomaRouter" onClick={esci}>
            <div className="film-cornice" onClick={(e) => e.stopPropagation()}>
              <video className="film-video" controls autoPlay playsInline preload="auto" poster={POSTER}>
                {SORGENTI.map((s) => (
                  <source key={s.src} src={s.src} type={s.tipo} />
                ))}
              </video>
            </div>
            <button ref={chiudi} type="button" className="film-chiudi" onClick={esci} aria-label="Chiudi il video">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
