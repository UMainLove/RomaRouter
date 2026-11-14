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
