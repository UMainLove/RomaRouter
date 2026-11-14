import { connection, type NextRequest } from "next/server";
import { passCorrente, prenota } from "@/lib/sportello-arte";

// POST /api/artisti/prenota — «Ci sarò»: l'artista col Pass sceglie posto, giorno e ora.
// Tutte le regole si controllano qui; preavviso alla Polizia Locale, SIAE e nulla osta li manda lo sportello.
export async function POST(req: NextRequest) {
  await connection();
  const pass = await passCorrente();
  if (!pass) return Response.json({ errore: "Prima crea il tuo Pass artista" }, { status: 401 });
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }
  const esito = await prenota(pass, b);
  if ("errore" in esito) return Response.json(esito, { status: 422 });
  return Response.json(esito, { status: 201 });
}
