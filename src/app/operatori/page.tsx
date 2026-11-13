import type { Metadata } from "next";
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
    </main>
  );
}
