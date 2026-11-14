import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { SportMappa } from "@/components/sport/SportMappa";
import { datiGuida } from "@/lib/sport";

export const metadata: Metadata = {
  title: "Impianti sportivi",
  description:
    "Dove fare sport a Roma: impianti comunali, centri sportivi municipali, campetti e aree fitness gratis, club. Per sport, Municipio e accessibilità, con le tariffe massime del Comune. Dati di Roma Capitale e OpenStreetMap.",
};

/*
 * Sport a tutta mappa: la mappa e la domanda «dove posso fare il mio sport vicino a me?» occupano lo schermo.
 * Tariffe, numeri per Municipio, lacune e fonti stanno nella Guida, scritta qui sul server.
 */
const ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
const fmt = (n: number) => n.toLocaleString("it-IT", { useGrouping: "always" } as Intl.NumberFormatOptions);
const euro = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const UNITA: Record<string, string> = { ora: "l'ora", turno: "a turno", ingresso: "a ingresso", mese: "al mese", anno: "l'anno" };

function Blocco({ id, titolo, testo, children }: { id: string; titolo: string; testo?: ReactNode; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5 border-t border-line pt-4 first:border-0 first:pt-0">
      <h2 id={id} className="text-lg font-bold text-ink">
        {titolo}
      </h2>
      {testo && <p className="text-[15px] leading-relaxed text-ink-soft">{testo}</p>}
      {children}
    </section>
  );
}
const Attesa = ({ cosa }: { cosa: string }) => <p className="text-sm text-muted">Carico {cosa}…</p>;

const ACCESSI: [string, string, string][] = [
  ["#16955A", "Libero e gratis", "Campetti nei parchi, aree fitness e sportive del Comune: si entra senza pagare."],
  ["#1F63D1", "Impianto comunale", "Impianti di Roma Capitale, quasi sempre affidati in concessione ad associazioni. I prezzi non possono superare le tariffe massime del Comune."],
  ["#7A4FD0", "Corsi in una scuola", "Centri sportivi municipali: nelle palestre delle scuole, il pomeriggio e la sera, un'associazione organizza corsi a prezzi calmierati."],
  ["#5F6B7A", "Club o privato", "Club, palestre e campi privati, o campi di cui non si sa chi li gestisce: di solito si paga."],
];

async function ComeSiEntra() {
  await connection();
  const d = await datiGuida();
  const gruppi = new Map<string, typeof d.tariffe>();
  d.tariffe.forEach((t) => gruppi.set(t.voce, [...(gruppi.get(t.voce) ?? []), t]));
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2.5">
        {ACCESSI.map(([c, n, t]) => (
          <li key={n} className="flex gap-2.5 text-[15px] leading-snug text-ink">
            <span className="mt-1 size-3.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: c }} aria-hidden="true" />
            <span>
              <b>{n}.</b> {t}
            </span>
          </li>
        ))}
      </ul>
      {d.tariffe.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full text-left text-sm">
            <caption className="px-3 pt-2.5 pb-1 text-left text-[13px] font-semibold text-muted">
              Tariffe massime negli impianti comunali, 2026/2027 ({d.tariffe[0].atto.replace(/ \(.*\)$/, "")})
            </caption>
            <tbody>
              {[...gruppi.values()].map(([t]) => (
                <tr key={t.voce} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink">{t.voce}</td>
                  <td className="px-3 py-1.5 text-right font-bold whitespace-nowrap text-ink tabular-nums">
                    {euro(t.euro)} € <span className="font-normal text-muted">{UNITA[t.unita] ?? t.unita}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function PerMunicipio() {
  await connection();
  const d = await datiGuida();
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Luoghi dove fare sport per Municipio e per tipo di accesso</caption>
        <thead className="bg-bg-sink text-xs tracking-wide text-muted uppercase">
          <tr>
            {["Mun.", "Luoghi", "Gratis", "Comunali", "Scuole", "Club", "Access."].map((h) => (
              <th key={h} scope="col" className="px-2.5 py-2 text-right first:text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.municipi.map((r) => (
            <tr key={r.m} className="border-t border-line tabular-nums">
              <th scope="row" className="px-2.5 py-1.5 text-left font-bold text-ink">
                {ROMANI[r.m]}
              </th>
              <td className="px-2.5 py-1.5 text-right font-bold text-ink">{fmt(r.tot)}</td>
              <td className="px-2.5 py-1.5 text-right text-[#0F7A47]">{r.libero}</td>
              <td className="px-2.5 py-1.5 text-right">{r.comunale}</td>
              <td className="px-2.5 py-1.5 text-right">{r.scuola}</td>
              <td className="px-2.5 py-1.5 text-right">{r.club}</td>
              <td className="px-2.5 py-1.5 text-right text-muted">{r.accessibili}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Lacune() {
  await connection();
  const { totali: t } = await datiGuida();
  const voci: [string, string][] = [
    ["Accessibilità", `si conosce solo per ${fmt(t.accessibilita_nota)} luoghi su ${fmt(t.luoghi)}: le altre schede dicono «non si sa», mai un sì inventato. Un controllo del Comune (ACoS, dicembre 2025) su 34 impianti comunali ne ha trovati il 68% senza barriere.`],
    ["Orari", `ci sono per ${fmt(t.con_orari)} luoghi. Gli orari dei corsi nei centri municipali sono nei PDF dei Municipi e arriveranno nella prossima versione.`],
    ["Prezzi", "per gli impianti comunali c'è il tetto massimo fissato dal Comune, non il prezzo del singolo impianto. Per i club bisogna chiedere."],
    ["Gestione", "i campi senza nome trovati su OpenStreetMap fuori dai parchi sono segnati come «club o privato»: spesso è così, ma non sempre."],
    ["Palestre private", "OpenStreetMap ne conosce poche rispetto a quelle che ci sono davvero."],
    ["Censimento nazionale", "Sport e Salute ha il censimento completo degli impianti (circa 2.258 a Roma), ma non è riusabile: si può chiederne un estratto per Roma."],
  ];
  return (
    <ul className="flex flex-col gap-2.5">
      {voci.map(([n, v]) => (
        <li key={n} className="text-[15px] leading-snug text-ink">
          <b>{n}:</b> {v}
        </li>
      ))}
    </ul>
  );
}

async function Fonti() {
  await connection();
  const { fonti, totali } = await datiGuida();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-ink-soft">
        {fmt(totali.luoghi)} luoghi e {fmt(totali.spazi)} campi e spazi; {fmt(totali.ufficiali)} luoghi vengono da Roma Capitale, gli altri da OpenStreetMap.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {fonti.map((f) => (
          <li key={f.titolo} className="leading-snug text-ink">
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-line underline-offset-2 hover:decoration-ink">
              {f.titolo}
            </a>
            <span className="block text-[13px] text-muted">{[f.ente, f.licenza ? `licenza: ${f.licenza}` : null, f.ufficiale ? null : "non ufficiale", f.n_record ? `${fmt(f.n_record)} elementi` : null].filter(Boolean).join(" · ")}</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">© OpenStreetMap contributors (ODbL). Dati di Roma Capitale con citazione della fonte.</p>
    </div>
  );
}

export default function PaginaSport() {
  return (
    <SportMappa
      guida={[
        {
          id: "accesso",
          nome: "Come si entra",
          contenuto: (
            <Blocco id="accesso" titolo="Gratis, comunale, a scuola o club" testo="Sulla mappa il colore dice come si entra, il disegno dice lo sport.">
              <Suspense fallback={<Attesa cosa="le tariffe" />}>
                <ComeSiEntra />
              </Suspense>
            </Blocco>
          ),
        },
        {
          id: "municipi",
          nome: "Per Municipio",
          contenuto: (
            <Blocco id="municipi-t" titolo="Quanti luoghi per Municipio" testo="Tutti i luoghi della mappa, Municipio per Municipio. «Access.» conta quelli segnalati accessibili in carrozzina.">
              <Suspense fallback={<Attesa cosa="i numeri" />}>
                <PerMunicipio />
              </Suspense>
            </Blocco>
          ),
        },
        {
          id: "lacune",
          nome: "Cosa non sappiamo",
          contenuto: (
            <Blocco id="lacune-t" titolo="Cosa non sappiamo (ancora)">
              <Suspense fallback={<Attesa cosa="le lacune" />}>
                <Lacune />
              </Suspense>
            </Blocco>
          ),
        },
        {
          id: "fonti",
          nome: "Fonti",
          contenuto: (
            <Blocco id="fonti-t" titolo="Da dove vengono i dati">
              <Suspense fallback={<Attesa cosa="le fonti" />}>
                <Fonti />
              </Suspense>
            </Blocco>
          ),
        },
      ]}
    />
  );
}
