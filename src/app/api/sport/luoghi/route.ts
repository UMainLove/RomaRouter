import { connection } from "next/server";
import { luoghiGeoJSON } from "@/lib/sport";

// GET /api/sport/luoghi — tutti i luoghi dove fare sport a Roma (impianti comunali, centri municipali, campi liberi,
// aree fitness, club), con discipline, accesso, accessibilita' e fonti. Copia statica: public/dati/sport/luoghi.json
export async function GET() {
  await connection();
  return Response.json(await luoghiGeoJSON(), { headers: { "Cache-Control": "public, max-age=300" } });
}
