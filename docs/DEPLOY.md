# Mettere RomaRouter online (Neon + Vercel)

Il sito va su **Vercel** (Next.js) e i database su **Neon** (Postgres in cloud con PostGIS e H3).
Entrambi hanno un piano gratuito. Mettete tutti e due a **Francoforte**: il sito risponde più in fretta
se le funzioni stanno vicino al database.

Vi servono: accesso da amministratori al repository GitHub, `psql` e `pg_restore` **versione 17 o più nuova**
sul vostro computer (le copie in `data/seed` sono fatte con pg_dump 17), Node 22.

---

## 1. Il database su Neon

1. **Progetto.** Su [console.neon.tech](https://console.neon.tech) → *New project*:
   nome `romarouter`, **Postgres 17**, regione **AWS Europe Central 1 (Frankfurt)**.
2. **Ruolo.** *Branches → main → Roles → New role*: nome `romarouter`.
   Copiate subito la password: Neon la mostra una volta sola (si può rigenerare).
   I ruoli creati dalla console possono installare le estensioni: serve per il passo 4.
3. **Database.** *Databases → New database*, cinque volte, tutti con owner `romarouter`:

   | Database | Variabile |
   |---|---|
   | `romarouter` | `DATABASE_URL` (solo il controllo `/api/health`) |
   | `rr_antenne` | `DATABASE_URL_ANTENNE` |
   | `rr_artisti_strada` | `DATABASE_URL_ARTISTI` |
   | `rr_impianti_sportivi` | `DATABASE_URL_SPORT` |
   | `rr_oggetti_smarriti` | `DATABASE_URL_SMARRITI` |

   Il database `neondb` creato da Neon non serve: lasciatelo lì.
4. **Le stringhe di connessione.** *Connect* (in alto nella dashboard) → scegliete database `rr_antenne`,
   ruolo `romarouter`. Ne servono **due versioni**:
   - **diretta** (interruttore *Connection pooling* spento): per caricare i dati dal vostro computer;
   - **pooled** (interruttore acceso, l'host contiene `-pooler`): per Vercel.

   Hanno questa forma (cambia solo il nome del database in fondo):

   ```
   diretta: postgresql://romarouter:PASSWORD@ep-nome-123456.eu-central-1.aws.neon.tech/rr_antenne?sslmode=require
   pooled:  postgresql://romarouter:PASSWORD@ep-nome-123456-pooler.eu-central-1.aws.neon.tech/rr_antenne?sslmode=require
   ```

   Per gli altri database copiate la stessa stringa e cambiate solo il nome dopo l'ultima `/`.
   Se la password contiene caratteri come `@ : / ? #` va codificata (`@` → `%40`); più semplice rigenerarla.
5. **Le estensioni** (PostGIS, H3, ricerca senza accenti…), una volta per ogni database, con le stringhe **dirette**:

   ```bash
   for db in romarouter rr_antenne rr_artisti_strada rr_impianti_sportivi rr_oggetti_smarriti; do
     psql "postgresql://romarouter:PASSWORD@ep-nome-123456.eu-central-1.aws.neon.tech/$db?sslmode=require" \
       -v ON_ERROR_STOP=1 -f db/_estensioni.sql
   done
   ```

   Gli avvisi su `pgrouting`/`ogr_fdw` sono normali: il sito non li usa. **Non** usate `db/init.sql`:
   serve per il Postgres sul vostro computer (crea ruolo e database, che su Neon fa la console).
6. **Tabelle e dati.** Lo script che a casa parte con `npm run dev` applica le migrazioni e carica le copie
   di `data/seed` (artisti, antenne, sport; i punti di consegna degli oggetti smarriti arrivano con le migrazioni,
   le segnalazioni partono vuote). Legge `.env.local`,
   quindi per un momento lo puntiamo su Neon, tenendo da parte il vostro:

   ```bash
   cp .env.local .env.local.mio          # il vostro, per dopo
   # in .env.local: le 5 stringhe DIRETTE di Neon + OGGETTI_SEGRETO (vedi sotto)
   npm run db:allinea                     # un paio di minuti: la copia degli artisti è la più grande
   cp .env.local .env.neon                # le stringhe di Neon, per la prossima volta
   cp .env.local.mio .env.local           # torna il vostro
   ```

   Deve scrivere `[database] … aggiornato` per artisti, antenne e sport. Se dice «non raggiungibile»,
   controllate stringa e password. I file `.env*` sono già esclusi da git: non committateli.
7. **Spazio.** Nel piano gratuito ogni progetto Neon ha 1 GB. Controllate in *Monitoring → Storage*:
   se siete vicini al limite, spostate `rr_artisti_strada` in un secondo progetto (stessi passi 1–6).

## 2. Le variabili

| Nome | Valore | Dove |
|---|---|---|
| `DATABASE_URL` | stringa del database `romarouter` | Vercel: **pooled** · `.env.neon`: diretta |
| `DATABASE_URL_ANTENNE` | … `rr_antenne` | idem |
| `DATABASE_URL_ARTISTI` | … `rr_artisti_strada` | idem |
| `DATABASE_URL_SPORT` | … `rr_impianti_sportivi` | idem |
| `DATABASE_URL_SMARRITI` | … `rr_oggetti_smarriti` | idem |
| `OGGETTI_SEGRETO` | 64 caratteri casuali | uguale ovunque |

`OGGETTI_SEGRETO` cifra recapiti, dettagli e messaggi degli oggetti smarriti e firma le sessioni. Createlo così:

```bash
openssl rand -hex 32
```

Usatelo **uguale** in `.env.neon` e su Vercel, conservatelo in un posto sicuro (un password manager) e
**non cambiatelo** dopo che il sito è online: i dati già cifrati non si leggerebbero più.
Non mettetelo in chat, nel README o in un commit.

`RR_NO_ALLINEA` su Vercel non serve: lì `npm start` non parte, il sito usa solo la build.

## 3. Il sito su Vercel

1. [vercel.com/new](https://vercel.com/new) → *Import Git Repository* → `UMainLove/RomaRouter`
   (la prima volta Vercel chiede di autorizzare la sua app GitHub sul repository: serve un amministratore).
2. Framework: **Next.js** (lo riconosce da solo). Root directory, build e output: lasciate i valori proposti.
3. *Environment Variables*: le sei variabili della tabella, con le stringhe **pooled**, per
   **Production** e **Preview**. Si possono incollare tutte insieme dal contenuto di un file `.env`.
4. *Deploy*. La prima build dura qualche minuto.
5. *Settings → Functions → Function Region*: **Frankfurt, Germany (fra1)**, poi *Deployments → Redeploy*.
6. Il branch di produzione è `main`: ogni push su `main` va online, ogni altro branch ha un suo indirizzo di anteprima.

Il piano Hobby di Vercel è per progetti non commerciali: per l'hackathon va bene.

## 4. Controlli dopo il primo deploy

- `https://<il-vostro-indirizzo>/api/health` → `{"ok":true,"database":"up", …}` con `postgis` e `h3` tra le estensioni.
- Le quattro sezioni: mappa, filtri, una scheda aperta, la **Guida** (Regole, Elenco, Fonti si devono caricare).
- Oggetti smarriti: un giro completo «Ho trovato» (usa `OGGETTI_SEGRETO`).
- Da telefono: home, menu delle sezioni, una mappa.

Se il database non risponde il sito resta in piedi: le mappe usano le copie in `public/dati` e nelle Guide
compare «In questo momento non riesco a caricare…». In quel caso guardate `/api/health` e i log in
*Vercel → Deployments → Functions*.

## Aggiornare i dati più avanti

Nuove migrazioni o nuove copie in `data/seed`: ripetete il passo 6 (`.env.neon` come `.env.local`,
`npm run db:allinea`, poi rimettete il vostro). Il sito su Vercel non va ripubblicato.
