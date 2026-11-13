import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaOggetti } from "@/components/oggetti/VistaOggetti";
import { Scheletro } from "@/components/vista/Scheletro";

export const metadata: Metadata = { title: "Oggetti smarriti" };

export default function PaginaOggetti() {
  return (
    <Suspense fallback={<Scheletro voceId="oggetti" />}>
      <VistaOggetti />
    </Suspense>
  );
}
