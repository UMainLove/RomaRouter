import "server-only";
import { cookies } from "next/headers";
import { firmaPayload, verificaPayloadFirmato } from "./crypto";
import type { RuoloCustode, RuoloSessione } from "./costanti";

export const NOME_COOKIE_SESSIONE = "rr_oggetti_sessione";

export type MetodoAccesso = "spid" | "cie" | "magic_link" | "operatore_emergenza" | "operatore_ente";

export interface SessioneOggetti {
  /** Riferimento opaco utente/custode (es. "demo:cittadino-1" o "demo:volontario"). */
  sub: string;
  ruolo: RuoloSessione;
  metodo: MetodoAccesso;
  etichetta: string;
  custodeId?: string;
  postazioneId?: string;
  badgeEnte?: string;
  mfaVerificato?: boolean;
  /** Data fine validità ISO (obbligatoria per Magic Link turista / check-out). */
  scadeIl: string;
}

export const PROFILI_DEMO: Record<
  string,
  Omit<SessioneOggetti, "scadeIl"> & { descrizione: string; postazione?: string }
> = {
  cittadino_spid: {
    sub: "demo:cittadino-spid",
    ruolo: "cittadino",
    metodo: "spid",
    etichetta: "Cittadino (SPID)",
    descrizione: "Può inviare 1 segnalazione Ho perso attiva, segnalare Ho trovato e rispondere ai custodi.",
  },
  cittadino_cie: {
    sub: "demo:cittadino-cie",
    ruolo: "cittadino",
    metodo: "cie",
    etichetta: "Cittadino (CIE)",
    descrizione: "Accesso CIE personale per Ho perso / Ho trovato e conferma bilaterale.",
  },
  volontario: {
    sub: "demo:volontario",
    ruolo: "volontario",
    metodo: "cie",
    etichetta: "Custode V-07 · Volontario CIE (Trastevere)",
    custodeId: "39986216-98a7-4324-bd72-186e960e236a",
    descrizione: "Volontario residente dal 2009 approvato: può custodire oggetti comuni (no documenti) e fare passaggi di consegna.",
  },
  guardia_giurata: {
    sub: "demo:guardia",
    ruolo: "guardia_giurata",
    metodo: "operatore_ente",
    etichetta: "Custode G-12 · Guardia Giurata (Ostiense)",
    custodeId: "a6fdd997-cd25-4623-bfd8-1107dfdcad31",
    badgeEnte: "GPG-RM-418",
    postazioneId: "PATTUGLIA-OST-04",
    mfaVerificato: true,
    descrizione: "Guardia giurata approvata dall'istituto e dal Comune.",
  },
  punto_h24: {
    sub: "demo:punto-h24",
    ruolo: "punto_h24",
    metodo: "operatore_ente",
    etichetta: "Punto H24 H-21 (Testaccio)",
    custodeId: "fe1ac860-8646-4b19-8723-e82f01a869e8",
    badgeEnte: "H24-TEST-21",
    postazioneId: "RECEPTION-H24-21",
    mfaVerificato: true,
    descrizione: "Punto Amico H24 convenzionato: accoglie consegne, ospita appuntamenti e assiste chi ha perso il telefono.",
  },
  forze_ordine: {
    sub: "demo:forze-ordine",
    ruolo: "forze_ordine",
    metodo: "operatore_ente",
    etichetta: "Polizia Locale P-03 (Aventino)",
    custodeId: "c62c4e10-928d-43f3-88e3-170a324fe37f",
    badgeEnte: "PL-RM-0309",
    postazioneId: "CMD-AVENTINO-03",
    mfaVerificato: true,
    descrizione: "Forze dell'Ordine: semaforo documenti, sblocco allo sportello e ricezione passaggi di consegna.",
  },
  ufficio: {
    sub: "demo:ufficio",
    ruolo: "ufficio",
    metodo: "operatore_ente",
    etichetta: "Operatore Ufficio Oggetti Rinvenuti",
    custodeId: "ccb36c3c-ba6d-4754-9de9-79075e8a64b2",
    badgeEnte: "UOR-CAP-01",
    postazioneId: "SPORTELLO-OST-191",
    mfaVerificato: true,
    descrizione: "Ufficio comunale: catalogo completo Livello 3, approvazione custodi/guardie, sblocco e Audit Log.",
  },
};

export function eRuoloCustode(r: RuoloSessione): r is RuoloCustode {
  return r === "volontario" || r === "guardia_giurata" || r === "forze_ordine" || r === "punto_h24" || r === "ufficio";
}

export function puoOperareEmergenza(r: RuoloSessione): boolean {
  return r === "guardia_giurata" || r === "forze_ordine" || r === "punto_h24" || r === "ufficio";
}

export function eForzeOUfficio(r: RuoloSessione): boolean {
  return r === "forze_ordine" || r === "ufficio";
}

export async function leggiSessione(): Promise<SessioneOggetti | null> {
  const store = await cookies();
  const raw = store.get(NOME_COOKIE_SESSIONE)?.value;
  if (!raw) return null;
  const json = verificaPayloadFirmato(raw);
  if (!json) return null;
  try {
    const s = JSON.parse(json) as SessioneOggetti;
    if (!s.sub || !s.ruolo || !s.scadeIl) return null;
    if (Date.now() > new Date(s.scadeIl).getTime()) return null;
    return s;
  } catch {
    return null;
  }
}

export async function impostaSessione(sessione: SessioneOggetti) {
  const store = await cookies();
  const maxAge = Math.max(60, Math.floor((new Date(sessione.scadeIl).getTime() - Date.now()) / 1000));
  const valore = firmaPayload(JSON.stringify(sessione));
  store.set(NOME_COOKIE_SESSIONE, valore, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  });
}

export async function cancellaSessione() {
  const store = await cookies();
  store.delete(NOME_COOKIE_SESSIONE);
}
