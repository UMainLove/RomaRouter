// Funzioni comuni agli importatori del layer antenne.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

export const RAW_DIR = path.resolve(import.meta.dirname, "../../data/raw/antenne");
// User-Agent onesto e generico (nessun dato personale). Overpass rifiuta con 406
// gli User-Agent che imitano un browser ("Mozilla/5.0 ..."), quindi niente imitazioni.
export const USER_AGENT = "civic-data-ingest/0.1";

// La sezione antenne ha il suo database (rr_antenne): vedi src/lib/sezioni.ts e db/init.sql.
// Il client si crea subito ma si connette solo in import.mts (i test non toccano il database).
export const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ANTENNE });

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function log(step: string, msg: string) {
  console.log(`[${step}] ${msg}`);
}

export interface Fonte {
  id: string;
  titolo: string;
  ente: string;
  url: string;
  formato: string;
  licenza: string | null;
  ufficiale: boolean;
  note?: string;
}

/** Registra (o aggiorna) una fonte nel registro antenne.fonti. */
export async function registraFonte(f: Fonte, extra: { sha256?: string; n_record?: number } = {}) {
  await db.query(
    `INSERT INTO antenne.fonti (id, titolo, ente, url, formato, licenza, ufficiale, note, scaricato_il, sha256, n_record)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now(), $9, $10)
     ON CONFLICT (id) DO UPDATE SET titolo=EXCLUDED.titolo, ente=EXCLUDED.ente, url=EXCLUDED.url,
       formato=EXCLUDED.formato, licenza=EXCLUDED.licenza, ufficiale=EXCLUDED.ufficiale, note=EXCLUDED.note,
       scaricato_il=now(), sha256=COALESCE(EXCLUDED.sha256, antenne.fonti.sha256),
       n_record=COALESCE(EXCLUDED.n_record, antenne.fonti.n_record)`,
    [f.id, f.titolo, f.ente, f.url, f.formato, f.licenza, f.ufficiale, f.note ?? null, extra.sha256 ?? null, extra.n_record ?? null],
  );
}

export async function aggiornaConteggioFonte(id: string, n: number) {
  await db.query("UPDATE antenne.fonti SET n_record = $2 WHERE id = $1", [id, n]);
}

/**
 * Scarica un URL (con ritentativi) e salva una copia in data/raw/antenne.
 * Restituisce il contenuto e lo sha256, così ogni import è tracciabile.
 */
export async function scarica(url: string, nomeFile: string, init: RequestInit = {}): Promise<{ buf: Buffer; sha256: string }> {
  await mkdir(RAW_DIR, { recursive: true });
  let ultimoErrore: unknown;
  for (let tentativo = 1; tentativo <= 3; tentativo++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(path.join(RAW_DIR, nomeFile), buf);
      return { buf, sha256: createHash("sha256").update(buf).digest("hex") };
    } catch (err) {
      ultimoErrore = err;
      await sleep(1500 * tentativo);
    }
  }
  throw ultimoErrore;
}

export async function scaricaTesto(url: string, nomeFile: string) {
  const { buf, sha256 } = await scarica(url, nomeFile);
  return { testo: buf.toString("utf8"), sha256 };
}

// ---------------------------------------------------------------------------
// Testo
// ---------------------------------------------------------------------------
const ENTITA: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">",
  "&deg;": "°", "&agrave;": "à", "&egrave;": "è", "&eacute;": "é", "&igrave;": "ì", "&ograve;": "ò",
  "&ugrave;": "ù", "&Agrave;": "À", "&Egrave;": "È", "&ndash;": "–", "&mdash;": "—", "&rsquo;": "'",
  "&lsquo;": "'", "&ldquo;": '"', "&rdquo;": '"', "&prime;": "'", "&Prime;": '"', "&ordm;": "°",
};

export function decodificaHtml(s: string): string {
  return s
    .replace(/&[a-zA-Z]+;|&#39;/g, (m) => ENTITA[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function pulisci(s: string | null | undefined): string {
  return decodificaHtml(s ?? "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Operatori: normalizza i nomi delle società in una forma canonica
// ---------------------------------------------------------------------------
const OPERATORI: [RegExp, string][] = [
  [/\bwind\s*-?\s*tre\b|\bwindtre\b|\bwind\b/i, "WindTre"],
  [/\bvodafone\b/i, "Vodafone"],
  [/\btelecom\s+italia\b|\btim\b/i, "TIM"],
  [/\bil+iad\b/i, "Iliad"],               // anche il refuso "Illiad" presente negli elenchi
  [/\bfiber\s*cop\b/i, "FiberCop"],
  [/\binwit\b/i, "INWIT"],
  [/\bcellnex\b/i, "Cellnex"],
  [/\bfastweb\b/i, "Fastweb"],
  [/\bzefiro\b/i, "Zefiro"],
  [/\bei\s*towers\b/i, "EI Towers"],
  [/\brai\s*way\b/i, "Rai Way"],
  [/\bopen\s*fiber\b/i, "Open Fiber"],
  [/\bnethex\b/i, "Nethex"],
  [/\bphoenix\s*tower\b/i, "Phoenix Tower"],
];

export function estraiOperatori(testo: string): string[] {
  const trovati = new Set<string>();
  for (const [re, nome] of OPERATORI) if (re.test(testo)) trovati.add(nome);
  return [...trovati];
}

export function normalizzaTipoIntervento(testo: string): string | null {
  const t = testo.toLowerCase();
  if (/incremento\s+limit/.test(t)) return "incremento limiti emissivi";
  if (/install|nuova\s+stazione|nuovo\s+impianto/.test(t)) return "installazione";
  if (/adeguament/.test(t)) return "adeguamento";
  if (/modific/.test(t)) return "modifica";
  if (/trasloc|delocalizz/.test(t)) return "trasloco";
  return null;
}

// ---------------------------------------------------------------------------
// Indirizzi
// ---------------------------------------------------------------------------
const TOPONIMI =
  "via|viale|v\\.le|piazza|p\\.zza|p\\.za|piazzale|largo|l\\.go|lungotevere|lungomare|circonvallazione|vicolo|strada|corso|c\\.so|salita|clivo|borgo|località|loc\\.|galleria|passeggiata|rampa|scalinata|traversa";

const RE_INDIRIZZO = new RegExp(`\\b(?:${TOPONIMI})\\s+[^,;:()\\n–—-]{2,60}?(?:,?\\s*(?:n\\.?\\s*°?\\s*)?\\d+[a-zA-Z]?(?:\\s*\\/\\s*[a-zA-Z0-9]+)?(?:\\s*-\\s*\\d+)?)?(?=$|[,;:()\\n–—-]|\\s+(?:presso|e|denominat|foglio|lat)\\b)`, "gi");

/** Trova il primo indirizzo plausibile in un testo (es. "via Ostiense n.131/L"). */
export function estraiIndirizzo(testo: string): string | null {
  const m = pulisci(testo).match(RE_INDIRIZZO);
  if (!m) return null;
  return m[0].replace(/\bn\.\s*°?\s*/i, "").replace(/\s+/g, " ").replace(/[\s,]+$/, "").trim();
}
