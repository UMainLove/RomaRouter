// Costruisce le mappe delle sezioni partendo da mappe/base.
// Uso: npm run mappe:build -- antenne        (una sezione)
//      npm run mappe:build -- tutte          (tutte)
// Serve Python 3.9+ (variabile PYTHON per indicarne uno preciso).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CSS_COMUNE, PNG_VUOTO, patchComuni, type Patch, type Sezione } from "../../mappe/comune.mts";

const RADICE = path.resolve(import.meta.dirname, "../..");
const BASE = path.join(RADICE, "mappe", "base");
const PUBBLICO = path.join(RADICE, "public", "mappe");
const SEZIONI = ["antenne", "artisti-di-strada", "impianti-sportivi", "oggetti-smarriti"];
const T = "mappa-quartieri.template.html";

function errore(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function trovaPython(): string[] {
  const candidati: string[][] = [];
  if (process.env.PYTHON) candidati.push([process.env.PYTHON]);
  if (process.env.LOCALAPPDATA) {
    for (const v of ["Python313", "Python312", "Python311", "Python310", "Python39"]) {
      candidati.push([path.join(process.env.LOCALAPPDATA, "Programs", "Python", v, "python.exe")]);
    }
  }
  candidati.push(["python3"], ["python"], ["py", "-3"]);
  for (const c of candidati) {
    const r = spawnSync(c[0], [...c.slice(1), "--version"], { encoding: "utf8" });
    if (r.status === 0 && /Python 3\.(9|1\d)/.test(r.stdout + r.stderr)) return c;
  }
  errore("Python 3.9+ non trovato. Installalo (winget install Python.Python.3.13) o imposta la variabile PYTHON.");
}

function applica(dir: string, p: Patch) {
  const file = path.join(dir, p.file);
  // a capo normalizzati: su Windows git puo' aver scritto la base con CRLF
  const testo = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  let n: number;
  if (typeof p.cerca === "string") {
    n = testo.split(p.cerca).length - 1;
  } else {
    if (!p.cerca.global) errore(`La RegExp di "${p.motivo}" deve avere il flag g`);
    n = (testo.match(p.cerca) ?? []).length;
  }
  const attese = p.volte ?? 1;
  const ok = attese === "almeno" ? n >= 1 : n === attese;
  if (!ok) {
    errore(`Modifica "${p.motivo}" su ${p.file}: attese ${attese} occorrenze, trovate ${n}. ` +
      "La mappa di base e' cambiata: aggiorna la modifica in mappe/.");
  }
  const nuovo = typeof p.cerca === "string" ? testo.split(p.cerca).join(p.sostituisci) : testo.replace(p.cerca, p.sostituisci);
  writeFileSync(file, nuovo, "utf8");
}

async function costruisci(slug: string, python: string[]) {
  const dirSezione = path.join(RADICE, "mappe", slug);
  const modulo = path.join(dirSezione, "sezione.mts");
  if (!existsSync(modulo)) errore(`Manca ${path.relative(RADICE, modulo)}`);
  const sez: Sezione = (await import(pathToFileURL(modulo).href)).default;
  console.log(`\n▶ ${sez.titolo} (${slug})`);

  // 1. Copia di lavoro della base, fuori dal repository
  const lavoro = path.join(tmpdir(), "romarouter-mappe", slug);
  rmSync(lavoro, { recursive: true, force: true });
  mkdirSync(lavoro, { recursive: true });
  cpSync(BASE, lavoro, { recursive: true });

  // 2. File della sezione (icone, dati...) e marchio Urbe Hub tolto
  const fileSezione = path.join(dirSezione, "file");
  if (existsSync(fileSezione)) cpSync(fileSezione, lavoro, { recursive: true });
  writeFileSync(path.join(lavoro, "brand", "urbe-hub-donor.png"), PNG_VUOTO);
  rmSync(path.join(lavoro, "brand", "og.png"), { force: true });

  // 3. Modifiche verificate: prima le comuni, poi quelle della sezione
  const patch = [...patchComuni(sez), ...(sez.patch ?? [])];
  for (const p of patch) applica(lavoro, p);
  console.log(`  ${patch.length} modifiche applicate`);

  // 4. CSS e JS iniettati: CSS dopo quello della 3D, JS in fondo alla chiusura della mappa
  //    (dopo la 3D, cosi' le funzioni avvolte dalla sezione sono quelle definitive)
  const leggi = (f?: string) => (f ? readFileSync(path.join(dirSezione, f), "utf8") : "");
  const css = CSS_COMUNE + leggi(sez.css);
  const icone = Object.fromEntries(
    Object.entries(sez.icone ?? {}).map(([k, f]) => [k, readFileSync(path.join(RADICE, f), "utf8").replace(/<\?xml[^>]*>\s*/, "").trim()]),
  );
  const js = (sez.icone ? `  var RR_ICONE = ${JSON.stringify(icone)};\n` : "") + leggi(sez.js);
  if (/<\/script/i.test(js) || /<\/style/i.test(css)) errore("CSS o JS della sezione contengono </script> o </style>");
  applica(lavoro, { file: T, cerca: "/*<<VISTA_3D_CSS>>*/", sostituisci: `/*<<VISTA_3D_CSS>>*/\n${css}`, motivo: "CSS della sezione" });
  applica(lavoro, {
    file: T, cerca: "  /*<<VISTA_3D_JS>>*/\n",
    sostituisci: `  /*<<VISTA_3D_JS>>*/\n  // ===== RomaRouter: sezione ${slug} =====\n${js}\n`, motivo: "JS della sezione",
  });

  // 5. Build Python in una cartella temporanea, poi pubblicazione
  const uscita = path.join(lavoro, "_dist");
  const r = spawnSync(python[0], [...python.slice(1), "build.py"], {
    cwd: lavoro,
    env: { ...process.env, MAPPA_DIST: uscita, MAPPA_STATISTICHE_ID: "", MAPPA_STATISTICHE_LINK: "", PYTHONIOENCODING: "utf-8" },
    encoding: "utf8",
  });
  const log = (r.stdout ?? "") + (r.stderr ?? "");
  if (r.status !== 0) errore(`Build della mappa ${slug} fallita:\n${log.slice(-3000)}`);
  for (const riga of log.split(/\r?\n/)) {
    if (/^(Strade|Servizi|Vista 3D|Statistiche|Scritto|Gate|ATTENZIONE)/.test(riga)) console.log(`  ${riga.replace(lavoro, "…")}`);
  }

  // Stradario e 3D: una copia sola in public/mappe/_comune (uguali per tutte le sezioni)
  const comune = path.join(PUBBLICO, "_comune");
  mkdirSync(comune, { recursive: true });
  for (const d of ["strade", "3d"]) {
    const da = path.join(uscita, d);
    if (!existsSync(da)) continue;
    rmSync(path.join(comune, d), { recursive: true, force: true });
    renameSync(da, path.join(comune, d));
  }
  rmSync(path.join(uscita, "vercel.json"), { force: true }); // gli header li decide Next.js

  const dest = path.join(PUBBLICO, slug);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(uscita, dest, { recursive: true });
  rmSync(lavoro, { recursive: true, force: true });
  console.log(`  ✓ pubblicata in public/mappe/${slug}/  →  /mappe/${slug}/index.html`);
}

const arg = process.argv[2];
const scelte = arg === "tutte" ? SEZIONI : SEZIONI.filter((s) => s === arg);
if (!scelte.length) errore(`Uso: npm run mappe:build -- <${SEZIONI.join("|")}|tutte>`);
const python = trovaPython();
console.log(`Python: ${python.join(" ")}`);
for (const s of scelte) await costruisci(s, python);
console.log("\nFatto.");
