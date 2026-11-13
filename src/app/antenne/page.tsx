import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaAntenne } from "@/components/antenne/VistaAntenne";
import { Scheletro } from "@/components/vista/Scheletro";

export const metadata: Metadata = { title: "Antenne" };

export default function PaginaAntenne() {
  return (
    <Suspense fallback={<Scheletro voceId="antenne" />}>
      <VistaAntenne />
    </Suspense>
  );
}
