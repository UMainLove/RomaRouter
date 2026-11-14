"use client";

import { useEffect, useState } from "react";
import {
  CATEGORIE_OGGETTI,
  FASCE_ORARIE,
  LUOGHI_TIPO,
  MACRO_AREE,
  type CategoriaOggetto,
  type FasciaOraria,
  type LuogoTipo,
  type MacroArea,
} from "@/lib/oggetti/costanti";
import { Icon } from "../Icon";
import { ICONE_CATEGORIA } from "../oggetti/icone";
import { btnPrimario, btnSecondario } from "../ui/stili";
import { Avviso, Etichetta, NotaPrivacy } from "../ui/Varie";

const PROPOSTA = {
  categoria: "borse" as CategoriaOggetto,
  colore: "nero",
  marca: "",
  descrizione: "Zaino nero con tasca frontale e cerniera rossa",
  verifica: "All'interno: un quaderno a quadretti e un mazzo di due chiavi",
};

const campoCls = "h-12 w-full rounded-[10px] border-[1.5px] border-campo bg-panel px-3 text-base";

export function RegistraOggetto({
  puoPubblicareINF = false,
  onRegistrato,
}: {
  puoPubblicareINF?: boolean;
  onRegistrato?: () => void;
}) {
  const [foto, setFoto] = useState<string | null>(null);
  const [analizzata, setAnalizzata] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaOggetto>("borse");
  const [colore, setColore] = useState("");
  const [marca, setMarca] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [verifica, setVerifica] = useState("");
  const [luogo, setLuogo] = useState<LuogoTipo>("mezzi");
  const [macroArea, setMacroArea] = useState<MacroArea>("ostiense");
  const [fascia, setFascia] = useState<FasciaOraria>("mattina");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [pubblico, setPubblico] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  useEffect(
    () => () => {
      if (foto) URL.revokeObjectURL(foto);
    },
    [foto],
  );

  const analizza = () => {
    setCategoria(PROPOSTA.categoria);
    setColore(PROPOSTA.colore);
    setMarca(PROPOSTA.marca);
    setDescrizione(PROPOSTA.descrizione);
    setVerifica(PROPOSTA.verifica);
    setAnalizzata(true);
  };

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    setEsito(null);
    setSalvataggio(true);
    try {
      const r = await fetch("/api/oggetti/custodia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azione: "registra_oggetto",
          categoria,
          colore,
          marca,
          descrizione,
          verifica,
          luogo,
          macro_area: macroArea,
          fascia,
          data,
          pubblico: puoPubblicareINF && pubblico,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErrore(d.errore ?? "Impossibile registrare l'oggetto.");
        return;
      }
      setEsito(
        `Registrato ${d.chiave} su PostgreSQL (${d.pubblico ? "elenco pubblico INF39645" : "custodia protetta · non in vetrina"}). Match generati: ${d.matching?.creati ?? 0}.`,
      );
      onRegistrato?.();
    } finally {
      setSalvataggio(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="t-foto" className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-panel border border-line bg-panel p-4">
          <h2 id="t-foto" className="text-lg font-bold">
            Foto e controllo privacy
          </h2>
          <label className="relative flex h-[240px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-[1.5px] border-dashed border-campo bg-bg-sink text-ink-soft">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="Foto caricata dell'oggetto" className="absolute inset-0 size-full object-contain" />
            ) : (
              <>
                <Icon name="fotocamera" size={32} />
                <span className="text-[15px] font-bold">Carica o scatta una foto</span>
                <span className="text-[13px]">Resta solo in questo browser</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFoto(URL.createObjectURL(file));
                setAnalizzata(false);
                setEsito(null);
              }}
            />
          </label>
          <button type="button" onClick={analizza} disabled={!foto} className={btnPrimario}>
            Simula analisi foto
          </button>
          <ul aria-label="Controlli privacy" className="flex flex-col gap-1.5 text-sm">
            {["Volti", "Numeri di documento e carte", "Nomi, indirizzi e targhe"].map((v) => (
              <li key={v} className="flex items-center gap-2">
                <Icon name={analizzata ? "spunta" : "orologio"} size={16} strokeWidth={2.2} className={analizzata ? "text-ok" : "text-muted"} />
                {v}: {analizzata ? "nessuno rilevato" : "da controllare"}
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-[18px] text-muted">
            Il dettaglio di verifica viene cifrato con AES-256-GCM in schema separato (riservato.dettagli_oggetto).
          </p>
        </section>

        <form
          aria-labelledby="t-scheda"
          onSubmit={salva}
          className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5 rounded-panel border border-line bg-panel p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="t-scheda" className="text-lg font-bold">
              Scheda di custodia
            </h2>
            {analizzata ? <Etichetta tono="attenzione">Da controllare</Etichetta> : <Etichetta>Inserimento operatore</Etichetta>}
          </div>

          {errore && <Avviso icona="attenzione">{errore}</Avviso>}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Categoria
              <select className={campoCls} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaOggetto)}>
                {Object.entries(CATEGORIE_OGGETTI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Colore
              <input className={campoCls} value={colore} placeholder="es. beige, color sabbia, lilla, verde smeraldo" onChange={(e) => setColore(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Marca
              <input className={campoCls} value={marca} placeholder={analizzata ? "Non leggibile" : ""} onChange={(e) => setMarca(e.target.value)} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Descrizione scheda (visibile solo ai custodi, oppure in Livello 1 se INF39645)
            <textarea
              rows={2}
              required
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className="resize-none rounded-[10px] border-[1.5px] border-campo bg-panel px-3 py-2.5 text-base font-normal"
            />
          </label>

          <label className="flex flex-col gap-1.5 rounded-card bg-bg-sink p-3 text-sm font-bold">
            <span className="flex items-center gap-2">
              <Icon name="lucchetto" size={16} />
              Dettaglio riservato di verifica · cifrato e mai pubblico
            </span>
            <textarea
              rows={2}
              value={verifica}
              onChange={(e) => setVerifica(e.target.value)}
              className="resize-none rounded-[10px] border-[1.5px] border-campo bg-panel px-3 py-2.5 text-base font-normal"
            />
            <span className="text-[13px] font-normal text-ink-soft">
              Usato dal custode per valutare le risposte alle domande aperte del proprietario.
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Macro-area
              <select className={campoCls} value={macroArea} onChange={(e) => setMacroArea(e.target.value as MacroArea)}>
                {Object.entries(MACRO_AREE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Fascia oraria
              <select className={campoCls} value={fascia} onChange={(e) => setFascia(e.target.value as FasciaOraria)}>
                {Object.entries(FASCE_ORARIE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Dove è stato trovato
              <select className={campoCls} value={luogo} onChange={(e) => setLuogo(e.target.value as LuogoTipo)}>
                {Object.entries(LUOGHI_TIPO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Data
              <input type="date" required className={campoCls} value={data} onChange={(e) => setData(e.target.value)} />
            </label>
          </div>

          {puoPubblicareINF && (
            <label className="flex items-center gap-2 rounded-card bg-bg-sink p-2.5 text-sm">
              <input
                type="checkbox"
                checked={pubblico}
                onChange={(e) => setPubblico(e.target.checked)}
                className="size-4 accent-amaranto"
              />
              <span>Pubblica anche nel Livello 1 (solo elenco pubblico INF39645 dell&apos;Ufficio Oggetti Rinvenuti)</span>
            </label>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button type="submit" disabled={salvataggio} className={btnPrimario}>
              {salvataggio ? "Salvataggio…" : "Salva in custodia protetta"}
            </button>
            <button
              type="button"
              className={btnSecondario}
              onClick={() => {
                setCategoria(PROPOSTA.categoria);
                setColore(PROPOSTA.colore);
                setDescrizione(PROPOSTA.descrizione);
                setVerifica(PROPOSTA.verifica);
              }}
            >
              Compila esempio
            </button>
          </div>

          {esito && (
            <p role="status" className="flex items-center gap-2 text-[15px] font-bold text-ok">
              <Icon name="spunta" size={18} strokeWidth={2.4} />
              {esito}
            </p>
          )}
        </form>
      </div>

      <section aria-labelledby="t-anteprima" className="flex max-w-xl flex-col gap-2">
        <h2 id="t-anteprima" className="text-base font-bold">
          Anteprima scheda interna
        </h2>
        <div className="flex items-start gap-3 rounded-panel border border-line bg-panel p-4">
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-card bg-oggetti-tint text-oggetti-ink">
            <Icon name={ICONE_CATEGORIA[categoria] ?? "info"} size={26} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold">{descrizione || "Descrizione scheda"}</span>
            <span className="block text-[13px] text-muted">
              {MACRO_AREE[macroArea].nome} · {LUOGHI_TIPO[luogo].toLowerCase()}
            </span>
            <span className="mt-1 block text-[13px] text-ink-soft">
              {pubblico ? "Pubblico solo come scheda INF39645 (verifica allo sportello)" : "Riservato: usato solo per il matching nascosto."}
            </span>
          </span>
        </div>
      </section>

      <NotaPrivacy>I file immagine restano nel browser; sul database finiscono i campi di matching e i dettagli cifrati.</NotaPrivacy>
    </div>
  );
}
