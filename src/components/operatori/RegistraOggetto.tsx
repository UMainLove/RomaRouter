"use client";

import { useEffect, useState } from "react";
import { CATEGORIE_OGGETTI, LUOGHI_RITROVAMENTO, OGGETTI, type CategoriaOggetto, type LuogoRitrovamento } from "@/data/esempi";
import { Icon } from "../Icon";
import { ICONE_CATEGORIA } from "../oggetti/icone";
import { Etichetta, NotaPrivacy } from "../ui/Varie";
import { btnPrimario, btnSecondario } from "../ui/stili";

// Registrazione da foto per il Reparto Oggetti Rinvenuti.
// La "proposta dell'agente" qui è di esempio: va collegata a un modello di visione lato server,
// che deve anche oscurare volti, numeri di documento, nomi e targhe prima di salvare.

const PROPOSTA = {
  categoria: "borse" as CategoriaOggetto,
  colore: "nero",
  marca: "",
  descrizione: "Zaino nero con tasca frontale e cerniera rossa",
  verifica: "All'interno: un quaderno a quadretti e un mazzo di due chiavi",
};

function prossimoCodice() {
  const massimo = Math.max(...OGGETTI.map((o) => Number(o.codice.split("-")[2])));
  return `OR-26-${String(massimo + 1).padStart(5, "0")}`;
}

const campoCls = "h-12 w-full rounded-[10px] border-[1.5px] border-campo bg-panel px-3 text-base";

export function RegistraOggetto() {
  const [foto, setFoto] = useState<string | null>(null);
  const [analizzata, setAnalizzata] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaOggetto>("borse");
  const [colore, setColore] = useState("");
  const [marca, setMarca] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [verifica, setVerifica] = useState("");
  const [luogo, setLuogo] = useState<LuogoRitrovamento>("mezzi");
  const [data, setData] = useState("");
  const [esito, setEsito] = useState<string | null>(null);
  const codice = prossimoCodice();

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto);
  }, [foto]);

  const analizza = () => {
    setCategoria(PROPOSTA.categoria);
    setColore(PROPOSTA.colore);
    setMarca(PROPOSTA.marca);
    setDescrizione(PROPOSTA.descrizione);
    setVerifica(PROPOSTA.verifica);
    setAnalizzata(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="t-foto" className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-panel border border-line bg-panel p-4">
          <h2 id="t-foto" className="text-lg font-bold">
            Foto
          </h2>
          <label className="relative flex h-[280px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-[1.5px] border-dashed border-campo bg-bg-sink text-ink-soft">
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
            Analizza la foto
          </button>
          <ul aria-label="Controlli privacy" className="flex flex-col gap-1.5 text-sm">
            {["Volti", "Numeri di documento e carte", "Nomi, indirizzi e targhe"].map((v) => (
              <li key={v} className="flex items-center gap-2">
                <Icon name={analizzata ? "spunta" : "orologio"} size={16} strokeWidth={2.2} className={analizzata ? "text-ok" : "text-muted"} />
                {v}: {analizzata ? "nessuno rilevato" : "da controllare"}
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-[18px] text-muted">Se ne trova, li oscura prima di salvare. Nel catalogo pubblico finisce solo la descrizione.</p>
        </section>

        <form
          aria-labelledby="t-scheda"
          onSubmit={(e) => {
            e.preventDefault();
            setEsito(`${codice} pronto per il catalogo (demo: non è stato salvato).`);
          }}
          className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5 rounded-panel border border-line bg-panel p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="t-scheda" className="text-lg font-bold">
              Proposta dell&apos;agente
            </h2>
            {analizzata ? <Etichetta tono="attenzione">Da controllare</Etichetta> : <Etichetta>In attesa della foto</Etichetta>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Categoria
              <select className={campoCls} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaOggetto)}>
                {(Object.keys(CATEGORIE_OGGETTI) as CategoriaOggetto[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIE_OGGETTI[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Colore
              <input className={campoCls} value={colore} onChange={(e) => setColore(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Marca
              <input className={campoCls} value={marca} placeholder={analizzata ? "Non leggibile" : ""} onChange={(e) => setMarca(e.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Descrizione pubblica
            <textarea rows={2} required value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className="resize-none rounded-[10px] border-[1.5px] border-campo bg-panel px-3 py-2.5 text-base font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 rounded-card bg-bg-sink p-3 text-sm font-bold">
            <span className="flex items-center gap-2">
              <Icon name="lucchetto" size={16} />
              Dettaglio di verifica · non pubblicato
            </span>
            <textarea rows={2} value={verifica} onChange={(e) => setVerifica(e.target.value)} className="resize-none rounded-[10px] border-[1.5px] border-campo bg-panel px-3 py-2.5 text-base font-normal" />
            <span className="text-[13px] font-normal text-ink-soft">Serve a capire se chi lo reclama è davvero il proprietario.</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Dove è stato trovato
              <select className={campoCls} value={luogo} onChange={(e) => setLuogo(e.target.value as LuogoRitrovamento)}>
                {(Object.keys(LUOGHI_RITROVAMENTO) as LuogoRitrovamento[]).map((l) => (
                  <option key={l} value={l}>
                    {LUOGHI_RITROVAMENTO[l]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              Data
              <input type="date" required className={campoCls} value={data} onChange={(e) => setData(e.target.value)} />
            </label>
            <div className="flex flex-col gap-1.5 text-sm font-bold">
              Codice
              <span className="flex h-12 items-center rounded-[10px] bg-bg-sink px-3 font-mono text-[15px]">{codice}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button type="submit" className={btnPrimario}>
              Pubblica nel catalogo
            </button>
            <button type="button" className={btnSecondario} onClick={() => setEsito("Bozza tenuta solo in questa pagina (demo).")}>
              Salva bozza
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
          Anteprima nel catalogo pubblico
        </h2>
        <div className="flex items-start gap-3 rounded-panel border border-line bg-panel p-4">
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-card bg-oggetti-tint text-oggetti-ink">
            <Icon name={ICONE_CATEGORIA[categoria]} size={26} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold">{descrizione || "Descrizione pubblica"}</span>
            <span className="block text-[13px] text-muted">
              {codice} · {LUOGHI_RITROVAMENTO[luogo].toLowerCase()}
            </span>
            <span className="mt-1 block text-[13px] text-ink-soft">Il dettaglio di verifica non compare.</span>
          </span>
        </div>
      </section>

      <NotaPrivacy>La foto resta in questo browser: il prototipo non la invia a nessun server.</NotaPrivacy>
    </div>
  );
}
