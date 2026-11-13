"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MappaSchematica } from "./MappaSchematica";
import { puntiMappa } from "./punti";

export function AnteprimaMappa() {
  const punti = useMemo(() => puntiMappa(), []);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const scelto = punti.find((p) => p.id === selezionato);
  return (
    <div className="flex flex-col gap-3">
      <MappaSchematica punti={punti} selezionato={selezionato} onSeleziona={setSelezionato} />
      <p aria-live="polite" className="min-h-6 text-[15px] text-ink-soft">
        {scelto ? (
          <>
            <b className="text-ink">{scelto.nome}</b> ·{" "}
            <Link href={scelto.href} className="font-bold">
              apri
            </Link>
          </>
        ) : (
          "Tocca un segnaposto per un'anteprima."
        )}
      </p>
    </div>
  );
}
