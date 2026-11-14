# Le mappe di RomaRouter: arte di strada e antenne

Studio e scelte di progetto (14/11/2026), dopo la critica alla prima versione «leggera».

## Cosa non andava

1. **Fondo grigio e spento.** Era una mappa raster di OpenStreetMap con un filtro grigio sopra: sfocata in movimento e piatta.
2. **Pallini tutti uguali.** Le antenne erano due colori senza forma: non capivi se era una piccola antenna o un traliccio, né di chi era. Le esibizioni degli artisti si vedevano solo cambiando modo.
3. **Schede da scorrere.** Dieci blocchi di testo uno sotto l'altro: per trovare la risposta dovevi scorrere.
4. **Nessuna idea.** La mappa mostrava i dati, ma non rispondeva da sola alla domanda di chi la apre.

## Principi

- **Una domanda per mappa, risposta in 3 secondi senza toccare nulla.**
  - Arte: «dove posso esibirmi, e chi si esibisce adesso?».
  - Antenne: «che antenne ci sono vicino a me, e di che tipo?».
- **La forma dice il tipo, il colore dice lo stato.** Ogni simbolo si legge senza legenda. La legenda serve anche da filtro, con i numeri.
- **Scheda = una schermata.** Una riga di titolo, una risposta grande, tre fatti, un'azione. Il resto va in una «Guida» a parte, che è una pagina e non un popup.
- **Veloce davvero.** Le mappe sono vettoriali (MapLibre + OpenFreeMap, senza chiavi): nitide a ogni zoom e fluide perché disegnate dalla GPU. Il motore si carica dopo la pagina, i dati sono piccoli, i livelli secondari arrivano solo se servono.
- **Bella.** Fondo carta caldo con la palette del sito e acqua e verde tenui. I nomi delle strade stanno sotto i dati, non sopra. Edifici in rilievo leggero da vicino.

## Arte di strada: idee valutate

| Idea | Impatto | Chiarezza | Costo | Scelta |
| --- | --- | --- | --- | --- |
| **La città si colora per la tua arte**: scegli musica, silenziosa, fuoco… e la mappa si ricolora (verde dove puoi, rosso dove no, viola solo sui palchi) | alto | alta | basso | **sì** |
| **Gli artisti in mappa**: ogni esibizione è un avatar con l'icona della disciplina (chitarra, maschera, pennello, fuoco, tarocchi); chi è in scena adesso pulsa. Interruttore Adesso / Stasera / Domani | alto | alta | medio | **sì** |
| **Palchi con i turni**: ogni postazione ufficiale mostra se è libera ora; la scheda ha i turni di oggi su una riga e un tocco su un turno libero lo prenota | alto | alta | medio | **sì** |
| Orologio del regolamento («ora puoi fino alle 20», «riapre alle 16») | medio | alta | basso | sì, nella barra |
| Portami lì (indicazioni a piedi) | medio | alta | basso | sì, un'azione nella scheda |
| Classifica dei posti migliori per passaggio di persone | medio | media | medio | dopo |
| Mappa di calore delle esibizioni | basso | media | medio | no |

## Antenne: idee valutate

| Idea | Impatto | Chiarezza | Costo | Scelta |
| --- | --- | --- | --- | --- |
| **Linguaggio dei tipi**: la forma dice la taglia (traliccio = stazione radio base, piccolo cerchio = piccola antenna a bassa potenza), il colore dice l'intervento (nuova, potenziamento, modifica), la sigla dice l'operatore; la legenda filtra | alto | alta | medio | **sì** |
| **Radar di casa**: scrivi l'indirizzo e partono gli anelli di 100, 250 e 500 m. In grande la distanza della più vicina, poi quante antenne per anello e i siti sensibili dentro | alto | alta | medio | **sì** |
| **Linea del tempo**: un istogramma delle richieste mese per mese. Scegli il periodo (3 mesi, 12 mesi, tutto) e la mappa mostra solo quelle; le nuove sono evidenziate | alto | media | medio | **sì** |
| Siti condivisi (più operatori sullo stesso palo) | medio | alta | basso | sì, nel simbolo |
| Chiedi una misura ad ARPA (azione) | medio | alta | basso | sì, nella scheda |
| Antenne in 3D sugli edifici | basso | bassa | alto | no |

## Schede: regola della schermata singola

- Altezza fissa: su telefono un foglio di circa 300 px, su computer una scheda di circa 360 px. Niente scorrimento.
- Struttura: icona e titolo, la risposta in una riga grande e colorata, tre caselle di fatti, una o due azioni.
- Liste lunghe: al massimo tre righe; il resto è un numero e un'azione.
- Regole, contatti, fonti ed elenco completo stanno nella «Guida» (pagina con schede, si apre dalla barra).

## Antenne in funzione: da dove vengono (novembre 2026)

Il catasto ufficiale degli impianti (ARPA Lazio ne conta 3.538 a Roma) non e' pubblico. La mappa mostra:

| Livello | Fonte | Quanti a Roma | Note |
| --- | --- | --- | --- |
| Antenne in funzione | OpenCelliD, copia completa di maggio 2024 su archive.org (CC BY-SA 4.0, senza registrazione) | 74.735 celle → **3.131 siti** | celle 4G raggruppate per stazione (eNodeB), 3G/2G agganciate entro 150 m, siti di operatori diversi entro 35 m uniti; escluse le celle senza misure dal 2018. Posizioni stimate (2.281 siti entro ±50 m) |
| Impianti esistenti | OpenStreetMap | 317 | tralicci, pali e antenne censiti dai volontari |
| Richieste | Roma Capitale | 192 | nuove antenne e modifiche pubblicate |

Rifare: `node --env-file=.env.local scripts/antenne/celle.mts data/raw/antenne/celle/roma_celle.csv "OpenCelliD maggio 2024 (CC BY-SA 4.0)"` (il CSV si ricava dal file di archive.org, che sta in `data/raw/`, fuori da git). Scartati: CellMapper, nPerf, OpenSignal e lteitaly.it, perche' le loro condizioni vietano copia e riuso. Il 5G non c'e' ancora nei dati aperti.

## Arte di strada: tutta Roma coperta (novembre 2026)

La mappa non mostra piu' solo le eccezioni del centro: tutto il Comune e' diviso in 80.041 esagoni H3
(risoluzione 10, ~0,015 km²), classificati con le 17.548 vie dello stradario di Roma Capitale, le piazze
pedonali e i 1.033 parchi di OpenStreetMap:

| Classe | Esagoni | Superficie | Significato |
| --- | --- | --- | --- |
| adatta (verde) | 38.705 | 623 km² | strade percorribili a piedi o piazze: valgono le regole generali (orari, 2 ore, preavviso) |
| parco | 512 | 8 km² | solo viali pavimentati, senza amplificazione (Allegato A) |
| non adatta (rosa) | 40.824 | 657 km² | campagna, ferrovie, aeroporto, autostrade, fiume |

Sopra: divieti (rosso a righe), solo silenzio (arancio), solo palchi (viola), fusi in forme pulite;
le 1.556 piazze pedonali libere come luoghi consigliati; 58 artisti dimostrativi in tutti i 15 Municipi.
La verifica di un punto usa gli esagoni esatti («Qui non c'e' spazio adatto»). Rifare:
`node --env-file=.env.local scripts/artisti/copertura.mts`, poi `npm run artisti:esporta`.

## Pass artista e sportello unico (demo, novembre 2026)

Prima l'artista doveva fare da solo: preavviso PEC alla Polizia Locale per ogni esibizione (art. 10),
licenza SIAE se suona brani di altri, nulla osta del Municipio per gli spettacoli di tipo 1. Ora:

1. **Pass artista** (una volta sola, 3 passi nella mappa): chi sei (SPID/CIE, nella demo identità di prova),
   cosa fai (nome d'arte, arte, tre risposte sì/no: gruppo grande, amplificazione, brani di altri), firma della delega.
   Il Pass vive in un cookie httpOnly (`rr_pass`) con un codice casuale: niente password.
2. **«Ci sarò»**: tocchi un punto verde o un palco, scegli giorno (da 3 giorni a un mese), ora e durata.
   Il server controlla fasce dell'art. 6, zone e divieti, palchi dell'Allegato B (niente amplificazione),
   parchi, posto assegnato per i ritratti, turni già presi entro 30 m (e propone l'orario dopo).
3. **Sportello** (`/operatori/arte`): ogni sera un lotto solo. Una comunicazione per Gruppo di Polizia Locale
   con tutte le esibizioni del suo territorio (testo, CSV allegato, file `.eml`), un elenco SIAE, una richiesta di
   nulla osta per Municipio. Esempio con i dati dimostrativi: 20 comunicazioni al posto di oltre 650 PEC.

Demo: le comunicazioni si generano complete in `artisti.invii` ma non partono (manca il collegamento PEC;
basterà inviare lo stesso `.eml`). «Ricomincia la demo» rimette tutto in coda. Tabelle: migrazione
`db/artisti-di-strada/migrations/009_pass_artista.sql` (si applica da sola all'avvio del sito).
API: `/api/artisti/pass` (GET, POST, DELETE), `/api/artisti/prenota`, `/api/operatori/arte` (GET, DELETE),
`/api/operatori/arte/invia`, `/api/operatori/arte/invii/<id>` (.eml). Da fare prima di andare dal vero:
SPID vero, accesso riservato all'area operatori, invio PEC e ricevute.

## Rosso e verde rifatti con l'art. 2 (novembre 2026)

Critica: «troppe poche zone davvero non utilizzabili». Era vero: il rosso mostrava solo i divieti deliberati
dai Municipi (sono davvero pochi: 10 vie e piazze del Municipio I più i divieti di suono del 2018) e il verde
copriva ogni esagono attraversato da una via, anche in campagna o lungo una superstrada. Mancavano le regole
generali dell'art. 2 DAC 24/2012, che valgono ovunque. Ora (dati OpenStreetMap, `scripts/artisti/vincoli_osm.mts`):

| Regola (art. 2) | Come si disegna | Quante |
| --- | --- | --- |
| Niente musica nelle vie larghe meno di 5 m | larghezza da facciata a facciata misurata ogni 8 m sugli edifici OSM della città storica (es. via dei Cappellari 4,3 m, via del Corso 10,4 m) | 196 vie |
| Niente musica a ridosso dei beni artistici e culturali | monumenti, rovine, porte, mura, archi, obelischi, fontane storiche, musei: area + 10 m o 15 m attorno al punto | 1.723 |
| Niente musica vicino a ospedali e luoghi di culto | da «attenzione» (giallo) a «solo silenzio» | 93 + 810 |
| Niente musica vicino alle scuole in attività | vale solo nei giorni feriali dalle 8 alle 17, da settembre a giugno | 2.676 |
| Non ostacolare la circolazione | superstrade e autostrade (motorway, trunk) non contano come spazio pedonale | 2.599 tratti |
| Nessuno spazio pedonale | campagna coltivata, boschi e prati fuori dai parchi, cimiteri, aree militari, ferrovie, aeroporti, cave, discariche, cantieri | 15.133 aree |

Per chi suona (o fa il fuoco) «solo silenzio» ora è rosso: vuol dire «qui non puoi». Copertura: adatta
488 km² (prima 623), parco 20 km² (i parchi valgono anche dove li attraversa un viale), non adatta 781 km²
(prima 657). Rifare: `node --env-file=.env.local scripts/artisti/vincoli_osm.mts [--scarica]`, poi
`npm run artisti:esporta`. Limiti: larghezze stimate solo nella città storica; i beni culturali sono quelli
mappati su OpenStreetMap (non il vincolo della Soprintendenza).
