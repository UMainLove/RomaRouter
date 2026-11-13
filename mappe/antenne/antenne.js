  // ==========================================================================================
  // RomaRouter · sezione ANTENNE DI TELEFONIA MOBILE
  // Gira dentro la chiusura della mappa di base (dopo la 3D): usa map, apriSchedaServizio,
  // entryDiCodice, dentroGeometria, tracciaVia, mostraInfo... e ne avvolge alcune.
  // Dati: /api/antenne/* (database rr_antenne), mai dati di altre sezioni.
  // ==========================================================================================
  (function () {
    var API = "/api/antenne/";
    var ZOOM_SITI = 13;          // sotto questo zoom i siti sensibili (2.500+) non si disegnano
    var ZOOM_SENZA_GRAPPOLI = 15;
    var RAGGIO_VIA = 200;        // metri: antenne e siti "lungo la via" cercata
    var RAGGIO_PUNTO = 300;      // metri: intorno a un punto aperto da link (?lat=&lon=)

    var COLORI = {
      antenne: "#2A6FD6", istruzione: "#D9468F", salute: "#C62828", rsa: "#8E5BC4",
      giochi: "#2E9E5B", carceri: "#5B6470", unesco: "#B8902F", protette: "#1E7A45"
    };
    var GRUPPI_SITI = [
      { k: "istruzione", t: "Scuole e asili" },
      { k: "salute", t: "Ospedali e cliniche" },
      { k: "rsa", t: "RSA e case di riposo" },
      { k: "giochi", t: "Parchi giochi" },
      { k: "carceri", t: "Carceri" }
    ];
    var CATEGORIE = {
      asilo_nido: { g: "istruzione", s: "Asilo nido" },
      scuola_infanzia: { g: "istruzione", s: "Scuola dell'infanzia" },
      scuola: { g: "istruzione", s: "Scuola" },
      ospedale: { g: "salute", s: "Ospedale" },
      casa_di_cura: { g: "salute", s: "Casa di cura" },
      sanitario_assistenziale: { g: "salute", s: "Struttura sanitaria" },
      rsa: { g: "rsa", s: "RSA o casa di riposo" },
      parco_giochi: { g: "giochi", s: "Parco giochi" },
      carcere: { g: "carceri", s: "Carcere" }
    };
    var TIPI_AREA = { sito_unesco: { t: "Sito UNESCO", c: "unesco" }, area_protetta: { t: "Area naturale protetta", c: "protette" } };

    var R = {
      istanze: [], siti: [], aree: [], centraline: [], info: null,
      acceso: { antenne: true, istruzione: true, salute: true, rsa: true, giochi: true, carceri: true, unesco: true, protette: true, centraline: true },
      gestore: "",
      areaProps: null, punto: null,
      markerAntenne: {}, strati: {}, pronti: false
    };

    // ---------------------------------------------------------------- utilita'
    function esc(s) { return escapeHtml(s == null ? "" : String(s)); }
    function num(n) { return formattaNumero(Math.round(n)); }
    function dataIt(d) {
      if (!d) return "";
      var x = new Date(d);
      return isNaN(x) ? "" : x.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    }
    function metri(m) { return m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km"; }
    function gruppoSito(c) { return (CATEGORIE[c] || { g: "salute" }).g; }
    function nomeCategoria(c) { return (CATEGORIE[c] || { s: c }).s; }
    function svgIcona(k) { return RR_ICONE[k] ? svgConIdUnici(RR_ICONE[k]) : ""; }
    function gestoriTesto(p) { return (p.gestori && p.gestori.length ? p.gestori.join(" · ") : "Operatore non indicato"); }
    function visibileAntenna(a) { return !R.gestore || (a.p.gestori || []).indexOf(R.gestore) !== -1; }
    // distanze in metri su piano locale (errore trascurabile alla scala di un quartiere)
    function kx(lat) { return 111320 * Math.cos(lat * Math.PI / 180); }
    function distPunto(a, b) {
      var k = kx(a.lat), dx = (a.lng - b.lng) * k, dy = (a.lat - b.lat) * 110540;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function distSegmento(p, a, b) {
      var k = kx(p.lat), ax = (a.lng - p.lng) * k, ay = (a.lat - p.lat) * 110540, bx = (b.lng - p.lng) * k, by = (b.lat - p.lat) * 110540;
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      var x = ax + t * dx, y = ay + t * dy;
      return Math.sqrt(x * x + y * y);
    }
    function appiattisci(ll, out) {
      out = out || [];
      if (ll && ll.length && ll[0] && typeof ll[0].lat === "number") out.push(ll); else (ll || []).forEach(function (x) { appiattisci(x, out); });
      return out;
    }
    function distLinee(p, linee) {
      var best = Infinity;
      linee.forEach(function (l) { for (var i = 1; i < l.length; i++) best = Math.min(best, distSegmento(p, l[i - 1], l[i])); });
      return best;
    }
    function vincoliDi(ll) {
      return R.aree.filter(function (a) { return a.bounds.contains(ll) && dentroGeometria(a.f.geometry, ll.lng, ll.lat); });
    }
    function getJson(nome) {
      return fetch(API + nome, { headers: { Accept: "application/json" } }).then(function (r) {
        if (!r.ok) throw new Error(nome + ": HTTP " + r.status);
        return r.json();
      });
    }

    // ---------------------------------------------------------------- strati Leaflet
    function pane(nome, z, puntatore) {
      map.createPane(nome);
      map.getPane(nome).style.zIndex = z;
      if (!puntatore) map.getPane(nome).style.pointerEvents = "none";
    }
    pane("rrAreePane", 404, false);
    pane("rrSitiPane", 452, true);
    pane("rrAntennePane", 455, true);
    var rendererSiti = L.canvas({ pane: "rrSitiPane", padding: 0.4 });
    var rendererAree = L.svg({ pane: "rrAreePane", padding: 0.4 });
    R.strati.aree = L.layerGroup().addTo(map);
    R.strati.siti = L.layerGroup().addTo(map);
    R.strati.antenne = L.layerGroup().addTo(map);
    R.strati.centraline = L.layerGroup().addTo(map);
    R.strati.ancore = L.layerGroup().addTo(map);

    // ---------------------------------------------------------------- servizi della base spenti
    // La mappa delle antenne mostra i siti sensibili dal database (Allegato A ricostruito),
    // non i servizi del Piano dei Servizi della base: niente doppioni ne' confusione.
    aggiornaServiziFocus = function () {
      var sp = document.getElementById("servizi-panel"); if (sp) sp.hidden = true;
    };
    try { aggiornaServiziFocus(null); } catch { /* la base puo' non avere ancora il pannello */ }

    // ---------------------------------------------------------------- schede
    function etichetteQualita(p) {
      if (p.qualita_posizione === "geocodificata") return '<span class="rr-etichetta rr-neutra">Posizione dall\'indirizzo</span>';
      if (p.qualita_posizione === "corretta") return '<span class="rr-etichetta rr-neutra">Coordinate corrette</span>';
      return "";
    }
    function htmlAntenna(a) {
      var p = a.p, h = '<div class="rr-scheda">';
      h += '<div class="ss-testa"><span class="rr-segno">' + svgIcona("antenna") + '</span><span class="ss-cat">Antenna · ' +
        esc(p.tipo_intervento ? p.tipo_intervento.charAt(0).toUpperCase() + p.tipo_intervento.slice(1) : "Richiesta") + "</span></div>";
      h += '<h2 id="scheda-servizio-titolo" tabindex="-1">' + esc(gestoriTesto(p)) + "</h2>";
      if (p.indirizzo) h += '<p class="ss-riga">' + esc(p.indirizzo) + "</p>";
      var zona = [p.quartiere, p.municipio_nome].filter(Boolean).join(" · ");
      if (zona) h += '<p class="ss-riga">' + esc(zona) + "</p>";
      var quando = [p.data_pubblicazione ? "Pubblicata il " + dataIt(p.data_pubblicazione) : "", p.protocollo ? "prot. " + p.protocollo : ""].filter(Boolean).join(" · ");
      if (quando) h += '<p class="ss-riga ss-det">' + esc(quando) + "</p>";
      if (p.regime) h += '<p class="ss-riga ss-det">' + esc(p.regime.charAt(0).toUpperCase() + p.regime.slice(1)) + "</p>";
      var et = etichetteQualita(p);
      a.vincoli = a.vincoli || vincoliDi(a.ll);
      a.vincoli.forEach(function (v) { et += '<span class="rr-etichetta rr-attenzione">In ' + esc(TIPI_AREA[v.f.properties.tipo] ? TIPI_AREA[v.f.properties.tipo].t.toLowerCase() : "area vincolata") + "</span>"; });
      if (et) h += '<div class="rr-etichette">' + et + "</div>";
      var s = p.sito_sensibile_vicino;
      if (s && s.distanza_m != null) {
        h += '<p class="ss-riga rr-vicino"><span>Sito sensibile più vicino: <b>' + esc(s.nome || nomeCategoria(s.categoria)) + "</b>" +
          (s.nome ? " (" + esc(nomeCategoria(s.categoria).toLowerCase()) + ")" : "") + ", a " + metri(Number(s.distanza_m)) + "</span></p>";
      }
      h += '<div class="ss-azioni">';
      if (p.url_avviso) h += '<div class="ss-link"><a href="' + esc(p.url_avviso) + '" target="_blank" rel="noopener noreferrer">Avviso ufficiale <span aria-hidden="true">↗</span></a></div>';
      h += "</div>";
      h += '<p class="rr-avvertenza">È una richiesta pubblicata da Roma Capitale: non prova che l\'impianto sia attivo. Le distanze sono indicative: il regolamento di Roma non fissa distanze minime.</p>';
      return h + "</div>";
    }
    function htmlSito(s) {
      var p = s.p, g = gruppoSito(p.categoria), h = '<div class="rr-scheda">';
      h += '<div class="ss-testa"><span class="rr-segno"><span class="rr-pallino" style="background:' + COLORI[g] + '"></span></span><span class="ss-cat">Sito sensibile · ' + esc(nomeCategoria(p.categoria)) + "</span></div>";
      h += '<h2 id="scheda-servizio-titolo" tabindex="-1">' + esc(p.nome || nomeCategoria(p.categoria)) + "</h2>";
      if (p.indirizzo) h += '<p class="ss-riga">' + esc(p.indirizzo) + "</p>";
      if (p.municipio) h += '<p class="ss-riga">Municipio ' + esc(municipioRomano[String(p.municipio)] || p.municipio) + "</p>";
      var vicine = R.istanze.filter(visibileAntenna).map(function (a) { return { a: a, d: distPunto(s.ll, a.ll) }; })
        .filter(function (x) { return x.d <= 500; }).sort(function (x, y) { return x.d - y.d; });
      h += '<p class="ss-riga rr-vicino"><span>' + (vicine.length
        ? "<b>" + vicine.length + "</b> " + (vicine.length === 1 ? "richiesta di antenna" : "richieste di antenne") + " entro 500 m · la più vicina a " + metri(vicine[0].d)
        : "Nessuna richiesta di antenna pubblicata entro 500 m") + "</span></p>";
      h += '<div class="rr-etichette">' + (p.ufficiale ? '<span class="rr-etichetta">Dato di Roma Capitale</span>' : '<span class="rr-etichetta rr-neutra">Da OpenStreetMap</span>') + "</div>";
      h += '<p class="rr-avvertenza">Il regolamento di Roma (DAC 78/2024, art. 4) vieta di installare antenne su questi siti. L\'elenco ufficiale (Allegato A) non è pubblicato in formato aperto: questo è ricostruito dai dati del Comune e da OpenStreetMap.</p>';
      return h + "</div>";
    }
    function htmlCentralina(c) {
      var p = c.p, h = '<div class="rr-scheda">';
      h += '<div class="ss-testa"><span class="rr-segno">' + svgIcona("centralina") + '</span><span class="ss-cat">Misure ARPA Lazio</span></div>';
      h += '<h2 id="scheda-servizio-titolo" tabindex="-1">' + esc(p.nome) + "</h2>";
      if (p.descrizione) h += '<p class="ss-riga">' + esc(p.descrizione) + "</p>";
      var rep = p.report || [];
      h += '<p class="ss-riga ss-det">' + (rep.length ? rep.length + " report mensili · ultimo: " + dataIt(rep[rep.length - 1].periodo_fine) : "Dati non pubblicati online") + "</p>";
      h += '<div class="rr-limiti"><span>Valore di attenzione</span><b>15 V/m</b><span>Limite di esposizione</span><b>20 V/m</b></div>';
      if (rep.length) h += '<div class="ss-azioni"><div class="ss-link"><a href="' + esc(rep[rep.length - 1].url) + '" target="_blank" rel="noopener noreferrer">Ultimo report <span aria-hidden="true">↗</span></a></div></div>';
      return h + "</div>";
    }
    // Scheda su un punto senza elemento proprio (sito su canvas, 3D...): un'ancora invisibile
    function apriSchedaSu(ll, html, etichetta, el) {
      R.strati.ancore.clearLayers();
      var ancora = el;
      if (!ancora) {
        var m = L.marker(ll, { icon: L.divIcon({ className: "rr-ancora", iconSize: [2, 2] }), interactive: false, keyboard: false }).addTo(R.strati.ancore);
        ancora = m.getElement();
      }
      apriSchedaServizio({ categoria: "rr-antenne" }, ll, ancora, {
        html: html, etichetta: etichetta,
        chiusa: function () { R.strati.ancore.clearLayers(); evidenzia(null); }
      });
    }

    // ---------------------------------------------------------------- disegno
    function iconaAntenna(a, dim) {
      return L.divIcon({
        className: "rr-divicon", iconSize: [dim, dim], iconAnchor: [dim / 2, dim],
        html: '<div class="rr-antenna' + (a.p.qualita_posizione === "geocodificata" ? " rr-stimata" : "") + '" data-id="' + a.id + '" style="position:relative">' + svgIcona("antenna") + "</div>"
      });
    }
    function markerAntenna(a) {
      if (R.markerAntenne[a.id]) return R.markerAntenne[a.id];
      var m = L.marker(a.ll, { icon: iconaAntenna(a, 32), pane: "rrAntennePane", keyboard: false, riseOnHover: true });
      m.bindTooltip(esc(gestoriTesto(a.p)) + '<span class="rr-tip-sub">' + esc(a.p.indirizzo || "") + "</span>", { direction: "top", offset: [0, -28], className: "rr-tip" });
      marcatoreTastiera(m, "Antenna: " + gestoriTesto(a.p) + (a.p.indirizzo ? ", " + a.p.indirizzo : ""));
      m.on("click", function () { apriAntenna(a); });
      R.markerAntenne[a.id] = m;
      return m;
    }
    function apriAntenna(a, vola) {
      var m = markerAntenna(a);
      if (vola) {
        var z = Math.max(map.getZoom(), ZOOM_SENZA_GRAPPOLI + 1);
        map.flyTo(a.ll, z, { duration: menoMoto() ? 0 : 0.6 });
        map.once("moveend", function () { disegnaAntenne(); setTimeout(function () { apriAntenna(a, false); }, 60); });
        return;
      }
      m.closeTooltip();
      var el = m.getElement();
      if (!el || !el.isConnected) { apriSchedaSu(a.ll, htmlAntenna(a), "Antenna: " + gestoriTesto(a.p)); return; }
      evidenzia(a.id);
      apriSchedaSu(a.ll, htmlAntenna(a), "Antenna: " + gestoriTesto(a.p), el.firstElementChild);
    }
    function evidenzia(id) {
      var p = map.getPane("rrAntennePane");
      p.querySelectorAll(".rr-antenna.attiva").forEach(function (x) { x.classList.remove("attiva"); });
      if (id != null) { var e = p.querySelector('.rr-antenna[data-id="' + id + '"]'); if (e) e.classList.add("attiva"); }
    }
    // Grappoli a griglia (come i servizi della base): sotto lo zoom 15 le antenne vicine si contano
    function disegnaAntenne() {
      R.strati.antenne.clearLayers();
      if (!R.acceso.antenne) return;
      var vis = R.istanze.filter(visibileAntenna), z = map.getZoom();
      if (z >= ZOOM_SENZA_GRAPPOLI) { vis.forEach(function (a) { R.strati.antenne.addLayer(markerAntenna(a)); }); segnaVicine(); return; }
      var cella = 68, celle = {};
      vis.forEach(function (a) {
        var pt = map.project(a.ll, z), k = Math.floor(pt.x / cella) + ":" + Math.floor(pt.y / cella);
        (celle[k] = celle[k] || []).push(a);
      });
      Object.keys(celle).forEach(function (k) {
        var g = celle[k];
        if (g.length === 1) { R.strati.antenne.addLayer(markerAntenna(g[0])); return; }
        var lat = 0, lng = 0; g.forEach(function (a) { lat += a.ll.lat; lng += a.ll.lng; });
        var c = L.latLng(lat / g.length, lng / g.length), dim = g.length < 10 ? 32 : g.length < 50 ? 38 : 44;
        var vicina = g.some(function (a) { return a.vicina; });
        var m = L.marker(c, {
          pane: "rrAntennePane", keyboard: false,
          icon: L.divIcon({ className: "rr-divicon", iconSize: [dim, dim], iconAnchor: [dim / 2, dim / 2], html: '<div class="rr-grappolo' + (vicina ? " rr-vicina" : "") + '">' + g.length + "</div>" })
        });
        m.bindTooltip(g.length + " richieste di antenne qui intorno<span class=\"rr-tip-sub\">Avvicinati per vederle una per una</span>", { direction: "top", offset: [0, -dim / 2], className: "rr-tip" });
        marcatoreTastiera(m, g.length + " antenne raggruppate: ingrandisci");
        m.on("click", function () {
          var b = L.latLngBounds(g.map(function (a) { return a.ll; }));
          map.fitBounds(b.pad(0.35), { maxZoom: ZOOM_SENZA_GRAPPOLI + 1, animate: !menoMoto() });
        });
        R.strati.antenne.addLayer(m);
      });
      segnaVicine();
    }
    function segnaVicine() {
      var pane = map.getPane("rrAntennePane");
      pane.classList.toggle("rr-con-via", R.istanze.some(function (a) { return a.vicina; }));
      R.istanze.forEach(function (a) {
        var e = pane.querySelector('.rr-antenna[data-id="' + a.id + '"]');
        if (e) e.classList.toggle("rr-vicina", !!a.vicina);
      });
    }
    function disegnaSiti() {
      R.strati.siti.clearLayers();
      var lontano = map.getZoom() < ZOOM_SITI;
      var pannello = document.getElementById("rr-livelli");
      if (pannello) pannello.classList.toggle("lontano", lontano);
      if (lontano) return;
      var b = map.getBounds().pad(0.25), r = map.getZoom() >= 16 ? 7 : map.getZoom() >= 14 ? 6 : 4.5;
      R.siti.forEach(function (s) {
        var g = gruppoSito(s.p.categoria);
        if (!R.acceso[g] || !b.contains(s.ll)) return;
        var m = L.circleMarker(s.ll, { renderer: rendererSiti, radius: r, color: "#ffffff", weight: 1.6, fillColor: COLORI[g], fillOpacity: s.p.ufficiale ? 0.95 : 0.7 });
        m.bindTooltip(esc(s.p.nome || nomeCategoria(s.p.categoria)) + '<span class="rr-tip-sub">' + esc(nomeCategoria(s.p.categoria)) + "</span>", { direction: "top", className: "rr-tip" });
        m.on("click", function () { apriSchedaSu(s.ll, htmlSito(s), nomeCategoria(s.p.categoria) + ": " + (s.p.nome || "")); });
        R.strati.siti.addLayer(m);
      });
    }
    function disegnaAree() {
      R.strati.aree.clearLayers();
      R.aree.forEach(function (a) {
        var t = TIPI_AREA[a.f.properties.tipo] || TIPI_AREA.area_protetta;
        if (!R.acceso[t.c]) return;
        R.strati.aree.addLayer(L.geoJSON(a.f, {
          pane: "rrAreePane", renderer: rendererAree, interactive: false,
          style: { color: COLORI[t.c], weight: 1.6, dashArray: "6 5", opacity: 0.9, fillColor: COLORI[t.c], fillOpacity: 0.09 }
        }));
      });
    }
    function disegnaCentraline() {
      R.strati.centraline.clearLayers();
      if (!R.acceso.centraline) return;
      R.centraline.forEach(function (c) {
        var m = L.marker(c.ll, {
          pane: "rrAntennePane", keyboard: false, riseOnHover: true,
          icon: L.divIcon({ className: "rr-divicon", iconSize: [34, 34], iconAnchor: [17, 34], html: '<div class="rr-centralina">' + svgIcona("centralina") + "</div>" })
        });
        m.bindTooltip(esc(c.p.nome) + '<span class="rr-tip-sub">Monitoraggio ARPA Lazio</span>', { direction: "top", offset: [0, -30], className: "rr-tip" });
        marcatoreTastiera(m, "Centralina di misura: " + c.p.nome);
        m.on("click", function () { var el = m.getElement(); apriSchedaSu(c.ll, htmlCentralina(c), c.p.nome, el && el.firstElementChild); });
        R.strati.centraline.addLayer(m);
      });
    }
    function disegnaTutto() { disegnaAree(); disegnaSiti(); disegnaAntenne(); disegnaCentraline(); aggiorna3D(); }
    map.on("zoomend", function () { disegnaAntenne(); disegnaSiti(); });
    map.on("moveend", function () { if (map.getZoom() >= ZOOM_SITI) disegnaSiti(); });

    // ---------------------------------------------------------------- pannello dei livelli
    function voce(k, segno, testo, n) {
      return '<label class="rr-voce' + (R.acceso[k] ? "" : " spenta") + '"><input type="checkbox" data-livello="' + k + '"' + (R.acceso[k] ? " checked" : "") +
        '><span class="rr-segno">' + segno + '</span><span>' + testo + '</span><span class="rr-n" data-n="' + k + '">' + (n == null ? "" : num(n)) + "</span></label>";
    }
    function creaPannello() {
      var el = document.createElement("section");
      el.id = "rr-livelli"; el.setAttribute("aria-label", "Livelli della mappa delle antenne");
      var conta = {}; R.siti.forEach(function (s) { var g = gruppoSito(s.p.categoria); conta[g] = (conta[g] || 0) + 1; });
      var contaAree = {}; R.aree.forEach(function (a) { var t = (TIPI_AREA[a.f.properties.tipo] || TIPI_AREA.area_protetta).c; contaAree[t] = (contaAree[t] || 0) + 1; });
      var gestori = {}; R.istanze.forEach(function (a) { (a.p.gestori || []).forEach(function (g) { gestori[g] = (gestori[g] || 0) + 1; }); });
      var h = '<button type="button" class="rr-testa" aria-expanded="true"><span>Livelli</span><span class="caret" aria-hidden="true">&#9660;</span></button><div class="rr-corpo">';
      h += '<div class="rr-gruppo"><div class="rr-gruppo-t">Impianti</div>' + voce("antenne", svgIcona("antenna"), "Antenne richieste", R.istanze.length);
      h += '<label class="rr-filtro">Operatore<select id="rr-gestore"><option value="">Tutti gli operatori</option>' +
        Object.keys(gestori).sort(function (a, b) { return gestori[b] - gestori[a]; }).map(function (g) { return '<option value="' + esc(g) + '">' + esc(g) + " (" + gestori[g] + ")</option>"; }).join("") +
        "</select></label></div>";
      h += '<div class="rr-gruppo"><div class="rr-gruppo-t">Siti sensibili</div>' +
        GRUPPI_SITI.map(function (g) { return voce(g.k, '<span class="rr-pallino" style="background:' + COLORI[g.k] + '"></span>', g.t, conta[g.k] || 0); }).join("") +
        '<p class="rr-nota rr-zoom">Avvicinati alla mappa per vedere i siti sensibili.</p></div>';
      h += '<div class="rr-gruppo"><div class="rr-gruppo-t">Aree vincolate</div>' +
        voce("unesco", '<span class="rr-campione-area" style="color:' + COLORI.unesco + '"></span>', "Sito UNESCO", contaAree.unesco || 0) +
        voce("protette", '<span class="rr-campione-area" style="color:' + COLORI.protette + '"></span>', "Aree protette", contaAree.protette || 0) + "</div>";
      h += '<div class="rr-gruppo"><div class="rr-gruppo-t">Misure</div>' + voce("centraline", svgIcona("centralina"), "Centraline ARPA", R.centraline.length) + "</div>";
      h += '<p class="rr-fonti">Cerca una via nell\'elenco a sinistra: vedi le antenne lungo la via. Fonti: Roma Capitale, ARPA Lazio, © OpenStreetMap contributors (ODbL).</p>';
      el.innerHTML = h + "</div>";
      el.querySelector(".rr-testa").addEventListener("click", function () {
        var chiuso = el.classList.toggle("chiuso"); this.setAttribute("aria-expanded", String(!chiuso));
      });
      el.addEventListener("change", function (e) {
        var t = e.target;
        if (t.id === "rr-gestore") { R.gestore = t.value; disegnaAntenne(); aggiornaZona(); aggiorna3D(); return; }
        var k = t.getAttribute("data-livello"); if (!k) return;
        R.acceso[k] = t.checked; t.closest(".rr-voce").classList.toggle("spenta", !t.checked);
        if (k === "antenne") disegnaAntenne(); else if (k === "unesco" || k === "protette") disegnaAree(); else if (k === "centraline") disegnaCentraline(); else disegnaSiti();
        aggiorna3D();
      });
      document.getElementById("map-wrap").appendChild(el);
      collocaPannello();
      window.matchMedia(MQ_TELEFONO).addEventListener("change", collocaPannello);
    }
    // Telefono: il pannello entra nel foglio "Livelli" della base (tasto Livelli in basso)
    function collocaPannello() {
      var el = document.getElementById("rr-livelli"); if (!el) return;
      var foglio = document.querySelector("#livelli-foglio .foglio-corpo");
      if (suMobile() && foglio) { el.classList.add("nel-foglio"); foglio.insertBefore(el, foglio.firstChild); }
      else { el.classList.remove("nel-foglio"); document.getElementById("map-wrap").appendChild(el); }
    }
    // ---------------------------------------------------------------- vicino a via, area o punto
    var zona = document.createElement("div");
    zona.id = "rr-zona"; zona.hidden = true; zona.setAttribute("aria-live", "polite");
    var infoVia = document.getElementById("info-via");
    infoVia.parentNode.insertBefore(zona, infoVia.nextSibling);

    function elencoAntenne(lista) {
      if (!lista.length) return "";
      return "<ul>" + lista.slice(0, 40).map(function (x) {
        return '<li><button type="button" data-antenna="' + x.a.id + '"><span>' + esc(gestoriTesto(x.a.p)) +
          '<span class="rr-sub">' + esc(x.a.p.indirizzo || "") + "</span></span>" + (x.d != null ? '<span class="rr-m">' + metri(x.d) + "</span>" : "") + "</button></li>";
      }).join("") + "</ul>";
    }
    function riepilogoSiti(siti) {
      var c = {}; siti.forEach(function (s) { var g = gruppoSito(s.p.categoria); c[g] = (c[g] || 0) + 1; });
      var parti = GRUPPI_SITI.filter(function (g) { return c[g.k]; }).map(function (g) {
        return '<span><span class="rr-pallino" style="background:' + COLORI[g.k] + '"></span>' + c[g.k] + " " + g.t.toLowerCase() + "</span>";
      });
      return parti.length ? '<div class="rr-sens">' + parti.join("") + "</div>" : "";
    }
    function aggiornaZona() {
      R.istanze.forEach(function (a) { a.vicina = false; });
      if (!R.pronti) { zona.hidden = true; return; }
      var ant = R.istanze.filter(visibileAntenna), h = "";
      var via = viaAttiva && viaAttiva.traccia ? viaAttiva : null;
      if (via) {
        var linee = appiattisci(via.traccia.getLatLngs());
        var vicine = ant.map(function (a) { return { a: a, d: distLinee(a.ll, linee) }; }).filter(function (x) { return x.d <= RAGGIO_VIA; }).sort(function (x, y) { return x.d - y.d; });
        var siti = R.siti.filter(function (s) { return distLinee(s.ll, linee) <= RAGGIO_VIA; });
        vicine.forEach(function (x) { x.a.vicina = true; });
        h += '<div class="rr-zona-t">Antenne lungo ' + esc(via.via.nome) + "</div>";
        h += '<p class="rr-zona-n">' + (vicine.length ? "<b>" + vicine.length + "</b> " + (vicine.length === 1 ? "richiesta" : "richieste") + " entro " + RAGGIO_VIA + " m dalla via"
          : "Nessuna richiesta di antenna pubblicata entro " + RAGGIO_VIA + " m dalla via") + (siti.length ? " · <b>" + siti.length + "</b> siti sensibili" : "") + "</p>";
        h += elencoAntenne(vicine) + riepilogoSiti(siti);
      } else if (R.punto) {
        var vp = ant.map(function (a) { return { a: a, d: distPunto(R.punto, a.ll) }; }).filter(function (x) { return x.d <= RAGGIO_PUNTO; }).sort(function (x, y) { return x.d - y.d; });
        var sp = R.siti.filter(function (s) { return distPunto(R.punto, s.ll) <= RAGGIO_PUNTO; });
        vp.forEach(function (x) { x.a.vicina = true; });
        h += '<div class="rr-zona-t">Intorno al punto (' + RAGGIO_PUNTO + " m)</div>";
        h += '<p class="rr-zona-n">' + (vp.length ? "<b>" + vp.length + "</b> " + (vp.length === 1 ? "richiesta di antenna" : "richieste di antenne") : "Nessuna richiesta di antenna") + (sp.length ? " · <b>" + sp.length + "</b> siti sensibili" : "") + "</p>";
        h += elencoAntenne(vp) + riepilogoSiti(sp);
      } else if (R.areaProps) {
        var e = entryDiCodice(R.areaProps.codice), g = e && e.feature.geometry;
        if (g) {
          var dentro = ant.filter(function (a) { return e.layer.getBounds().contains(a.ll) && dentroGeometria(g, a.ll.lng, a.ll.lat); })
            .map(function (a) { return { a: a, d: null }; });
          var sd = R.siti.filter(function (s) { return e.layer.getBounds().contains(s.ll) && dentroGeometria(g, s.ll.lng, s.ll.lat); });
          h += '<div class="rr-zona-t">Antenne in quest\'area</div>';
          h += '<p class="rr-zona-n">' + (dentro.length ? "<b>" + dentro.length + "</b> " + (dentro.length === 1 ? "richiesta pubblicata" : "richieste pubblicate") : "Nessuna richiesta di antenna pubblicata") + (sd.length ? " · <b>" + sd.length + "</b> siti sensibili" : "") + "</p>";
          h += elencoAntenne(dentro) + riepilogoSiti(sd);
        }
      }
      zona.innerHTML = h; zona.hidden = !h;
      segnaVicine(); disegnaAntenne(); aggiorna3D();
    }
    zona.addEventListener("click", function (e) {
      var b = e.target.closest("[data-antenna]"); if (!b) return;
      var id = b.getAttribute("data-antenna"), a = R.istanze.filter(function (x) { return String(x.id) === id; })[0];
      if (a) apriAntenna(a, true);
    });

    // Avvolgo le funzioni della base: via cercata, scheda dell'area, via tolta
    var _tracciaVia = tracciaVia;
    tracciaVia = function () { var t = _tracciaVia.apply(this, arguments); setTimeout(aggiornaZona, 0); return t; };
    var _pulisciVia = pulisciVia;
    pulisciVia = function () { var r = _pulisciVia.apply(this, arguments); setTimeout(aggiornaZona, 0); return r; };
    var _mostraInfo = mostraInfo;
    mostraInfo = function (props) { var r = _mostraInfo.apply(this, arguments); R.areaProps = props || null; R.punto = null; aggiornaZona(); return r; };
    var _deseleziona = deseleziona;
    deseleziona = function () { var r = _deseleziona.apply(this, arguments); R.areaProps = null; aggiornaZona(); return r; };

    // ---------------------------------------------------------------- striscia dei numeri e pannello "Cos'e'"
    function aggiornaTesta() {
      var ov = document.getElementById("overview-stats");
      var roma = (R.info && R.info.statistiche || []).filter(function (s) { return s.indicatore === "impianti_srb" && s.ambito === "comune:Roma"; })[0];
      var voci = [
        { n: R.istanze.length, l: "antenne richieste" },
        { n: R.siti.length, l: "siti sensibili" },
        roma ? { n: Number(roma.valore), l: "impianti a Roma (ARPA)" } : null,
        { raw: "15 V/m", l: "valore di attenzione" }
      ].filter(Boolean);
      if (ov) ov.innerHTML = voci.map(function (s) { return '<div class="stat"><span class="n">' + (s.raw || num(s.n)) + '</span><span class="l">' + s.l + "</span></div>"; }).join("");
      var btn = document.getElementById("about-btn");
      if (btn) btn.innerHTML = '<span class="ic">i</span> Come leggere la mappa';
      var pan = document.getElementById("about-panel");
      if (pan && !document.getElementById("rr-about")) {
        var a = document.createElement("div"); a.id = "rr-about";
        var fonti = (R.info && R.info.fonti || []).filter(function (f) { return f.id !== "normativa_cem"; });
        a.innerHTML = '<div class="ab-kicker">Antenne di telefonia mobile</div><h2>Come leggere questa mappa</h2>' +
          "<p>I simboli blu sono le <strong>richieste di installazione o modifica</strong> di antenne pubblicate da Roma Capitale e dai Municipi. Non sono il catasto completo, che non è pubblico: ARPA Lazio conta circa 3.538 impianti nel Comune di Roma. Una richiesta non prova che l'impianto sia attivo.</p>" +
          "<p>I pallini colorati sono i <strong>siti sensibili</strong> dove il regolamento di Roma (DAC 78/2024) vieta le antenne: scuole, asili, ospedali, RSA, parchi giochi, carceri. Le aree tratteggiate sono il <strong>sito UNESCO</strong> e le <strong>aree protette</strong>.</p>" +
          '<div class="rr-limiti-tab"><b>20 V/m</b><span>limite di esposizione, mai superabile</span><b>15 V/m</b><span>valore di attenzione negli edifici, media sulle 24 ore (dal 2024; prima 6 V/m)</span></div>' +
          "<p>Per una misura a casa tua: il proprietario o l'affittuario scrive via PEC ad ARPA Lazio, Sezione provinciale di Roma.</p>" +
          (fonti.length ? '<div class="ab-fonti"><div class="ab-fonti-t">Fonti dei dati sulle antenne</div><p>' + fonti.map(function (f) {
            return '<a href="' + esc(String(f.url).split(" ")[0]) + '" target="_blank" rel="noopener">' + esc(f.titolo) + "</a> (" + esc(f.ente) + (f.licenza ? ", " + esc(f.licenza) : "") + ")";
          }).join("; ") + ".</p></div>" : "");
        var chiudi = pan.querySelector(".ab-close");
        pan.insertBefore(a, chiudi ? chiudi.nextSibling : pan.firstChild);
      }
    }

    // ---------------------------------------------------------------- 3D (MapLibre)
    var mappe3d = [];
    function geo(features) { return { type: "FeatureCollection", features: features }; }
    function dati3D() {
      return {
        antenne: geo(R.acceso.antenne ? R.istanze.filter(visibileAntenna).map(function (a) {
          return { type: "Feature", properties: { rid: a.id, vicina: !!a.vicina }, geometry: { type: "Point", coordinates: [a.ll.lng, a.ll.lat] } };
        }) : []),
        siti: geo(R.siti.filter(function (s) { return R.acceso[gruppoSito(s.p.categoria)]; }).map(function (s) {
          return { type: "Feature", properties: { rid: s.i, col: COLORI[gruppoSito(s.p.categoria)] }, geometry: { type: "Point", coordinates: [s.ll.lng, s.ll.lat] } };
        })),
        aree: geo(R.aree.filter(function (a) { return R.acceso[(TIPI_AREA[a.f.properties.tipo] || TIPI_AREA.area_protetta).c]; }).map(function (a) {
          var t = TIPI_AREA[a.f.properties.tipo] || TIPI_AREA.area_protetta;
          return { type: "Feature", properties: { col: COLORI[t.c] }, geometry: a.f.geometry };
        }))
      };
    }
    function prepara3D(m) {
      if (!R.pronti || !m || !m.getStyle || mappe3d.indexOf(m) !== -1 && m.getSource("rr-antenne")) { aggiorna3D(); return; }
      var d = dati3D();
      try {
        if (!m.getSource("rr-aree")) m.addSource("rr-aree", { type: "geojson", data: d.aree });
        if (!m.getSource("rr-siti")) m.addSource("rr-siti", { type: "geojson", data: d.siti });
        if (!m.getSource("rr-antenne")) m.addSource("rr-antenne", { type: "geojson", data: d.antenne });
        if (!m.getLayer("rr3-aree")) m.addLayer({ id: "rr3-aree", type: "line", source: "rr-aree", paint: { "line-color": ["get", "col"], "line-width": 2, "line-dasharray": [3, 2.5], "line-opacity": 0.9 } });
        if (!m.getLayer("rr3-siti")) m.addLayer({ id: "rr3-siti", type: "circle", source: "rr-siti", minzoom: ZOOM_SITI - 1,
          paint: { "circle-color": ["get", "col"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 3, 16, 7], "circle-stroke-color": "#fff", "circle-stroke-width": 1.4, "circle-pitch-alignment": "map" } });
        if (!m.getLayer("rr3-antenne-alone")) m.addLayer({ id: "rr3-antenne-alone", type: "circle", source: "rr-antenne",
          paint: { "circle-color": COLORI.antenne, "circle-opacity": 0.18, "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 7, 16, 18] } });
        if (!m.getLayer("rr3-antenne")) m.addLayer({ id: "rr3-antenne", type: "circle", source: "rr-antenne",
          paint: { "circle-color": COLORI.antenne, "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 16, 8], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
        if (mappe3d.indexOf(m) === -1) {
          mappe3d.push(m);
          var popup = null;
          function apriPopup(ll, html) {
            if (popup) popup.remove();
            popup = new window.maplibregl.Popup({ className: "rr-popup", maxWidth: "320px", focusAfterOpen: false }).setLngLat(ll).setHTML(html).addTo(m);
          }
          m.on("click", "rr3-antenne", function (e) {
            var id = e.features && e.features[0] && e.features[0].properties.rid;
            var a = R.istanze.filter(function (x) { return x.id === id; })[0];
            if (a) apriPopup([a.ll.lng, a.ll.lat], htmlAntenna(a));
          });
          m.on("click", "rr3-siti", function (e) {
            var i = e.features && e.features[0] && e.features[0].properties.rid, s = R.siti[i];
            if (s) apriPopup([s.ll.lng, s.ll.lat], htmlSito(s));
          });
          ["rr3-antenne", "rr3-siti"].forEach(function (id) {
            m.on("mouseenter", id, function () { m.getCanvas().style.cursor = "pointer"; });
            m.on("mouseleave", id, function () { m.getCanvas().style.cursor = ""; });
          });
        }
      } catch (err) { if (window.console) console.warn("RomaRouter 3D:", err); }
    }
    function aggiorna3D() {
      if (!mappe3d.length) return;
      var d = dati3D();
      mappe3d.forEach(function (m) {
        try {
          if (m.getSource("rr-antenne")) m.getSource("rr-antenne").setData(d.antenne);
          if (m.getSource("rr-siti")) m.getSource("rr-siti").setData(d.siti);
          if (m.getSource("rr-aree")) m.getSource("rr-aree").setData(d.aree);
        } catch { /* sorgente gia' rimossa: si ignora */ }
      });
    }
    window.addEventListener("rr:mappa3d", function (e) { prepara3D(e.detail); });

    // ---------------------------------------------------------------- caricamento
    Promise.all([getJson("istanze"), getJson("siti-sensibili"), getJson("aree-vincolate"), getJson("monitoraggio"), getJson("info").catch(function () { return null; })])
      .then(function (r) {
        R.istanze = (r[0].features || []).filter(function (f) { return f.geometry; }).map(function (f) {
          return { id: f.id, p: f.properties, ll: L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]) };
        });
        R.siti = (r[1].features || []).filter(function (f) { return f.geometry && f.geometry.type === "Point"; }).map(function (f, i) {
          return { i: i, p: f.properties, ll: L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]) };
        });
        R.aree = (r[2].features || []).map(function (f) { return { f: f, bounds: L.geoJSON(f).getBounds() }; });
        R.centraline = (r[3].features || []).map(function (f) { return { p: f.properties, ll: L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]) }; });
        R.info = r[4];
        R.pronti = true;
        creaPannello();
        aggiornaTesta();
        disegnaTutto();
        apriDaParametri();
        if (selectedEntry) R.areaProps = selectedEntry.feature.properties;
        aggiornaZona();
        try { window.parent.postMessage({ tipo: "rr:mappa-pronta", sezione: "antenne" }, location.origin); } catch { /* senza pagina ospite: nulla da avvisare */ }
      })
      .catch(function (err) {
        if (window.console) console.error("RomaRouter antenne:", err);
        avviso("I dati sulle antenne non si sono caricati. Riprova tra poco.");
      });

    // ?antenna=<id> apre un'antenna; ?lat=&lon= inquadra un punto e conta cosa c'e' intorno
    function apriDaParametri() {
      var q = new URLSearchParams(location.search);
      var id = q.get("antenna");
      if (id) {
        var a = R.istanze.filter(function (x) { return String(x.id) === id; })[0];
        if (a) { apriAntenna(a, true); return; }
      }
      var lat = parseFloat(q.get("lat")), lon = parseFloat(q.get("lon"));
      if (isFinite(lat) && isFinite(lon) && lat > 41.5 && lat < 42.2 && lon > 12.1 && lon < 13) {
        R.punto = L.latLng(lat, lon);
        L.circle(R.punto, { radius: RAGGIO_PUNTO, pane: "rrAreePane", interactive: false, color: COLORI.antenne, weight: 2, dashArray: "4 4", fillOpacity: 0.06 }).addTo(R.strati.ancore);
        map.setView(R.punto, 16, { animate: false });
      }
    }

    // La mappa nell'iframe risponde anche a messaggi della pagina che la ospita (stessa origine)
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data || e.data.tipo !== "rr:apri-antenna") return;
      var a = R.istanze.filter(function (x) { return String(x.id) === String(e.data.id); })[0];
      if (a) apriAntenna(a, true);
    });
  })();
