// node esplora.mjs /sport 4 out.jpg  → istantanea dopo N secondi di orologio finto
import { apri } from "./rig.mjs";
const [p0, sec = "4", file = "esplora.jpg"] = process.argv.slice(2);
const percorso = "/" + p0.split("/").filter(Boolean).join("/");
const t0 = Date.now();
const r = await apri({ nome: "esplora", percorso, prova: true });
console.log("aperta in", Date.now() - t0, "ms");
const t1 = Date.now();
await r.prepara(Number(sec));
console.log(`${sec}s finti in`, Date.now() - t1, "ms");
await r.istantanea(file);
console.log(await r.page.evaluate(() => !!window.__rrMappa));
await r.fine();
