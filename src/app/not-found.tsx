import Link from "next/link";
import { Icon } from "@/components/Icon";
import { btnPrimario, btnSecondario, contenitore } from "@/components/ui/stili";

// Pagina 404 in italiano: copre gli indirizzi sconosciuti e i notFound() delle schede (es. /sport/[id]).
export default function NonTrovata() {
  return (
    <main className={`${contenitore} flex flex-1 flex-col items-start justify-center gap-5 py-16`}>
      <span className="grid size-12 place-items-center rounded-full bg-velo text-amaranto">
        <Icon name="bussola" size={24} />
      </span>
      <h1 className="text-3xl font-bold tracking-[-0.01em] sm:text-4xl">Questa pagina non c&apos;è</h1>
      <p className="max-w-[560px] text-lg leading-7 text-ink-soft">
        Forse il link è vecchio o nell&apos;indirizzo c&apos;è un errore. Dimmi cosa ti serve e ti porto al servizio
        giusto.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/altro" className={btnPrimario}>
          Chiedi a Roma Router
        </Link>
        <Link href="/" className={btnSecondario}>
          Scegli un ambito
        </Link>
      </div>
    </main>
  );
}
