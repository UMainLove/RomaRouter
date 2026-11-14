import { readFile } from "node:fs/promises";
import path from "node:path";

// Il "worker" di MapLibre (disegno delle mappe in un thread a parte) e' un file a se' che il bundler non serve:
// lo serviamo da node_modules, cosi' resta sempre della stessa versione della libreria.
let cache: Buffer | null = null;

export async function GET() {
  cache ??= await readFile(path.join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"));
  return new Response(new Uint8Array(cache), {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
