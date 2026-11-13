import type { Metadata } from "next";
import { Suspense } from "react";
import { Conversazione } from "@/components/agente/Conversazione";

export const metadata: Metadata = { title: "Chiedi" };

export default function PaginaChiedi() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<p className="mx-auto w-full max-w-[760px] px-4 py-8 text-ink-soft sm:px-8">Carico la conversazione…</p>}>
        <Conversazione />
      </Suspense>
    </main>
  );
}
