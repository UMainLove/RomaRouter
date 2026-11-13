import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaAltro } from "@/components/vista/VistaAltro";
import { Scheletro } from "@/components/vista/Scheletro";

export const metadata: Metadata = { title: "Non è tra questi?" };

export default function PaginaAltro() {
  return (
    <Suspense fallback={<Scheletro voceId="altro" />}>
      <VistaAltro />
    </Suspense>
  );
}
