# RomaRouter

Chatbot che aiuta chi vive a Roma a orientarsi tra servizi e pratiche di Roma Capitale, con dati open, geodati e pagamenti pagoPA.

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
| `src/lib/db.ts` | Pool di connessioni Postgres (solo lato server) |
| `db/init.sql` | Crea ruolo, database, estensioni e schemi |
| `docs/SETUP.md` | Installazione completa su Windows |

### Schemi del database

- `opendata`: dataset importati (Roma Capitale, ISTAT, …)
- `chatbot`: conversazioni, documenti, embedding
- `pagamenti`: posizioni debitorie ed esiti pagoPA

## Regole del team

- Non committare mai `.env.local` né chiavi o password. I nomi delle variabili vanno in `.env.example`.
- Lavorate su un branch (`git checkout -b nome-feature`) e aprite una PR verso `main`.
