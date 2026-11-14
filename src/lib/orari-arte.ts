/*
 * Fasce orarie dell'art. 6 DAC 24/2012 (confermate dal TAR nel 2013), ora di Roma. Servono sia al server
 * (verifica, annunci) sia alla mappa (l'orologio "puoi fino alle 20" / "riapre alle 16").
 */
export type AttivitaArte = "musica" | "silenziosa" | "fuoco" | "figurativa" | "esoterica";

function oraRoma(quando: Date) {
  const parti = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", month: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(quando);
  const v = (t: string) => Number(parti.find((p) => p.type === t)?.value ?? 0);
  return { mese: v("month"), minuti: v("hour") * 60 + v("minute") };
}

export function fasceDelGiorno(quando: Date, attivita: AttivitaArte): [number, number][] {
  const { mese } = oraRoma(quando);
  const estate = mese >= 6 && mese <= 9;
  return attivita === "esoterica" ? [[16, 20], [20, 24]] : attivita === "figurativa" ? [[8, 24]] : estate ? [[10, 13], [16, 22]] : [[10, 13], [16, 20]];
}

/** Fascia oraria dell'art. 6 valida in quel momento. */
export function fasciaArt6(quando: Date, attivita: AttivitaArte) {
  const { mese, minuti } = oraRoma(quando);
  const estate = mese >= 6 && mese <= 9;
  const fasce = fasceDelGiorno(quando, attivita);
  const dentro = fasce.some(([a, b]) => minuti >= a * 60 && minuti < b * 60);
  const testo = fasce.map(([a, b]) => `${a}–${b}`).join(" e ");
  return { dentro, testo, stagione: attivita === "esoterica" || attivita === "figurativa" ? null : estate ? "1 giugno – 30 settembre" : "1 ottobre – 31 maggio" };
}

/** L'orologio: aperto fino a che ora, oppure a che ora riapre (oggi o domani). */
export function orologio(quando: Date, attivita: AttivitaArte): { aperto: boolean; ora: string; testo: string } {
  const { minuti } = oraRoma(quando);
  const fasce = fasceDelGiorno(quando, attivita);
  const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  // fasce contigue (es. 16-20 e 20-24) valgono come una sola
  const unite: [number, number][] = [];
  for (const f of fasce) {
    const u = unite[unite.length - 1];
    if (u && u[1] === f[0]) u[1] = f[1];
    else unite.push([...f]);
  }
  const ora = unite.find(([a, b]) => minuti >= a * 60 && minuti < b * 60);
  if (ora) return { aperto: true, ora: hh(ora[1]), testo: `Puoi esibirti fino alle ${hh(ora[1])}` };
  const dopo = unite.find(([a]) => minuti < a * 60);
  if (dopo) return { aperto: false, ora: hh(dopo[0]), testo: `Ora no: riapre alle ${hh(dopo[0])}` };
  return { aperto: false, ora: hh(unite[0][0]), testo: `Ora no: domani dalle ${hh(unite[0][0])}` };
}
