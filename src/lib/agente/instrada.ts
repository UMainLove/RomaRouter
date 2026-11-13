/*
 * Instradamento a parole chiave: il fallback della demo, senza LLM.
 * Capisce l'ambito, estrae i dati utili, fa al massimo una domanda e costruisce
 * l'URL di destinazione con i filtri già applicati. Stessa forma di risposta dell'agente LLM.
 */
import { AMBITI, ORDINE_AMBITI, type AmbitoId } from "@/lib/ambiti";
import { normalizza } from "@/lib/geo";
import { INDIRIZZI_ESEMPIO, ZONE, type CategoriaOggetto } from "@/data/esempi";
import type { Destinazione, Domanda, Entita, RichiestaAgente, RispostaAgente } from "./tipi";

const PAROLE: Record<AmbitoId, RegExp[]> = {
  oggetti: [/\bpers[oaie]\b/, /smarrit/, /dimenticat/, /\bho lasciato\b/, /ritrovat/, /\boggett[oi]\b/, /\blost\b/],
  sport: [
    /\bsport/,
    /\bcalc(io|etto)\b/,
    /\bbasket\b/,
    /pallacanestro/,
    /pallavolo/,
    /\bvolley\b/,
    /\btennis\b/,
    /\bpadel\b/,
    /\bnuot/,
    /piscin/,
    /palestr/,
    /\bcamp(o|etto|i)\b(?! elettr)/,
    /\bgiocare\b/,
    /allenar/,
  ],
  antenne: [/antenn/, /ripetitor/, /\b5g\b/, /elettromagnet/, /\bonde\b/, /\bsrb\b/, /stazion[ei] radio/, /\barpa\b/],
  arte: [
    /suonar/,
    /esibir/,
    /esibisc/,
    /\bartist/,
    /\bbusker/,
    /giocolier/,
    /spettacol/,
    /postazion/,
    /arte di strada/,
    /ritratt/,
    /statua vivente/,
    /\bmimo\b/,
    /cantar/,
    /musicist/,
  ],
};

const FONTI: Record<AmbitoId, string> = {
  oggetti: "Elenchi degli oggetti rinvenuti di Roma Capitale (dati di esempio)",
  sport: "Censimento degli impianti e OpenStreetMap (dati di esempio)",
  antenne: "Impianti di telefonia e misure ARPA Lazio (dati di esempio)",
  arte: "Postazioni del regolamento per l'arte di strada (dati di esempio)",
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

/* ---------- date, sempre nel fuso di Roma ---------- */

function oggiRoma(adesso: Date): { a: number; m: number; g: number; dow: number } {
  const parti = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(adesso)
    .split("-")
    .map(Number);
  const [a, m, g] = parti;
  const dow = new Date(Date.UTC(a, m - 1, g)).getUTCDay();
  return { a, m, g, dow };
}

function spostaGiorni(base: { a: number; m: number; g: number }, giorni: number) {
  const d = new Date(Date.UTC(base.a, base.m - 1, base.g + giorni));
  return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, g: d.getUTCDate() };
}

function iso(d: { a: number; m: number; g: number }) {
  return `${d.a}-${String(d.m).padStart(2, "0")}-${String(d.g).padStart(2, "0")}`;
}

function breve(d: { m: number; g: number }) {
  return `${d.g} ${MESI_BREVI[d.m - 1]}`;
}

/** "ieri sera", "l'altro ieri", "12/11", "12 novembre"… → giorno. */
function trovaGiornoPassato(t: string, adesso: Date): { iso: string; etichetta: string; breve: string } | null {
  const oggi = oggiRoma(adesso);
  const conEtichetta = (scarto: number, prefisso: string) => {
    const d = spostaGiorni(oggi, scarto);
    return { iso: iso(d), etichetta: `${prefisso} · ${breve(d)}`, breve: breve(d) };
  };
  if (/l.?altro ieri|altroieri|ieri l.?altro/.test(t)) return conEtichetta(-2, "L'altro ieri");
  if (/\bieri sera\b/.test(t)) return conEtichetta(-1, "Ieri sera");
  if (/\bieri\b/.test(t)) return conEtichetta(-1, "Ieri");
  if (/\b(oggi|stamattina|stamani|stasera|stanotte)\b/.test(t)) return conEtichetta(0, "Oggi");
  if (/settimana scorsa/.test(t)) return conEtichetta(-7, "Da una settimana");
  const numerica = t.match(/\b(\d{1,2})\s*[/-]\s*(\d{1,2})\b/);
  if (numerica) {
    const g = Number(numerica[1]);
    const m = Number(numerica[2]);
    if (g >= 1 && g <= 31 && m >= 1 && m <= 12) {
      const d = { a: m > oggi.m ? oggi.a - 1 : oggi.a, m, g };
      return { iso: iso(d), etichetta: `Dal ${breve(d)}`, breve: breve(d) };
    }
  }
  const testuale = t.match(new RegExp(`\\b(\\d{1,2})\\s+(${MESI.join("|")})\\b`));
  if (testuale) {
    const g = Number(testuale[1]);
    const m = MESI.indexOf(testuale[2]) + 1;
    const d = { a: m > oggi.m ? oggi.a - 1 : oggi.a, m, g };
    return { iso: iso(d), etichetta: `Dal ${breve(d)}`, breve: breve(d) };
  }
  return null;
}

/** "oggi", "domani", "sabato"… → prossimo giorno. */
function trovaGiornoFuturo(t: string, adesso: Date): { iso: string; etichetta: string } | null {
  const oggi = oggiRoma(adesso);
  const conEtichetta = (scarto: number, nome: string) => {
    const d = spostaGiorni(oggi, scarto);
    return { iso: iso(d), etichetta: `${nome} ${breve(d)}` };
  };
  if (/\bdopodomani\b/.test(t)) return conEtichetta(2, "Dopodomani,");
  if (/\bdomani\b/.test(t)) return conEtichetta(1, "Domani,");
  if (/\b(oggi|stasera|stamattina)\b/.test(t)) return conEtichetta(0, "Oggi,");
  for (let i = 0; i < GIORNI.length; i++) {
    if (new RegExp(`\\b${GIORNI[i]}\\b`).test(t)) {
      const scarto = (i - oggi.dow + 7) % 7;
      const nome = GIORNI[i].charAt(0).toUpperCase() + GIORNI[i].slice(1, 3);
      return conEtichetta(scarto, nome);
    }
  }
  return null;
}

/* ---------- dati estratti ---------- */

function trovaZona(t: string) {
  for (const [chiave, zona] of Object.entries(ZONE)) if (t.includes(chiave)) return { chiave, zona };
  return null;
}

function trovaIndirizzo(t: string): string | null {
  for (const [chiave, ind] of Object.entries(INDIRIZZI_ESEMPIO)) if (t.includes(chiave)) return ind.etichetta;
  const m = t.match(/\b((?:via|viale|piazza|piazzale|largo|lungotevere|circonvallazione|vicolo)(?:\s+[a-z']+){1,4})/);
  if (!m) return null;
  return m[1].replace(/\b\w/g, (c) => c.toUpperCase());
}

const OGGETTI_PAROLE: [RegExp, string, string, CategoriaOggetto][] = [
  [/zain(o|etto)/, "Zaino", "zaino", "borse"],
  [/portafogl/, "Portafoglio", "portafoglio", "borse"],
  [/\bbors(a|etta)\b/, "Borsa", "borsa", "borse"],
  [/\bvaligi/, "Valigia", "valigia", "borse"],
  [/\bchiav(e|i)\b/, "Chiavi", "chiavi", "chiavi"],
  [/telefon|cellular|smartphone|iphone/, "Telefono", "smartphone", "elettronica"],
  [/auricolar|cuffi/, "Auricolari", "auricolari", "elettronica"],
  [/tablet|computer|portatile|laptop/, "Computer o tablet", "", "elettronica"],
  [/document|carta d.?identita|passaport|patente/, "Documento", "documento", "documenti"],
  [/ombrell/, "Ombrello", "ombrello", "ombrelli"],
  [/giacc|cappott|giubbott|sciarp/, "Abbigliamento", "", "abbigliamento"],
];

const COLORI: [RegExp, string][] = [
  [/\bner[oaie]\b/, "nero"],
  [/\bbianc[oaih]e?\b/, "bianco"],
  [/\bross[oaie]\b/, "rosso"],
  [/\bblu\b/, "blu"],
  [/\bverd[ei]\b/, "verde"],
  [/\bgiall[oaie]\b/, "giallo"],
  [/\bmarron[ei]\b/, "marrone"],
  [/\bgrigi[oaie]?\b/, "grigio"],
];

type Luogo = "mezzi" | "metro" | "taxi" | "treno" | "aeroporto" | "strada";

const ETICHETTE_LUOGO: Record<Luogo, string> = {
  mezzi: "Bus o tram",
  metro: "Metro",
  taxi: "Taxi",
  treno: "Treno o stazione",
  aeroporto: "Aeroporto",
  strada: "In strada o altro",
};

function trovaLuogo(t: string): { luogo: Luogo; etichetta: string } | null {
  const tram = t.match(/\btram\b(?:\s*(?:n\.?|numero)?\s*(\d+))?/);
  if (tram) return { luogo: "mezzi", etichetta: tram[1] ? `Tram ${tram[1]}` : "Tram" };
  const bus = t.match(/\b(?:bus|autobus)\b(?:\s*(?:n\.?|numero)?\s*(\d+))?/);
  if (bus) return { luogo: "mezzi", etichetta: bus[1] ? `Bus ${bus[1]}` : "Bus" };
  const metro = t.match(/\bmetro(?:politana)?\b(?:\s+(?:linea\s+)?([abc])\b)?/);
  if (metro) return { luogo: "metro", etichetta: metro[1] ? `Metro ${metro[1].toUpperCase()}` : "Metro" };
  if (/\btaxi\b/.test(t)) return { luogo: "taxi", etichetta: "Taxi" };
  if (/aeroport|fiumicino|ciampino/.test(t)) return { luogo: "aeroporto", etichetta: "Aeroporto" };
  if (/\btren[oi]\b|\bstazion[ei]\b|\btermini\b/.test(t)) return { luogo: "treno", etichetta: "Treno o stazione" };
  if (/\bin strada\b|marciapied|\bparco\b|giardin|\bpiazza\b/.test(t)) return { luogo: "strada", etichetta: "In strada" };
  return null;
}

/* ---------- risposte per ambito ---------- */

/** Allarga una corrispondenza parziale ("antenn") alla parola intera ("antenna"). */
function parolaIntera(t: string, inizio: number, fine: number): string {
  let a = inizio;
  let b = fine;
  while (a > 0 && /[a-z0-9']/.test(t[a - 1])) a--;
  while (b < t.length && /[a-z0-9]/.test(t[b])) b++;
  return t.slice(a, b).replace(/^[^']*'/, "");
}

function perche(t: string, id: AmbitoId): string | undefined {
  const parole = PAROLE[id]
    .map((r) => {
      const m = r.exec(t);
      return m ? parolaIntera(t, m.index, m.index + m[0].length) : null;
    })
    .filter((p): p is string => Boolean(p))
    .filter((p, i, tutte) => tutte.indexOf(p) === i)
    .slice(0, 3);
  return parole.length ? `Hai scritto «${parole.join("», «")}».` : undefined;
}

function rispostaOggetti(t: string, risposte: Record<string, string>, adesso: Date): RispostaAgente {
  const entita: Entita[] = [];
  const parametri: Record<string, string> = {};

  const oggetto = OGGETTI_PAROLE.find(([r]) => r.test(t));
  if (oggetto) {
    const [, etichetta, ricerca, categoria] = oggetto;
    parametri.categoria = categoria;
    entita.push({ chiave: "oggetto", etichetta, parametro: "categoria", valore: categoria });
    if (ricerca) parametri.q = ricerca;
  }
  const colore = COLORI.find(([r]) => r.test(t));
  if (colore) {
    parametri.colore = colore[1];
    entita.push({ chiave: "colore", etichetta: colore[1].charAt(0).toUpperCase() + colore[1].slice(1), parametro: "colore", valore: colore[1] });
  }

  const daRisposta = risposte.luogo as Luogo | undefined;
  const trovato = trovaLuogo(t);
  const luogo: Luogo | undefined = trovato?.luogo ?? daRisposta;
  if (luogo) {
    const etichetta = trovato?.etichetta ?? ETICHETTE_LUOGO[luogo];
    const filtro = luogo === "metro" ? "mezzi" : luogo === "treno" || luogo === "aeroporto" ? undefined : luogo;
    if (filtro) parametri.luogo = filtro;
    entita.push({ chiave: "luogo", etichetta, parametro: filtro ? "luogo" : undefined, valore: luogo });
  }

  const giorno = trovaGiornoPassato(t, adesso);
  if (giorno) {
    parametri.dal = giorno.iso;
    entita.push({ chiave: "giorno", etichetta: giorno.etichetta, parametro: "dal", valore: giorno.iso });
  }

  if (!luogo) {
    const domanda: Domanda = {
      chiave: "luogo",
      testo: "Dove l'hai perso? Così cerco nell'ufficio giusto.",
      opzioni: (Object.keys(ETICHETTE_LUOGO) as Luogo[]).map((v) => ({ valore: v, etichetta: ETICHETTE_LUOGO[v] })),
    };
    return { ambito: "oggetti", messaggio: "Mi dispiace!", entita, domanda, perche: perche(t, "oggetti"), fonte: FONTI.oggetti };
  }

  const destinazione: Destinazione = { base: "/oggetti", parametri, etichetta: "Vedi gli oggetti simili" };
  const dal = giorno ? ` dal ${giorno.breve} in poi` : "";
  return {
    ambito: "oggetti",
    messaggio: `Ti porto agli oggetti smarriti: cerco tra quelli consegnati all'Ufficio Oggetti Rinvenuti${dal}.`,
    entita,
    perche: perche(t, "oggetti"),
    fonte: FONTI.oggetti,
    destinazione,
    avviso:
      luogo === "treno" || luogo === "aeroporto" || luogo === "metro"
        ? "Stazioni, aeroporti e metro hanno anche un proprio ufficio oggetti smarriti: controlla pure quello del gestore."
        : undefined,
  };
}

const DISCIPLINE_PAROLE: [RegExp, string][] = [
  [/\bbasket\b|pallacanestro/, "Basket"],
  [/calcetto|calcio a (5|cinque)/, "Calcio a 5"],
  [/\bcalcio\b/, "Calcio"],
  [/\btennis\b/, "Tennis"],
  [/pallavolo|\bvolley\b/, "Pallavolo"],
  [/\bpadel\b/, "Padel"],
  [/\bnuot|piscin/, "Nuoto"],
  [/ginnastic|palestr/, "Ginnastica"],
];

function rispostaSport(t: string): RispostaAgente {
  const entita: Entita[] = [];
  const parametri: Record<string, string> = {};
  const disciplina = DISCIPLINE_PAROLE.find(([r]) => r.test(t));
  if (disciplina) {
    parametri.disciplina = disciplina[1];
    entita.push({ chiave: "disciplina", etichetta: disciplina[1], parametro: "disciplina", valore: disciplina[1] });
  }
  const zona = trovaZona(t);
  if (zona) {
    parametri.zona = zona.chiave;
    entita.push({ chiave: "zona", etichetta: `Vicino a ${zona.zona.nome} · 1,5 km`, parametro: "zona", valore: zona.chiave });
  }
  if (/gratis|gratuit|senza pagare|non a pagamento/.test(t)) {
    parametri.gratuito = "1";
    entita.push({ chiave: "gratuito", etichetta: "Gratis, se possibile", parametro: "gratuito", valore: "1" });
  }
  if (/accessibil|disabil|carrozzin|sedia a rotelle|senza barriere/.test(t)) {
    parametri.accessibile = "1";
    entita.push({ chiave: "accessibile", etichetta: "Accessibile", parametro: "accessibile", valore: "1" });
  }
  return {
    ambito: "sport",
    messaggio: "Ti porto agli impianti sportivi, con i filtri già pronti.",
    entita,
    perche: perche(t, "sport"),
    fonte: FONTI.sport,
    destinazione: { base: "/sport", parametri, etichetta: "Vedi gli impianti" },
  };
}

function rispostaAntenne(t: string, risposte: Record<string, string>): RispostaAgente {
  const entita: Entita[] = [];
  const parametri: Record<string, string> = {};
  const indirizzo = risposte.indirizzo ?? trovaIndirizzo(t) ?? trovaZona(t)?.zona.nome ?? null;
  if (indirizzo) {
    parametri.indirizzo = indirizzo;
    entita.push({ chiave: "indirizzo", etichetta: indirizzo, parametro: "indirizzo", valore: indirizzo });
  }
  if (/scuol|asil|\bnid[oi]\b/.test(t)) entita.push({ chiave: "sensibile", etichetta: "Vicino a una scuola" });
  else if (/ospedal/.test(t)) entita.push({ chiave: "sensibile", etichetta: "Vicino a un ospedale" });
  else if (/parco giochi|area giochi|giardinett/.test(t)) entita.push({ chiave: "sensibile", etichetta: "Vicino a un'area giochi" });

  if (!indirizzo) {
    return {
      ambito: "antenne",
      messaggio: "Posso controllare antenne, misure ARPA e siti sensibili entro 300 m.",
      entita,
      domanda: {
        chiave: "indirizzo",
        testo: "Quale indirizzo vuoi verificare? Scegline uno o scrivilo.",
        opzioni: Object.values(INDIRIZZI_ESEMPIO)
          .slice(0, 3)
          .map((i) => ({ valore: i.etichetta, etichetta: i.etichetta })),
      },
      perche: perche(t, "antenne"),
      fonte: FONTI.antenne,
    };
  }
  return {
    ambito: "antenne",
    messaggio: "Ti porto alla verifica delle antenne entro 300 m, con le misure ARPA più vicine.",
    entita,
    perche: perche(t, "antenne"),
    fonte: FONTI.antenne,
    destinazione: { base: "/antenne", parametri, etichetta: "Apri la verifica" },
  };
}

function rispostaArte(t: string, risposte: Record<string, string>, adesso: Date): RispostaAgente {
  const entita: Entita[] = [];
  const parametri: Record<string, string> = {};
  let ruolo = risposte.ruolo as "artista" | "pubblico" | undefined;
  if (!ruolo) {
    if (/voglio suonar|suonare a|esibirm|sono (un |una )?artist|prenot|postazion|\bturno\b|faccio (lo |il )?(spettacolo|giocoliere|ritratti)/.test(t))
      ruolo = "artista";
    else if (/chi suona|chi si esibisce|vedere|ascoltare|spettacoli (di|in|a|oggi|stasera)/.test(t)) ruolo = "pubblico";
  }
  const zona = trovaZona(t);
  if (zona) {
    parametri.zona = zona.chiave;
    entita.push({ chiave: "zona", etichetta: zona.zona.nome, parametro: "zona", valore: zona.chiave });
  }
  const giorno = trovaGiornoFuturo(t, adesso);
  if (giorno) {
    parametri.giorno = giorno.iso;
    entita.push({ chiave: "giorno", etichetta: giorno.etichetta, parametro: "giorno", valore: giorno.iso });
  }
  if (!ruolo) {
    return {
      ambito: "arte",
      messaggio: "Artisti di strada, ok.",
      entita,
      domanda: {
        chiave: "ruolo",
        testo: "Vuoi esibirti o vedere chi si esibisce?",
        opzioni: [
          { valore: "artista", etichetta: "Voglio esibirmi" },
          { valore: "pubblico", etichetta: "Voglio vedere uno spettacolo" },
        ],
      },
      perche: perche(t, "arte"),
      fonte: FONTI.arte,
    };
  }
  entita.unshift({ chiave: "ruolo", etichetta: ruolo === "artista" ? "Sono un artista" : "Voglio vedere" });
  if (ruolo === "pubblico") {
    return {
      ambito: "arte",
      messaggio: "Ti mostro chi si esibisce e dove.",
      entita,
      perche: perche(t, "arte"),
      fonte: FONTI.arte,
      destinazione: { base: "/arte", parametri: { per: "pubblico", ...parametri }, etichetta: "Vedi chi si esibisce" },
    };
  }
  return {
    ambito: "arte",
    messaggio: "Ti porto alle postazioni per artisti: scegli giorno e turno.",
    entita,
    perche: perche(t, "arte"),
    fonte: FONTI.arte,
    destinazione: { base: "/arte", parametri, etichetta: "Scegli la postazione" },
  };
}

/* ---------- ingresso ---------- */

export function instrada(richiesta: RichiestaAgente, adesso: Date = new Date()): RispostaAgente {
  const t = normalizza(richiesta.messaggi.join(" . "));
  const risposte = richiesta.risposte ?? {};
  let ambito = (richiesta.ambitoForzato ?? risposte.ambito) as AmbitoId | "altro" | undefined;

  if (!ambito) {
    const punteggi = ORDINE_AMBITI.map((id) => ({ id, n: PAROLE[id].filter((r) => r.test(t)).length }));
    const massimo = Math.max(...punteggi.map((p) => p.n));
    const primi = punteggi.filter((p) => p.n === massimo);
    // Dentro la vista di un ambito si resta lì, a meno che la richiesta non porti chiaramente altrove.
    const corrente = richiesta.ambitoCorrente;
    if (massimo === 0) ambito = corrente ?? "altro";
    else if (corrente && primi.some((p) => p.id === corrente)) ambito = corrente;
    else if (primi.length > 1) {
      return {
        ambito: null,
        messaggio: "Posso aiutarti in più modi.",
        entita: [],
        domanda: {
          chiave: "ambito",
          testo: "Di cosa si tratta?",
          opzioni: primi.map((p) => ({ valore: p.id, etichetta: AMBITI[p.id].nome })),
        },
      };
    } else ambito = primi[0].id;
  }

  switch (ambito) {
    case "oggetti":
      return rispostaOggetti(t, risposte, adesso);
    case "sport":
      return rispostaSport(t);
    case "antenne":
      return rispostaAntenne(t, risposte);
    case "arte":
      return rispostaArte(t, risposte, adesso);
    default:
      return {
        ambito: "altro",
        messaggio:
          "Non è tra i quattro ambiti di RomaRouter. Ti indico il portale di Roma Capitale, dove trovare la pagina ufficiale.",
        entita: [],
        esterno: { href: "https://www.comune.roma.it", etichetta: "Portale di Roma Capitale" },
      };
  }
}
