"use client";

import { useEffect, useRef, useState } from "react";

/*
 * «Guarda il video»: il film di presentazione (video/, render di Remotion) in una finestra sopra la home.
 * Leggero: finche' non si preme il pulsante la pagina non scarica nulla del video; il file arriva in
 * streaming (moov all'inizio) e parte subito, con l'audio.
 */
const SORGENTI = [{ src: "/video/romarouter.mp4", tipo: "video/mp4" }] as const;
const POSTER = "/video/romarouter.jpg";

export function GuardaVideo() {
  const [aperto, setAperto] = useState(false);
  const chiudi = useRef<HTMLButtonElement>(null);
  const apri = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aperto) return;
    chiudi.current?.focus();
    const tasto = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAperto(false);
      apri.current?.focus();
    };
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  }, [aperto]);

  const esci = () => {
    setAperto(false);
    apri.current?.focus();
  };

  return (
    <>
      <button ref={apri} type="button" className="mg-rivedi" onClick={() => setAperto(true)}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M5 3.2v9.6c0 .5.5.8.9.5l7.1-4.8c.4-.3.4-.8 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z" fill="currentColor" />
        </svg>
        Guarda il video
      </button>
      {aperto && (
        <div className="film" role="dialog" aria-modal="true" aria-label="Video di presentazione di RomaRouter" onClick={esci}>
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
        </div>
      )}
    </>
  );
}
