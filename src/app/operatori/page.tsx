import type { Metadata } from "next";
import { AreaOperatori } from "@/components/operatori/AreaOperatori";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Area operatori · Livello 3" };

export default function PaginaOperatori() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <div>
        <p className="text-sm font-bold tracking-[0.06em] text-muted uppercase">
          Area operatori · Livello 3 · Reparto Oggetti Rinvenuti, Custodi e Forze dell&apos;Ordine
        </p>
        <h1 className="text-[30px] leading-[38px] font-bold">Gestione protetta e restituzione</h1>
        <p className="text-base text-ink-soft">
          Catalogo completo con Audit Log, inbox match pseudonima, verifica con domande aperte, semaforo documenti e passaggi di consegna.
        </p>
      </div>
      <AreaOperatori />
    </main>
  );
}
