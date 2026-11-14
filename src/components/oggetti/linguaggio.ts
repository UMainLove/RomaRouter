/*
 * Oggetti smarriti: il linguaggio della mappa. La spilla dice dove consegnare o ritirare (forma e colore per
 * il tipo di punto, bollino «24h» se e' sempre aperto); i tasselli dicono che cosa si e' perso o trovato.
 * Glifi a tratto bianco in coordinate 0..24 (come le altre mappe).
 */
export type TipoPunto = "ufficio" | "forze_ordine" | "ospedale_h24" | "misericordia" | "affiliato_h24";

export const PUNTI: Record<TipoPunto, { n: string; breve: string; c: string; g: string; spiega: string }> = {
  forze_ordine: {
    n: "Polizia e Carabinieri", breve: "Polizia", c: "#1F4E9C",
    g: `<path d="M12 3 5 6v5.5c0 4.4 3 8.1 7 9.5 4-1.4 7-5.1 7-9.5V6Z"/><path d="m9 12 2.2 2.2L15.5 10"/>`,
    spiega: "Caserme, commissariati e Polizia Locale: accettano tutto, anche documenti, carte e chiavi d'auto.",
  },
  ufficio: {
    n: "Ufficio Oggetti Rinvenuti", breve: "Ufficio", c: "#8E2453",
    g: `<path d="M4 8.5h16v11H4Z"/><path d="M3 5h18v3.5H3ZM10 12h4"/>`,
    spiega: "Il deposito centrale di Roma Capitale, in Circonvallazione Ostiense 191: qui finisce tutto quello che non viene ritirato.",
  },
  ospedale_h24: {
    n: "Pronto soccorso H24", breve: "Ospedali", c: "#D2372F",
    g: `<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5Z" fill="#fff" fill-opacity=".25"/>`,
    spiega: "Aperti giorno e notte: utili se trovi qualcosa di notte. Consegnano poi alle Forze dell'Ordine.",
  },
  misericordia: {
    n: "Misericordie e Croce Rossa", breve: "Soccorso", c: "#E07A1F",
    g: `<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20Z"/>`,
    spiega: "Associazioni di soccorso che ricevono oggetti trovati, alcune anche di notte.",
  },
  affiliato_h24: {
    n: "Punti amici H24", breve: "Punti amici", c: "#16955A",
    g: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>`,
    spiega: "Attività sempre aperte che collaborano con il servizio (alcune sono di esempio in questa versione).",
  },
};
export const TIPI_PUNTO = Object.keys(PUNTI) as TipoPunto[];

/** Le categorie di oggetti, con un glifo per tassello. */
export const COSE: { k: string; n: string; g: string }[] = [
  { k: "borse", n: "Borsa o zaino", g: `<path d="M6 8h12l1.2 12H4.8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>` },
  { k: "portafogli", n: "Portafoglio", g: `<rect x="3.5" y="6.5" width="17" height="12" rx="2.5"/><path d="M15 12.5h5.5"/><circle cx="16.4" cy="12.5" r=".8" fill="#fff"/>` },
  { k: "documenti", n: "Documenti", g: `<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.5 1.8-2.2 3.2-2.2s2.6.7 3.2 2.2M14 10h4M14 13.5h3"/>` },
  { k: "elettronica", n: "Telefono o PC", g: `<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 18h2"/>` },
  { k: "chiavi", n: "Chiavi", g: `<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M14 9l2 2"/>` },
  { k: "occhiali", n: "Occhiali", g: `<circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14c1.3-1 2.7-1 4 0M3 13l1.5-5M21 13l-1.5-5"/>` },
  { k: "valigie", n: "Valigia", g: `<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9.5 7V4.5h5V7M9 11v5M15 11v5"/>` },
  { k: "abbigliamento", n: "Vestiti", g: `<path d="m8 4-4.5 3 2 4L7.5 10v10h9V10l2 1 2-4L16 4c-.7 1.5-2.2 2.5-4 2.5S8.7 5.5 8 4Z"/>` },
  { k: "ombrelli", n: "Ombrello", g: `<path d="M3.5 12a8.5 8.5 0 0 1 17 0Z"/><path d="M12 12v6.5a2 2 0 0 1-4 0"/>` },
  { k: "altro", n: "Altro", g: `<circle cx="6" cy="12" r="1.5" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="#fff"/><circle cx="18" cy="12" r="1.5" fill="#fff"/>` },
];

export const FASCE: [string, string][] = [["mattina", "Mattina"], ["pomeriggio", "Pomeriggio"], ["sera", "Sera"], ["notte", "Notte"]];
export const LUOGHI: [string, string][] = [["strada", "In strada"], ["mezzi", "Bus, tram, metro"], ["taxi", "Taxi"]];
export const COLORI: [string, string][] = [
  ["nero", "#1E1E1E"], ["bianco", "#FFFFFF"], ["grigio", "#9AA0A6"], ["marrone", "#7A4E2D"], ["blu", "#2457C5"],
  ["rosso", "#D2372F"], ["verde", "#2E8B57"], ["giallo", "#F2C230"], ["rosa", "#E87FB0"], ["beige", "#D9C3A0"],
];
export const CANALI: [string, string][] = [["whatsapp", "WhatsApp"], ["sms", "SMS"], ["email", "Email"]];

/** Telefono perso: i servizi ufficiali per bloccarlo o ritrovarlo. */
export const TELEFONO = [
  { nome: "iPhone: Dov'è", url: "https://www.icloud.com/find", nota: "Attiva Modalità smarrito e mostra un numero da chiamare." },
  { nome: "Android: Trova il mio dispositivo", url: "https://www.google.com/android/find", nota: "Fai suonare, blocca o cancella da remoto." },
  { nome: "SIM e IMEI", url: "https://www.agcom.it", nota: "Chiama il tuo operatore per sospendere la SIM; dopo la denuncia chiedi il blocco IMEI." },
];
