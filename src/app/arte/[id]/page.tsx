import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrenotaPostazione } from "@/components/arte/PrenotaPostazione";
import { Icon } from "@/components/Icon";
import { TesseraAmbito } from "@/components/ui/Varie";
import { POSTAZIONI } from "@/data/esempi";

export function generateStaticParams() {
  return POSTAZIONI.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/arte/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = POSTAZIONI.find((x) => x.id === id);
  return { title: p ? `Postazione ${p.codice}` : "Postazione" };
}

export default async function PaginaPostazione({ params }: PageProps<"/arte/[id]">) {
  const { id } = await params;
  const postazione = POSTAZIONI.find((p) => p.id === id);
  if (!postazione) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-8 sm:px-8">
      <Link href="/arte" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold">
        <Icon name="indietro" size={18} strokeWidth={2} />
        Tutte le postazioni
      </Link>
      <div className="flex items-center gap-3.5">
        <TesseraAmbito id="arte" size={52} />
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold">Postazione {postazione.codice}</h1>
          <p className="text-[15px] text-ink-soft">
            {postazione.luogo} · Municipio {postazione.municipio}
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="text-ink-soft">Carico i turni…</p>}>
        <PrenotaPostazione postazione={postazione} />
      </Suspense>
    </main>
  );
}
