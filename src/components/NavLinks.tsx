"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VOCI, type Voce } from "@/lib/ambiti";
import { TesseraVoce } from "./ui/Varie";

function Voci({ attiva }: { attiva: (v: Voce) => boolean }) {
  return (
    <>
      {VOCI.map((v) => {
        const corrente = attiva(v);
        return (
          <Link
            key={v.id}
            href={v.href}
            aria-current={corrente ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1.5 text-[15px] ${
              corrente ? "bg-ink font-bold text-white" : "font-semibold text-ink-soft hover:bg-bg-sink hover:text-ink"
            }`}
          >
            <TesseraVoce id={v.id} size={28} />
            {v.corto}
          </Link>
        );
      })}
    </>
  );
}

/** Selettore degli ambiti in testata. Nella home non serve: la pagina stessa è la scelta. */
export function NavLinks() {
  const percorso = usePathname();
  if (percorso === "/") return null;
  return <Voci attiva={(v) => percorso === v.href || percorso.startsWith(v.href + "/")} />;
}

/** Stessi link senza stato attivo: fallback mentre il percorso non è noto (rotte dinamiche). */
export function NavLinksStatici() {
  return <Voci attiva={() => false} />;
}
