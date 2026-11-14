import type { Metadata } from "next";
import Link from "next/link";
import { SportelloArte } from "@/components/operatori/SportelloArte";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Sportello arte di strada · Area operatori" };

export default function PaginaSportelloArte() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <div>
        <p className="text-sm font-bold tracking-[0.06em] text-muted uppercase">
          <Link href="/operatori" className="hover:text-ink">
            Area operatori
          </Link>{" "}
          · Sportello unico arte di strada
        </p>
        <h1 className="flex flex-wrap items-center gap-3 text-[30px] leading-[38px] font-bold">
          Una richiesta dall&apos;artista, tutto il resto lo manda lo sportello
          <span className="rounded-full bg-attenzione-tint px-3 py-1 text-[13px] font-bold tracking-normal text-attenzione">DEMO</span>
        </h1>
        <p className="max-w-[760px] text-base text-ink-soft">
          L&apos;artista crea il suo Pass una volta e prenota sulla mappa con «Ci sarò». Ogni sera lo sportello raccoglie tutte le prenotazioni e manda
          una comunicazione per Gruppo di Polizia Locale (art. 10 DAC 24/2012), l&apos;elenco SIAE e le richieste di nulla osta ai Municipi.
          In questa demo le comunicazioni sono complete ma non partono: manca il collegamento alla PEC.
        </p>
      </div>
      <SportelloArte />
    </main>
  );
}
