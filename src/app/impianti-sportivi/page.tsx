import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaSezione } from "@/components/PaginaSezione";
import { Badge, BarraFiltri, CampoScelta, CampoTesto, Conteggio, MUNICIPI, Vuoto, nomeMunicipio, parametro } from "@/components/Filtri";
import { querySezione } from "@/lib/db";

export const metadata: Metadata = { title: "Impianti sportivi" };

const LIMITE = 300;

interface Impianto {
  id: number;
  nome: string;
  tipo: string | null;
  gestione: string | null;
  gestore: string | null;
  municipio: number | null;
  indirizzo: string | null;
  accessibile_disabili: boolean | null;
  accessibilita_note: string | null;
  ufficiale: boolean;
  discipline: string[];
}

async function Risultati({ searchParams }: { searchParams: PageProps<"/impianti-sportivi">["searchParams"] }) {
  const sp = await searchParams;
  const q = parametro(sp.q);
  const disciplina = parametro(sp.disciplina);
  const municipio = parametro(sp.municipio);
  const accessibile = parametro(sp.accessibile); // si | no | nd

  const [discipline, impianti] = await Promise.all([
    querySezione<{ codice: string; nome: string }>("impianti-sportivi", "SELECT codice, nome FROM sport.discipline ORDER BY nome"),
    querySezione<Impianto>(
      "impianti-sportivi",
      `SELECT i.id, i.nome, i.tipo, i.gestione, i.gestore, i.municipio, i.indirizzo,
              i.accessibile_disabili, i.accessibilita_note, i.ufficiale,
              COALESCE(array_agg(d.nome ORDER BY d.nome) FILTER (WHERE d.nome IS NOT NULL), '{}') AS discipline
       FROM sport.impianti i
       LEFT JOIN sport.impianti_discipline x ON x.impianto_id = i.id
       LEFT JOIN sport.discipline d ON d.codice = x.disciplina
       WHERE ($1::text IS NULL OR unaccent(i.nome || ' ' || coalesce(i.indirizzo, '')) ILIKE '%' || unaccent($1) || '%')
         AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM sport.impianti_discipline y WHERE y.impianto_id = i.id AND y.disciplina = $2))
         AND ($3::int IS NULL OR i.municipio = $3)
         AND ($4::text IS NULL
              OR ($4 = 'si' AND i.accessibile_disabili IS TRUE)
              OR ($4 = 'no' AND i.accessibile_disabili IS FALSE)
              OR ($4 = 'nd' AND i.accessibile_disabili IS NULL))
       GROUP BY i.id
       ORDER BY i.municipio NULLS LAST, i.nome
       LIMIT ${LIMITE}`,
      [q ?? null, disciplina ?? null, municipio ? Number(municipio) : null, accessibile ?? null],
    ),
  ]);

  const filtrato = Boolean(q || disciplina || municipio || accessibile);
  return (
    <div className="grid gap-5">
      <BarraFiltri azzera="/impianti-sportivi">
        <CampoTesto nome="q" etichetta="Nome o indirizzo" valore={q} segnaposto="es. piscina, via Flaminia" />
        <CampoScelta
          nome="disciplina"
          etichetta="Disciplina"
          valore={disciplina}
          tutte="Tutte"
          opzioni={discipline.rows.map((d) => ({ valore: d.codice, testo: d.nome }))}
        />
        <CampoScelta nome="municipio" etichetta="Municipio" valore={municipio} opzioni={MUNICIPI} />
        <CampoScelta
          nome="accessibile"
          etichetta="Accessibilità"
          valore={accessibile}
          tutte="Qualsiasi"
          opzioni={[
            { valore: "si", testo: "Accessibile" },
            { valore: "no", testo: "Non accessibile" },
            { valore: "nd", testo: "Informazione non disponibile" },
          ]}
        />
      </BarraFiltri>

      <Conteggio n={impianti.rows.length} singolare="impianto" plurale="impianti" limite={LIMITE} />

      {impianti.rows.length === 0 ? (
        <Vuoto filtrato={filtrato} cosa="impianto" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {impianti.rows.map((i) => (
            <li key={i.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                {i.accessibile_disabili === true && <Badge tono="positivo">Accessibile</Badge>}
                {i.accessibile_disabili === false && <Badge tono="negativo">Non accessibile</Badge>}
                {i.accessibile_disabili === null && <Badge>Accessibilità non indicata</Badge>}
                {!i.ufficiale && <Badge>Fonte non ufficiale</Badge>}
              </div>
              <p className="mt-3 text-lg font-bold leading-snug text-ink">{i.nome}</p>
              <p className="mt-1 text-muted">{[i.tipo, nomeMunicipio(i.municipio)].filter(Boolean).join(" · ")}</p>
              {i.indirizzo && <p className="mt-1 text-sm text-ink">{i.indirizzo}</p>}
              {i.discipline.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Discipline">
                  {i.discipline.map((d) => (
                    <li key={d}><Badge tono="accento">{d}</Badge></li>
                  ))}
                </ul>
              )}
              {(i.gestione || i.gestore) && (
                <p className="mt-3 text-sm text-muted">Gestione: {[i.gestione, i.gestore].filter(Boolean).join(" – ")}</p>
              )}
              {i.accessibilita_note && <p className="mt-1 text-sm text-muted">{i.accessibilita_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ImpiantiSportivi(props: PageProps<"/impianti-sportivi">) {
  return (
    <PaginaSezione sezione="impianti-sportivi">
      <Suspense fallback={<p className="text-muted">Caricamento degli impianti…</p>}>
        <Risultati searchParams={props.searchParams} />
      </Suspense>
    </PaginaSezione>
  );
}
