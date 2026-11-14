import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";
import { COOKIE_PASS, annullaPrenotazione, creaPass, passCorrente, prenotazioniDelPass, primaDataUtile, regoleDelPass } from "@/lib/sportello-arte";

// Il Pass dell'artista (DEMO dello sportello unico): una registrazione sola, poi si prenota con un tocco.
// Il Pass vive in un cookie httpOnly con un codice casuale: niente password.

async function risposta() {
  const pass = await passCorrente();
  if (!pass) return { pass: null, prima_data: primaDataUtile() };
  return { pass, regole: regoleDelPass(pass), prenotazioni: await prenotazioniDelPass(pass.id), prima_data: primaDataUtile() };
}

export async function GET() {
  await connection();
  return Response.json(await risposta(), { headers: { "Cache-Control": "no-store" } });
}

const creati = new Map<string, number[]>();
export async function POST(req: NextRequest) {
  await connection();
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }
  if (typeof b.sito_web === "string" && b.sito_web) return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  const chi = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "locale";
  const recenti = (creati.get(chi) ?? []).filter((t) => Date.now() - t < 3_600_000);
  if (recenti.length >= 10) return Response.json({ errore: "Troppe registrazioni da qui: riprova tra un'ora." }, { status: 429 });
  const esito = await creaPass(b);
  if ("errore" in esito) return Response.json(esito, { status: 400 });
  creati.set(chi, [...recenti, Date.now()]);
  (await cookies()).set(COOKIE_PASS, esito.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 86_400,
  });
  return Response.json({ pass: esito.pass, regole: regoleDelPass(esito.pass), prenotazioni: [], prima_data: primaDataUtile() }, { status: 201 });
}

// DELETE /api/artisti/pass → esci; DELETE /api/artisti/pass?prenotazione=<id> → annulla un turno non ancora comunicato
export async function DELETE(req: NextRequest) {
  await connection();
  const id = req.nextUrl.searchParams.get("prenotazione");
  if (id) {
    const pass = await passCorrente();
    if (!pass || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ errore: "Prenotazione non trovata" }, { status: 404 });
    if (!(await annullaPrenotazione(pass.id, id))) return Response.json({ errore: "Già comunicata alla Polizia Locale: per annullarla scrivi allo sportello" }, { status: 409 });
    return Response.json(await risposta());
  }
  (await cookies()).delete(COOKIE_PASS);
  return Response.json({ pass: null, prima_data: primaDataUtile() });
}
