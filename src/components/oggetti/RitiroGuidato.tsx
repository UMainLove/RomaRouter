"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Oggetto } from "@/data/esempi";
import { LUOGHI_RITROVAMENTO } from "@/data/esempi";
import { formattaData, prossimiGiorni } from "@/lib/formato";
import { Icon, type IconName } from "../Icon";
import { NotaPrivacy } from "../ui/Varie";
import { ICONE_CATEGORIA } from "./icone";
import { btnPrimario, btnSecondario } from "../ui/stili";

const PASSI = ["Oggetto", "Chi ritira", "Documenti", "Appuntamento"];
const ORARI = ["9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"];

type Chi = "persona" | "delega" | "consolato";

const SCELTE: { valore: Chi; titolo: string; testo: string; icona: IconName }[] = [
  { valore: "persona", titolo: "Io, di persona", testo: "Porta un documento d'identità valido.", icona: "utente" },
  { valore: "delega", titolo: "Una persona delegata", testo: "Serve la delega firmata e la copia del tuo documento: il modulo lo prepariamo noi.", icona: "persone" },
  { valore: "consolato", titolo: "Ambasciata o consolato", testo: "Se sei già ripartito da Roma.", icona: "bandiera" },
];

const DA_PORTARE: Record<Chi, string[]> = {
  persona: ["Documento d'identità valido", "Ricevuta dei diritti di custodia: [IMPORTO]"],
  delega: ["Delega firmata da te", "Copia del tuo documento", "Documento della persona delegata", "Ricevuta dei diritti di custodia: [IMPORTO]"],
  consolato: ["Richiesta dell'ambasciata o del consolato", "Copia del tuo documento", "Ricevuta dei diritti di custodia: [IMPORTO]"],
};

export function RitiroGuidato({ oggetto }: { oggetto: Oggetto }) {
  const [passo, setPasso] = useState(0);
  const [chi, setChi] = useState<Chi>("persona");
  const [dettaglio, setDettaglio] = useState("");
  const [giorni, setGiorni] = useState<ReturnType<typeof prossimiGiorni>>([]);
  const [giorno, setGiorno] = useState<string | null>(null);
  const [orario, setOrario] = useState<string | null>(null);
  const [inviata, setInviata] = useState(false);

  // I giorni dipendono dalla data di oggi: si calcolano solo nel browser.
  useEffect(() => {
    const t = setTimeout(() => setGiorni(prossimiGiorni(5, true).slice(1)), 0);
    return () => clearTimeout(t);
  }, []);

  const puoAndareAvanti =
    passo === 0 || passo === 1 || (passo === 2 && dettaglio.trim().length >= 3) || (passo === 3 && giorno && orario);

  if (inviata) {
    const g = giorni.find((x) => x.iso === giorno);
    return (
      <div className="flex flex-col gap-4 rounded-panel border border-line bg-panel p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-ok">
          <Icon name="spunta" size={22} strokeWidth={2.4} />
          Richiesta pronta
        </p>
        <p className="text-base">
          Appuntamento {g ? `${g.giorno} ${g.numero} ${g.mese}` : ""} alle {orario} per <b>{oggetto.descrizione}</b> ({oggetto.codice}).
        </p>
        <div>
          <p className="mb-1.5 text-sm font-bold">Cosa portare</p>
          <ul className="flex flex-col gap-1.5">
            {DA_PORTARE[chi].map((v) => (
              <li key={v} className="flex items-center gap-2 text-[15px]">
                <Icon name="spunta" size={16} strokeWidth={2.4} className="text-ok" />
                {v}
              </li>
            ))}
          </ul>
        </div>
        <NotaPrivacy>Prototipo: nessun dato è stato inviato né salvato.</NotaPrivacy>
        <Link href="/oggetti" className={`${btnSecondario} self-start`}>
          Torna al catalogo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Passi della richiesta" className="grid grid-cols-4 gap-1.5">
        {PASSI.map((p, i) => (
          <li
            key={p}
            aria-current={i === passo ? "step" : undefined}
            className={`flex flex-col gap-1.5 text-xs leading-4 font-bold ${i < passo ? "text-ok" : i === passo ? "text-amaranto" : "text-muted"}`}
          >
            <span className={`h-[5px] rounded-sm ${i < passo ? "bg-ok" : i === passo ? "bg-amaranto" : "bg-line"}`} />
            {p}
            {i < passo && " ✓"}
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3 rounded-card border border-line bg-panel px-3.5 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-oggetti-tint text-oggetti-ink">
          <Icon name={ICONE_CATEGORIA[oggetto.categoria]} size={22} strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold">{oggetto.descrizione}</span>
          <span className="block text-[13px] text-muted">
            {oggetto.codice} · trovato il {formattaData(oggetto.data, false)} · {LUOGHI_RITROVAMENTO[oggetto.luogo].toLowerCase()}
          </span>
        </span>
      </div>

      {passo === 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[21px] leading-7 font-bold">È questo il tuo oggetto?</h2>
          <p className="text-base text-ink-soft">Controlla descrizione, data e luogo. Al passo 3 ti chiederemo un dettaglio che solo tu conosci.</p>
        </section>
      )}

      {passo === 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2.5 text-[21px] leading-7 font-bold">Chi verrà a ritirarlo?</legend>
          {SCELTE.map((s) => (
            <label
              key={s.valore}
              className={`flex items-start gap-3 rounded-[14px] px-3.5 py-3 ${chi === s.valore ? "border-2 border-amaranto bg-velo" : "border-[1.5px] border-line bg-panel"}`}
            >
              <input type="radio" name="chi" value={s.valore} checked={chi === s.valore} onChange={() => setChi(s.valore)} className="mt-0.5 size-5 shrink-0 accent-amaranto" />
              <span className="flex-1">
                <span className="block text-base leading-[21px] font-bold">{s.titolo}</span>
                <span className="block text-sm leading-5 text-ink-soft">{s.testo}</span>
              </span>
              <Icon name={s.icona} size={22} className="shrink-0 text-ink-soft" />
            </label>
          ))}
        </fieldset>
      )}

      {passo === 2 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] leading-7 font-bold">Documenti e verifica</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rt-dettaglio" className="text-[15px] font-bold">
              Un dettaglio che solo tu conosci
            </label>
            <textarea
              id="rt-dettaglio"
              rows={3}
              value={dettaglio}
              onChange={(e) => setDettaglio(e.target.value)}
              placeholder="Es. cosa c'era dentro, un portachiavi, un adesivo"
              className="resize-none rounded-card border-[1.5px] border-campo bg-panel px-3.5 py-2.5 text-base"
            />
            <p className="flex gap-1.5 text-[13px] text-muted">
              <Icon name="lucchetto" size={16} className="mt-px shrink-0" />
              Non viene pubblicato: serve all&apos;ufficio per verificare.
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold">Cosa portare</p>
            <ul className="flex flex-col gap-1.5">
              {DA_PORTARE[chi].map((v) => (
                <li key={v} className="flex items-center gap-2 text-[15px]">
                  <Icon name="documento" size={16} className="text-muted" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {passo === 3 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] leading-7 font-bold">Quando vieni?</h2>
          <div role="radiogroup" aria-label="Giorno" className="grid grid-cols-4 gap-2">
            {giorni.map((g) => (
              <button
                key={g.iso}
                type="button"
                role="radio"
                aria-checked={giorno === g.iso}
                onClick={() => setGiorno(g.iso)}
                className={`flex min-h-[60px] flex-col items-center justify-center rounded-card ${
                  giorno === g.iso ? "border-2 border-amaranto bg-velo text-amaranto" : "border-[1.5px] border-line bg-panel"
                }`}
              >
                <span className="text-xs font-bold uppercase">{g.giorno}</span>
                <span className="text-lg font-bold">{g.numero}</span>
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Orario" className="grid grid-cols-4 gap-2">
            {ORARI.map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={orario === o}
                onClick={() => setOrario(o)}
                className={`min-h-12 rounded-card text-base font-bold ${
                  orario === o ? "border-2 border-amaranto bg-velo text-amaranto" : "border-[1.5px] border-line bg-panel"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-muted">Orari di esempio: vanno presi dall&apos;agenda dell&apos;ufficio.</p>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 rounded-card bg-bg-sink px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-ink-soft">
          <Icon name="euro" size={18} />
          Diritti di custodia
        </span>
        <b>[IMPORTO]</b>
      </div>

      <div className="flex gap-2.5">
        {passo > 0 && (
          <button type="button" onClick={() => setPasso((p) => p - 1)} className={btnSecondario}>
            Indietro
          </button>
        )}
        <button
          type="button"
          disabled={!puoAndareAvanti}
          onClick={() => (passo === 3 ? setInviata(true) : setPasso((p) => p + 1))}
          className={`${btnPrimario} flex-1`}
        >
          {passo === 0 ? "Sì, è mio" : passo === 3 ? "Conferma la richiesta" : "Continua"}
          <Icon name="freccia" size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
