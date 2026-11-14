import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "./Icon";
import { LogoMark, Wordmark } from "./Logo";
import { MenuSezioni, MenuSezioniStatico } from "./MenuSezioni";
import { NavLinks, NavLinksStatici } from "./NavLinks";

// Su desktop la testata è alta esattamente 4rem (h-16): le viste con la mappa ne tolgono l'altezza.
// Sotto lg le sezioni non stanno in riga: le apre il cerchio con il burger accanto a «Operatori».
export function Header() {
  return (
    <header className="relative z-40 border-b border-line bg-panel">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 sm:gap-x-4 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
        <Link href="/" className="flex min-h-11 items-center gap-2.5" aria-label="RomaRouter, scegli un ambito">
          <LogoMark />
          <Wordmark />
        </Link>
        <nav
          aria-label="Ambiti"
          className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-1 empty:hidden max-lg:hidden sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:order-none lg:mx-0 lg:w-auto lg:flex-1 lg:justify-center lg:overflow-visible lg:px-0 lg:pb-0"
        >
          <Suspense fallback={<NavLinksStatici />}>
            <NavLinks />
          </Suspense>
        </nav>
        <Link
          href="/operatori"
          className="ml-auto flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[15px] font-semibold text-ink-soft hover:bg-bg-sink hover:text-ink sm:gap-2 sm:px-3 lg:ml-0"
        >
          <Icon name="utente" size={18} />
          <span className="hidden sm:inline">Area operatori</span>
          <span className="max-[359px]:sr-only sm:hidden">Operatori</span>
        </Link>
        <Suspense fallback={<MenuSezioniStatico />}>
          <MenuSezioni />
        </Suspense>
      </div>
    </header>
  );
}
