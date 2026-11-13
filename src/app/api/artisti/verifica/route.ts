import { connection, type NextRequest } from "next/server";
import { eAttivita, verificaLuogo } from "@/lib/artisti";
import { cercaIndirizzo } from "@/lib/stradario";

// GET /api/artisti/verifica?indirizzo=piazza navona&attivita=musica[&quando=2026-11-20T18:00]
// GET /api/artisti/verifica?lat=41.89&lon=12.47&attivita=silenziosa
// Dice se in quel punto ci si puo' esibire, perche', a quali condizioni, cosa fare e chi si esibisce li'.
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const attivita = sp.get("attivita") ?? "musica";
  if (!eAttivita(attivita)) return Response.json({ errore: "attivita non valida" }, { status: 400 });
  const quando = sp.get("quando") ? new Date(sp.get("quando")!) : new Date();
  if (isNaN(quando.getTime())) return Response.json({ errore: "data non valida" }, { status: 400 });

  let lat = Number(sp.get("lat")), lon = Number(sp.get("lon"));
  let luogo: { etichetta: string; precisione: string } | null = null;
  const indirizzo = sp.get("indirizzo")?.trim();
  if (indirizzo) {
    try {
      // lo stradario scrive i santi abbreviati ("PIAZZA S. MARIA IN TRASTEVERE"): seconda prova con "S."
      const testo = indirizzo.slice(0, 120);
      let [primo] = await cercaIndirizzo(testo);
      if (!primo && /\b(sant[oa]?|san|sant')\b/i.test(testo)) {
        [primo] = await cercaIndirizzo(testo.replace(/\b(sant[oa]?|san)\b\s*|\bsant'\s*/gi, "S. "));
      }
      if (!primo) return Response.json({ errore: "Indirizzo non trovato nello stradario di Roma Capitale" }, { status: 404 });
      ({ lat, lon } = primo);
      luogo = { etichetta: primo.etichetta, precisione: primo.precisione };
    } catch (err) {
      return Response.json({ errore: (err as Error).message }, { status: 502 });
    }
  }
  if (!(lat > 41.5 && lat < 42.2 && lon > 12.1 && lon < 13)) {
    return Response.json({ errore: "Serve un indirizzo di Roma o lat e lon" }, { status: 400 });
  }
  const r = await verificaLuogo(lat, lon, attivita, quando);
  return Response.json({ luogo, quando: quando.toISOString(), ...r }, { headers: { "Cache-Control": "no-store" } });
}
