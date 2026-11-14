import type { Metadata } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SCRIPT_AVVIO } from "@/components/copertina/costanti";
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

export const metadata: Metadata = {
  title: {
    default: "RomaRouter · tutte le strade portano al servizio giusto",
    template: "%s · RomaRouter",
  },
  description:
    "Chiedi a RomaRouter cosa ti serve: ti porta al servizio giusto di Roma Capitale, dagli oggetti smarriti agli impianti sportivi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: lo script della copertina aggiunge data-copertina prima di React
    <html lang="it" className={`${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_AVVIO }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
