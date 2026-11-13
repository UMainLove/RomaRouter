import type { Metadata } from "next";
import { Suspense } from "react";
import { VerificaAntenne } from "@/components/antenne/VerificaAntenne";
import { IntestazionePagina } from "@/components/ui/Varie";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Antenne" };

export default function PaginaAntenne() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <IntestazionePagina
        ambito="antenne"
        titolo="Antenne"
        sottotitolo="Impianti di telefonia, misure ARPA Lazio e siti sensibili entro 300 m"
      />
      <Suspense fallback={<p className="text-ink-soft">Carico la verifica…</p>}>
        <VerificaAntenne />
      </Suspense>
    </main>
  );
}
