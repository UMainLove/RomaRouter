import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaArte } from "@/components/arte/VistaArte";
import { Scheletro } from "@/components/vista/Scheletro";

export const metadata: Metadata = { title: "Artisti di strada" };

export default function PaginaArte() {
  return (
    <Suspense fallback={<Scheletro voceId="arte" />}>
      <VistaArte />
    </Suspense>
  );
}
