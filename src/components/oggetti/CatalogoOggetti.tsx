"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  CATEGORIE_OGGETTI,
  LUOGHI_RITROVAMENTO,
  OGGETTI,
  type CategoriaOggetto,
  type LuogoRitrovamento,
} from "@/data/esempi";
import { normalizza } from "@/lib/geo";
import { formattaData } from "@/lib/formato";
import { Icon } from "../Icon";
import { ICONE_CATEGORIA } from "./icone";
import { Etichetta } from "../ui/Varie";


const COLORI = Array.from(new Set(OGGETTI.map((o) => o.colore).filter((c): c is string => Boolean(c)))).sort();
const selectCls = "h-12 w-full rounded-card border-[1.5px] border-campo bg-panel px-3 text-base text-ink";

export function CatalogoOggetti() {
  const parametri = useSearchParams();
  const router = useRouter();
  const q = parametri.get("q") ?? "";
  const categoria = (parametri.get("categoria") ?? "") as CategoriaOggetto | "";
  const dal = parametri.get("dal") ?? "";
  const luogo = (parametri.get("luogo") ?? "") as LuogoRitrovamento | "";
  const colore = parametri.get("colore") ?? "";

  const imposta = (chiave: string, valore: string) => {
    const qs = new URLSearchParams(parametri.toString());
    if (valore) qs.set(chiave, valore);
    else qs.delete(chiave);
    router.replace(qs.toString() ? `/oggetti?${qs}` : "/oggetti", { scroll: false });
  };

  const risultati = useMemo(() => {
    const parole = normalizza(q).split(" ").filter(Boolean);
    return OGGETTI.filter((o) => !categoria || o.categoria === categoria)
      .filter((o) => !dal || o.data >= dal)
      .filter((o) => !luogo || o.luogo === luogo)
      .filter((o) => !colore || o.colore === colore)
      .filter((o) => parole.every((p) => normalizza(`${o.descrizione} ${CATEGORIE_OGGETTI[o.categoria]}`).includes(p)))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [q, categoria, dal, luogo, colore]);

  const filtriAttivi = [
    categoria && { chiave: "categoria", etichetta: CATEGORIE_OGGETTI[categoria] },
    dal && { chiave: "dal", etichetta: `Dal ${formattaData(dal, false)}` },
    luogo && { chiave: "luogo", etichetta: LUOGHI_RITROVAMENTO[luogo] },
    colore && { chiave: "colore", etichetta: colore.charAt(0).toUpperCase() + colore.slice(1) },
  ].filter((f): f is { chiave: string; etichetta: string } => Boolean(f));

  return (
    <div className="flex flex-col gap-4">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-4">
        <label htmlFor="og-q" className="text-sm font-bold">
          Cerca un oggetto
        </label>
        <div className="relative">
          <Icon name="cerca" size={20} className="pointer-events-none absolute top-3.5 left-3 text-muted" />
          <input
            id="og-q"
            type="search"
            defaultValue={q}
            placeholder="Es. zaino, chiavi, ombrello"
            onChange={(e) => imposta("q", e.target.value.trim())}
            className="h-12 w-full rounded-card border-[1.5px] border-campo bg-panel pr-3 pl-10 text-base"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Tipo
            <select className={selectCls} value={categoria} onChange={(e) => imposta("categoria", e.target.value)}>
              <option value="">Tutti</option>
              {(Object.keys(CATEGORIE_OGGETTI) as CategoriaOggetto[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIE_OGGETTI[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Trovati dal
            <input type="date" className={selectCls} value={dal} onChange={(e) => imposta("dal", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Dove
            <select className={selectCls} value={luogo} onChange={(e) => imposta("luogo", e.target.value)}>
              <option value="">Ovunque</option>
              {(Object.keys(LUOGHI_RITROVAMENTO) as LuogoRitrovamento[]).map((l) => (
                <option key={l} value={l}>
                  {LUOGHI_RITROVAMENTO[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Colore
            <select className={selectCls} value={colore} onChange={(e) => imposta("colore", e.target.value)}>
              <option value="">Qualsiasi</option>
              {COLORI.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filtriAttivi.length > 0 && (
          <ul aria-label="Filtri attivi" className="flex flex-wrap gap-1.5">
            {filtriAttivi.map((f) => (
              <li key={f.chiave}>
                <button
                  type="button"
                  onClick={() => imposta(f.chiave, "")}
                  aria-label={`Togli il filtro: ${f.etichetta}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-oggetti-tint pr-2.5 pl-3.5 text-[15px] font-semibold"
                >
                  {f.etichetta}
                  <Icon name="chiudi" size={16} strokeWidth={2.2} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <p className="text-base font-bold" aria-live="polite">
        {risultati.length === 1 ? "1 oggetto" : `${risultati.length} oggetti`}
      </p>

      <ol className="grid gap-3 md:grid-cols-2">
        {risultati.map((o) => (
          <li key={o.codice} className="flex flex-col gap-2 rounded-panel border border-line bg-panel p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-[52px] shrink-0 items-center justify-center rounded-card bg-oggetti-tint text-oggetti-ink">
                <Icon name={ICONE_CATEGORIA[o.categoria]} size={26} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base leading-[22px] font-bold">{o.descrizione}</h3>
                <p className="text-[13px] leading-[19px] text-muted">
                  {o.codice} · trovato il {formattaData(o.data, false)} · {LUOGHI_RITROVAMENTO[o.luogo].toLowerCase()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {o.stato === "custodia" ? (
                <Etichetta tono="ok" icona="spunta">
                  In custodia
                </Etichetta>
              ) : (
                <Etichetta tono="attenzione" icona="orologio">
                  Ritiro in corso
                </Etichetta>
              )}
              {o.stato === "custodia" && (
                <Link href={`/oggetti/${o.codice}/ritiro`} className="inline-flex min-h-11 items-center gap-1 text-[15px] font-bold">
                  È mio: richiedi il ritiro
                  <Icon name="avanti" size={16} strokeWidth={2} />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      {risultati.length === 0 && (
        <p className="rounded-panel border border-line bg-panel p-5 text-ink-soft">
          Nessun oggetto con questi filtri. Gli oggetti arrivano all&apos;ufficio anche dopo qualche giorno: riprova più avanti.
        </p>
      )}
    </div>
  );
}
