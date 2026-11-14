/** Costanti condivise (client e server) per il flusso protetto a tre livelli di Oggetti Smarriti. */

export const CATEGORIE_OGGETTI = {
  borse: "Borse e zaini",
  portafogli: "Portafogli",
  documenti: "Documenti",
  elettronica: "Telefoni ed elettronica",
  chiavi: "Chiavi",
  occhiali: "Occhiali",
  valigie: "Valigie",
  abbigliamento: "Abbigliamento",
  ombrelli: "Ombrelli",
  altro: "Altro",
} as const;

export type CategoriaOggetto = keyof typeof CATEGORIE_OGGETTI;

export function eCategoriaOggetto(v: unknown): v is CategoriaOggetto {
  return typeof v === "string" && v in CATEGORIE_OGGETTI;
}

export const MACRO_AREE = {
  centro: { nome: "Centro storico", municipio: "I", lat: 41.8986, lon: 12.4768 },
  testaccio: { nome: "Testaccio", municipio: "I", lat: 41.8769, lon: 12.4757 },
  trastevere: { nome: "Trastevere", municipio: "I", lat: 41.8894, lon: 12.4703 },
  aventino: { nome: "Aventino", municipio: "I", lat: 41.8834, lon: 12.4813 },
  prati: { nome: "Prati / Borgo", municipio: "I", lat: 41.9065, lon: 12.4618 },
  termini: { nome: "Termini / Esquilino", municipio: "I", lat: 41.9009, lon: 12.502 },
  parioli: { nome: "Parioli / Salario", municipio: "II", lat: 41.9225, lon: 12.4955 },
  tiburtina: { nome: "Tiburtina / San Lorenzo / Pietralata", municipio: "II / IV", lat: 41.9098, lon: 12.5305 },
  montesacro: { nome: "Montesacro / Nomentano", municipio: "III", lat: 41.9465, lon: 12.5268 },
  prenestino: { nome: "Prenestino / Centocelle", municipio: "V", lat: 41.8862, lon: 12.5562 },
  tor_vergata: { nome: "Tor Vergata / Casilina", municipio: "VI", lat: 41.8576, lon: 12.631 },
  san_giovanni: { nome: "San Giovanni", municipio: "VII", lat: 41.8859, lon: 12.5096 },
  appio: { nome: "Appio / Tuscolano", municipio: "VII", lat: 41.8695, lon: 12.523 },
  ostiense: { nome: "Ostiense / Garbatella", municipio: "VIII", lat: 41.8705, lon: 12.4795 },
  eur: { nome: "EUR / Laurentino", municipio: "IX", lat: 41.8294, lon: 12.4712 },
  ostia: { nome: "Ostia / Litorale", municipio: "X", lat: 41.7324, lon: 12.2886 },
  marconi: { nome: "Marconi / Portuense", municipio: "XI", lat: 41.8576, lon: 12.4518 },
  monteverde: { nome: "Monteverde / Gianicolense", municipio: "XII", lat: 41.8712, lon: 12.4525 },
  aurelio: { nome: "Aurelio / Boccea", municipio: "XIII", lat: 41.8984, lon: 12.4268 },
  monte_mario: { nome: "Monte Mario / Gemelli", municipio: "XIV", lat: 41.9292, lon: 12.4352 },
  cassia: { nome: "Cassia / Flaminia", municipio: "XV", lat: 41.9535, lon: 12.4735 },
  altro: { nome: "Altra zona di Roma", municipio: "Roma", lat: 41.8902, lon: 12.4922 },
} as const;

export type MacroArea = keyof typeof MACRO_AREE;

export function eMacroArea(v: unknown): v is MacroArea {
  return typeof v === "string" && v in MACRO_AREE;
}

export const FASCE_ORARIE = {
  mattina: "Mattina (06–12)",
  pomeriggio: "Pomeriggio (12–18)",
  sera: "Sera (18–24)",
  notte: "Notte (00–06)",
} as const;

export type FasciaOraria = keyof typeof FASCE_ORARIE;

export function eFasciaOraria(v: unknown): v is FasciaOraria {
  return typeof v === "string" && v in FASCE_ORARIE;
}

export const LUOGHI_TIPO = {
  mezzi: "Mezzo pubblico (bus, tram, metro)",
  strada: "In strada o luogo pubblico",
  taxi: "Taxi",
} as const;

export type LuogoTipo = keyof typeof LUOGHI_TIPO;

export function eLuogoTipo(v: unknown): v is LuogoTipo {
  return typeof v === "string" && v in LUOGHI_TIPO;
}

export const CANALI_RECAPITO = {
  sms: "SMS",
  email: "Email",
  telefono: "Numero di telefono",
  whatsapp: "WhatsApp",
} as const;

export type CanaleRecapito = keyof typeof CANALI_RECAPITO;

export const PROVENIENZE_UTENTE = {
  italiano: "Italiano",
  straniero_ue: "Straniero (UE)",
  straniero_extra_ue: "Straniero (Extra UE)",
} as const;

export type ProvenienzaUtente = keyof typeof PROVENIENZE_UTENTE;

export function eProvenienzaUtente(v: unknown): v is ProvenienzaUtente {
  return typeof v === "string" && v in PROVENIENZE_UTENTE;
}

export const TIPI_RECAPITO_ML = {
  sms: "SMS",
  email: "Email",
  telefono: "Numero di telefono",
  struttura: "Struttura in cui alloggia",
} as const;

export type TipoRecapitoMl = keyof typeof TIPI_RECAPITO_ML;

export function eTipoRecapitoMl(v: unknown): v is TipoRecapitoMl {
  return typeof v === "string" && v in TIPI_RECAPITO_ML;
}

export const MAGIC_LINK_SCADENZA_MS = 3_600_000; // 1 ora fissa

export const MOTIVI_RIFIUTO = {
  risposte_errate: "Risposte non corrispondenti all'oggetto",
  descrizione_diversa: "Descrizione incompatibile con quanto custodito",
  sospetto: "Richiesta sospetta o elementi insufficienti (verifica di persona consigliata)",
  altro: "Altro motivo motivato",
} as const;

export type MotivoRifiuto = keyof typeof MOTIVI_RIFIUTO;

export const RUOLI_CUSTODE = {
  volontario: "Volontario residente (CIE)",
  guardia_giurata: "Guardia Giurata (con decreto e istituto)",
  forze_ordine: "Forze dell'Ordine / Polizia Locale",
  punto_h24: "Punto Amico H24 convenzionato",
  ufficio: "Ufficio Oggetti Rinvenuti (Roma Capitale)",
} as const;

export type RuoloCustode = keyof typeof RUOLI_CUSTODE;

export type RuoloSessione = "cittadino" | "turista" | RuoloCustode;

export const STATI_OGGETTO_ETICHETTE: Record<string, string> = {
  da_consegnare: "Da consegnare a un custode / punto",
  in_deposito: "In deposito all'Ufficio",
  custodia_temporanea: "In custodia temporanea protetta",
  in_verifica: "Verifica proprietà in corso",
  restituito: "Restituito al proprietario",
  consegnato_comando: "Consegnato alle Forze dell'Ordine",
  al_ritrovatore: "Assegnato al ritrovatore (art. 929 c.c.)",
  devoluto: "Devoluto",
};

export const LINK_EMERGENZA_TELEFONO = [
  {
    nome: "Apple Dov'è (iPhone)",
    url: "https://www.icloud.com/find",
    nota: "Attiva Modalità Smarrito e mostra un numero alternativo sullo schermo.",
  },
  {
    nome: "Google Trova il mio dispositivo (Android)",
    url: "https://www.google.com/android/find",
    nota: "Blocca lo schermo o cancella i dati da remoto.",
  },
  {
    nome: "Blocco SIM e IMEI",
    url: "https://www.agcom.it",
    nota: "Chiama il tuo operatore telefonico per sospendere la SIM e richiedere il blocco IMEI dopo denuncia.",
  },
];

export const PASSI_RITIRO_PUBBLICO = [
  {
    titolo: "Catalogo consultabile solo dal backend",
    testo: "Il catalogo degli oggetti rinvenuti non è pubblico né sfogliabile dai cittadini: possono consultarlo solo operatori comunali, custodi abilitati e Forze dell'Ordine autenticati.",
  },
  {
    titolo: "Segnalazione protetta in Ho perso",
    testo: "Chi ha smarrito un oggetto invia la propria descrizione nella scheda Ho perso (protetto); il matching avviene in privato lato server.",
  },
  {
    titolo: "Contatto avviato solo dal custode",
    testo: "Il matching resta nascosto lato server: se emerge corrispondenza è l'operatore o il custode a contattarti con domande aperte di verifica.",
  },
  {
    titolo: "Verifica di persona allo sportello",
    testo: "Per il ritiro presso l'Ufficio Oggetti Rinvenuti porta un documento valido (o delega/consolato) e la ricevuta dei diritti di custodia vigenti.",
  },
];

export const MATRICE_DEMO = [
  { funzionalita: "Catalogo oggetti su PostgreSQL riservato al solo backend operatori", stato: "Reale nella demo" },
  { funzionalita: "Segnalazioni Ho perso / Ho trovato con schema riservato separato", stato: "Reale nella demo" },
  { funzionalita: "Cifratura AES-256-GCM di dettagli, messaggi, recapiti e denunce", stato: "Reale nella demo" },
  { funzionalita: "Impronte HMAC-SHA256 per documenti (semaforo) e codici consegna", stato: "Reale nella demo" },
  { funzionalita: "Matching nascosto lato server + inbox pseudonima + conferma bilaterale + Audit Log", stato: "Reale nella demo" },
  { funzionalita: "Accesso SPID / CIE, MFA operatori, Magic Link con PIN", stato: "Simulato localmente con cookie firmato" },
  { funzionalita: "Bot WhatsApp / SMS, numero mascherato e lettura OCR denuncia/documento", stato: "Simulato e persistito in DB per verifica dal vivo" },
  { funzionalita: "Integrazione reale con API comunali INF39645 / ATAC / Questura", stato: "Previsto in produzione" },
] as const;

export const TESTI_NOTIFICA = {
  confermaPerso:
    "In caso di match riceverai un messaggio criptato dal ritrovatore o custode temporaneo per la verifica della proprietà.",
};

export const SOGLIA_ANNI_VOLONTARIO = 5;
export const MAX_TENTATIVI_OGGETTO = 3;

export const MUNICIPI_ROMA = [
  "Comune di Roma (Ufficio centrale)",
  "Municipio I · Centro Storico",
  "Municipio II · Parioli / Nomentano",
  "Municipio III · Montesacro",
  "Municipio IV · Tiburtina",
  "Municipio V · Prenestino",
  "Municipio VI · Le Torri",
  "Municipio VII · Appio / Tuscolano",
  "Municipio VIII · Ostiense / Garbatella",
  "Municipio IX · EUR",
  "Municipio X · Ostia / Litorale",
  "Municipio XI · Marconi / Portuense",
  "Municipio XII · Monteverde",
  "Municipio XIII · Aurelio",
  "Municipio XIV · Monte Mario",
  "Municipio XV · Cassia / Flaminia",
] as const;

export const CATEGORIE_PUNTI_RICONSEGNA = {
  ufficio: "Ufficio Oggetti Rinvenuti",
  forze_ordine: "Caserme e Forze dell'Ordine (Carabinieri, Polizia, GdF, Polizia Locale)",
  ospedale_h24: "Ospedali H24 e Pronto Soccorso",
  misericordia: "Misericordie, CRI e soccorso (anche H24)",
  affiliato_h24: "Punti e aziende H24 affiliati",
  guardia_giurata: "Guardie Giurate (istituti convenzionati)",
  volontario: "Privati affiliati approvati (collaboratori del servizio)",
} as const;

export type CategoriaPuntoRiconsegna = keyof typeof CATEGORIE_PUNTI_RICONSEGNA;

export function eCategoriaPuntoRiconsegna(v: unknown): v is CategoriaPuntoRiconsegna {
  return typeof v === "string" && v in CATEGORIE_PUNTI_RICONSEGNA;
}

export interface PuntoRiconsegnaPubblico {
  id: string;
  categoria: CategoriaPuntoRiconsegna;
  nome: string;
  ente: string;
  indirizzo: string;
  posizioneEsatta: boolean;
  municipio: string;
  macroArea: string | null;
  zonaNome: string;
  lat: number;
  lon: number;
  h24: boolean;
  orari: string;
  telefono: string | null;
  note: string | null;
  fonte: "punti_consegna" | "custode_approvato";
  verificatoComune: boolean;
}

