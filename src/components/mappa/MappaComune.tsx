"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ZONE } from "@/data/esempi";
import { AMBITI, LIVELLI_MAPPA, type AmbitoId } from "@/lib/ambiti";
import { distanzaMetri, formattaDistanza } from "@/lib/geo";
import { Icon } from "../Icon";
import { CampioneForma, TesseraAmbito } from "../ui/Varie";
import { MappaSchematica } from "./MappaSchematica";
import { puntiMappa } from "./punti";

const URL_FORK = "/quartieri/index.html";
const RAGGIO_ZONA = 1500;

type StatoFork = "verifica" | "presente" | "assente";

/*
 * Mappa comune delle sfide 1, 2 e 4.
 * Se il fork di quartieri-roma-2026 è in public/quartieri, lo incorpora in un iframe
 * (stato iniziale nella query, aggiornamenti e clic via postMessage, vedi docs/MAPPA.md).
 * Altrimenti mostra l'anteprima schematica con i dati di esempio.
 */
export function MappaComune() {
  const parametri = useSearchParams();
  const router = useRouter();
  const livelliIniziali = (parametri.get("livelli")?.split(",").filter((l): l is AmbitoId => (LIVELLI_MAPPA as string[]).includes(l)) ??
    []) as AmbitoId[];
  const zonaChiave = parametri.get("zona") ?? "";
  const zona = ZONE[zonaChiave] ?? null;

  const [livelli, setLivelli] = useState<AmbitoId[]>(livelliIniziali.length ? livelliIniziali : LIVELLI_MAPPA);
  const [vista, setVista] = useState<"mappa" | "elenco">("mappa");
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [fork, setFork] = useState<StatoFork>("verifica");
  const iframe = useRef<HTMLIFrameElement>(null);

  // C'è il build del fork in public/mappa?
  useEffect(() => {
    let attivo = true;
    fetch(URL_FORK, { method: "HEAD" })
      .then((r) => attivo && setFork(r.ok ? "presente" : "assente"))
      .catch(() => attivo && setFork("assente"));
    return () => {
      attivo = false;
    };
  }, []);

  // Clic dalla mappa del fork verso l'app: { tipo: "rr:apri", ambito, id }.
  useEffect(() => {
    function suMessaggio(e: MessageEvent) {
      if (e.origin !== window.location.origin || !e.data || e.data.tipo !== "rr:apri") return;
      const { ambito, id } = e.data as { ambito?: string; id?: string };
      if (ambito === "sport" && id) router.push(`/sport/${encodeURIComponent(id)}`);
      else if (ambito === "arte" && id) router.push(`/arte/${encodeURIComponent(id)}`);
      else if (ambito === "antenne") router.push("/antenne");
    }
    window.addEventListener("message", suMessaggio);
    return () => window.removeEventListener("message", suMessaggio);
  }, [router]);

  // Aggiornamenti verso il fork, senza ricaricare l'iframe.
  useEffect(() => {
    if (fork !== "presente") return;
    iframe.current?.contentWindow?.postMessage(
      { tipo: "rr:mostra", livelli, centro: zona ? [zona.lat, zona.lon] : null, raggio: zona ? RAGGIO_ZONA : null },
      window.location.origin,
    );
  }, [fork, livelli, zona]);

  const punti = useMemo(() => {
    return puntiMappa()
      .filter((p) => livelli.includes(p.ambito))
      .map((p) => ({ ...p, distanza: zona ? distanzaMetri(zona, p) : null }))
      .filter((p) => p.distanza === null || p.distanza <= RAGGIO_ZONA)
      .sort((a, b) => (a.distanza ?? 0) - (b.distanza ?? 0));
  }, [livelli, zona]);

  const scelto = punti.find((p) => p.id === selezionato) ?? null;
  const srcIframe = useMemo(() => {
    const qs = new URLSearchParams({ intro: "no", incorporata: "1", livelli: livelliIniziali.join(",") || LIVELLI_MAPPA.join(",") });
    if (zona) {
      qs.set("centro", `${zona.lat},${zona.lon}`);
      qs.set("raggio", String(RAGGIO_ZONA));
    }
    return `${URL_FORK}?${qs.toString()}`;
    // L'iframe si carica una volta: i cambi successivi passano da postMessage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alterna = (id: AmbitoId) =>
    setLivelli((l) => (l.includes(id) ? (l.length > 1 ? l.filter((x) => x !== id) : l) : [...l, id]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Livelli della mappa" className="flex flex-wrap gap-1 rounded-[14px] bg-panel p-1 shadow-[0_2px_8px_rgba(37,29,28,.12)]">
          {LIVELLI_MAPPA.map((id) => {
            const attivo = livelli.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={attivo}
                onClick={() => alterna(id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-[15px] ${
                  attivo ? `${AMBITI[id].classi.tinta} font-bold ${AMBITI[id].classi.testo}` : "font-semibold text-ink-soft hover:bg-bg-sink"
                }`}
              >
                <CampioneForma id={id} pieno={attivo} />
                {AMBITI[id].nome}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Vista" className="flex gap-1 rounded-[14px] bg-panel p-1 shadow-[0_2px_8px_rgba(37,29,28,.12)]">
          {(["mappa", "elenco"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              onClick={() => setVista(v)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-[15px] ${
                vista === v ? "bg-ink font-bold text-white" : "font-semibold text-ink-soft hover:bg-bg-sink"
              }`}
            >
              <Icon name={v} size={16} strokeWidth={2} />
              {v === "mappa" ? "Mappa" : "Elenco"}
            </button>
          ))}
        </div>
      </div>

      {zona && (
        <p className="text-[15px] text-ink-soft">
          Entro {formattaDistanza(RAGGIO_ZONA)} da <b className="text-ink">{zona.nome}</b> ·{" "}
          <Link href="/mappa" className="font-bold">
            togli il filtro
          </Link>
        </p>
      )}

      {vista === "mappa" ? (
        fork === "presente" ? (
          <iframe
            ref={iframe}
            src={srcIframe}
            title="Mappa comune di Roma: sport, antenne e arte di strada"
            className="h-[70vh] min-h-[460px] w-full rounded-panel border border-line bg-[#ebe6dc]"
          />
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-[999_1_480px]">
              <MappaSchematica
                punti={punti}
                selezionato={selezionato}
                onSeleziona={setSelezionato}
                centro={zona}
                raggioMetri={zona ? RAGGIO_ZONA : undefined}
              />
            </div>
            <aside aria-live="polite" className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
              {scelto ? (
                <SchedaPunto punto={scelto} />
              ) : (
                <p className="rounded-panel border border-line bg-panel p-4 text-[15px] text-ink-soft">
                  Tocca un segnaposto per vedere la scheda. Forma, colore e icona distinguono i tre livelli.
                </p>
              )}
              {fork === "assente" && (
                <p className="text-[13px] leading-[18px] text-muted">
                  Mappa vera: build del fork di quartieri-roma-2026 in <code>public/quartieri</code> (vedi docs/MAPPA.md).
                </p>
              )}
            </aside>
          </div>
        )
      ) : (
        <ul className="overflow-hidden rounded-panel border border-line bg-panel">
          {punti.map((p) => (
            <li key={`${p.ambito}-${p.id}`} className="border-b border-line-soft last:border-0">
              <Link href={p.href} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                <TesseraAmbito id={p.ambito} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block text-base leading-[22px] font-bold">{p.nome}</span>
                  <span className="block text-sm leading-5 text-ink-soft">
                    {p.dettaglio}
                    {p.distanza !== null && ` · ${formattaDistanza(p.distanza)}`}
                  </span>
                </span>
                <Icon name="avanti" size={18} className="text-muted" />
              </Link>
            </li>
          ))}
          {punti.length === 0 && <li className="px-4 py-6 text-ink-soft">Nessun punto con questi filtri.</li>}
        </ul>
      )}

      <p className="text-[13px] leading-[18px] text-muted">
        Fonti: censimento impianti sportivi, impianti di telefonia, postazioni per l&apos;arte di strada (dati di esempio) · mappa
        basata su Quartieri di Roma 2026 · © OpenStreetMap contributors
      </p>
    </div>
  );
}

function SchedaPunto({ punto }: { punto: ReturnType<typeof puntiMappa>[number] & { distanza: number | null } }) {
  const a = AMBITI[punto.ambito];
  return (
    <article className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(37,29,28,.12)]">
      <div className="flex items-center gap-3">
        <TesseraAmbito id={punto.ambito} size={40} />
        <div className="min-w-0">
          <p className={`text-xs font-bold tracking-[0.06em] uppercase ${a.classi.testo}`}>{a.nome}</p>
          <h2 className="text-lg leading-6 font-bold">{punto.nome}</h2>
        </div>
      </div>
      <p className="text-[15px] leading-[22px] text-ink-soft">
        {punto.dettaglio}
        {punto.distanza !== null && ` · ${formattaDistanza(punto.distanza)}`}
      </p>
      <Link
        href={punto.href}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-amaranto px-4 text-[15px] font-bold text-white hover:bg-amaranto-scuro"
      >
        {punto.ambito === "arte" ? "Prenota (artisti)" : punto.ambito === "antenne" ? "Verifica qui" : "Apri la scheda"}
        <Icon name="freccia" size={18} strokeWidth={2} />
      </Link>
    </article>
  );
}
