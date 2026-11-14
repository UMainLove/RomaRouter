import type { Metadata } from "next";
import { RichiestaAbilitazione } from "@/components/operatori/RichiestaAbilitazione";
import { contenitore } from "@/components/ui/stili";

export const metadata: Metadata = {
  title: "Richiesta collaborazione · Comune e Municipi",
  description:
    "Richiesta formale separata al Comune o Municipio per cittadini privati e aziende che si impegnano a collaborare alla custodia protetta degli oggetti smarriti.",
};

export default function PaginaRichiestaAbilitazione() {
  return (
    <main className={`${contenitore} flex flex-col gap-6 py-8`}>
      <div>
        <p className="text-sm font-bold tracking-[0.06em] text-muted uppercase">
          Richiesta separata al Comune / Municipio · Privati e Aziende partner
        </p>
        <h1 className="text-[30px] leading-[38px] font-bold">
          Collabora come custode o punto convenzionato
        </h1>
        <p className="text-base text-ink-soft">
          Sezione dedicata a privati cittadini residenti (CIE), aziende e attività locali o istituti di vigilanza che si impegnano formalmente a collaborare con il Comune di Roma e i Municipi.
        </p>
      </div>
      <RichiestaAbilitazione />
    </main>
  );
}
