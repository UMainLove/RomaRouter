import type { Metadata } from "next";
import { Suspense } from "react";
import { RicercaImpianti } from "@/components/sport/RicercaImpianti";
import { IntestazionePagina } from "@/components/ui/Varie";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Impianti sportivi" };

export default function PaginaSport() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <IntestazionePagina
        ambito="sport"
        titolo="Impianti sportivi"
        sottotitolo="Impianti comunali, palestre scolastiche aperte al quartiere e privati"
      />
      <Suspense fallback={<p className="text-ink-soft">Carico gli impianti…</p>}>
        <RicercaImpianti />
      </Suspense>
    </main>
  );
}
