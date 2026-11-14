import { connection } from "next/server";
import { campiGeoJSON } from "@/lib/sport-campi";

// GET /api/sport/campi — le forme dei campi (con disciplina e fondo) e i perimetri degli impianti.
// Copia statica: public/dati/sport/campi.json
export async function GET() {
  await connection();
  return Response.json(await campiGeoJSON(), { headers: { "Cache-Control": "public, max-age=300" } });
}
