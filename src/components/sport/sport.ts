/*
 * Linguaggio della mappa dello sport: il glifo dice lo sport, il colore dice come si entra.
 * Glifi in coordinate 0..24, tratto bianco (come mappa-rr/icone.ts).
 */
export type Gruppo = "calcio" | "tennis" | "padel" | "nuoto" | "basket" | "volley" | "palestra" | "corsa" | "altro";
export type Accesso = "libero" | "comunale" | "scuola" | "club";

export const GLIFI_SPORT: Record<Gruppo | "tutti", string> = {
  tutti: `<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/>`,
  calcio: `<circle cx="12" cy="12" r="8.5"/><path d="m12 8.2 3.4 2.5-1.3 4h-4.2l-1.3-4Z" fill="#fff" stroke="none"/><path d="M12 3.5v4.7M15.4 10.7l4.6-1.6M14.1 14.7l2.8 4M9.9 14.7l-2.8 4M8.6 10.7 4 9.1"/>`,
  tennis: `<circle cx="12" cy="12" r="8.5"/><path d="M5.6 6.4c3.6 3 3.6 8.2 0 11.2M18.4 6.4c-3.6 3-3.6 8.2 0 11.2"/>`,
  padel: `<path d="M9.4 3.6a5.6 5.6 0 0 1 7.9 0 5.6 5.6 0 0 1 0 7.9l-3.3 3.3-7.9-7.9Z"/><path d="m6.1 6.9 7.9 7.9M6.6 15.8l-3 3"/><circle cx="12.2" cy="8.4" r=".6" fill="#fff"/><circle cx="14.6" cy="6.6" r=".6" fill="#fff"/><circle cx="10.4" cy="6.2" r=".6" fill="#fff"/>`,
  nuoto: `<circle cx="15.5" cy="6.5" r="2"/><path d="m5 12.5 4.5-3.5 3 2.5 3-2"/><path d="M3 16.5c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0M3 20c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0"/>`,
  basket: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17M6 6c2.6 3.3 2.6 8.7 0 12M18 6c-2.6 3.3-2.6 8.7 0 12"/>`,
  volley: `<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c-1.5 4 .5 7 4.5 8.5M12 12c-4 .5-7 3-7.5 6M12 12c2.5 3 2.8 6.3 1.6 8.4M8 4.5c3 1.5 4.3 4.3 4 7.5"/>`,
  palestra: `<path d="M6.5 7.5v9M17.5 7.5v9M4 9.5v5M20 9.5v5M6.5 12h11"/>`,
  corsa: `<circle cx="14.5" cy="4.8" r="1.9"/><path d="m8 21 3-6 3 2.5 1 4M11 15l1.5-5.5-3.5 1-2 3M12.5 9.5l3 2.5 3.5-.5"/>`,
  altro: `<path d="m12 3 2.4 5.6 6 .5-4.6 4 1.4 5.9L12 15.9 6.8 19l1.4-5.9-4.6-4 6-.5Z"/>`,
};

export const SPORT: { k: Gruppo | "tutti"; n: string }[] = [
  { k: "tutti", n: "Tutti" }, { k: "calcio", n: "Calcio" }, { k: "tennis", n: "Tennis" }, { k: "padel", n: "Padel" }, { k: "nuoto", n: "Nuoto" },
  { k: "basket", n: "Basket" }, { k: "volley", n: "Volley" }, { k: "palestra", n: "Palestra" }, { k: "corsa", n: "Corsa" }, { k: "altro", n: "Altro" },
];

/** Come si entra: il colore della spilla. */
export const ACCESSO: Record<Accesso, { c: string; n: string; breve: string; frase: string }> = {
  libero: { c: "#16955A", n: "Libero e gratis", breve: "Gratis", frase: "Si entra liberamente, senza pagare" },
  comunale: { c: "#1F63D1", n: "Impianto comunale", breve: "Comunali", frase: "Del Comune, con tariffe massime fissate per legge" },
  scuola: { c: "#7A4FD0", n: "Corsi in una scuola", breve: "Scuole", frase: "Centro sportivo municipale: corsi nella palestra della scuola" },
  club: { c: "#5F6B7A", n: "Club o privato", breve: "Club", frase: "Club, palestra o campo privato: si paga" },
};

export const PRIORITA: Gruppo[] = ["nuoto", "padel", "tennis", "basket", "volley", "calcio", "corsa", "palestra", "altro"];

export const NOMI_DISCIPLINA: Record<string, [string, string]> = {
  calcio: ["campo da calcio", "campi da calcio"], calcetto: ["campo da calcetto", "campi da calcetto"], calcio_a_7: ["campo a 7", "campi a 7"],
  tennis: ["campo da tennis", "campi da tennis"], padel: ["campo da padel", "campi da padel"], nuoto: ["piscina", "piscine"],
  acquagym: ["vasca per acquagym", "vasche"], pallanuoto: ["vasca da pallanuoto", "vasche"], basket: ["campo da basket", "campi da basket"],
  pallavolo: ["campo da pallavolo", "campi da pallavolo"], beach_volley: ["campo da beach volley", "campi da beach volley"],
  fitness: ["area fitness", "aree fitness"], ginnastica: ["palestra", "palestre"], danza: ["sala danza", "sale"], arti_marziali: ["sala arti marziali", "sale"],
  yoga: ["sala yoga", "sale"], pugilato: ["ring", "ring"], atletica: ["pista di atletica", "piste"], corsa: ["percorso", "percorsi"],
  rugby: ["campo da rugby", "campi da rugby"], baseball: ["campo da baseball", "campi da baseball"], hockey: ["campo da hockey", "campi da hockey"],
  equitazione: ["maneggio", "maneggi"], golf: ["campo da golf", "campi da golf"], skate: ["skatepark", "skatepark"], arrampicata: ["parete", "pareti"],
  bocce: ["campo da bocce", "campi da bocce"], ping_pong: ["tavolo da ping pong", "tavoli"], pallamano: ["campo da pallamano", "campi"],
  scherma: ["sala scherma", "sale"], ciclismo: ["pista per bici", "piste"], canottaggio: ["base nautica", "basi"], tiro: ["campo di tiro", "campi"],
  ghiaccio: ["pista di ghiaccio", "piste"], multi: ["campo polivalente", "campi polivalenti"],
};

export const TIPO: Record<string, string> = {
  centro: "Centro sportivo", piscina: "Piscina", campi: "Campi sportivi", area_fitness: "Area sportiva all'aperto", playground: "Campetto",
  palestra: "Palestra", scuola: "Centro sportivo municipale", stadio: "Stadio", pista: "Pista", maneggio: "Maneggio", golf: "Golf",
};
