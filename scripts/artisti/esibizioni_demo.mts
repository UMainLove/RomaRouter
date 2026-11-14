// Esibizioni dimostrative per la vista dei cittadini (finche' gli artisti veri non annunciano le loro).
// Artisti inventati, luoghi e orari VERI rispetto alle regole: solo dove ci si puo' esibire per quell'attivita'
// (postazioni dell'Allegato B, aree del Municipio X, aree dedicate, piazze pedonali libere) e solo nelle
// fasce dell'art. 6. Tutto marcato demo (profili.rif_artista = 'demo:...', vista v_esibizioni.demo):
//   node --env-file=.env.local scripts/artisti/esibizioni_demo.mts [giorni=14]
//   node --env-file=.env.local scripts/artisti/esibizioni_demo.mts --rimuovi
import pg from "pg";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ARTISTI });
await db.connect();

async function rimuovi() {
  const r = await db.query(
    `WITH p AS (SELECT id FROM artisti.profili WHERE rif_artista LIKE 'demo:%'),
          d AS (DELETE FROM artisti.prenotazioni WHERE profilo_id IN (SELECT id FROM p) RETURNING 1)
     SELECT count(*)::int AS n FROM d`,
  );
  await db.query("DELETE FROM artisti.profili WHERE rif_artista LIKE 'demo:%'");
  return r.rows[0].n as number;
}

if (process.argv.includes("--rimuovi")) {
  console.log(`esibizioni demo rimosse: ${await rimuovi()}`);
  await db.end();
  process.exit(0);
}
const GIORNI = Math.min(Math.max(Number(process.argv[2]) || 14, 1), 31);

// generatore ripetibile (stessi dati a ogni esecuzione nello stesso giorno)
let seme = 20261114;
const caso = () => ((seme = (seme * 1103515245 + 12345) % 2147483648) / 2147483648);
const uno = <T,>(a: readonly T[]) => a[Math.floor(caso() * a.length)];

type Attivita = "musica" | "silenziosa" | "fuoco" | "figurativa" | "esoterica";
const ARTISTI: { nome: string; disciplina: string; attivita: Attivita; descrizione: string }[] = [
  { nome: "Duo Tevere", disciplina: "chitarra e voce", attivita: "musica", descrizione: "Canzone romana e cantautori, in acustico." },
  { nome: "Lalla Swing", disciplina: "clarinetto jazz", attivita: "musica", descrizione: "Swing e manouche anni Trenta." },
  { nome: "Marco dei Monti", disciplina: "fisarmonica", attivita: "musica", descrizione: "Valzer, tango e musica popolare." },
  { nome: "Trio Sampietrino", disciplina: "archi", attivita: "musica", descrizione: "Violino, viola e violoncello: dal barocco al pop." },
  { nome: "Nina Arpa", disciplina: "arpa celtica", attivita: "musica", descrizione: "Melodie irlandesi e bretoni." },
  { nome: "Gipsy Rione", disciplina: "chitarra manouche", attivita: "musica", descrizione: "Jazz manouche in acustico." },
  { nome: "Elia Hang", disciplina: "handpan", attivita: "musica", descrizione: "Improvvisazioni al tamburo armonico." },
  { nome: "Voci di Borgo", disciplina: "coro a cappella", attivita: "musica", descrizione: "Quattro voci, repertorio popolare italiano." },
  { nome: "Sax Ostiense", disciplina: "sassofono", attivita: "musica", descrizione: "Standard jazz e colonne sonore." },
  { nome: "Bea Ukulele", disciplina: "ukulele e voce", attivita: "musica", descrizione: "Cover acustiche per tutte le età." },
  { nome: "Il Mimo Lento", disciplina: "mimo", attivita: "silenziosa", descrizione: "Pantomima e piccole storie senza parole." },
  { nome: "Statua d'Oro", disciplina: "statua vivente", attivita: "silenziosa", descrizione: "Un centurione dorato che si muove solo per voi." },
  { nome: "Giocolieri Bislacchi", disciplina: "giocoleria", attivita: "silenziosa", descrizione: "Clave, palline e diabolo." },
  { nome: "Bolle di Ninfa", disciplina: "bolle di sapone giganti", attivita: "silenziosa", descrizione: "Bolle grandi come un'auto: i bambini impazziscono." },
  { nome: "Madonnaro Pietro", disciplina: "gessetti sul selciato", attivita: "silenziosa", descrizione: "Copie di capolavori a gessetto." },
  { nome: "Equilibri Precari", disciplina: "equilibrismo", attivita: "silenziosa", descrizione: "Monociclo e rola bola." },
  { nome: "La Marionettista", disciplina: "marionette a filo", attivita: "silenziosa", descrizione: "Pulcinella e i suoi amici, a filo." },
  { nome: "Fuochi di Ostia", disciplina: "giocoleria col fuoco", attivita: "fuoco", descrizione: "Poi e bastoni infuocati al tramonto." },
  { nome: "Drago Mangiafuoco", disciplina: "mangiafuoco", attivita: "fuoco", descrizione: "Spettacolo col fuoco, distanza di sicurezza garantita." },
  { nome: "Ritratti di Anna", disciplina: "ritratti a carboncino", attivita: "figurativa", descrizione: "Un ritratto in 15 minuti." },
  { nome: "Caricature Max", disciplina: "caricature", attivita: "figurativa", descrizione: "Caricature a pennarello, anche di coppia." },
  { nome: "Acquerelli di Trastevere", disciplina: "acquerello", attivita: "figurativa", descrizione: "Vedute di Roma dipinte sul posto." },
  { nome: "Madame Tarocchi", disciplina: "cartomanzia", attivita: "esoterica", descrizione: "Lettura dei tarocchi, per gioco." },
  { nome: "Il Chiromante", disciplina: "lettura della mano", attivita: "esoterica", descrizione: "Un minuto per la vostra mano." },
  // artisti di quartiere: si esibiscono nelle piazze di tutti i Municipi
  { nome: "Banda del Quadraro", disciplina: "ottoni e percussioni", attivita: "musica", descrizione: "Marce e funk da strada." },
  { nome: "Chiara e la Chitarra", disciplina: "cantautrice", attivita: "musica", descrizione: "Canzoni sue e di De André." },
  { nome: "Duo Garbatella", disciplina: "violino e chitarra", attivita: "musica", descrizione: "Musica popolare e balcanica." },
  { nome: "Mandolino di Testaccio", disciplina: "mandolino", attivita: "musica", descrizione: "Stornelli romani." },
  { nome: "Centocelle Soul", disciplina: "voce e tastiera", attivita: "musica", descrizione: "Soul e R&B anni Settanta." },
  { nome: "Fisarmonica di Tor Pignattara", disciplina: "fisarmonica", attivita: "musica", descrizione: "Musette e tango." },
  { nome: "Rap di Primavalle", disciplina: "rap a cappella", attivita: "musica", descrizione: "Freestyle sulle parole del pubblico." },
  { nome: "Quartetto Monteverde", disciplina: "quartetto d'archi", attivita: "musica", descrizione: "Vivaldi e colonne sonore." },
  { nome: "Lucia Flauto Traverso", disciplina: "flauto", attivita: "musica", descrizione: "Barocco e jazz." },
  { nome: "Batucada Portuense", disciplina: "percussioni brasiliane", attivita: "musica", descrizione: "Samba per strada." },
  { nome: "Il Cantastorie di Ostia", disciplina: "cantastorie", attivita: "musica", descrizione: "Storie di mare con la chitarra." },
  { nome: "Nico Blues", disciplina: "armonica e chitarra", attivita: "musica", descrizione: "Blues del Delta." },
  { nome: "Coro Gospel EUR", disciplina: "coro gospel", attivita: "musica", descrizione: "Sei voci, spiritual e gospel." },
  { nome: "Violinista di Monti", disciplina: "violino", attivita: "musica", descrizione: "Classica e pop arrangiato." },
  { nome: "Steel Drum Tuscolano", disciplina: "steel drum", attivita: "musica", descrizione: "Suoni dei Caraibi." },
  { nome: "Pino Organetto", disciplina: "organetto", attivita: "musica", descrizione: "Saltarelli e tarantelle." },
  { nome: "Clown Bombetta", disciplina: "clownerie", attivita: "silenziosa", descrizione: "Spettacolo per bambini, senza parole." },
  { nome: "La Donna d'Argento", disciplina: "statua vivente", attivita: "silenziosa", descrizione: "Si muove solo con una moneta." },
  { nome: "Trampolieri di San Lorenzo", disciplina: "trampoli", attivita: "silenziosa", descrizione: "Giganti colorati tra la gente." },
  { nome: "Il Mago Ottavio", disciplina: "illusionismo", attivita: "silenziosa", descrizione: "Magia da vicino con le carte." },
  { nome: "Acrobati di Talenti", disciplina: "acrobatica", attivita: "silenziosa", descrizione: "Piramidi umane e salti." },
  { nome: "Palloncini di Pietralata", disciplina: "sculture di palloncini", attivita: "silenziosa", descrizione: "Animali di palloncini in un minuto." },
  { nome: "Mimo Pierrot", disciplina: "mimo", attivita: "silenziosa", descrizione: "Il classico mimo bianco." },
  { nome: "Burattini di Prati", disciplina: "burattini", attivita: "silenziosa", descrizione: "Teatrino dei burattini." },
  { nome: "Gessetti di Ostiense", disciplina: "madonnaro", attivita: "silenziosa", descrizione: "Disegni a gessetto sul marciapiede." },
  { nome: "Hula Hoop Roma", disciplina: "hula hoop", attivita: "silenziosa", descrizione: "Cerchi e coreografie." },
  { nome: "Fachiro di Casilino", disciplina: "fachirismo", attivita: "silenziosa", descrizione: "Letto di chiodi e vetri." },
  { nome: "Bolle di Villa Ada", disciplina: "bolle di sapone", attivita: "silenziosa", descrizione: "Bolle per i più piccoli." },
  { nome: "Contorsionista Elettra", disciplina: "contorsionismo", attivita: "silenziosa", descrizione: "Flessibilità da circo." },
  { nome: "Statua di Bronzo", disciplina: "statua vivente", attivita: "silenziosa", descrizione: "Un poeta di bronzo che saluta." },
  { nome: "Poeta di Strada", disciplina: "poesia su richiesta", attivita: "silenziosa", descrizione: "Una poesia scritta per voi a macchina." },
  { nome: "Ritratti di Marco", disciplina: "ritratti a matita", attivita: "figurativa", descrizione: "Ritratti dal vero." },
  { nome: "Caricature Sole", disciplina: "caricature", attivita: "figurativa", descrizione: "Caricature colorate in dieci minuti." },
  { nome: "Pastelli di Laura", disciplina: "pastelli", attivita: "figurativa", descrizione: "Vedute e ritratti a pastello." },
];

// Luoghi ammessi per attivita', dal database (le stesse regole della verifica)
const luoghi = new Map<Attivita, { id: number | null; nome: string; lon: number; lat: number; mun?: number | null }[]>();
// zone nel punto: un posto e' ammesso se nessuna zona lo vieta per quell'attivita' (anche i divieti da stampa)
type Z = { esito: string; vale_per: string[] };
const blocca = (zone: Z[], a: Attivita, postazione: boolean) =>
  zone.some((z) => (z.vale_per.length === 0 || z.vale_per.includes(a)) &&
    (z.esito === "no" || z.esito === "info" || z.esito === "solo_silenzio" || (z.esito === "solo_postazioni" && !postazione)));
const postazioni = await db.query<{ id: number; nome: string; tipo: string; lon: number; lat: number; zone: Z[] }>(
  `SELECT p.id, p.nome, p.tipo, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat,
          COALESCE((SELECT json_agg(json_build_object('esito', z.esito, 'vale_per', z.vale_per)) FROM artisti.zone z WHERE ST_Intersects(z.geom, p.geom)), '[]') AS zone
   FROM artisti.postazioni p WHERE p.attiva`,
);
for (const p of postazioni.rows) {
  const posto = { id: p.id, nome: p.nome, lon: p.lon, lat: p.lat };
  const per: Attivita[] =
    p.tipo === "postazione_allegatoB" ? ["musica", "silenziosa"] :
    p.tipo === "area_consentita" ? ["musica", "silenziosa", "fuoco"] :
    p.tipo === "area_esoterici" ? ["esoterica"] :
    p.tipo === "arti_figurative_area" ? ["figurativa"] : [];
  per.filter((a) => !blocca(p.zone, a, true)).forEach((a) => luoghi.set(a, [...(luoghi.get(a) ?? []), posto]));
}
// piazze pedonali dove nessuna zona lo vieta o lo limita
const piazze = await db.query<{ nome: string; lon: number; lat: number; esiti: string[]; mun: number | null }>(
  `SELECT c.nome, c.municipio AS mun, ST_X(ST_PointOnSurface(c.geom)) AS lon, ST_Y(ST_PointOnSurface(c.geom)) AS lat,
          ARRAY(SELECT z.esito FROM artisti.zone z WHERE ST_Intersects(z.geom, ST_PointOnSurface(c.geom))) AS esiti
   FROM artisti.contesto c WHERE c.layer = 'piazze_pedonali' AND c.nome IS NOT NULL`,
);
for (const p of piazze.rows) {
  if (p.esiti.some((e) => ["no", "solo_postazioni", "solo_silenzio", "info"].includes(e))) continue;
  const posto = { id: null, nome: p.nome, lon: p.lon, lat: p.lat, mun: p.mun };
  const per: Attivita[] = p.esiti.includes("condizioni") ? ["silenziosa"] : ["musica", "silenziosa"];
  per.forEach((a) => luoghi.set(a, [...(luoghi.get(a) ?? []), posto]));
}

// fasce dell'art. 6 (ora di Roma)
function fasce(giorno: Date, a: Attivita): [number, number][] {
  if (a === "esoterica") return [[16, 20], [20, 24]];
  if (a === "figurativa") return [[10, 13], [15, 19]];
  const m = giorno.getMonth() + 1;
  return m >= 6 && m <= 9 ? [[10, 13], [16, 22]] : [[10, 13], [16, 20]];
}
// "YYYY-MM-DDTHH:MM" in ora di Roma -> Date (Roma: +01:00 d'inverno, +02:00 d'estate)
function aRoma(giorno: string, ore: number, minuti: number) {
  const prova = new Date(`${giorno}T${String(ore).padStart(2, "0")}:${String(minuti).padStart(2, "0")}:00+01:00`);
  const off = new Intl.DateTimeFormat("en", { timeZone: "Europe/Rome", timeZoneName: "shortOffset" }).formatToParts(prova).find((p) => p.type === "timeZoneName")!.value;
  return off === "GMT+2" ? new Date(prova.getTime() - 3_600_000) : prova;
}

await db.query("BEGIN");
try {
  const tolte = await rimuovi();
  const profili = new Map<string, string>();
  for (const [i, a] of ARTISTI.entries()) {
    const r = await db.query<{ id: string }>(
      `INSERT INTO artisti.profili (rif_artista, nome_arte, disciplina, descrizione, pubblico) VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [`demo:${i + 1}`, a.nome, a.disciplina, a.descrizione],
    );
    profili.set(a.nome, r.rows[0].id);
  }
  let n = 0;
  const oggi = new Date();
  for (let g = 0; g < GIORNI; g++) {
    const giorno = new Date(oggi.getTime() + g * 86_400_000);
    const iso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(giorno);
    const occupati = new Set<string>();
    for (const a of ARTISTI) {
      if (caso() < 0.35) continue; // non tutti i giorni
      const posti = luoghi.get(a.attivita) ?? [];
      if (!posti.length) continue;
      const quante = caso() < 0.3 ? 2 : 1;
      for (const [da, a2] of fasce(giorno, a.attivita).sort(() => caso() - 0.5).slice(0, quante)) {
        // piu' spesso nelle postazioni e aree ufficiali, dove i cittadini cercano gli artisti
        const ufficiali = posti.filter((x) => x.id != null);
        // prima il Municipio a caso, poi una piazza dentro: artisti in tutta Roma, non solo in centro
        const perMun = posti.filter((x) => x.id == null && x.mun);
        const municipi = [...new Set(perMun.map((x) => x.mun))];
        const scelto = municipi.length ? uno(municipi) : null;
        const posto = ufficiali.length && caso() < 0.3 ? uno(ufficiali) : scelto ? uno(perMun.filter((x) => x.mun === scelto)) : uno(posti);
        const durata = uno([60, 90, 120]);
        const inizioMin = da * 60 + Math.floor(caso() * Math.max(1, ((a2 - da) * 60 - durata) / 30)) * 30;
        const chiave = `${posto.nome}|${da}`;
        if (occupati.has(chiave)) continue; // una postazione per fascia
        occupati.add(chiave);
        const inizio = aRoma(iso, Math.floor(inizioMin / 60), inizioMin % 60);
        if (inizio.getTime() < Date.now()) continue;
        const fine = new Date(inizio.getTime() + durata * 60_000);
        await db.query(
          `INSERT INTO artisti.prenotazioni (profilo_id, postazione_id, inizio, fine, rif_artista, stato, luogo, geom, attivita)
           VALUES ($1, $2, $3, $4, 'demo', 'confermata', $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8)`,
          [profili.get(a.nome), posto.id, inizio, fine, posto.nome, posto.lon, posto.lat, a.attivita],
        );
        n++;
      }
    }
  }
  await db.query("COMMIT");
  console.log(`esibizioni demo: ${n} in ${GIORNI} giorni, ${ARTISTI.length} artisti (tolte le ${tolte} precedenti)`);
  console.log(`luoghi ammessi: ${[...luoghi].map(([k, v]) => `${k} ${v.length}`).join(", ")}`);
} catch (err) {
  await db.query("ROLLBACK");
  throw err;
} finally {
  await db.end();
}
