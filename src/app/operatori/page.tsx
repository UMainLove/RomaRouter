import type { Metadata } from "next";
import Link from "next/link";
import { AreaOperatori } from "@/components/operatori/AreaOperatori";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Area operatori" };

export default function PaginaOperatori() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <div>
        <p className="text-sm font-bold tracking-[0.06em] text-muted uppercase">Area operatori · Oggetti smarriti</p>
        <h1 className="text-[30px] leading-[38px] font-bold">Consegne e restituzioni</h1>
        <p className="text-base text-ink-soft">Prendi in consegna gli oggetti, verifica chi li cerca e restituiscili. I dati dei cittadini restano cifrati.</p>
      </div>
      <AreaOperatori />
      <Link href="/operatori/arte" className="flex items-center gap-4 rounded-panel border border-line bg-panel p-5 hover:bg-bg-sink">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-[0.06em] text-muted uppercase">Arte di strada · demo</span>
          <span className="block text-xl font-bold text-ink">Sportello unico: preavvisi, SIAE e nulla osta in un invio solo</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-ink">
          →
        </span>
      </Link>
    </main>
  );
}
