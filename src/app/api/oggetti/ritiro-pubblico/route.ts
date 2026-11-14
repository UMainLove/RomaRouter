import { connection } from "next/server";

/**
 * POST /api/oggetti/ritiro-pubblico — DISABILITATO per regola di sicurezza:
 * dal Catalogo Pubblico (Livello 1 INF39645) non deve essere mai possibile
 * richiedere, prenotare o ottenere oggetti. Il cittadino apre "2. Ho perso"
 * ed è solo l'operatore/custode ad avviare la verifica dopo matching lato server.
 */
export async function POST() {
  await connection();
  return Response.json(
    {
      errore:
        "Il catalogo pubblico non è disponibile ai cittadini ed è consultabile esclusivamente dal backend operatori. Usa 'Ho perso (protetto)' oppure recati di persona all'Ufficio Oggetti Rinvenuti.",
    },
    { status: 403 },
  );
}
