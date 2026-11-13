import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PaginaSezione } from "@/components/PaginaSezione";
import { Badge, BarraFiltri, CampoScelta, CampoTesto, Conteggio, MUNICIPI, Vuoto, parametro } from "@/components/Filtri";
import { MappaAntenne } from "@/components/antenne/MappaAntenne";
import { queryAntenne } from "@/lib/antenne";

export const metadata: Metadata = {
  title: "Antenne di telefonia mobile",
  description: "Mappa delle antenne di telefonia mobile a Roma: impianti, misure dei campi elettromagnetici e informazioni sul contesto.",
};

// useGrouping "always": in italiano anche 3538 diventa 3.538 (più leggibile per i cittadini)
const fmt = (n: number | string) => Number(n).toLocaleString("it-IT", { useGrouping: "always" } as Intl.NumberFormatOptions);
const dataIt = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—");

// ---------------------------------------------------------------------------
// Cifre chiave
// ---------------------------------------------------------------------------
async function Cifre() {
  await connection();
  const { rows } = await queryAntenne<{ impianti_roma: string | null; istanze: number; sensibili: number; misure: number }>(
    `SELECT (SELECT valore FROM antenne.statistiche WHERE indicatore = 'impianti_srb' AND ambito = 'comune:Roma' LIMIT 1) AS impianti_roma,
            (SELECT count(*)::int FROM antenne.istanze_srb WHERE geom IS NOT NULL) AS istanze,
            (SELECT count(*)::int FROM antenne.siti_sensibili) AS sensibili,
            (SELECT count(*)::int FROM antenne.misure_cem) AS misure`,
  );
  const r = rows[0];
  const voci = [
    { valore: r.impianti_roma ? fmt(r.impianti_roma) : "—", testo: "impianti di telefonia mobile nel Comune di Roma", fonte: "ARPA Lazio" },
    { valore: fmt(r.istanze), testo: "richieste di installazione o modifica in mappa", fonte: "Roma Capitale" },
    { valore: fmt(r.sensibili), testo: "siti sensibili: scuole, asili, ospedali, RSA…", fonte: "GeoRoma + OSM" },
    { valore: "15 V/m", testo: "valore di attenzione dal 2024 (limite massimo 20 V/m)", fonte: "L. 214/2023" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {voci.map((v) => (
        <li key={v.testo} className="rounded-3xl border border-line bg-surface p-5">
          <p className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">{v.valore}</p>
          <p className="mt-1 text-sm leading-snug text-ink">{v.testo}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{v.fonte}</p>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Misure: limiti di legge, centraline, numeri ARPA
// ---------------------------------------------------------------------------
function ScalaLimiti() {
  const MAX = 22;
  const segni = [
    { v: 6, testo: "6 V/m", nota: "vecchio valore di attenzione (fino ad aprile 2024)", stile: "border-dashed border-muted text-muted" },
    { v: 15, testo: "15 V/m", nota: "valore di attenzione e obiettivo di qualità", stile: "border-accent-2 text-accent-2" },
    { v: 20, testo: "20 V/m", nota: "limite di esposizione: mai superabile", stile: "border-accent text-accent" },
  ];
  return (
    <figure className="rounded-3xl border border-line bg-surface p-6">
      <figcaption className="text-lg font-bold text-ink">Quanto è &laquo;troppo&raquo;? I limiti italiani</figcaption>
      <p className="mt-1 text-sm text-muted">Campo elettrico per le frequenze della telefonia mobile (3 MHz – 3 GHz).</p>
      <div className="relative mt-14 h-4 rounded-full bg-gradient-to-r from-emerald-400/70 via-amber-300/80 to-rose-500/80" role="img"
        aria-label="Scala del campo elettrico: 6 volt al metro vecchio valore di attenzione, 15 volt al metro valore di attenzione attuale, 20 volt al metro limite di esposizione">
        {segni.map((s) => (
          <div key={s.v} className="absolute -top-12 bottom-0 flex flex-col items-center" style={{ left: `${(s.v / MAX) * 100}%` }}>
            <span className={`whitespace-nowrap text-sm font-bold ${s.stile.split(" ").filter((c) => c.startsWith("text-")).join(" ")}`}>{s.testo}</span>
            <span className={`mt-1 flex-1 border-l-2 ${s.stile}`} />
          </div>
        ))}
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {segni.map((s) => (
          <div key={s.v} className="rounded-2xl bg-surface-2 p-4">
            <dt className="text-sm font-bold text-ink">{s.testo}</dt>
            <dd className="mt-1 text-sm text-muted">{s.nota}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        I 15 V/m si verificano a <strong className="text-ink">1,5 m dal pavimento</strong>, come <strong className="text-ink">media sulle 24 ore</strong>, nelle case e
        negli ambienti dove si resta almeno 4 ore al giorno, balconi e terrazzi compresi (DL 179/2012). Il valore di 15 V/m è
        <strong className="text-ink"> provvisorio</strong>: lo ha fissato la legge sulla concorrenza (L. 214/2023, art. 10) in attesa di un nuovo decreto.
      </p>
    </figure>
  );
}

function Barre({ titolo, sottotitolo, serie }: { titolo: string; sottotitolo: string; serie: { anno: number; valore: number }[] }) {
  const max = Math.max(...serie.map((s) => s.valore), 1);
  return (
    <figure className="rounded-3xl border border-line bg-surface p-6">
      <figcaption>
        <span className="block text-base font-bold text-ink">{titolo}</span>
        <span className="block text-sm text-muted">{sottotitolo}</span>
      </figcaption>
      <ol className="mt-5 flex h-40 items-end gap-2" aria-label={titolo}>
        {serie.map((s) => (
          <li key={s.anno} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold text-ink">{fmt(s.valore)}</span>
            <span className="w-full rounded-t-lg bg-gradient-to-t from-accent-2 to-accent" style={{ height: `${(s.valore / max) * 100}%` }} aria-hidden="true" />
            <span className="text-xs text-muted">{s.anno}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

async function Misure() {
  await connection();
  const [stat, centraline] = await Promise.all([
    queryAntenne<{ indicatore: string; anno: number; valore: string }>(
      `SELECT indicatore, anno, valore FROM antenne.statistiche
       WHERE ambito = 'provincia:Roma' AND indicatore IN ('pareri_alta_frequenza','esposti_evasi') AND anno IS NOT NULL ORDER BY anno`,
    ),
    queryAntenne<{ nome: string; descrizione: string | null; ultimo_dato: string | null; n_report: number }>(
      `SELECT p.nome, p.descrizione, p.ultimo_dato, (SELECT count(*)::int FROM antenne.misure_cem m WHERE m.punto_id = p.id) AS n_report
       FROM antenne.punti_monitoraggio p ORDER BY p.id`,
    ),
  ]);
  const serie = (ind: string) => stat.rows.filter((r) => r.indicatore === ind).map((r) => ({ anno: r.anno, valore: Number(r.valore) }));

  return (
    <div className="grid gap-4">
      <ScalaLimiti />
      <div className="grid gap-4 lg:grid-cols-2">
        <Barre titolo="Pareri ARPA su nuovi impianti" sottotitolo="Provincia di Roma, alta frequenza, per anno" serie={serie("pareri_alta_frequenza")} />
        <Barre titolo="Segnalazioni dei cittadini gestite" sottotitolo="Esposti CEM evasi da ARPA, provincia di Roma" serie={serie("esposti_evasi")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">Le centraline di monitoraggio a Roma</h3>
          <ul className="mt-3 grid gap-3">
            {centraline.rows.map((c) => (
              <li key={c.nome} className="rounded-2xl bg-surface-2 p-4">
                <p className="font-semibold text-ink">{c.nome}</p>
                {c.descrizione && <p className="mt-1 text-sm text-muted">{c.descrizione}</p>}
                <p className="mt-2 text-xs font-semibold text-muted">
                  {c.n_report ? `${c.n_report} report mensili · ultimo dato ${dataIt(c.ultimo_dato)}` : "Dati non pubblicati online"}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            Le misure puntuali di ARPA sui singoli impianti <strong className="text-ink">non sono pubblicate</strong>: per questo la mappa mostra dove
            sono state chieste le antenne, non quanto campo producono.
          </p>
        </section>
        <section className="rounded-3xl border border-accent-2/30 bg-gradient-to-br from-accent/5 to-accent-2/10 p-6">
          <h3 className="text-base font-bold text-ink">Vuoi sapere quanto campo c&apos;è a casa tua?</h3>
          <ol className="mt-3 grid gap-3 text-sm text-ink">
            <li className="flex gap-3"><Passo n={1} />Chi può chiederlo: proprietario, affittuario o un suo rappresentante (es. l&apos;amministratore di condominio).</li>
            <li className="flex gap-3"><Passo n={2} />Scrivi via PEC ad ARPA Lazio, Sezione provinciale di Roma, chiedendo un sopralluogo per la misura dei campi elettromagnetici.</li>
            <li className="flex gap-3"><Passo n={3} />Il tecnico misura sul posto e rilascia il verbale. Se c&apos;è un superamento, scatta la riduzione a conformità.</li>
          </ol>
          <p className="mt-4 rounded-xl bg-surface px-3 py-2 font-mono text-sm text-ink">direzione.centrale@arpalazio.legalmailpa.it</p>
          <a href="https://www.arpalazio.it/en/servizi/faq" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
            Le FAQ di ARPA Lazio
          </a>
        </section>
      </div>
    </div>
  );
}

function Passo({ n }: { n: number }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-xs font-bold text-white">{n}</span>;
}

// ---------------------------------------------------------------------------
// Contesto: iter a Roma e norme
// ---------------------------------------------------------------------------
async function Contesto() {
  await connection();
  const { rows } = await queryAntenne<{ id: string; livello: string; titolo: string; sintesi: string; url: string | null }>(
    `SELECT id, livello, titolo, sintesi, url FROM antenne.riferimenti_normativi
     ORDER BY CASE livello WHEN 'comunale' THEN 1 WHEN 'regionale' THEN 2 ELSE 3 END, id`,
  );
  const iter = [
    { quando: "Giorno 0", cosa: "L'operatore presenta l'istanza al SUAP di Roma Capitale (dall'8 novembre 2024)." },
    { quando: "Entro 15 giorni", cosa: "Il Municipio pubblica l'avviso sul proprio sito: è quello che vedi in mappa." },
    { quando: "Entro 20 giorni dalla pubblicazione", cosa: "Il Municipio e i cittadini possono presentare osservazioni o opposizioni e proporre siti alternativi." },
    { quando: "Parere ARPA", cosa: "ARPA Lazio valuta il progetto rispetto ai limiti di legge." },
    { quando: "90 giorni", cosa: "Senza un diniego o un parere negativo ARPA, l'istanza è accolta per silenzio-assenso." },
  ];
  const livelli = [
    { id: "comunale", titolo: "Roma Capitale" },
    { id: "regionale", titolo: "Regione Lazio e ARPA" },
    { id: "nazionale", titolo: "Italia" },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <section className="rounded-3xl border border-line bg-surface p-6">
        <h3 className="text-base font-bold text-ink">Come nasce un&apos;antenna a Roma</h3>
        <ol className="relative mt-4 grid gap-5 border-l-2 border-line pl-6">
          {iter.map((p) => (
            <li key={p.quando} className="relative">
              <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-4 border-surface bg-gradient-to-br from-accent to-accent-2" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-wide text-accent">{p.quando}</p>
              <p className="mt-0.5 text-sm text-ink">{p.cosa}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
          <strong className="text-ink">Dove sono vietate.</strong> Il regolamento di Roma (DAC 78/2024) vieta le antenne sopra ospedali, case di cura, RSA, asili nido,
          scuole, oratori, parchi gioco e carceri, e nelle aree vincolate. Non fissa invece distanze minime: il Consiglio di Stato aveva bocciato i 100 m del regolamento 2015.
        </p>
      </section>
      <section className="grid gap-3">
        {livelli.map((l) => (
          <div key={l.id} className="rounded-3xl border border-line bg-surface p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{l.titolo}</h3>
            <div className="mt-2 divide-y divide-line">
              {rows.filter((r) => r.livello === l.id).map((r) => (
                <details key={r.id} className="group py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                    {r.titolo}
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{r.sintesi}</p>
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-accent hover:underline">Testo ufficiale</a>}
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elenco accessibile delle istanze (funziona anche senza JavaScript)
// ---------------------------------------------------------------------------
interface RigaIstanza {
  id: number; gestori: string[]; indirizzo: string | null; municipio_nome: string | null; suddivisione_nome: string | null;
  tipo_intervento: string | null; data_pubblicazione: string | null; qualita: string; url_avviso: string | null;
}

async function Elenco({ searchParams }: { searchParams: PageProps<"/antenne">["searchParams"] }) {
  const sp = await searchParams;
  const q = parametro(sp.q);
  const municipio = parametro(sp.municipio);
  const gestore = parametro(sp.gestore);
  const [gestori, righe] = await Promise.all([
    queryAntenne<{ g: string }>("SELECT DISTINCT unnest(gestori) AS g FROM antenne.istanze_srb ORDER BY 1"),
    queryAntenne<RigaIstanza>(
      `SELECT id, gestori, indirizzo, municipio_nome, suddivisione_nome, tipo_intervento, data_pubblicazione, qualita, url_avviso
       FROM antenne.v_istanze
       WHERE geom IS NOT NULL
         AND ($1::text IS NULL OR unaccent(coalesce(indirizzo,'') || ' ' || coalesce(suddivisione_nome,'') || ' ' || array_to_string(gestori,' ')) ILIKE '%' || unaccent($1) || '%')
         AND ($2::int IS NULL OR municipio = $2)
         AND ($3::text IS NULL OR $3 = ANY(gestori))
       ORDER BY data_pubblicazione DESC NULLS LAST, municipio NULLS LAST
       LIMIT 300`,
      [q ?? null, municipio ? Number(municipio) : null, gestore ?? null],
    ),
  ]);
  const filtrato = Boolean(q || municipio || gestore);
  return (
    <div className="grid gap-4">
      <BarraFiltri azzera="/antenne#elenco">
        <CampoTesto nome="q" etichetta="Via, quartiere o operatore" valore={q} segnaposto="es. Ostiense, Iliad" />
        <CampoScelta nome="municipio" etichetta="Municipio" valore={municipio} opzioni={MUNICIPI} />
        <CampoScelta nome="gestore" etichetta="Operatore" valore={gestore} opzioni={gestori.rows.map((r) => ({ valore: r.g, testo: r.g }))} />
      </BarraFiltri>
      <Conteggio n={righe.rows.length} singolare="antenna" plurale="antenne" limite={300} />
      {righe.rows.length === 0 ? (
        <Vuoto filtrato={filtrato} cosa="antenna" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <caption className="sr-only">Istanze di installazione o modifica di stazioni radio base pubblicate da Roma Capitale</caption>
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Operatore</th>
                <th scope="col" className="px-4 py-3 font-semibold">Dove</th>
                <th scope="col" className="px-4 py-3 font-semibold">Intervento</th>
                <th scope="col" className="px-4 py-3 font-semibold">Pubblicato</th>
                <th scope="col" className="px-4 py-3 font-semibold">Fonte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {righe.rows.map((r) => (
                <tr key={r.id} className="align-top transition hover:bg-surface-2/60">
                  <td className="px-4 py-3 font-semibold text-ink">{r.gestori.join(" · ") || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-ink">{r.indirizzo ?? "—"}</span>
                    <span className="block text-xs text-muted">{[r.suddivisione_nome, r.municipio_nome].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-4 py-3">{r.tipo_intervento ? <Badge tono="accento">{r.tipo_intervento}</Badge> : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{dataIt(r.data_pubblicazione)}</td>
                  <td className="px-4 py-3">
                    {r.url_avviso ? <a href={r.url_avviso} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">Avviso</a> : "—"}
                    {r.qualita !== "originale" && <span className="block text-xs text-muted">{r.qualita === "geocodificata" ? "posizione da indirizzo" : "coordinate corrette"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fonti e trasparenza
// ---------------------------------------------------------------------------
async function Fonti() {
  await connection();
  const { rows } = await queryAntenne<{ id: string; titolo: string; ente: string; url: string; formato: string; licenza: string | null; ufficiale: boolean; n_record: number | null; scaricato_il: string | null }>(
    "SELECT id, titolo, ente, url, formato, licenza, ufficiale, n_record, scaricato_il FROM antenne.fonti WHERE id <> 'normativa_cem' ORDER BY ufficiale DESC, ente, titolo",
  );
  const lacune = [
    "Non esiste un catasto pubblico degli impianti attivi: ARPA Lazio (NirWeb, dal 2026) e il Ministero lo tengono riservato. In mappa ci sono le richieste pubblicate, non tutti i 3.538 impianti.",
    "L'elenco ufficiale dei siti sensibili (Allegato A della DAC 78/2024) non è pubblicato in formato aperto: lo ricostruiamo dai layer del Comune e da OpenStreetMap.",
    "Le misure di ARPA sui singoli impianti non sono pubbliche; i report della centralina di via Boncompagni sono solo grafici e fermi a giugno 2022.",
    "Le coordinate pubblicate dal Comune hanno formati misti e alcuni errori: ogni correzione è dichiarata, e dove mancano usiamo lo stradario ufficiale.",
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">Fonti dei dati della sezione antenne</caption>
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr><th scope="col" className="px-4 py-3">Fonte</th><th scope="col" className="px-4 py-3">Formato</th><th scope="col" className="px-4 py-3 text-right">Record</th><th scope="col" className="px-4 py-3">Aggiornato</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((f) => (
              <tr key={f.id} className="align-top">
                <td className="px-4 py-3">
                  <a href={f.url.split(" ")[0]} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink hover:text-accent">{f.titolo}</a>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {f.ente}
                    {f.ufficiale ? <Badge tono="positivo">ufficiale</Badge> : <Badge>non ufficiale</Badge>}
                    {f.licenza && <Badge>{f.licenza}</Badge>}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{f.formato}</td>
                <td className="px-4 py-3 text-right font-mono text-ink">{f.n_record != null ? fmt(f.n_record) : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{dataIt(f.scaricato_il)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="rounded-3xl border border-dashed border-line bg-surface p-6">
        <h3 className="text-base font-bold text-ink">Cosa i dati pubblici non dicono</h3>
        <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-muted">
          {lacune.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {l}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Blocco({ id, occhiello, titolo, testo, children }: { id: string; occhiello: string; titolo: string; testo?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titolo`} className="scroll-mt-6">
      <p className="text-sm font-semibold text-accent">{occhiello}</p>
      <h2 id={`${id}-titolo`} className="mt-1 text-2xl font-bold tracking-tight text-ink">{titolo}</h2>
      {testo && <p className="mt-1 max-w-3xl text-muted">{testo}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Attesa = ({ cosa }: { cosa: string }) => (
  <div className="rounded-3xl border border-line bg-surface p-8 text-center text-muted" role="status">Caricamento {cosa}…</div>
);

export default function Antenne(props: PageProps<"/antenne">) {
  return (
    <PaginaSezione sezione="antenne">
      <nav aria-label="In questa pagina" className="-mt-4 mb-8 flex flex-wrap gap-2">
        {[["#mappa", "Mappa"], ["#misure", "Misure"], ["#contesto", "Regole"], ["#elenco", "Elenco"], ["#fonti", "Fonti"]].map(([h, t]) => (
          <a key={h} href={h} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-muted transition hover:border-accent hover:text-accent">{t}</a>
        ))}
      </nav>

      <div className="grid gap-14">
        <Suspense fallback={<Attesa cosa="dei numeri" />}><Cifre /></Suspense>

        <Blocco id="mappa" occhiello="Impianti" titolo="La mappa delle antenne"
          testo="Le richieste di nuove antenne o di modifiche pubblicate da Roma Capitale, con i siti sensibili e le aree vincolate intorno. Clicca un punto per scoprire cosa c'è entro 500 metri.">
          <MappaAntenne />
        </Blocco>

        <Blocco id="misure" occhiello="Misure" titolo="Campi elettromagnetici: limiti e controlli"
          testo="Cosa dice la legge, chi misura e come puoi chiedere una verifica a casa tua.">
          <Suspense fallback={<Attesa cosa="delle misure" />}><Misure /></Suspense>
        </Blocco>

        <Blocco id="contesto" occhiello="Contesto" titolo="Le regole, dal Campidoglio a Roma"
          testo="Come si autorizza un'antenna, dove è vietata e quali norme valgono.">
          <Suspense fallback={<Attesa cosa="delle regole" />}><Contesto /></Suspense>
        </Blocco>

        <Blocco id="elenco" occhiello="Elenco" titolo="Tutte le antenne in elenco" testo="La stessa informazione della mappa, in tabella: cerca per via, quartiere o operatore.">
          <Suspense fallback={<Attesa cosa="dell'elenco" />}><Elenco searchParams={props.searchParams} /></Suspense>
        </Blocco>

        <Blocco id="fonti" occhiello="Trasparenza" titolo="Da dove vengono i dati"
          testo="Ogni dato ha una fonte pubblica. Dove i dati mancano, lo diciamo.">
          <Suspense fallback={<Attesa cosa="delle fonti" />}><Fonti /></Suspense>
        </Blocco>
      </div>
    </PaginaSezione>
  );
}
