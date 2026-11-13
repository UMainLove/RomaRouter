import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaSezione } from "@/components/PaginaSezione";
import { Badge, BarraFiltri, CampoScelta, CampoTesto, Conteggio, Vuoto, nomeMunicipio, parametro } from "@/components/Filtri";
import { querySezione } from "@/lib/db";

export const metadata: Metadata = { title: "Oggetti smarriti" };

const LIMITE = 200;

const STATI: Record<string, { testo: string; tono: "positivo" | "neutro" | "accento" }> = {
  in_deposito: { testo: "In deposito", tono: "positivo" },
  restituito: { testo: "Restituito", tono: "neutro" },
  al_ritrovatore: { testo: "Assegnato al ritrovatore", tono: "neutro" },
  devoluto: { testo: "Devoluto", tono: "neutro" },
};

interface Oggetto {
  id: number;
  protocollo: string | null;
  categoria: string | null;
  descrizione: string;
  colore: string | null;
  marca: string | null;
  luogo_ritrovamento: string | null;
  municipio: number | null;
  data_ritrovamento: Date | null;
  ente_custode: string;
  stato: string;
  scadenza_giacenza: Date | null;
}

const data = (d: Date | null) => (d ? d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : null);

async function Risultati({ searchParams }: { searchParams: PageProps<"/oggetti-smarriti">["searchParams"] }) {
  const sp = await searchParams;
  const q = parametro(sp.q);
  const categoria = parametro(sp.categoria);
  const stato = parametro(sp.stato) ?? "in_deposito";

  const [categorie, oggetti] = await Promise.all([
    querySezione<{ codice: string; nome: string }>("oggetti-smarriti", "SELECT codice, nome FROM smarriti.categorie ORDER BY nome"),
    // Ricerca: full-text italiano senza accenti + somiglianza (errori di battitura)
    querySezione<Oggetto>(
      "oggetti-smarriti",
      `SELECT o.id, o.protocollo, c.nome AS categoria, o.descrizione, o.colore, o.marca, o.luogo_ritrovamento, o.municipio,
              o.data_ritrovamento, o.ente_custode, o.stato, o.scadenza_giacenza
       FROM smarriti.oggetti o
       LEFT JOIN smarriti.categorie c ON c.codice = o.categoria
       WHERE ($1::text IS NULL
              OR o.ricerca @@ websearch_to_tsquery('italian_unaccent', $1)
              -- soglia tarata su casi reali: "portafolio" → portafoglio (0,64) ma non portachiavi (0,28)
              OR strict_word_similarity(unaccent(lower($1)), unaccent(lower(o.descrizione))) > 0.5)
         AND ($2::text IS NULL OR o.categoria = $2)
         AND ($3::text = 'tutti' OR o.stato = $3)
       ORDER BY
         CASE WHEN $1::text IS NULL THEN 0 ELSE -ts_rank(o.ricerca, websearch_to_tsquery('italian_unaccent', $1)) END,
         o.data_ritrovamento DESC NULLS LAST
       LIMIT ${LIMITE}`,
      [q ?? null, categoria ?? null, stato],
    ),
  ]);

  const filtrato = Boolean(q || categoria || stato !== "in_deposito");
  return (
    <div className="grid gap-5">
      <BarraFiltri azzera="/oggetti-smarriti">
        <CampoTesto nome="q" etichetta="Cosa hai perso?" valore={q} segnaposto="es. portafoglio nero, chiavi, zaino" />
        <CampoScelta
          nome="categoria"
          etichetta="Categoria"
          valore={categoria}
          tutte="Tutte"
          opzioni={categorie.rows.map((c) => ({ valore: c.codice, testo: c.nome }))}
        />
        <CampoScelta
          nome="stato"
          etichetta="Stato"
          valore={stato === "in_deposito" ? "" : stato}
          tutte="In deposito"
          opzioni={[{ valore: "tutti", testo: "Tutti" }, ...Object.entries(STATI).filter(([k]) => k !== "in_deposito").map(([k, v]) => ({ valore: k, testo: v.testo }))]}
        />
      </BarraFiltri>

      <Conteggio n={oggetti.rows.length} singolare="oggetto" plurale="oggetti" limite={LIMITE} />

      {oggetti.rows.length === 0 ? (
        <Vuoto filtrato={filtrato} cosa="oggetto" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {oggetti.rows.map((o) => (
            <li key={o.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                {o.categoria && <Badge tono="accento">{o.categoria}</Badge>}
                <Badge tono={STATI[o.stato]?.tono ?? "neutro"}>{STATI[o.stato]?.testo ?? o.stato}</Badge>
              </div>
              <p className="mt-3 text-lg font-bold leading-snug text-ink">{o.descrizione}</p>
              {(o.marca || o.colore) && (
                <p className="mt-1 text-muted">{[o.marca, o.colore].filter(Boolean).join(" · ")}</p>
              )}
              <dl className="mt-4 grid gap-1 text-sm">
                {o.data_ritrovamento && (
                  <div className="flex gap-2"><dt className="text-muted">Ritrovato il</dt><dd className="font-semibold text-ink">{data(o.data_ritrovamento)}</dd></div>
                )}
                {(o.luogo_ritrovamento || o.municipio) && (
                  <div className="flex gap-2"><dt className="text-muted">Dove</dt><dd className="font-semibold text-ink">{[o.luogo_ritrovamento, nomeMunicipio(o.municipio)].filter(Boolean).join(", ")}</dd></div>
                )}
                <div className="flex gap-2"><dt className="text-muted">Dove ritirarlo</dt><dd className="font-semibold text-ink">{o.ente_custode}</dd></div>
                {o.protocollo && (
                  <div className="flex gap-2"><dt className="text-muted">Riferimento</dt><dd className="font-mono text-ink">{o.protocollo}</dd></div>
                )}
                {o.stato === "in_deposito" && o.scadenza_giacenza && (
                  <div className="flex gap-2"><dt className="text-muted">Giacenza fino al</dt><dd className="font-semibold text-ink">{data(o.scadenza_giacenza)}</dd></div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OggettiSmarriti(props: PageProps<"/oggetti-smarriti">) {
  return (
    <PaginaSezione sezione="oggetti-smarriti">
      <Suspense fallback={<p className="text-muted">Caricamento degli oggetti…</p>}>
        <Risultati searchParams={props.searchParams} />
      </Suspense>
    </PaginaSezione>
  );
}
