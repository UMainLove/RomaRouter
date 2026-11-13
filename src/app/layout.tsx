import type { Metadata } from "next";
import { Geist_Mono, Titillium_Web } from "next/font/google";
import "./globals.css";

// Titillium Web è il carattere del design system della Pubblica Amministrazione (Designers Italia)
const titillium = Titillium_Web({
  variable: "--font-titillium",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RomaRouter",
    template: "%s · RomaRouter",
  },
  description:
    "Quattro servizi per orientarsi a Roma: artisti di strada, antenne di telefonia mobile, oggetti smarriti e impianti sportivi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${titillium.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
