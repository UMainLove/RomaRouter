import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Etichetta, Fonte, TesseraAmbito } from "@/components/ui/Varie";
import { btnPrimario, btnSecondario, contenitore } from "@/components/ui/stili";
import { IMPIANTI, TIPI_IMPIANTO } from "@/data/esempi";
import { formattaData } from "@/lib/formato";

export function generateStaticParams() {
  return IMPIANTI.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: PageProps<"/sport/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: IMPIANTI.find((i) => i.id === id)?.nome ?? "Impianto sportivo" };
}

export default async function PaginaImpianto({ params }: PageProps<"/sport/[id]">) {
  const { id } = await params;
  const impianto = IMPIANTI.find((i) => i.id === id);
  if (!impianto) notFound();

  const accessibilita = [
    { voce: "Ingresso senza gradini", valore: impianto.accessibile },
    { voce: "Spogliatoio accessibile", valore: impianto.accessibile },
    { voce: "Parcheggio riservato", valore: null },
  ];
  const osm = `https://www.openstreetmap.org/?mlat=${impianto.lat}&mlon=${impianto.lon}#map=18/${impianto.lat}/${impianto.lon}`;

  return (
    <main className="flex flex-col">
      <section className="bg-sport-tint">
        <div className={`${contenitore} flex flex-col gap-3 py-7`}>
          <Link href="/sport" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold text-sport-ink">
            <Icon name="indietro" size={18} strokeWidth={2} />
            Tutti gli impianti
          </Link>
          <div className="flex items-center gap-3.5">
            <TesseraAmbito id="sport" size={52} />
            <div>
              <h1 className="text-[28px] leading-[34px] font-bold">{impianto.nome}</h1>
              <p className="text-sm font-bold text-sport-ink">{TIPI_IMPIANTO[impianto.tipo]}</p>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[15px] text-ink-soft">
            <Icon name="segnaposto" size={16} />
            Municipio {impianto.municipio} · {impianto.quartiere}
          </p>
          <ul aria-label="Discipline" className="flex flex-wrap gap-1.5">
            {impianto.discipline.map((d) => (
              <li key={d} className="rounded-full bg-panel px-3 py-1 text-sm font-bold">
                {d}
              </li>
            ))}
            {impianto.gratuito && (
              <li>
                <Etichetta tono="ok" icona="spunta">
                  Ingresso libero
                </Etichetta>
              </li>
            )}
          </ul>
        </div>
      </section>

      <div className={`${contenitore} grid gap-6 py-8 md:grid-cols-2`}>
        <section aria-labelledby="t-acc" className="flex flex-col gap-2">
          <h2 id="t-acc" className="flex items-center gap-2 text-lg font-bold">
            <Icon name="accessibile" size={20} strokeWidth={2} />
            Accessibilità
          </h2>
          <ul className="overflow-hidden rounded-card border border-line bg-panel">
            {accessibilita.map((a) => (
              <li key={a.voce} className="flex items-center justify-between gap-2 border-b border-line-soft px-4 py-3 last:border-0">
                {a.voce}
                {a.valore === true ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-ok">
                    <Icon name="spunta" size={16} strokeWidth={2.4} />
                    Sì
                  </span>
                ) : a.valore === false ? (
                  <span className="text-sm font-bold text-errore">No</span>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-bold text-attenzione">
                    <Icon name="attenzione" size={16} strokeWidth={2.2} />
                    Da verificare
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="t-info" className="flex flex-col gap-2">
          <h2 id="t-info" className="text-lg font-bold">
            Informazioni
          </h2>
          <dl className="grid grid-cols-[auto_1fr] overflow-hidden rounded-card border border-line bg-panel text-[15px]">
            <dt className="border-b border-line-soft px-4 py-3 text-muted">Orari</dt>
            <dd className="border-b border-line-soft px-4 py-3 font-bold">{impianto.orari ?? "[ORARI del gestore]"}</dd>
            <dt className="border-b border-line-soft px-4 py-3 text-muted">Tariffe</dt>
            <dd className="border-b border-line-soft px-4 py-3 font-bold">{impianto.gratuito ? "Ingresso libero" : "[TARIFFE]"}</dd>
            <dt className="px-4 py-3 text-muted">Contatti</dt>
            <dd className="px-4 py-3 font-bold">[CONTATTI]</dd>
          </dl>
        </section>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Fonte>
            {impianto.fonte} · aggiornato il {formattaData(impianto.aggiornato)} (dati di esempio)
          </Fonte>
          <Link href="/operatori" className="inline-flex min-h-11 items-center gap-1.5 self-start font-bold">
            <Icon name="matita" size={18} />
            Sei il gestore? Aggiorna i dati
          </Link>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <a href={osm} target="_blank" rel="noopener noreferrer" className={btnPrimario}>
              Apri su OpenStreetMap
              <Icon name="esterno" size={18} />
            </a>
            <Link href={`/sport?sel=${impianto.id}`} className={btnSecondario}>
              <Icon name="mappa" size={18} />
              Vedi sulla mappa
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
