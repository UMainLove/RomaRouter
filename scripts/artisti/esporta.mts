// Copia del database dell'arte di strada versionata in git, cosi' chi fa `git pull` non deve rifare gli import:
//   data/seed/rr_artisti_strada.dump → pg_dump dello schema artisti (zone, postazioni, divieti, esibizioni demo...)
// Uso: npm run artisti:esporta
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const radice = path.resolve(import.meta.dirname, "../../data");
const url = process.env.DATABASE_URL_ARTISTI;
if (!url) throw new Error("DATABASE_URL_ARTISTI non impostata in .env.local");
const u = new URL(url);
const pgDump = process.env.PG_DUMP ?? "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";
await mkdir(path.join(radice, "seed"), { recursive: true });
execFileSync(pgDump, [
  "-Fc", "--no-owner", "--no-privileges", "-n", "artisti",
  "-h", u.hostname, "-p", u.port || "5432", "-U", decodeURIComponent(u.username),
  "-f", path.join(radice, "seed", "rr_artisti_strada.dump"), u.pathname.slice(1),
], { env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password) }, stdio: "inherit" });
console.log("seed/rr_artisti_strada.dump aggiornato");
