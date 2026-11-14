import type { Metadata } from "next";
import Link from "next/link";
import { RegistraOggetto } from "@/components/operatori/RegistraOggetto";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Area operatori" };

export default function PaginaOperatori() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <div>
        <p className="text-sm font-bold tracking-[0.06em] text-muted uppercase">Area operatori · Reparto Oggetti Rinvenuti</p>
        <h1 className="text-[30px] leading-[38px] font-bold">Registra un oggetto</h1>
        <p className="text-base text-ink-soft">Carica una foto: l&apos;agente propone la scheda, tu controlli e pubblichi.</p>
      </div>
      <RegistraOggetto />
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
