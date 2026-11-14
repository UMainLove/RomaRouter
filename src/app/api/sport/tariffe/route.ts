import { connection } from "next/server";
import { tariffe } from "@/lib/sport";

// GET /api/sport/tariffe — tariffe massime degli impianti sportivi di Roma Capitale (2026/2027)
export async function GET() {
  await connection();
  return Response.json({ tariffe: await tariffe() }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
