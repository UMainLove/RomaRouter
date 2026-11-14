# Setup su Windows (da zero)

Guida per avere lo stesso ambiente di sviluppo su ogni PC del team. Lanciate i comandi da PowerShell. Dopo ogni installazione chiudete e riaprite il terminale, così il PATH si aggiorna.

## 1. Git e Node.js

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

Configurate la vostra identità Git (una volta sola):

```powershell
git config --global user.name "Nome Cognome"
git config --global user.email "vostra@email.it"
```

## 2. Clonare il progetto

```powershell
git clone https://github.com/UMainLove/RomaRouter.git
cd RomaRouter
npm install
```

## 3. PostgreSQL 17

```powershell
winget install --id PostgreSQL.PostgreSQL.17 -e
```

Durante l'installazione scegliete la password del superuser `postgres` e annotatela. Lasciate la porta 5432.

## 4. PostGIS (con pgRouting, H3 e ogr_fdw)

1. Scaricate `postgis-bundle-pg17-3.6.2x64.zip` da https://download.osgeo.org/postgis/windows/pg17/ e verificate l'MD5 con il file `.md5` accanto.
2. Estraete lo zip e copiate le cartelle `bin`, `lib`, `share`, `gdal-data` e `utils` dentro `C:\Program Files\PostgreSQL\17`, **senza sovrascrivere** i file che esistono già (servono i permessi di amministratore). Da PowerShell come amministratore, dentro la cartella estratta:

   ```powershell
   foreach ($d in 'bin','lib','share','gdal-data','utils') { robocopy ".\$d" "C:\Program Files\PostgreSQL\17\$d" /E /XC /XN /XO }
   ```

3. **Importante:** copiate anche `bin\postgisgui\libwinpthread-1.dll` in `C:\Program Files\PostgreSQL\17\bin`. Senza questa DLL `CREATE EXTENSION postgis` fallisce con "unknown error 126".

## 5. pgvector (ricerca per somiglianza)

pgvector va compilato, quindi servono i Build Tools C++ di Microsoft:

```powershell
winget install --id Microsoft.VisualStudio.BuildTools -e --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Poi aprite **"x64 Native Tools Command Prompt for VS"** come amministratore e lanciate:

```cmd
set "PGROOT=C:\Program Files\PostgreSQL\17"
cd %TEMP%
git clone --branch v0.8.7 https://github.com/pgvector/pgvector.git
cd pgvector
nmake /F Makefile.win
nmake /F Makefile.win install
```

> **Smart App Control:** se in Windows 11 è attivo (Sicurezza di Windows → Controllo app e browser), blocca `vector.dll` perché non è firmata, e `CREATE EXTENSION vector` fallisce con "unknown error 4551". In questo caso usate pgvector da un Postgres in cloud condiviso (Supabase o Neon lo includono già) oppure da Docker (immagine `pgvector/pgvector:pg17`). `db/init.sql` prosegue comunque anche senza pgvector.

## 6. Database del progetto

Scegliete una password per l'utente applicativo `romarouter` e lanciate, dalla cartella del progetto:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -v app_password='PASSWORD_APP' -f db/init.sql
```

Lo script crea il ruolo `romarouter` e cinque database, tutti con le stesse estensioni:

| Database | Sezione |
| --- | --- |
| `rr_antenne` | Antenne di telefonia mobile |
| `rr_artisti_strada` | Artisti di strada |
| `rr_impianti_sportivi` | Impianti sportivi |
| `rr_oggetti_smarriti` | Oggetti smarriti |
| `romarouter` | Database generale, usato solo dal controllo `/api/health` |

Ogni sezione del sito legge **solo** il proprio database. Potete rilanciare lo script senza problemi: salta quello che esiste già.

Le tabelle delle sezioni le creano le migrazioni in `db/<sezione>/migrations/`.

## 7. Variabili d'ambiente

```powershell
Copy-Item .env.example .env.local
```

Aprite `.env.local` e sostituite `LA_TUA_PASSWORD` con la password scelta al punto 6, in tutte e cinque le righe `DATABASE_URL*`.

## 8. Avvio

```powershell
npm run dev
```

- http://localhost:3000 mostra l'app
- Prima di partire `npm run dev` (e `npm start`) **aggiorna da solo il database**: applica le migrazioni che mancano e, se dopo un `git pull` nel repository c'è una copia nuova dei dati (`data/seed/`), la carica. Non serve lanciare altro. Se il database è spento il sito parte lo stesso. Per saltare l'aggiornamento: `$env:RR_NO_ALLINEA=1`.
- http://localhost:3000/api/health deve rispondere `"ok": true` con l'elenco delle estensioni, tra cui `postgis` e `vector`

## Strumenti utili

- **pgAdmin 4** viene installato insieme a Postgres: serve per sfogliare tabelle e lanciare query.
- **ogr2ogr** si trova in `C:\Program Files\PostgreSQL\17\bin` e importa GeoJSON e shapefile degli open data, per esempio:

  ```powershell
  & "C:\Program Files\PostgreSQL\17\bin\ogr2ogr.exe" -f PostgreSQL "PG:dbname=romarouter user=romarouter host=localhost" municipi.geojson -nln opendata.municipi -lco GEOMETRY_NAME=geom -t_srs EPSG:4326
  ```
