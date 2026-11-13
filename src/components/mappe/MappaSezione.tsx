"use client";

import { useEffect, useRef, useState } from "react";
import type { Sezione } from "@/lib/sezioni";

/**
 * La mappa di una sezione (public/mappe/<sezione>/, costruita da mappe/<sezione>/ con
 * `npm run mappe:build`). Ogni sezione ha la sua mappa: qui si incorpora quella giusta,
 * senza testata (la pagina ha gia' titolo e numeri). La mappa avvisa quando ha caricato
 * i suoi dati con postMessage { tipo: "rr:mappa-pronta" }.
 */
export function MappaSezione({
  sezione,
  titolo,
  parametri = "",
  altezza = "min(78vh, 760px)",
}: {
  sezione: Sezione;
  /** Titolo accessibile dell'iframe, es. "Mappa delle antenne di telefonia mobile". */
  titolo: string;
  /** Parametri aggiuntivi per la mappa, es. "antenna=12" o "lat=41.9&lon=12.5". */
  parametri?: string;
  altezza?: string;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const contenitore = useRef<HTMLDivElement>(null);
  const [pronta, setPronta] = useState(false);

  // "Mostra sulla mappa" da altre parti della pagina (VediSuMappa): si scorre fino alla mappa
  // e le si chiede di aprire l'elemento
  useEffect(() => {
    function apri(e: Event) {
      const d = (e as CustomEvent<{ sezione: string; id: number | string }>).detail;
      if (!d || d.sezione !== sezione) return;
      contenitore.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      iframe.current?.contentWindow?.postMessage({ tipo: "rr:apri-antenna", id: d.id }, window.location.origin);
    }
    window.addEventListener("rr:apri-su-mappa", apri);
    return () => window.removeEventListener("rr:apri-su-mappa", apri);
  }, [sezione]);
  const base = `/mappe/${sezione}/index.html`;
  const src = `${base}?incorporata=1${parametri ? `&${parametri}` : ""}`;

  useEffect(() => {
    function suMessaggio(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== iframe.current?.contentWindow) return;
      if (e.data?.tipo === "rr:mappa-pronta") setPronta(true);
    }
    window.addEventListener("message", suMessaggio);
    // rete lenta o dati non disponibili: dopo qualche secondo si mostra comunque la mappa
    const t = setTimeout(() => setPronta(true), 8000);
    return () => {
      window.removeEventListener("message", suMessaggio);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div ref={contenitore} className="relative overflow-hidden rounded-panel border border-line bg-panel" style={{ height: altezza, minHeight: 520 }}>
        <iframe
          ref={iframe}
          src={src}
          title={titolo}
          allow="geolocation; fullscreen"
          className="absolute inset-0 h-full w-full border-0"
        />
        {!pronta && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-panel/70" role="status">
            <span className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink-soft shadow-sm">
              Carico la mappa…
            </span>
          </div>
        )}
      </div>
      <a
        href={base}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 items-center gap-1.5 self-end rounded-full px-2 text-sm font-bold text-ink-soft hover:text-ink"
      >
        Apri la mappa a schermo intero
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
