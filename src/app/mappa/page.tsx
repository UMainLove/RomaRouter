import type { Metadata } from "next";
import { Suspense } from "react";
import { MappaComune } from "@/components/mappa/MappaComune";
import { IntestazionePagina } from "@/components/ui/Varie";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Mappa comune" };

export default function PaginaMappa() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <IntestazionePagina titolo="Mappa comune" sottotitolo="Impianti sportivi, antenne e postazioni per l'arte di strada" />
      <Suspense fallback={<p className="text-ink-soft">Carico la mappa…</p>}>
        <MappaComune />
      </Suspense>
    </main>
  );
}
