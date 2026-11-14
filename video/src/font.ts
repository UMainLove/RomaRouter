// I caratteri del sito, caricati prima di disegnare il primo fotogramma.
import { continueRender, delayRender, staticFile } from "remotion";

const FONT: Array<[string, string, string]> = [
  ["Montserrat", "font/montserrat-latin.woff2", "100 900"],
  ["Titillium Web", "font/titillium-web-latin-600.woff2", "600"],
  ["Titillium Web", "font/titillium-web-latin-700.woff2", "700"],
];

let caricati = false;
export function caricaFont() {
  if (caricati || typeof document === "undefined") return;
  caricati = true;
  const h = delayRender("font");
  Promise.all(
    FONT.map(([nome, file, peso]) => {
      const ff = new FontFace(nome, `url(${staticFile(file)}) format("woff2")`, { weight: peso });
      return ff.load().then((f) => (document.fonts as unknown as { add: (x: FontFace) => void }).add(f));
    }),
  )
    .then(() => continueRender(h))
    .catch((e) => {
      console.error(e);
      continueRender(h);
    });
}
