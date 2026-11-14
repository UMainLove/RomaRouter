import { connection, type NextRequest } from "next/server";
import { caricaCatalogoPubblico } from "@/lib/oggetti/db";
import { eRuoloCustode, leggiSessione } from "@/lib/oggetti/sessione";

/**
 * GET /api/oggetti/catalogo — RISERVATO ESCLUSIVAMENTE AL BACKEND OPERATORI
 * Il catalogo pubblico per i cittadini è stato eliminato: solo operatori, custodi
 * abilitati, FF.OO. e Ufficio autenticati possono consultare il catalogo via backend.
 */
export async function GET(req: NextRequest) {
  await connection();
  const s = await leggiSessione();
  if (!s || !eRuoloCustode(s.ruolo)) {
    return Response.json(
      { errore: "Catalogo consultabile esclusivamente dal backend operatori e custodi autenticati." },
      { status: 403 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const dati = await caricaCatalogoPubblico({
    q: sp.get("q") ?? "",
    categoria: sp.get("categoria") ?? "",
    luogo: sp.get("luogo") ?? "",
    colore: sp.get("colore") ?? "",
    dal: sp.get("dal") ?? "",
    zona: sp.get("zona") ?? "",
  });
  return Response.json(dati, { headers: { "Cache-Control": "no-store" } });
}
