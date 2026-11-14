import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OggettiMappa } from "@/components/oggetti/OggettiMappa";
import { PUNTI, TELEFONO, TIPI_PUNTO } from "@/components/oggetti/linguaggio";

export const metadata: Metadata = {
  title: "Oggetti smarriti",
  description:
    "Hai perso o trovato qualcosa a Roma? Segnalalo in tre passi e trova il punto più vicino dove consegnare o ritirare: Polizia e Carabinieri, pronto soccorso H24, Misericordie, Ufficio Oggetti Rinvenuti.",
};

/*
 * Oggetti smarriti a tutta mappa: i due pulsanti (Ho trovato, Ho perso) e la mappa dei punti di consegna
 * occupano lo schermo. Come funziona, telefono perso, punti e fonti stanno nella Guida.
 */
function Blocco({ id, titolo, testo, children }: { id: string; titolo: string; testo?: ReactNode; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5 border-t border-line pt-4 first:border-0 first:pt-0">
      <h2 id={id} className="text-lg font-bold text-ink">
        {titolo}
      </h2>
      {testo && <p className="text-[15px] leading-relaxed text-ink-soft">{testo}</p>}
      {children}
    </section>
  );
}

function Passi({ voci }: { voci: [string, string][] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {voci.map(([t, d], i) => (
        <li key={t} className="flex gap-3 text-[15px] leading-snug text-ink">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-extrabold text-white">{i + 1}</span>
          <span>
            <b>{t}.</b> {d}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function PaginaOggetti() {
  return (
    <OggettiMappa
      guida={[
        {
          id: "come",
          nome: "Come funziona",
          contenuto: (
            <>
              <Blocco id="trovato" titolo="Ho trovato qualcosa">
                <Passi
                  voci={[
                    ["Dici cosa, dove e quando", "tre tocchi, più un dettaglio che solo il proprietario può sapere (resta cifrato)."],
                    ["Ricevi un codice di consegna", "e il punto più vicino dove portare l'oggetto: Polizia, Carabinieri, pronto soccorso o un punto H24."],
                    ["Lo consegni", "mostrando il codice. Documenti, carte di pagamento e chiavi d'auto vanno sempre alle Forze dell'Ordine."],
                  ]}
                />
              </Blocco>
              <Blocco id="perso" titolo="Ho perso qualcosa">
                <Passi
                  voci={[
                    ["Lo segnali", "cosa, dove, quando e come avvisarti. Per i documenti servono il numero e la denuncia."],
                    ["Lo confrontiamo", "con gli oggetti consegnati: se ce n'è uno simile, il custode ti fa una domanda che solo tu sai."],
                    ["Lo ritiri", "all'appuntamento, con il codice di ritiro e un documento."],
                  ]}
                />
              </Blocco>
              <Blocco
                id="privacy"
                titolo="Chi perde e chi trova non si vedono"
                testo="Recapiti, dettagli e messaggi restano cifrati. Il custode vede il tuo recapito solo dopo che hai superato la verifica, e chi trova l'oggetto non lo vede mai. Chi trova una cosa smarrita deve restituirla al proprietario o consegnarla (art. 927 del Codice civile)."
              />
            </>
          ),
        },
        {
          id: "telefono",
          nome: "Telefono perso",
          contenuto: (
            <Blocco id="telefono-t" titolo="Hai perso il telefono? Prima di tutto" testo="Bloccalo o fallo suonare da un altro dispositivo, poi segnalalo qui con «Ho perso».">
              <ul className="flex flex-col gap-2.5">
                {TELEFONO.map((t) => (
                  <li key={t.nome} className="text-[15px] leading-snug text-ink">
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-line underline-offset-2 hover:decoration-ink">
                      {t.nome}
                    </a>
                    <span className="block text-[14px] text-ink-soft">{t.nota}</span>
                  </li>
                ))}
              </ul>
            </Blocco>
          ),
        },
        {
          id: "punti",
          nome: "Dove consegnare",
          contenuto: (
            <Blocco id="punti-t" titolo="I punti sulla mappa" testo="Il bollino «24h» indica i punti sempre aperti. Chi trova un oggetto su bus, tram, metro o taxi può lasciarlo anche al conducente: finisce all'Ufficio Oggetti Rinvenuti.">
              <ul className="flex flex-col gap-2.5">
                {TIPI_PUNTO.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[15px] leading-snug text-ink">
                    <span className="mt-1 size-3.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: PUNTI[t].c }} aria-hidden="true" />
                    <span>
                      <b>{PUNTI[t].n}.</b> {PUNTI[t].spiega}
                    </span>
                  </li>
                ))}
              </ul>
            </Blocco>
          ),
        },
        {
          id: "fonti",
          nome: "Fonti e limiti",
          contenuto: (
            <Blocco id="fonti-t" titolo="Da dove vengono i dati">
              <ul className="flex flex-col gap-2 text-[15px] leading-snug text-ink">
                <li>Ufficio Oggetti Rinvenuti, orari e servizi: Roma Capitale.</li>
                <li>Caserme, commissariati, pronto soccorso e sedi di soccorso: © OpenStreetMap contributors (ODbL), con indirizzi controllati a mano.</li>
                <li>Alcuni punti amici H24 sono esempi di come funzionerebbero le attività convenzionate: lo dice il loro nome.</li>
                <li>Versione dimostrativa: SPID, CIE e i messaggi sono simulati, nessun dato lascia il sito.</li>
              </ul>
            </Blocco>
          ),
        },
      ]}
    />
  );
}
