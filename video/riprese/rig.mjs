/*
 * La regia delle riprese: il sito vero in Edge (GPU), con l'orologio della pagina finto.
 * Tra due fotogrammi passano esattamente 1000/30 ms di tempo della pagina, qualunque sia il tempo reale
 * per disegnarli: i voli della mappa e le animazioni CSS vengono perfettamente fluidi e prima di ogni
 * fotogramma aspettiamo che le tessere della mappa siano arrivate. Ogni ripresa scrive
 * video/public/riprese/<nome>/00000.jpg… (2880×1620) e <nome>.json con il cursore fotogramma per fotogramma.
 */
import { chromium } from "playwright-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const FPS = 30;
export const W = 1440;
export const H = 810;
const QUI = dirname(fileURLToPath(import.meta.url));
export const USCITA = join(QUI, "..", "riprese-dati");
export const SITO = process.env.SITO ?? "http://localhost:3100";

const dormi = (ms) => new Promise((r) => setTimeout(r, ms));

/** CSS solo per le riprese: niente barre di scorrimento, niente cursore di testo lampeggiante. */
const CSS_RIPRESE = `
  ::-webkit-scrollbar { display: none }
  * { caret-color: transparent !important }
`;

export async function apri({ nome, percorso, ora = "2026-11-14T17:40:00+01:00", prova = false, css = "" }) {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  await ctx.addInitScript(() => {
    window.__rrRiprese = true;
    try {
      localStorage.setItem("rr-copertina", "1");
    } catch {}
  });
  await ctx.clock.install({ time: new Date(ora) });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn("[pagina]", e.message));
  page.on("console", (m) => m.type() === "error" && console.warn("[console]", m.text().slice(0, 200)));

  const cartella = join(USCITA, nome);
  if (!prova) {
    rmSync(cartella, { recursive: true, force: true });
    mkdirSync(cartella, { recursive: true });
  }

  await page.goto(SITO + percorso, { waitUntil: "load" });
  await page.addStyleTag({ content: CSS_RIPRESE + css });

  const stato = { f: 0, x: W / 2, y: H / 2 + 120, giu: false, visibile: false };
  const cursore = []; // per fotogramma: [x, y, giu, visibile]
  const eventi = []; // {f, tipo, ...}
  let registra = false;

  /** Allinea le animazioni CSS/WAAPI all'orologio finto (altrimenti andrebbero in tempo reale). */
  async function allineaAnimazioni() {
    await page.evaluate(() => {
      const ora = performance.now();
      for (const a of document.getAnimations()) {
        if (a.__rrInizio === undefined) {
          a.__rrInizio = ora - (a.currentTime ?? 0);
          a.pause();
        }
        if (a.playState !== "finished") a.currentTime = ora - a.__rrInizio;
      }
    });
  }

  /** Aspetta che la mappa (se c'e') abbia tutte le tessere, poi la ridisegna subito. */
  async function aspettaMappa(limite = 20000) {
    const t0 = Date.now();
    for (;;) {
      const s = await page.evaluate(() => {
        const m = window.__rrMappa;
        if (!m) return "nessuna";
        try {
          if (!m.isStyleLoaded() || !m.areTilesLoaded()) return "carica";
          m.redraw();
          return "ok";
        } catch {
          return "nessuna";
        }
      });
      if (s !== "carica") return s;
      if (Date.now() - t0 > limite) {
        console.warn("  tessere ancora in arrivo dopo", limite, "ms: vado avanti");
        return s;
      }
      await dormi(25);
    }
  }

  async function scatta() {
    if (!registra) return;
    if (prova) {
      cursore.push([0, 0, 0, 0]);
      stato.f++;
      return;
    }
    await page.screenshot({ path: join(cartella, String(stato.f).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92, animations: "allow", caret: "initial", scale: "device" });
    cursore.push([Math.round(stato.x * 10) / 10, Math.round(stato.y * 10) / 10, stato.giu ? 1 : 0, stato.visibile ? 1 : 0]);
    stato.f++;
    if (stato.f % 60 === 0) process.stdout.write(`  ${nome}: ${stato.f} fotogrammi\n`);
  }

  /** Avanza di n fotogrammi. */
  async function passo(n = 1) {
    for (let i = 0; i < n; i++) {
      await page.clock.runFor(1000 / FPS);
      await allineaAnimazioni();
      await aspettaMappa();
      await scatta();
    }
  }

  const facile = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** Il cursore va a (x, y) con una curva morbida in `fotogrammi`. */
  async function muovi(x, y, fotogrammi = 18) {
    const x0 = stato.x, y0 = stato.y;
    // una leggera curva, come una mano vera
    const cx = (x0 + x) / 2 + (y - y0) * 0.12, cy = (y0 + y) / 2 - (x - x0) * 0.12;
    stato.visibile = true;
    for (let i = 1; i <= fotogrammi; i++) {
      const t = facile(i / fotogrammi);
      const u = 1 - t;
      stato.x = u * u * x0 + 2 * u * t * cx + t * t * x;
      stato.y = u * u * y0 + 2 * u * t * cy + t * t * y;
      await page.mouse.move(stato.x, stato.y);
      await passo(1);
    }
  }

  async function centro(selettore) {
    const el = typeof selettore === "string" ? page.locator(selettore).first() : selettore;
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    if (!b) throw new Error("non trovo " + selettore);
    return [b.x + b.width / 2, b.y + b.height / 2, b];
  }

  /** Clic in (x, y), o sull'elemento: il cursore ci va, preme, rilascia. */
  async function clic(dove, { fotogrammi = 18, dopo = 6 } = {}) {
    const [x, y] = Array.isArray(dove) ? dove : await centro(dove);
    await muovi(x, y, fotogrammi);
    await passo(2);
    stato.giu = true;
    eventi.push({ f: stato.f, tipo: "clic", x, y });
    await page.mouse.down();
    await passo(3);
    stato.giu = false;
    await page.mouse.up();
    await passo(dopo);
  }

  /** Scrive come una persona: un carattere ogni `ritmo` fotogrammi. */
  async function scrivi(testo, ritmo = 2) {
    eventi.push({ f: stato.f, tipo: "scrivi", testo });
    for (const c of testo) {
      await page.keyboard.type(c);
      await passo(ritmo);
    }
  }

  async function tasto(k) {
    await page.keyboard.press(k);
    await passo(1);
  }

  /** Esegue codice sulla mappa (la camera della regia). */
  async function mappa(fn, arg) {
    return page.evaluate(([src, a]) => new Function("m", "a", src)(window.__rrMappa, a), [`const v = (${fn})(m, a); return v === m ? null : v;`, arg]);
  }

  /** Avanza (senza registrare) finche' la mappa non ha stile, tessere e il primo disegno. */
  async function prontaMappa(limite = 60000) {
    const prima = registra;
    registra = false;
    const t0 = Date.now();
    for (;;) {
      const ok = await page.evaluate(() => { const m = window.__rrMappa; return !!m && m.isStyleLoaded() && m.areTilesLoaded(); });
      if (ok) break;
      if (Date.now() - t0 > limite) throw new Error("la mappa non si carica");
      await page.clock.runFor(1000 / FPS);
      await dormi(20);
    }
    registra = prima;
  }

  /** Coordinate di pagina di un punto [lon, lat] della mappa. */
  async function punto(lon, lat) {
    return page.evaluate(([a, b]) => {
      const m = window.__rrMappa;
      const r = m.getContainer().getBoundingClientRect();
      const q = m.project([a, b]);
      return [r.left + q.x, r.top + q.y];
    }, [lon, lat]);
  }

  /** Riscaldamento senza registrare: lascia caricare pagina e mappa. */
  async function prepara(secondi = 2) {
    const prima = registra;
    registra = false;
    for (let i = 0; i < secondi * FPS; i++) await passo(1);
    registra = prima;
  }

  async function segna(n) {
    eventi.push({ f: stato.f, tipo: "segno", nome: n });
    console.log(`  · ${n} @ ${stato.f}`);
    if (prova && process.env.PROVE) await istantanea(join(process.env.PROVE, `${nome}-${n}.jpg`));
  }

  async function fine() {
    if (!prova) writeFileSync(join(USCITA, nome + ".json"), JSON.stringify({ nome, fps: FPS, w: W, h: H, fotogrammi: stato.f, cursore, eventi }));
    console.log(`${nome}: ${stato.f} fotogrammi (${(stato.f / FPS).toFixed(1)} s)`);
    await browser.close();
  }

  async function istantanea(file) {
    await aspettaMappa();
    await allineaAnimazioni();
    await page.screenshot({ path: file, type: "jpeg", quality: 80, scale: "css" });
  }

  return {
    page,
    stato,
    passo,
    muovi,
    clic,
    scrivi,
    tasto,
    mappa,
    prepara,
    segna,
    fine,
    istantanea,
    centro,
    punto,
    prontaMappa,
    nascondiCursore: () => (stato.visibile = false),
    mostraCursore: (x, y) => Object.assign(stato, { visibile: true, ...(x !== undefined ? { x, y } : {}) }),
    gira: () => (registra = true),
    ferma: () => (registra = false),
  };
}
