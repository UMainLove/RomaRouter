"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VOCI = [
  { href: "/mappa", etichetta: "Mappa comune" },
  { href: "/oggetti", etichetta: "Oggetti smarriti" },
  { href: "/sport", etichetta: "Impianti sportivi" },
  { href: "/antenne", etichetta: "Antenne" },
  { href: "/arte", etichetta: "Arte di strada" },
];

function classi(attiva: boolean) {
  return attiva
    ? "flex min-h-11 shrink-0 items-center rounded-[10px] bg-velo px-3 text-[15px] font-bold text-amaranto"
    : "flex min-h-11 shrink-0 items-center rounded-[10px] px-3 text-[15px] font-semibold text-ink-soft hover:bg-bg-sink hover:text-ink";
}

export function NavLinks() {
  const percorso = usePathname();
  return (
    <>
      {VOCI.map((v) => {
        const attiva = percorso === v.href || percorso.startsWith(v.href + "/");
        return (
          <Link key={v.href} href={v.href} aria-current={attiva ? "page" : undefined} className={classi(attiva)}>
            {v.etichetta}
          </Link>
        );
      })}
    </>
  );
}

/** Stessi link senza stato attivo: fallback mentre il percorso non è noto (rotte dinamiche). */
export function NavLinksStatici() {
  return (
    <>
      {VOCI.map((v) => (
        <Link key={v.href} href={v.href} className={classi(false)}>
          {v.etichetta}
        </Link>
      ))}
    </>
  );
}
