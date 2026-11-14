import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { ArteMappa } from "@/components/arte/ArteMappa";
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
      info={
        <div className="flex flex-col gap-5">
          <Blocco
            id="regole"
            titolo="Le regole in breve"
            testo="Il regolamento di Roma Capitale (DAC 24/2012, come risulta dopo la sentenza del TAR Lazio n. 5494/2013) vale in tutto il Comune; i Municipi aggiungono divieti in zone precise."
          >
            <Suspense fallback={<Attesa cosa="le regole" />}>
              <Regole />
            </Suspense>
          </Blocco>
          <Blocco id="contatti" titolo="A chi mandare il preavviso" testo="Almeno 3 giorni prima, al Gruppo di Polizia Locale del Municipio dove ti esibisci (art. 10).">
            <Suspense fallback={<Attesa cosa="i contatti" />}>
              <Contatti />
            </Suspense>
          </Blocco>
          <Blocco
            id="fonti"
            titolo="Fonti"
            testo="Atti di Roma Capitale e dei Municipi raccolti nel dataset Art Spot. Le posizioni delle postazioni sono stimate dalle planimetrie; i divieti noti solo dalla stampa sono segnati «da verificare»."
          >
            <Suspense fallback={<Attesa cosa="le fonti" />}>
              <Fonti />
            </Suspense>
          </Blocco>
        </div>
      }
    />
  );
}
