import { connection } from "next/server";
import { normalizza } from "@/lib/geo";
import { eCategoriaPuntoRiconsegna } from "@/lib/oggetti/costanti";
import { caricaPuntiRiconsegnaPubblici } from "@/lib/oggetti/db";

/**
 * Elenco pubblico (senza oggetti smarriti!) dei punti dove consegnare un oggetto ritrovato a Roma:
 * Ufficio Oggetti Rinvenuti, Forze dell'Ordine, Ospedali H24, Misericordie/CRI,
 * aziende H24 affiliate, guardie giurate e privati volontari già approvati dal Comune/Municipio.
 */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const categoriaParam = (url.searchParams.get("categoria") ?? "").trim();
  const zonaParam = (url.searchParams.get("zona") ?? "").trim();
  const soloH24 = url.searchParams.get("h24") === "1";
  const q = normalizza(url.searchParams.get("q") ?? "");

  const tutti = await caricaPuntiRiconsegnaPubblici();

  const filtrati = tutti.filter((p) => {
    if (categoriaParam && eCategoriaPuntoRiconsegna(categoriaParam) && p.categoria !== categoriaParam) {
      return false;
    }
    if (zonaParam && p.macroArea !== zonaParam) {
      return false;
    }
    if (soloH24 && !p.h24) {
      return false;
    }
    if (q) {
      const testo = normalizza(`${p.nome} ${p.ente} ${p.indirizzo} ${p.zonaNome} ${p.municipio} ${p.note ?? ""}`);
      if (!testo.includes(q)) return false;
    }
    return true;
  });

  return Response.json({
    punti: filtrati,
    totale: filtrati.length,
    totaleComplessivo: tutti.length,
  });
}
