/*
 * Le riprese del film: node scene.mjs [home oggetti-trovato oggetti-perso sport arte antenne]
 * Ognuna in un browser nuovo (sessioni separate: chi trova e chi perde sono due persone diverse).
 * Server: preview "riprese" (video/riprese/server.mjs, porta 3100) sull'ultima build di produzione.
 */
import { apri } from "./rig.mjs";

const btn = (p, nome) => p.getByRole("button", { name: nome }).first();

const SCENE = {
  async home() {
    const r = await apri({ nome: "home", percorso: "/?copertina=0", css: ".mg-rivedi { visibility: hidden }" });
    r.gira();
    await r.passo(100); // le strade corrono verso il Colosseo
    await r.segna("strade");
    r.mostraCursore(1100, 700);
    for (const id of ["sport", "antenne", "arte", "oggetti"]) {
      const [x, y] = await r.centro(`.mg-link[data-ambito=${id}] .mg-segno-box`);
      await r.muovi(x, y, 20);
      await r.segna("su-" + id);
      await r.passo(16);
    }
    await r.passo(40);
    await r.fine();
  },

  async "oggetti-trovato"() {
    const r = await apri({ nome: "oggetti-trovato", percorso: "/oggetti" });
    const p = r.page;
    await r.prontaMappa();
    r.gira();
    await r.segna("mappa");
    await r.passo(110);
    r.mostraCursore(1150, 760);
    await r.clic(btn(p, /Ho trovato/), { fotogrammi: 22 });
    await r.passo(8);
    await r.clic(btn(p, /Entra con SPID/));
    await r.passo(14);
    await r.segna("cosa");
    await r.clic(btn(p, "Portafoglio"));
    await r.clic(btn(p, "Avanti"), { dopo: 14 });
    await r.segna("dove");
    await r.clic(btn(p, "Pomeriggio"));
    await r.clic(btn(p, "Avanti"), { dopo: 14 });
    await r.segna("dettaglio");
    await r.clic(p.locator("textarea").first(), { dopo: 2 });
    await r.scrivi("Dentro c'è una foto di un cane", 1);
    await r.passo(6);
    await r.clic(btn(p, "Dammi il codice di consegna"), { dopo: 4 });
    await r.passo(20);
    await r.segna("codice");
    await r.passo(90);
    await r.fine();
  },

  async "oggetti-perso"() {
    const r = await apri({ nome: "oggetti-perso", percorso: "/oggetti" });
    const p = r.page;
    await r.prontaMappa();
    await r.prepara(4);
    r.gira();
    r.mostraCursore(1150, 760);
    await r.clic(btn(p, /Ho perso/), { fotogrammi: 20 });
    await r.passo(8);
    await r.clic(btn(p, /Entra con SPID/));
    await r.passo(14);
    await r.segna("cosa");
    await r.clic(btn(p, "Portafoglio"));
    await r.clic(btn(p, "Avanti"), { dopo: 14 });
    await r.clic(btn(p, "Pomeriggio"));
    await r.clic(btn(p, "Avanti"), { dopo: 14 });
    await r.segna("recapito");
    await r.clic(p.locator("input[type=tel]").first(), { dopo: 2 });
    await r.scrivi("+39 333 123 4567", 1);
    await r.passo(4);
    await r.clic(btn(p, "Avvisami se lo trovano"), { dopo: 4 });
    await r.passo(20);
    await r.segna("simile");
    await r.passo(100);
    await r.fine();
  },

  async sport() {
    const r = await apri({ nome: "sport", percorso: "/sport" });
    const p = r.page;
    await r.prontaMappa();
    r.gira();
    await r.segna("mappa");
    await r.passo(150);
    r.mostraCursore(1150, 760);
    await r.segna("filtri");
    await r.clic(btn(p, /Padel/), { dopo: 55 });
    await r.segna("padel");
    await r.clic(btn(p, /Calcio/), { dopo: 55 });
    await r.segna("calcio");
    await r.clic(btn(p, /Gioca gratis/), { dopo: 65 });
    await r.segna("gratis");
    await r.clic(btn(p, /Gioca gratis/), { dopo: 4 });
    await r.clic(btn(p, /Tutti/), { dopo: 16 });
    await r.segna("cerca");
    await r.clic(p.locator("input").first(), { dopo: 2 });
    await r.scrivi("Viale dei Gladiatori", 2);
    await r.passo(16);
    await r.segna("invio");
    await r.tasto("Enter");
    await r.passo(110);
    await r.segna("arrivo");
    await r.passo(20);
    await r.clic([905, 203], { fotogrammi: 24 });
    await r.segna("campi");
    await r.passo(55);
    // la camera gira piano attorno al Foro Italico
    await r.mappa((m) => m.easeTo({ bearing: -42, pitch: 58, zoom: m.getZoom() + 0.45, duration: 8000, easing: (t) => t * (2 - t) }));
    await r.segna("giro");
    await r.passo(230);
    await r.fine();
  },

  async arte() {
    const r = await apri({ nome: "arte", percorso: "/arte" });
    const p = r.page;
    await r.prontaMappa();
    r.gira();
    await r.segna("mappa");
    await r.passo(150);
    r.mostraCursore(1150, 760);
    await r.segna("filtri");
    await r.clic(btn(p, /Fuoco/), { dopo: 40 });
    await r.segna("fuoco");
    await r.clic(btn(p, /Musica/), { dopo: 30 });
    await r.segna("musica");
    await r.clic(await r.punto(12.4833, 41.9009), { fotogrammi: 22, dopo: 4 });
    await r.segna("no");
    await r.passo(64);
    await r.clic(await r.punto(12.4655, 41.8935), { fotogrammi: 22, dopo: 4 });
    await r.segna("si");
    await r.passo(64);
    // il Pass Artista
    await r.clic(btn(p, /Chiudi/), { dopo: 10 });
    await r.clic(btn(p, /Crea il Pass/), { dopo: 12 });
    await r.segna("pass-1");
    await r.clic(btn(p, /Entra con SPID/), { dopo: 14 });
    await r.clic(btn(p, "Avanti"), { dopo: 14 });
    await r.segna("pass-2");
    await r.clic(p.getByPlaceholder(/Nome d'arte/).first(), { dopo: 2 });
    await r.scrivi("Vento di Trastevere", 1);
    await r.clic(p.getByRole("button", { name: "Sì" }).nth(2));
    await r.clic(btn(p, "Avanti"), { dopo: 14 });
    await r.segna("pass-3");
    await r.clic(p.locator("input[type=checkbox]:visible").first());
    await r.clic(btn(p, "Crea il mio Pass"), { dopo: 4 });
    await r.passo(16);
    await r.segna("pass");
    await r.passo(90);
    // il palco: un turno a Piazza Navona
    await r.clic(btn(p, /Chiudi/), { dopo: 10 });
    await r.clic(await r.punto(12.4731, 41.8992), { fotogrammi: 22, dopo: 4 });
    await r.segna("palco");
    await r.passo(50);
    await r.clic(btn(p, "Prenota un turno"), { dopo: 16 });
    await r.segna("turno");
    await r.clic(p.getByText(/^sab$/i).first());
    await r.clic(p.getByText("18", { exact: true }).last());
    await r.clic(p.getByText("1 h 30", { exact: true }).first());
    await r.clic(p.getByRole("button", { name: /^Ci sarò/ }).last(), { dopo: 4 });
    await r.passo(16);
    await r.segna("prenotato");
    await r.passo(70);
    // chi suona adesso
    const chiudi = p.getByRole("button", { name: /Chiudi/ });
    if (await chiudi.count()) await r.clic(chiudi.first(), { dopo: 10 });
    await r.clic(btn(p, /Voglio guardare/), { dopo: 4 });
    await r.segna("guardare");
    await r.passo(30);
    await r.mappa((m) => m.easeTo({ zoom: 12.6, center: [12.475, 41.897], duration: 5200, easing: (t) => 1 - Math.pow(1 - t, 3) }));
    await r.passo(150);
    await r.fine();
  },

  async antenne() {
    const r = await apri({ nome: "antenne", percorso: "/antenne" });
    const p = r.page;
    await r.prontaMappa();
    r.gira();
    await r.segna("mappa");
    await r.passo(150);
    r.mostraCursore(1150, 760);
    await r.segna("filtri");
    await r.clic(btn(p, /Nuove/), { dopo: 60 });
    await r.segna("nuove");
    await r.clic(btn(p, /Nuove/), { dopo: 10 });
    await r.segna("cerca");
    await r.clic(p.locator("input").first(), { dopo: 2 });
    await r.scrivi("Via Nazionale", 2);
    await r.passo(16);
    await r.segna("invio");
    await r.tasto("Enter");
    await r.passo(100);
    await r.segna("intorno");
    await r.passo(40);
    await r.clic([933, 403], { fotogrammi: 22, dopo: 4 });
    await r.segna("antenna");
    await r.passo(75);
    await r.clic(btn(p, /Cosa c.è intorno/), { dopo: 4 });
    await r.segna("sensibili");
    await r.passo(170);
    await r.fine();
  },
};

const scelte = process.argv.slice(2);
for (const nome of scelte.length ? scelte : Object.keys(SCENE)) {
  const t0 = Date.now();
  console.log("▶", nome);
  await SCENE[nome]();
  console.log(`  ${nome} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
