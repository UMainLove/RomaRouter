import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { ArteMappa } from "@/components/arte/ArteMappa";
import { SeNonCarica } from "@/components/ui/SeNonCarica";
import { queryArtisti } from "@/lib/artisti";

export const metadata: Metadata = {
  title: "Artisti di strada",
  description:
    "Dove si può fare arte di strada a Roma: scrivi un indirizzo e scopri se puoi esibirti, a quali condizioni e chi si esibisce lì. Dati dal regolamento DAC 24/2012, dalle delibere dei Municipi e dal dataset Art Spot.",
};

/*
 * Arte di strada a tutta mappa: la mappa e la domanda "posso esibirmi qui?" (o "chi si esibisce qui?")
 * occupano lo schermo; regole, contatti e fonti stanno nel pannello e si aprono solo se servono.
 * Sono scritte qui sul server e passate al pannello gia' pronte.
 */

function Blocco({ id, titolo, testo, children }: { id: string; titolo: string; testo?: string; children: ReactNode }) {
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

function Attesa({ cosa }: { cosa: string }) {
  return (
    <p role="status" className="text-sm text-muted">
      Carico {cosa}…
    </p>
  );
}

async function Regole() {
  await connection();
  const { rows } = await queryArtisti<{ categoria: string; testo: string; riferimento: string | null; verifica: string | null }>(
    "SELECT categoria, testo, riferimento, verifica FROM artisti.regole WHERE postazione_id IS NULL ORDER BY id",
  );
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={`${r.categoria}-${r.riferimento}`} className="text-[15px] leading-snug text-ink">
          <span className="font-bold">{r.categoria}.</span> {r.testo}
          <span className="mt-0.5 block text-[13px] text-muted">
            {r.riferimento ?? ""}
            {r.verifica && !r.verifica.startsWith("ufficiale") ? ` · ${r.verifica}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function Contatti() {
  await connection();
  const { rows } = await queryArtisti<{ municipio: number; gruppo_pl: string | null; pec_pl: string | null; telefono_pl: string | null; verifica: string | null }>(
    "SELECT municipio, gruppo_pl, pec_pl, telefono_pl, verifica FROM artisti.contatti ORDER BY municipio, gruppo_pl",
  );
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Gruppi di Polizia Locale a cui mandare il preavviso, per Municipio</caption>
        <thead className="bg-bg-sink text-xs tracking-wide text-muted uppercase">
          <tr>
            <th scope="col" className="px-3 py-2">
              Mun.
            </th>
            <th scope="col" className="px-3 py-2">
              Gruppo e PEC
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr key={`${c.municipio}-${i}`} className="border-t border-line align-top">
              <td className="px-3 py-2 font-bold text-ink tabular-nums">{c.municipio}</td>
              <td className="px-3 py-2">
                <span className="block font-semibold text-ink">{c.gruppo_pl ?? "—"}</span>
                {c.pec_pl && <span className="block break-all text-ink-soft">{c.pec_pl}</span>}
                {c.telefono_pl && <span className="block text-ink-soft">tel. {c.telefono_pl}</span>}
                {c.verifica && /da verificare/i.test(c.verifica) && <span className="block text-[12px] text-muted">PEC da verificare</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Fonti() {
  await connection();
  const { rows } = await queryArtisti<{ titolo: string; ente: string | null; url: string | null; url_archivio: string | null; data_atto: string | null; ufficiale: boolean | null }>(
    "SELECT titolo, ente, url, url_archivio, data_atto::text, ufficiale FROM artisti.fonti ORDER BY ufficiale DESC NULLS LAST, data_atto DESC NULLS LAST, titolo",
  );
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {rows.map((f) => {
        const href = f.url ?? f.url_archivio;
        return (
          <li key={f.titolo} className="leading-snug text-ink">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-line underline-offset-2 hover:decoration-ink">
                {f.titolo}
              </a>
            ) : (
              <span className="font-semibold">{f.titolo}</span>
            )}
            <span className="block text-[13px] text-muted">
              {[f.ente, f.data_atto ? new Date(f.data_atto).toLocaleDateString("it-IT") : null, f.ufficiale === false ? "non ufficiale" : null].filter(Boolean).join(" · ")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PaginaArte() {
  return (
    <ArteMappa
      guida={[
        {
          id: "regole",
          nome: "Regole",
          contenuto: (
            <>
              <Blocco id="regole" titolo="Le regole in breve" testo="Il regolamento di Roma Capitale (DAC 24/2012, come risulta dopo la sentenza del TAR Lazio n. 5494/2013) vale in tutto il Comune; i Municipi aggiungono divieti in zone precise.">
                <SeNonCarica cosa="le regole">
                  <Suspense fallback={<Attesa cosa="le regole" />}>
                    <Regole />
                  </Suspense>
                </SeNonCarica>
              </Blocco>
              {/* su telefono queste righe non stanno nel riquadro della mappa: sono qui */}
              <Blocco id="legenda" titolo="Come leggere la mappa">
                <ul className="flex flex-col gap-2 text-[15px] leading-snug text-ink">
                  <li>
                    <span className="font-bold">Rosso, vietato:</span> i divieti dei Municipi. Per musica e fuoco anche le vie sotto i 5 m, gli ospedali, le chiese e i monumenti (art. 2).
                  </li>
                  <li>
                    <span className="font-bold">Rosa, non adatto:</span> campagna, cimiteri, ferrovie, superstrade.
                  </li>
                  <li>
                    <span className="font-bold">L&apos;onda intorno a un artista:</span> è in scena adesso.
                  </li>
                </ul>
              </Blocco>
            </>
          ),
        },
        {
          id: "preavviso",
          nome: "Pass e preavviso",
          contenuto: (
            <Blocco
              id="contatti"
              titolo="Il Pass artista: il preavviso lo mandiamo noi"
              testo="Crea il Pass una volta sola (chi sei, cosa fai, tre risposte sì/no, la delega). Poi tocchi un punto verde o un palco e premi «Ci sarò»: controlliamo orari, zone e turni, e ogni sera lo sportello manda al Gruppo di Polizia Locale una sola comunicazione con tutte le esibizioni del suo territorio (art. 10), l'elenco SIAE per chi suona brani di altri e le richieste di nulla osta ai Municipi. Si prenota da 3 giorni a un mese prima. Versione dimostrativa: le comunicazioni si preparano ma non partono. Se preferisci farlo da te, questi sono i Gruppi di Polizia Locale."
            >
              <SeNonCarica cosa="i contatti">
                <Suspense fallback={<Attesa cosa="i contatti" />}>
                  <Contatti />
                </Suspense>
              </SeNonCarica>
            </Blocco>
          ),
        },
        {
          id: "fonti",
          nome: "Fonti",
          contenuto: (
            <Blocco id="fonti" titolo="Da dove vengono i dati" testo="Atti di Roma Capitale e dei Municipi (registro Deliberazioni e Atti), dataset Art Spot e OpenStreetMap. Le posizioni delle postazioni sono stimate dalle planimetrie.">
              <SeNonCarica cosa="le fonti">
                <Suspense fallback={<Attesa cosa="le fonti" />}>
                  <Fonti />
                </Suspense>
              </SeNonCarica>
            </Blocco>
          ),
        },
      ]}
    />
  );
}
