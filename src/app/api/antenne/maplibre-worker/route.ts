import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";

// MapLibre GL 6 carica il suo web worker da un file separato (maplibre-gl-worker.mjs) accanto al bundle.
// Turbopack non copia quel file, quindi lo serviamo da qui, dalla stessa origine e con la versione installata.
export async function GET() {
  await connection();
  const file = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
  const codice = await readFile(file, "utf8");
  return new Response(codice, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
