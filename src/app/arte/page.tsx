import type { Metadata } from "next";
import { Suspense } from "react";
import { ElencoPostazioni } from "@/components/arte/ElencoPostazioni";
import { Avviso, IntestazionePagina } from "@/components/ui/Varie";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = { title: "Arte di strada" };

export default function PaginaArte() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <IntestazionePagina ambito="arte" titolo="Arte di strada" sottotitolo="Postazioni, turni e prenotazione per gli artisti iscritti al registro" />
      <Avviso>
        Le postazioni e le regole sono di esempio: quelle vere arrivano con il nuovo regolamento e le mappe dei Municipi.
      </Avviso>
      <Suspense fallback={<p className="text-ink-soft">Carico le postazioni…</p>}>
        <ElencoPostazioni />
      </Suspense>
    </main>
  );
}
