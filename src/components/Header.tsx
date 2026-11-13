import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "./Icon";
import { LogoMark, Wordmark } from "./Logo";
import { NavLinks, NavLinksStatici } from "./NavLinks";

export function Header() {
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2.5" aria-label="RomaRouter, pagina iniziale">
          <LogoMark />
          <Wordmark />
        </Link>
        <nav
          aria-label="Ambiti"
          className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          <Suspense fallback={<NavLinksStatici />}>
            <NavLinks />
          </Suspense>
        </nav>
        <Link
          href="/operatori"
          className="ml-auto flex min-h-11 items-center gap-2 rounded-card border-[1.5px] border-campo px-4 text-[15px] font-semibold text-ink hover:bg-bg-sink sm:ml-0"
        >
          <Icon name="utente" size={18} />
          Area operatori
        </Link>
      </div>
    </header>
  );
}
