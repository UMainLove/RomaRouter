import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { btnPrimario, btnSecondario } from "@/components/ui/stili";
import { Avviso, NotaPrivacy } from "@/components/ui/Varie";

export const metadata: Metadata = { title: "Accesso riservato · Oggetti smarriti" };

export default function PaginaRitiroDisabilitata() {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-8 sm:px-8">
      <Link href="/oggetti" className="inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-bold">
        <Icon name="indietro" size={18} strokeWidth={2} />
        Oggetti smarriti
      </Link>
      <h1 className="text-[28px] leading-[34px] font-bold">Consultazione catalogo riservata al backend</h1>
      <Avviso icona="scudo">
        <b>Catalogo pubblico eliminato:</b> le schede degli oggetti rinvenuti non sono consultabili dai cittadini sul frontend e possono essere visionate esclusivamente dal backend operatori e custodi autorizzati.
      </Avviso>
      <NotaPrivacy>
        Se hai smarrito un oggetto invia una segnalazione protetta nella sezione <b>Ho perso (protetto)</b>: l&apos;eventuale corrispondenza viene verificata lato server e gestita dagli operatori.
      </NotaPrivacy>
      <div className="flex flex-wrap gap-2.5">
        <Link href="/oggetti?scheda=perso" className={btnPrimario}>
          Vai a Ho perso (protetto)
          <Icon name="freccia" size={18} strokeWidth={2} />
        </Link>
        <Link href="/operatori" className={btnSecondario}>
          Area operatori (backend)
        </Link>
      </div>
    </main>
  );
}
