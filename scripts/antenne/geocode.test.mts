// Test della scomposizione degli indirizzi (casi reali dagli avvisi di Roma Capitale).
// Uso: node --env-file=.env.local --test scripts/antenne/geocode.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { scomponi } from "./geocode.mts";

test("via con civico e barra", () => {
  assert.deepEqual(scomponi("via Ostiense n.131/L"), { tipo: "VIA", nome: "OSTIENSE N.131/L".replace(/ N\.131\/L/, ""), parole: ["OSTIENSE"], civico: 131 });
});

test("piazza abbreviata", () => {
  const s = scomponi("P.zza Lorenzo Lotto, 11");
  assert.equal(s?.tipo, "PIAZZA");
  assert.deepEqual(s?.parole, ["LORENZO", "LOTTO"]);
  assert.equal(s?.civico, 11);
});

test("accenti e iniziali puntate", () => {
  const s = scomponi("Via Adolfo Ravà, 124");
  assert.deepEqual(s?.parole, ["ADOLFO", "RAVA"]);
  const t = scomponi("Via A. Macinghi Strozzi, 36");
  assert.deepEqual(t?.parole, ["MACINGHI", "STROZZI"]);
  assert.equal(t?.civico, 36);
});

test("presso centrale (c/o) e senza civico", () => {
  const s = scomponi("C/O CENTRALE TELECOM via Claudio, 13");
  assert.equal(s?.tipo, "VIA");
  assert.deepEqual(s?.parole, ["CLAUDIO"]);
  const t = scomponi("VIA DELLE SETTE CHIESE");
  assert.deepEqual(t?.parole, ["SETTE", "CHIESE"]);
  assert.equal(t?.civico, null);
});

test("intervallo di civici e snc", () => {
  assert.equal(scomponi("Via dell'Arcadia, 17/19")?.civico, 17);
  assert.equal(scomponi("Via Casale di sant'Angelo SNC")?.civico, null);
});
