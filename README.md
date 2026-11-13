# RomaRouter

Servizi per chi vive a Roma, nati dalle quattro sfide dell'Agentic Hack Rome (Urbe Hub). L'interfaccia è quella del frontend del team (grafica RomaRouter, `src/lib/ambiti.ts`); ogni sezione porta ai dati del proprio ambito. **Ogni sezione è un tool indipendente con il proprio database**, quindi i dati di una sezione non compaiono mai nelle altre.

| Sezione | Percorso | Database |
| --- | --- | --- |
| Arte di strada: dove esibirsi e come prenotare | `/arte` | `rr_artisti_strada` |
| Antenne di telefonia mobile: impianti, misure, contesto | `/antenne` | `rr_antenne` |
| Oggetti smarriti: catalogo ricercabile, inserimento, restituzione | `/oggetti` | `rr_oggetti_smarriti` |
| Impianti sportivi: mappa per disciplina, Municipio e accessibilità | `/sport` | `rr_impianti_sportivi` |

I database delle sezioni sono elencati in [src/lib/sezioni.ts](src/lib/sezioni.ts) (lo slug è anche la cartella `db/<slug>/migrations`); gli ambiti dell'interfaccia in [src/lib/ambiti.ts](src/lib/ambiti.ts). Nel codice server usate `querySezione("oggetti-smarriti", sql, params)` da [src/lib/db.ts](src/lib/db.ts): legge la variabile `DATABASE_URL_*` della sezione.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4)
- **PostgreSQL 17** con PostGIS, pgRouting, H3, ogr_fdw, pg_trgm e unaccent; pgvector per gli embedding (vedi la nota su Smart App Control in [docs/SETUP.md](docs/SETUP.md))
- Driver `pg` con il pool in [src/lib/db.ts](src/lib/db.ts)

## Avvio rapido

Per installare tutto da zero su un PC nuovo segui [docs/SETUP.md](docs/SETUP.md). Se hai già tutto installato:

```bash
git pull
npm install
npm run dev
```

Poi apri http://localhost:3000. Se http://localhost:3000/api/health risponde `"ok": true`, il database è collegato.

## Struttura

| Percorso | Cosa c'è |
| --- | --- |
| `src/app/` | Pagine e rotte API (App Router) |
| `src/app/api/health/` | Controllo della connessione al DB e delle estensioni |
| `src/app/{arte,antenne,oggetti,sport}/` | Pagina di ciascuna sezione |
| `src/components/` | Componenti dell'interfaccia (header, mappa, ambiti, antenne, filtri) |
| `src/lib/sezioni.ts` | Database delle quattro sezioni |
| `src/lib/db.ts` | Pool di connessioni Postgres, uno per sezione (solo lato server) |
| `db/init.sql` | Crea ruolo, database ed estensioni |
| `db/<sezione>/migrations/` | Tabelle di ciascuna sezione |
| `docs/SETUP.md` | Installazione completa su Windows |
| `docs/ANTENNE.md` | Dati e API della sezione antenne |

### Schemi per database

- `rr_artisti_strada` → `artisti`: postazioni, regole, fasce orarie, prenotazioni
- `rr_impianti_sportivi` → `sport`: impianti, discipline, accessibilità
- `rr_oggetti_smarriti` → `smarriti`: oggetti (con ricerca full-text), categorie, richieste di restituzione
- `rr_antenne` → `antenne`, `opendata`: vedi [docs/ANTENNE.md](docs/ANTENNE.md)
- `romarouter` → database generale, usato solo da `/api/health`

## Regole del team

- Non committare mai `.env.local` né chiavi o password. I nomi delle variabili vanno in `.env.example`.
- Lavorate su un branch (`git checkout -b nome-feature`) e aprite una PR verso `main`.
