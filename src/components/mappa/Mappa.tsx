"use client";

import { useEffect, useRef, useState } from "react";
import { AMBITI, ORDINE_AMBITI } from "@/lib/ambiti";
import { MappaSchematica, type PropsMappa, type SegnoExtra } from "./MappaSchematica";

/*
 * La mappa di ogni ambito. La base comune è "Quartieri di Roma 2026" (build in public/quartieri,
 * vedi docs/MAPPA.md), incorporata in un iframe: l'app le passa solo i punti già filtrati
 * dell'ambito, la mappa li disegna in 2D e in 3D e segnala i tocchi.
 * Senza la build si usa l'anteprima schematica, con le stesse props.
 *
 * Protocollo (stessa origine, controllata sempre):
 *   mappa → app   { tipo: "rr:pronta" }              la mappa ascolta
 *   app → mappa   { tipo: "rr:mostra", stili, punti, extra, selezionato, centro, raggio }
 *   mappa → app   { tipo: "rr:apri", ambito, id }    tocco su un punto
 */
const URL_MAPPA = "/quartieri/index.html";
const SRC_IFRAME = `${URL_MAPPA}?intro=no&incorporata=1#3d`;
const NESSUNO: SegnoExtra[] = [];

let verifica: Promise<boolean> | null = null;
function buildPresente() {
  verifica ??= fetch(URL_MAPPA, { method: "HEAD" }).then(
    (r) => r.ok,
    () => false,
  );
  return verifica;
}

export function Mappa({ titolo, ...props }: PropsMappa & { titolo: string }) {
  const [build, setBuild] = useState<boolean | null>(null);
  useEffect(() => {
    let attivo = true;
    void buildPresente().then((ok) => {
      if (attivo) setBuild(ok);
    });
    return () => {
      attivo = false;
    };
  }, []);

  return (
    <section aria-label={titolo} className="relative size-full min-h-[inherit] overflow-hidden bg-mappa">
      {build === true && <MappaQuartieri titolo={titolo} {...props} />}
      {build === false && <MappaSchematica {...props} />}
    </section>
  );
}

function MappaQuartieri({ titolo, punti, selezionato, onSeleziona, centro, raggioMetri, extra = NESSUNO }: PropsMappa & { titolo: string }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [pronta, setPronta] = useState(false);
  const seleziona = useRef(onSeleziona);
  useEffect(() => {
    seleziona.current = onSeleziona;
  });

  useEffect(() => {
    function suMessaggio(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== iframe.current?.contentWindow) return;
      const d = e.data as { tipo?: string; id?: unknown } | null;
      if (d?.tipo === "rr:pronta") setPronta(true);
      else if (d?.tipo === "rr:apri" && typeof d.id === "string") seleziona.current(d.id);
    }
    window.addEventListener("message", suMessaggio);
    return () => window.removeEventListener("message", suMessaggio);
  }, []);

  useEffect(() => {
    const finestra = iframe.current?.contentWindow;
    if (!pronta || !finestra) return;
    const radice = getComputedStyle(document.documentElement);
    const stili = Object.fromEntries(
      ORDINE_AMBITI.map((id) => [
        id,
        { nome: AMBITI[id].nome, forma: AMBITI[id].forma, colore: radice.getPropertyValue(`--color-${id}`).trim() },
      ]),
    );
    finestra.postMessage(
      {
        tipo: "rr:mostra",
        stili,
        punti: punti.map(({ id, ambito, nome, dettaglio, lat, lon, conteggio }) => ({ id, ambito, nome, dettaglio, lat, lon, conteggio })),
        extra,
        selezionato,
        centro: centro ? [centro.lat, centro.lon] : null,
        raggio: centro && raggioMetri ? raggioMetri : null,
      },
      window.location.origin,
    );
  }, [pronta, punti, extra, selezionato, centro, raggioMetri]);

  return <iframe ref={iframe} src={SRC_IFRAME} title={titolo} className="absolute inset-0 size-full border-0" />;
}
