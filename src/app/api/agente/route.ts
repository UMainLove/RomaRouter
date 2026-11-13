import { eAmbito } from "@/lib/ambiti";
import { instrada } from "@/lib/agente/instrada";
import type { RichiestaAgente } from "@/lib/agente/tipi";

// POST /api/agente: capisce la richiesta e restituisce ambito, dati estratti,
// eventuale domanda di chiarimento e destinazione. Oggi usa l'instradamento a parole chiave;
// qui si può collegare l'agente LLM mantenendo la stessa forma di RispostaAgente.
// Privacy: il testo non viene salvato né scritto nei log.
export async function POST(request: Request) {
  let corpo: Partial<RichiestaAgente>;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ errore: "Richiesta non valida" }, { status: 400 });
  }

  const messaggi = Array.isArray(corpo.messaggi)
    ? corpo.messaggi.filter((m): m is string => typeof m === "string").slice(-6).map((m) => m.slice(0, 500))
    : [];
  if (messaggi.length === 0) {
    return Response.json({ errore: "Scrivi cosa ti serve" }, { status: 400 });
  }

  const risposte =
    corpo.risposte && typeof corpo.risposte === "object"
      ? Object.fromEntries(
          Object.entries(corpo.risposte).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v.slice(0, 120)]),
        )
      : undefined;

  const ambitoForzato = eAmbito(corpo.ambitoForzato) || corpo.ambitoForzato === "altro" ? corpo.ambitoForzato : undefined;
  const ambitoCorrente = eAmbito(corpo.ambitoCorrente) ? corpo.ambitoCorrente : undefined;

  return Response.json(instrada({ messaggi, risposte, ambitoForzato, ambitoCorrente }));
}
