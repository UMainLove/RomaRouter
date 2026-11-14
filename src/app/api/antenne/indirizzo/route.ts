import { connection, type NextRequest } from "next/server";
import { cercaIndirizzo } from "@/lib/stradario";

// GET /api/antenne/indirizzo?q=via salaria 292 — suggerimenti dallo stradario ufficiale di Roma Capitale
export async function GET(req: NextRequest) {
  await connection();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return Response.json({ risultati: [] });
  try {
    return Response.json({ risultati: await cercaIndirizzo(q.slice(0, 120)), fonte: "Stradario ufficiale Roma Capitale – GeoRoma" });
  } catch (err) {
    return Response.json({ risultati: [], errore: (err as Error).message }, { status: 502 });
  }
}
