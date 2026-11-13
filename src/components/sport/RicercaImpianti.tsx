"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { DISCIPLINE, IMPIANTI, TIPI_IMPIANTO, ZONE, type TipoImpianto } from "@/data/esempi";
import { distanzaMetri, formattaDistanza } from "@/lib/geo";
import { Icon } from "../Icon";
import { Etichetta, Fonte, TesseraAmbito } from "../ui/Varie";
import { btnSecondario } from "../ui/stili";

const RAGGIO = 1500;
const selectCls = "h-12 w-full rounded-card border-[1.5px] border-campo bg-panel px-3 text-base text-ink";

export function RicercaImpianti() {
  const parametri = useSearchParams();
  const router = useRouter();
  const disciplina = parametri.get("disciplina") ?? "";
  const zonaChiave = parametri.get("zona") ?? "";
  const tipo = (parametri.get("tipo") ?? "") as TipoImpianto | "";
  const gratuitiPrima = parametri.get("gratuito") === "1";
  const soloAccessibili = parametri.get("accessibile") === "1";
  const zona = ZONE[zonaChiave] ?? null;

  const imposta = (chiave: string, valore: string) => {
    const qs = new URLSearchParams(parametri.toString());
    if (valore) qs.set(chiave, valore);
    else qs.delete(chiave);
    router.replace(qs.toString() ? `/sport?${qs}` : "/sport", { scroll: false });
  };

  const risultati = useMemo(() => {
    return IMPIANTI.filter((i) => !disciplina || i.discipline.some((d) => d.toLowerCase().startsWith(disciplina.toLowerCase())))
      .filter((i) => !tipo || i.tipo === tipo)
      .filter((i) => !soloAccessibili || i.accessibile === true)
      .map((i) => ({ ...i, distanza: zona ? distanzaMetri(zona, i) : null }))
      .filter((i) => i.distanza === null || i.distanza <= RAGGIO)
      .sort((a, b) => (gratuitiPrima ? Number(b.gratuito) - Number(a.gratuito) : 0) || (a.distanza ?? 0) - (b.distanza ?? 0));
  }, [disciplina, tipo, soloAccessibili, zona, gratuitiPrima]);

  const qsMappa = new URLSearchParams({ livelli: "sport", ...(zonaChiave ? { zona: zonaChiave } : {}) });

  return (
    <div className="flex flex-col gap-5">
      <form className="grid gap-3 rounded-panel border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Disciplina
          <select className={selectCls} value={disciplina} onChange={(e) => imposta("disciplina", e.target.value)}>
            <option value="">Tutte</option>
            {DISCIPLINE.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Vicino a
          <select className={selectCls} value={zonaChiave} onChange={(e) => imposta("zona", e.target.value)}>
            <option value="">Tutta la zona</option>
            {Object.entries(ZONE).map(([k, z]) => (
              <option key={k} value={k}>
                {z.nome} (Municipio {z.municipio})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Tipo
          <select className={selectCls} value={tipo} onChange={(e) => imposta("tipo", e.target.value)}>
            <option value="">Tutti</option>
            {(Object.keys(TIPI_IMPIANTO) as TipoImpianto[]).map((t) => (
              <option key={t} value={t}>
                {TIPI_IMPIANTO[t]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-col justify-end gap-1">
          <legend className="sr-only">Altre preferenze</legend>
          <label className="flex min-h-11 items-center gap-2.5 text-[15px] font-semibold">
            <input type="checkbox" className="size-5 accent-amaranto" checked={gratuitiPrima} onChange={(e) => imposta("gratuito", e.target.checked ? "1" : "")} />
            Gratuiti in cima
          </label>
          <label className="flex min-h-11 items-center gap-2.5 text-[15px] font-semibold">
            <input type="checkbox" className="size-5 accent-amaranto" checked={soloAccessibili} onChange={(e) => imposta("accessibile", e.target.checked ? "1" : "")} />
            Solo accessibili
          </label>
        </fieldset>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-bold" aria-live="polite">
          {risultati.length === 1 ? "1 impianto" : `${risultati.length} impianti`}
          {zona && <span className="font-normal text-ink-soft"> entro {formattaDistanza(RAGGIO)} da {zona.nome}</span>}
        </p>
        <Link href={`/mappa?${qsMappa}`} className={btnSecondario}>
          <Icon name="mappa" size={18} />
          Vedi sulla mappa
        </Link>
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {risultati.map((i) => (
          <li key={i.id}>
            <Link href={`/sport/${i.id}`} className="flex h-full gap-3.5 rounded-panel border border-line bg-panel p-4 hover:border-campo">
              <TesseraAmbito id="sport" size={44} />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[17px] leading-6 font-bold">{i.nome}</span>
                <span className="text-sm leading-5 text-ink-soft">
                  {TIPI_IMPIANTO[i.tipo]} · Municipio {i.municipio}
                  {i.distanza !== null && ` · ${formattaDistanza(i.distanza)}`}
                </span>
                <span className="flex flex-wrap gap-1.5 pt-0.5">
                  {i.gratuito ? <Etichetta tono="ok" icona="spunta">Ingresso libero</Etichetta> : <Etichetta>A pagamento</Etichetta>}
                  {i.accessibile === true && <Etichetta icona="accessibile">Accessibile</Etichetta>}
                  {i.discipline.map((d) => (
                    <Etichetta key={d}>{d}</Etichetta>
                  ))}
                </span>
              </span>
              <Icon name="avanti" size={18} className="mt-1 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ol>
      {risultati.length === 0 && (
        <p className="rounded-panel border border-line bg-panel p-5 text-ink-soft">Nessun impianto con questi filtri. Prova ad allargare la zona.</p>
      )}
      <Fonte>censimento degli impianti di Roma Capitale, anagrafe dell&apos;edilizia scolastica, OpenStreetMap (dati di esempio)</Fonte>
    </div>
  );
}
