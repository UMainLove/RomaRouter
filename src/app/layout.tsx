import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import "./globals.css";

// Montserrat variabile (100–900), latino, licenza SIL OFL 1.1 (fonts/OFL-Montserrat.txt).
// Locale e non da Google Fonts: il build funziona senza rete e il browser non fa richieste esterne.
const montserrat = localFont({
  src: "./fonts/montserrat-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-montserrat",
  display: "swap",
});
// Titillium Web: il carattere dei siti della Pubblica Amministrazione italiana (Designers Italia), per il nome.
// SIL OFL 1.1 (fonts/OFL-TitilliumWeb.txt), locale come Montserrat.
const titillium = localFont({
  src: [
    { path: "./fonts/titillium-web-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/titillium-web-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-titillium",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Roma Router · tutte le strade portano al servizio giusto",
    template: "%s · Roma Router",
  },
  description:
    "Chiedi a Roma Router cosa ti serve: ti porta al servizio giusto di Roma Capitale, dagli oggetti smarriti agli impianti sportivi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${montserrat.variable} ${titillium.variable} h-full antialiased`}>
      {/* schermo singolo: la testata in alto, sotto la pagina che riempie lo spazio. Le sezioni con la mappa non
          scorrono mai; le pagine di testo (home, operatori) scorrono solo dentro il loro spazio. */}
      <body className="flex h-dvh flex-col overflow-hidden bg-bg font-sans text-ink">
        <Header />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
