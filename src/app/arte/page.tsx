import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { VerificaArte } from "@/components/arte/VerificaArte";
import { MappaSezione } from "@/components/mappe/MappaSezione";
import { VistaAmbito } from "@/components/vista/VistaAmbito";
import { queryArtisti } from "@/lib/artisti";

export const metadata: Metadata = {
  title: "Artisti di strada",
  description:
    "Dove si può fare arte di strada a Roma: scrivi un indirizzo e scopri se puoi esibirti, a quali condizioni e chi si esibisce lì. Dati dal regolamento DAC 24/2012, dalle delibere dei Municipi e dal dataset Art Spot.",
};

/*
 * Sezione arte di strada nell'impaginazione comune (VistaAmbito): a destra la mappa della sezione
 * (public/mappe/artisti-di-strada, zone e postazioni da rr_artisti_strada), a sinistra la verifica di un
 * indirizzo (artista: posso esibirmi qui?; cittadino: chi si esibisce qui?), poi regole, contatti e fonti.
 * La vecchia vista con dati di esempio (components/arte/VistaArte) resta nel repo ma non e' piu' usata qui.
 */

const fmt = (n: number) => n.toLocaleString("it-IT", { useGrouping: "always" } as Intl.NumberFormatOptions);

async function Cifre() {
  await connection();
  const { rows } = await queryArtisti<{ postazioni: number; divieti: number; dedicate: number; esibizioni: number }>(
    `SELECT (SELECT count(*)::int FROM artisti.postazioni WHERE tipo = 'postazione_allegatoB') AS postazioni,
            (SELECT count(*)::int FROM artisti.zone WHERE esito IN ('no', 'solo_silenzio')) AS divieti,
            (SELECT count(*)::int FROM artisti.postazioni WHERE tipo <> 'postazione_allegatoB') AS dedicate,
            (SELECT count(*)::int FROM artisti.v_esibizioni WHERE fine > now() AND inizio < now() + interval '7 days') AS esibizioni`,
  );
  const r = rows[0];
  const voci = [
    { valore: fmt(r.postazioni), testo: "postazioni ufficiali in centro", fonte: "DAC 24/2012, All. B" },
    { valore: fmt(r.divieti), testo: "zone con divieti", fonte: "Municipio I + stampa" },
    { valore: fmt(r.dedicate), testo: "aree dedicate", fonte: "Mun. X, art. 13, DAC 304/2025" },
    { valore: fmt(r.esibizioni), testo: "esibizioni nei prossimi 7 giorni", fonte: "annunci degli artisti" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {voci.map((v) => (
        <li key={v.testo} className="rounded-card border border-line bg-surface px-3.5 py-3">
          <p className="text-2xl font-bold tracking-tight text-accent tabular-nums">{v.valore}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink">{v.testo}</p>
          <p className="mt-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{v.fonte}</p>
        </li>
      ))}
    </ul>
  );
}

function CifreAttesa() {
  return (
    <ul className="grid grid-cols-2 gap-2.5" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="h-[92px] rounded-card border border-line bg-surface-2" />
      ))}
    </ul>
  );
}

function Blocco({ id, titolo, testo, children }: { id: string; titolo: string; testo?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5 border-t border-line pt-5">
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
    <VistaAmbito
      voceId="arte"
      barra={
        <Suspense fallback={<CifreAttesa />}>
          <Cifre />
        </Suspense>
      }
      mappa={<MappaSezione sezione="artisti-di-strada" titolo="Mappa dell'arte di strada a Roma: dove ci si può esibire e dove no" pieno />}
    >
      <VerificaArte />

      <Blocco
        id="regole"
        titolo="Le regole in breve"
        testo="Il regolamento di Roma Capitale (DAC 24/2012) vale ovunque nel Comune; i Municipi aggiungono divieti in zone precise. Quelle annullate dal TAR Lazio nel 2013 sono segnate."
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
        testo="Atti di Roma Capitale e dei Municipi, raccolti nel dataset Art Spot (novembre 2026). Le posizioni delle postazioni sono stimate dalle planimetrie; i divieti noti solo dalla stampa sono segnati «da verificare»."
      >
        <Suspense fallback={<Attesa cosa="le fonti" />}>
          <Fonti />
        </Suspense>
      </Blocco>
    </VistaAmbito>
  );
}
