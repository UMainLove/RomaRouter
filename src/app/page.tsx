import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CampioneForma, TesseraAmbito } from "@/components/ui/Varie";
import { ALTRO, AMBITI, ORDINE_AMBITI } from "@/lib/ambiti";

// Home minimale: quattro ambiti e "Non è tra questi?". Ogni voce apre la sua mappa con la barra dell'assistente.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 sm:py-16">
      <div className="flex w-full max-w-[1040px] flex-col gap-8 sm:gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[34px] leading-[40px] font-bold tracking-[-0.02em] sm:text-[48px] sm:leading-[54px]">Scegli un ambito</h1>
          <p className="max-w-[560px] text-base leading-6 text-ink-soft sm:text-lg sm:leading-7">
            Per ognuno trovi la mappa e una barra dove chiedere quello che ti serve, a parole tue.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {ORDINE_AMBITI.map((id) => {
            const a = AMBITI[id];
            return (
              <li key={id}>
                <Link
                  href={a.href}
                  className="group flex h-full flex-col items-center gap-3 rounded-[20px] border border-line bg-panel px-3 pt-6 pb-5 text-center transition-[border-color,box-shadow] hover:border-campo hover:shadow-[0_12px_32px_rgba(37,29,28,.10)] sm:px-5 sm:pt-8 sm:pb-6"
                >
                  <span className="transition-transform group-hover:-translate-y-0.5">
                    <TesseraAmbito id={id} size={64} />
                  </span>
                  <span className="text-[17px] leading-[22px] font-bold sm:text-lg">{a.nome}</span>
                  <span className="hidden text-sm leading-5 text-ink-soft sm:block">{a.breve}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-1 text-[13px] font-semibold text-muted">
                    <CampioneForma id={id} />
                    Mappa e assistente
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href={ALTRO.href}
          className="group flex min-h-16 items-center gap-3 rounded-full border-[1.5px] border-campo bg-panel py-2 pr-2 pl-5 shadow-[0_6px_20px_rgba(37,29,28,.06)] hover:border-ink"
        >
          <Icon name="cerca" size={22} className="shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] leading-6 font-bold">{ALTRO.nome}</span>
            <span className="block truncate text-sm leading-5 text-ink-soft">{ALTRO.breve}</span>
          </span>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amaranto text-white group-hover:bg-amaranto-scuro">
            <Icon name="freccia" size={20} strokeWidth={2} />
          </span>
        </Link>
      </div>
    </main>
  );
}
