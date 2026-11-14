import { connection, type NextRequest } from "next/server";
import { cercaIndirizzo } from "@/lib/stradario";

// GET /api/artisti/indirizzo?q=campo de fiori — suggerimenti dallo stradario ufficiale di Roma Capitale
export async function GET(req: NextRequest) {
  await connection();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ risultati: [] });
  try {
    let risultati = await cercaIndirizzo(q.slice(0, 120));
    // santi abbreviati nello stradario ("S. MARIA"): seconda prova
    if (!risultati.length && /\b(sant[oa]?|san|sant')\b/i.test(q)) {
      risultati = await cercaIndirizzo(q.slice(0, 120).replace(/\b(sant[oa]?|san)\b\s*|\bsant'\s*/gi, "S. "));
    }
    return Response.json({ risultati, fonte: "Stradario ufficiale Roma Capitale – GeoRoma" });
  } catch (err) {
    return Response.json({ risultati: [], errore: (err as Error).message }, { status: 502 });
  }
}
