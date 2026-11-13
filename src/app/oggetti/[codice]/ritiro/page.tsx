import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { RitiroGuidato } from "@/components/oggetti/RitiroGuidato";
import { OGGETTI } from "@/data/esempi";

export function generateStaticParams() {
  return OGGETTI.filter((o) => o.stato === "custodia").map((o) => ({ codice: o.codice }));
}

export const metadata: Metadata = { title: "Richiesta di ritiro" };

export default async function PaginaRitiro({ params }: PageProps<"/oggetti/[codice]/ritiro">) {
  const { codice } = await params;
  const oggetto = OGGETTI.find((o) => o.codice === codice);
  if (!oggetto) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-8 sm:px-8">
      <Link href="/oggetti" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold">
        <Icon name="indietro" size={18} strokeWidth={2} />
        Catalogo
      </Link>
      <h1 className="text-[28px] leading-[34px] font-bold">Richiesta di ritiro</h1>
      <RitiroGuidato oggetto={oggetto} />
    </main>
  );
}
