import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaSport } from "@/components/sport/VistaSport";
import { Scheletro } from "@/components/vista/Scheletro";

export const metadata: Metadata = { title: "Impianti sportivi" };

export default function PaginaSport() {
  return (
    <Suspense fallback={<Scheletro voceId="sport" />}>
      <VistaSport />
    </Suspense>
  );
}
