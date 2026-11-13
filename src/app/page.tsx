import Link from "next/link";
import { CampoRichiesta } from "@/components/agente/CampoRichiesta";
import { Icon } from "@/components/Icon";
import { AnteprimaMappa } from "@/components/mappa/AnteprimaMappa";
import { CampioneForma, TesseraAmbito } from "@/components/ui/Varie";
import { contenitore } from "@/components/ui/stili";
import { AMBITI, LIVELLI_MAPPA, ORDINE_AMBITI } from "@/lib/ambiti";

const ESEMPI = [
  { testo: "Dove gioco a basket vicino a Testaccio? Meglio se gratis", ambito: "sport" as const },
  { testo: "Ho perso lo zaino sul tram 8 ieri sera", ambito: "oggetti" as const },
  { testo: "Ci sono antenne vicino alla scuola di Piazza Testaccio?", ambito: "antenne" as const },
  { testo: "Voglio suonare a Trastevere sabato", ambito: "arte" as const },
];

const ALTRI = ["Segnalazioni", "Mobilità e ZTL", "Anagrafe", "Tributi"];

export default function Home() {
  return (
    <main>
      <section className={`${contenitore} flex flex-wrap items-stretch gap-10 pt-12 pb-10 sm:pt-14`}>
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <p className="flex items-center gap-3 text-sm font-bold tracking-[0.08em] text-amaranto uppercase">
            <span aria-hidden="true" className="h-[3px] w-8 rounded-sm bg-oro" />
            Tutte le strade portano al servizio giusto
          </p>
          <h1 className="max-w-[680px] text-[40px] leading-[46px] font-bold tracking-[-0.02em] sm:text-[56px] sm:leading-[60px]">
            Cosa ti serve, oggi, a Roma?
          </h1>
          <p className="max-w-[620px] text-lg leading-7 text-ink-soft sm:text-xl sm:leading-[30px]">
            Scrivi o parla come faresti allo sportello. L&apos;agente capisce la richiesta, ti fa al massimo una domanda e ti
            porta al servizio giusto con i filtri già pronti.
          </p>
          <CampoRichiesta />
          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-bold text-muted">Prova con</p>
            <ul className="flex flex-wrap gap-2">
              {ESEMPI.map((e) => (
                <li key={e.testo}>
                  <Link
                    href={`/chiedi?q=${encodeURIComponent(e.testo)}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel px-3.5 text-[15px] font-semibold hover:bg-bg-sink"
                  >
                    <span aria-hidden="true" className={`size-2.5 rounded-full ${AMBITI[e.ambito].classi.segno}`} />
                    {e.testo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside aria-labelledby="titolo-mappa" className="flex min-w-0 flex-[1_1_380px] flex-col gap-3 rounded-[20px] border border-line bg-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="titolo-mappa" className="text-xl leading-[26px] font-bold">
                Mappa comune
              </h2>
              <p className="text-[15px] leading-[22px] text-ink-soft">Sport, antenne e arte di strada su un&apos;unica mappa</p>
            </div>
            <Link href="/mappa" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-bold">
              Apri
              <Icon name="freccia" size={18} strokeWidth={2} />
            </Link>
          </div>
          <AnteprimaMappa />
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold text-ink-soft">
            {LIVELLI_MAPPA.map((id) => (
              <li key={id} className="flex items-center gap-1.5">
                <CampioneForma id={id} />
                {AMBITI[id].nome}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section aria-labelledby="titolo-ambiti" className={`${contenitore} pb-10`}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="titolo-ambiti" className="text-[28px] leading-9 font-bold">
            Oppure scegli un ambito
          </h2>
          <p className="text-base text-muted">Le quattro sfide di Roma Capitale, in un solo posto</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {ORDINE_AMBITI.map((id) => {
            const a = AMBITI[id];
            return (
              <article key={id} className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 rounded-panel border border-line bg-panel p-5">
                <div className="flex items-center gap-3">
                  <TesseraAmbito id={id} />
                  <h3 className="text-[21px] leading-[26px] font-bold">{a.nome}</h3>
                </div>
                <p className="text-base leading-6 text-ink-soft">{a.descrizione}</p>
                <div className="mt-auto flex flex-col border-t border-line-soft pt-1.5">
                  {a.azioni.map((az) => (
                    <Link key={az.href} href={az.href} className="flex min-h-11 items-center justify-between text-base font-semibold text-ink hover:text-amaranto">
                      {az.etichetta}
                      <Icon name="avanti" size={18} className="text-muted" />
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="titolo-altro" className={`${contenitore} pb-14`}>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-panel px-5 py-4">
          <div className="flex min-w-0 flex-[1_1_420px] items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-card bg-ink text-white">
              <Icon name="bussola" size={24} />
            </span>
            <div>
              <h2 id="titolo-altro" className="text-[19px] leading-[26px] font-bold">
                Non è tra questi?
              </h2>
              <p className="text-base leading-6 text-ink-soft">
                Chiedi lo stesso: l&apos;agente ti indica la pagina ufficiale giusta e da dove viene l&apos;informazione.
              </p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2">
            {ALTRI.map((a) => (
              <li key={a}>
                <Link href={`/chiedi?q=${encodeURIComponent(a)}`} className="inline-flex min-h-11 items-center rounded-full border border-line px-3.5 text-[15px] font-semibold hover:bg-bg-sink">
                  {a}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
