const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** "2026-11-12" → "12 nov 2026", senza usare l'ora corrente. */
export function formattaData(iso: string, conAnno = true): string {
  const [a, m, g] = iso.split("-").map(Number);
  if (!a || !m || !g) return iso;
  return conAnno ? `${g} ${MESI[m - 1]} ${a}` : `${g} ${MESI[m - 1]}`;
}

/** Prossimi giorni a partire da oggi, nel fuso di Roma. Da chiamare solo nel browser (usa l'ora corrente). */
export function prossimiGiorni(quanti: number, saltaDomenica = false): { iso: string; giorno: string; numero: number; mese: string }[] {
  const oggi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  const risultato = [];
  for (let i = 0; risultato.length < quanti && i < quanti * 2; i++) {
    const d = new Date(Date.UTC(oggi[0], oggi[1] - 1, oggi[2] + i));
    if (saltaDomenica && d.getUTCDay() === 0) continue;
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    risultato.push({ iso, giorno: GIORNI[d.getUTCDay()], numero: d.getUTCDate(), mese: MESI[d.getUTCMonth()] });
  }
  return risultato;
}
