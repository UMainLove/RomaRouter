import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaSezione } from "@/components/PaginaSezione";
import { Badge, BarraFiltri, CampoScelta, CampoTesto, Conteggio, MUNICIPI, Vuoto, nomeMunicipio, parametro } from "@/components/Filtri";
import { querySezione } from "@/lib/db";

export const metadata: Metadata = { title: "Artisti di strada" };

const LIMITE = 300;
const GIORNI = ["", "lun", "mar", "mer", "gio", "ven", "sab", "dom"];

interface Postazione {
  id: number;
  codice: string | null;
  nome: string;
  municipio: number | null;
  indirizzo: string | null;
  descrizione: string | null;
  capienza_artisti: number | null;
  amplificazione: boolean | null;
  fasce: { giorni: number[]; inizio: string; fine: string; durata_max_min: number | null }[];
  regole: { categoria: string; testo: string }[];
}

interface Regola {
  categoria: string;
  testo: string;
  riferimento: string | null;
  url: string | null;
}

const ora = (t: string) => t.slice(0, 5);
const giorni = (g: number[]) => (g.length === 7 ? "tutti i giorni" : g.map((n) => GIORNI[n]).join(", "));

async function Risultati({ searchParams }: { searchParams: PageProps<"/artisti-di-strada">["searchParams"] }) {
  const sp = await searchParams;
  const q = parametro(sp.q);
  const municipio = parametro(sp.municipio);

  const [regoleGenerali, postazioni] = await Promise.all([
    querySezione<Regola>(
      "artisti-di-strada",
      "SELECT categoria, testo, riferimento, url FROM artisti.regole WHERE postazione_id IS NULL ORDER BY categoria, id",
    ),
    querySezione<Postazione>(
      "artisti-di-strada",
      `SELECT p.id, p.codice, p.nome, p.municipio, p.indirizzo, p.descrizione, p.capienza_artisti, p.amplificazione,
              COALESCE((SELECT json_agg(json_build_object('giorni', f.giorni, 'inizio', f.ora_inizio, 'fine', f.ora_fine,
                                                         'durata_max_min', f.durata_max_min) ORDER BY f.ora_inizio)
                        FROM artisti.fasce_orarie f WHERE f.postazione_id = p.id), '[]') AS fasce,
              COALESCE((SELECT json_agg(json_build_object('categoria', r.categoria, 'testo', r.testo) ORDER BY r.categoria)
                        FROM artisti.regole r WHERE r.postazione_id = p.id), '[]') AS regole
       FROM artisti.postazioni p
       WHERE p.attiva
         AND ($1::text IS NULL OR unaccent(p.nome || ' ' || coalesce(p.indirizzo, '')) ILIKE '%' || unaccent($1) || '%')
         AND ($2::int IS NULL OR p.municipio = $2)
       ORDER BY p.municipio NULLS LAST, p.nome
       LIMIT ${LIMITE}`,
      [q ?? null, municipio ? Number(municipio) : null],
    ),
  ]);

  const filtrato = Boolean(q || municipio);
  return (
    <div className="grid gap-5">
      {regoleGenerali.rows.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-6" aria-labelledby="regole-generali">
          <h2 id="regole-generali" className="text-lg font-bold text-ink">Regole valide in tutte le postazioni</h2>
          <ul className="mt-3 grid gap-2">
            {regoleGenerali.rows.map((r, i) => (
              <li key={i} className="flex gap-3">
                <Badge tono="accento">{r.categoria}</Badge>
                <span className="text-ink">
                  {r.testo}
                  {r.riferimento && (
                    <span className="text-muted">
                      {" "}({r.url ? <a className="underline" href={r.url}>{r.riferimento}</a> : r.riferimento})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BarraFiltri azzera="/artisti-di-strada">
        <CampoTesto nome="q" etichetta="Luogo" valore={q} segnaposto="es. piazza Navona, Trastevere" />
        <CampoScelta nome="municipio" etichetta="Municipio" valore={municipio} opzioni={MUNICIPI} />
      </BarraFiltri>

      <Conteggio n={postazioni.rows.length} singolare="postazione" plurale="postazioni" limite={LIMITE} />

      {postazioni.rows.length === 0 ? (
        <Vuoto filtrato={filtrato} cosa="postazione" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {postazioni.rows.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                {p.amplificazione === true && <Badge tono="positivo">Amplificazione consentita</Badge>}
                {p.amplificazione === false && <Badge tono="negativo">Niente amplificazione</Badge>}
                {p.capienza_artisti != null && <Badge>Max {p.capienza_artisti} {p.capienza_artisti === 1 ? "artista" : "artisti"}</Badge>}
              </div>
              <p className="mt-3 text-lg font-bold leading-snug text-ink">{p.nome}</p>
              <p className="mt-1 text-muted">{[p.indirizzo, nomeMunicipio(p.municipio)].filter(Boolean).join(" · ")}</p>
              {p.descrizione && <p className="mt-2 text-sm text-ink">{p.descrizione}</p>}
              {p.fasce.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-muted">Fasce orarie</p>
                  <ul className="mt-1 grid gap-1 text-sm text-ink">
                    {p.fasce.map((f, i) => (
                      <li key={i}>
                        {giorni(f.giorni)}: {ora(f.inizio)}–{ora(f.fine)}
                        {f.durata_max_min ? ` (max ${f.durata_max_min} min)` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.regole.length > 0 && (
                <ul className="mt-3 grid gap-1 text-sm text-muted">
                  {p.regole.map((r, i) => (
                    <li key={i}>
                      <span className="font-semibold">{r.categoria}:</span> {r.testo}
                    </li>
                  ))}
                </ul>
              )}
              {p.codice && <p className="mt-3 font-mono text-xs text-muted">Postazione {p.codice}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ArtistiDiStrada(props: PageProps<"/artisti-di-strada">) {
  return (
    <PaginaSezione sezione="artisti-di-strada">
      <Suspense fallback={<p className="text-muted">Caricamento delle postazioni…</p>}>
        <Risultati searchParams={props.searchParams} />
      </Suspense>
    </PaginaSezione>
  );
}
