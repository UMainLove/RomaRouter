// Test del parser di coordinate sui casi reali trovati negli elenchi di Roma Capitale.
// Uso: node --test scripts/antenne/coord.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { interpreta, scegli } from "./coord.mts";

const vicino = (a: number, b: number, tol = 1e-5) => Math.abs(a - b) < tol;

test("DMS valido (pagina SRB 2025)", () => {
  const [c] = interpreta(`Lat 41° 54' 55.1" N`);
  assert.equal(c.metodo, "originale");
  assert.ok(vicino(c.valore, 41 + 54 / 60 + 55.1 / 3600));
});

test("DMS con entità HTML e senza spazi", () => {
  const [c] = interpreta("Long. 12&deg;29&#39; 0.27&quot;E".replace("&#39;", "'").replace("&quot;", '"'));
  assert.equal(c.metodo, "originale");
  assert.ok(vicino(c.valore, 12 + 29 / 60 + 0.27 / 3600));
});

test("decimale puro (PDF Municipio X)", () => {
  const [c] = interpreta("Lat. 41.735933 N");
  assert.equal(c.metodo, "originale");
  assert.ok(vicino(c.valore, 41.735933));
});

test("simbolo dei gradi usato come virgola", () => {
  const [c] = interpreta("41°734438 N");
  assert.equal(c.metodo, "corretta");
  assert.ok(vicino(c.valore, 41.734438));
});

test("minuti oltre 60: due interpretazioni", () => {
  const cs = interpreta(`41°86'61.11''N`);
  assert.equal(cs.length, 2);
  assert.ok(vicino(cs[0].valore, 41.866111));
  assert.ok(cs.every((c) => c.metodo === "corretta"));
});

test("virgola decimale e apostrofi tipografici", () => {
  const [c] = interpreta("41° 44’ 14,92” N");
  assert.equal(c.metodo, "originale");
  assert.ok(vicino(c.valore, 41 + 44 / 60 + 14.92 / 3600));
});

test("scegli usa il geocoding per decidere tra le correzioni", () => {
  const lat = interpreta(`41° 74 69.21"`); // 41.746921 oppure 42.25...
  const lon = interpreta("12.280361 E");
  const s = scegli(lat, lon, { lat: 41.7468, lon: 12.2805 });
  assert.ok(s);
  assert.ok(vicino(s.lat, 41.746921));
});

test("decimale travestito da DMS su entrambe le coordinate (via Corvisieri, tabella SRB 2025)", () => {
  const lat = interpreta(`Lat 41°91'98.7"N`);
  const lon = interpreta(`Long 12°52'12.2"E`);
  // senza indirizzo vince la lettura "originale" della longitudine (12°52' ≈ 12.87, fuori dal centro)
  // con il civico geocodificato (via Corvisieri 13 ≈ 41.9199, 12.5212) vince la lettura decimale
  const s = scegli(lat, lon, { lat: 41.9199, lon: 12.5212 });
  assert.ok(s);
  assert.ok(vicino(s.lat, 41.91987) && vicino(s.lon, 12.52122));
  assert.equal(s.metodo, "corretta");
});

test("senza riferimento si preferisce sempre la lettura originale", () => {
  const s = scegli(interpreta(`41° 54' 55.1" N`), interpreta(`12° 31' 36" E`));
  assert.equal(s?.metodo, "originale");
});

test("scegli scarta punti fuori Roma e corregge lat/lon invertite", () => {
  const s = scegli(interpreta("12.4964"), interpreta("41.9028"));
  assert.ok(s);
  assert.ok(vicino(s.lat, 41.9028) && vicino(s.lon, 12.4964));
  assert.match(s.nota ?? "", /invertite/);
  assert.equal(scegli(interpreta("45.46"), interpreta("9.19")), null); // Milano
});
