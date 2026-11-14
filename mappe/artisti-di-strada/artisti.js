  // ==========================================================================================
  // RomaRouter · sezione ARTE DI STRADA
  // Gira dentro la chiusura della mappa di base (dopo la 3D). Dati: /api/artisti/* (rr_artisti_strada).
  // Due modi d'uso: "Sono un artista" (posso esibirmi qui?) e "Voglio vedere artisti" (chi c'e' qui?).
  // ==========================================================================================
  (function () {
    var API = "/api/artisti/";
    var ZOOM_CONDIZIONI = 15;   // le zone "con condizioni" (scuole, chiese...) si caricano da vicino
    var COLORI = { no: "#C62828", solo_silenzio: "#E07B1F", solo_postazioni: "#7A4FD0", condizioni: "#C9A24A", area_dedicata: "#0F9466", info: "#6B7280" };
    var ESITI = [
      { k: "no", t: "Vietato" },
      { k: "solo_silenzio", t: "Solo esibizioni silenziose" },
      { k: "solo_postazioni", t: "Solo nelle postazioni" },
      { k: "condizioni", t: "Con condizioni (scuole, chiese…)" },
      { k: "area_dedicata", t: "Aree dedicate" },
      { k: "info", t: "Divieti richiesti, non in vigore" }
    ];
    var ATTIVITA = [
      ["musica", "Musica o canto"], ["silenziosa", "Esibizione silenziosa"], ["fuoco", "Spettacolo col fuoco"],
      ["figurativa", "Ritratti e caricature"], ["esoterica", "Cartomanzia"]
    ];
    var TIPI_POSTAZIONE = {
      postazione_allegatoB: "Postazione ufficiale (Allegato B)",
      area_consentita: "Area consentita del Municipio X",
      area_esoterici: "Area per cartomanti",
      arti_figurative_area: "Area arti figurative"
    };

    var R = {
      modo: "artista", attivita: "musica",
      zone: [], condizioni: {}, postazioni: [], esibizioni: [],
      acceso: { no: true, solo_silenzio: true, solo_postazioni: true, condizioni: true, area_dedicata: true, info: true, postazioni: true, esibizioni: true },
      areaProps: null, pronti: false, punto: null, strati: {}
    };

    // ---------------------------------------------------------------- utilita'
    function esc(s) { return escapeHtml(s == null ? "" : String(s)); }
    function metri(m) { return m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km"; }
    function quando(d) { var x = new Date(d); return isNaN(x) ? "" : x.toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    function getJson(url) { return fetch(url, { headers: { Accept: "application/json" } }).then(function (r) { if (!r.ok) throw new Error(url + ": HTTP " + r.status); return r.json(); }); }
    function svgIcona(k) { return RR_ICONE[k] ? svgConIdUnici(RR_ICONE[k]) : ""; }

    function pane(nome, z, puntatore) { map.createPane(nome); map.getPane(nome).style.zIndex = z; if (!puntatore) map.getPane(nome).style.pointerEvents = "none"; }
    pane("rrZonePane", 404, false);
    pane("rrPostazioniPane", 455, true);
    var rendererZone = L.svg({ pane: "rrZonePane", padding: 0.4 });
    ["zone", "condizioni", "postazioni", "esibizioni", "ancore"].forEach(function (k) { R.strati[k] = L.layerGroup().addTo(map); });

    // I servizi della base non servono qui
    aggiornaServiziFocus = function () { var sp = document.getElementById("servizi-panel"); if (sp) sp.hidden = true; };
    try { aggiornaServiziFocus(null); } catch { /* pannello non ancora pronto */ }

    // ---------------------------------------------------------------- disegno delle zone
    function stileZona(p) {
      var c = COLORI[p.esito] || COLORI.info;
      var incerta = !p.ufficiale || p.esito === "info";
      return {
        pane: "rrZonePane", renderer: rendererZone, interactive: false,
        color: c, weight: p.esito === "condizioni" ? 1 : 2, opacity: 0.9, dashArray: incerta ? "6 5" : null,
        fillColor: c, fillOpacity: p.esito === "no" ? (incerta ? 0.14 : 0.24) : p.esito === "condizioni" ? 0.12 : 0.18
      };
    }
    function disegnaZone() {
      R.strati.zone.clearLayers();
      R.zone.forEach(function (f) {
        if (!R.acceso[f.properties.esito]) return;
        R.strati.zone.addLayer(L.geoJSON(f, { style: function () { return stileZona(f.properties); } }));
      });
    }
    function disegnaCondizioni() {
      R.strati.condizioni.clearLayers();
      var pannello = document.getElementById("rr-pannello");
      var lontano = map.getZoom() < ZOOM_CONDIZIONI;
      if (pannello) pannello.classList.toggle("lontano", lontano);
      if (lontano || !R.acceso.condizioni) return;
      var b = map.getBounds().pad(0.2), chiave = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(function (x) { return x.toFixed(3); }).join(",");
      var disegna = function (fc) {
        if (map.getZoom() < ZOOM_CONDIZIONI) return;
        R.strati.condizioni.clearLayers();
        fc.features.filter(function (f) { return f.properties.esito === "condizioni"; }).forEach(function (f) {
          var l = L.geoJSON(f, { style: function () { return stileZona(f.properties); } });
          R.strati.condizioni.addLayer(l);
        });
      };
      if (R.condizioni[chiave]) { disegna(R.condizioni[chiave]); return; }
      getJson(API + "zone?esiti=condizioni&bbox=" + chiave).then(function (fc) { R.condizioni[chiave] = fc; disegna(fc); }).catch(function () {});
    }
    function disegnaPostazioni() {
      R.strati.postazioni.clearLayers();
      if (!R.acceso.postazioni) return;
      var z = map.getZoom();
      R.postazioni.forEach(function (f) {
        var p = f.properties, ll = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
        if (p.tipo === "postazione_allegatoB" && z < 14) return;   // da lontano bastano le zone viola
        var dim = p.tipo === "postazione_allegatoB" ? 22 : 26;
        var testo = p.tipo === "postazione_allegatoB" ? (String(p.nome).match(/postazione\s+(\w+)/i) || [, ""])[1] : p.tipo === "area_consentita" ? "X" : p.tipo === "area_esoterici" ? "✶" : "✎";
        var m = L.marker(ll, {
          pane: "rrPostazioniPane", keyboard: false, riseOnHover: true,
          icon: L.divIcon({ className: "rr-divicon", iconSize: [dim, dim], iconAnchor: [dim / 2, dim / 2], html: '<div class="rr-postazione ' + esc(p.tipo) + '">' + esc(testo) + "</div>" })
        });
        m.bindTooltip(esc(p.nome) + '<span class="rr-tip-sub">' + esc(TIPI_POSTAZIONE[p.tipo] || p.tipo) + (p.posizione_stimata ? " · posizione stimata" : "") + "</span>", { direction: "top", offset: [0, -dim / 2], className: "rr-tip" });
        marcatoreTastiera(m, (TIPI_POSTAZIONE[p.tipo] || "Postazione") + ": " + p.nome);
        m.on("click", function () { var el = m.getElement(); apriSchedaSu(ll, htmlPostazione(p), p.nome, el && el.firstElementChild); });
        R.strati.postazioni.addLayer(m);
      });
    }
    function disegnaEsibizioni() {
      R.strati.esibizioni.clearLayers();
      if (!R.acceso.esibizioni) return;
      R.esibizioni.forEach(function (f) {
        var p = f.properties, ll = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
        var m = L.marker(ll, {
          pane: "rrPostazioniPane", keyboard: false, riseOnHover: true,
          icon: L.divIcon({ className: "rr-divicon", iconSize: [36, 36], iconAnchor: [18, 36], html: '<div class="rr-esibizione">' + svgIcona("artista") + "</div>" })
        });
        m.bindTooltip(esc(p.nome_arte) + '<span class="rr-tip-sub">' + esc(p.disciplina) + " · " + esc(quando(p.inizio)) + "</span>", { direction: "top", offset: [0, -32], className: "rr-tip" });
        marcatoreTastiera(m, "Esibizione: " + p.nome_arte + ", " + quando(p.inizio));
        m.on("click", function () { var el = m.getElement(); apriSchedaSu(ll, htmlEsibizione(p), p.nome_arte, el && el.firstElementChild); });
        R.strati.esibizioni.addLayer(m);
      });
    }
    function disegnaTutto() { disegnaZone(); disegnaCondizioni(); disegnaPostazioni(); disegnaEsibizioni(); }
    // si ridisegnano le postazioni solo quando si passa la soglia di zoom (cosi' una scheda aperta resta agganciata)
    var vicinoPrima = map.getZoom() >= 14;
    map.on("zoomend", function () {
      var vicino = map.getZoom() >= 14;
      if (vicino !== vicinoPrima) { vicinoPrima = vicino; disegnaPostazioni(); }
      disegnaCondizioni();
    });
    map.on("moveend", function () { if (map.getZoom() >= ZOOM_CONDIZIONI) disegnaCondizioni(); });

    // ---------------------------------------------------------------- schede
    function apriSchedaSu(ll, html, etichetta, el) {
      R.strati.ancore.clearLayers();
      var ancora = el;
      if (!ancora) {
        var m = L.marker(ll, { icon: L.divIcon({ className: "rr-ancora", iconSize: [2, 2] }), interactive: false, keyboard: false }).addTo(R.strati.ancore);
        ancora = m.getElement();
      }
      apriSchedaServizio({ categoria: "rr-artisti" }, ll, ancora, { html: html, etichetta: etichetta, chiusa: function () { R.strati.ancore.clearLayers(); } });
    }
    function rif(m) {
      var r = [m.riferimento, m.fonte_url ? '<a href="' + esc(m.fonte_url) + '" target="_blank" rel="noopener noreferrer">fonte ↗</a>' : ""].filter(Boolean).join(" · ");
      return (r ? '<span class="rr-rif">' + r + "</span>" : "");
    }
    function htmlMotivo(m) {
      return "<li>" + esc(m.testo) +
        (!m.ufficiale ? '<span class="rr-etichetta verifica">da verificare</span>' : "") +
        (m.approssimata ? '<span class="rr-etichetta stima">confine stimato</span>' : "") +
        '<span class="rr-rif">' + esc(m.luogo) + "</span>" + rif(m) + "</li>";
    }
    var ICONA_ESITO = { ok: "✓", attenzione: "!", errore: "✕" };
    function htmlVerdetto(v) {
      var h = '<div class="rr-scheda rr-verdetto">';
      h += '<div class="ss-testa"><span class="rr-segno-svg">' + svgIcona("artista") + '</span><span class="ss-cat">' +
        (R.modo === "artista" ? esc(v.attivita.nome) : "Arte di strada qui") + "</span></div>";
      h += '<h2 id="scheda-servizio-titolo" tabindex="-1">' + esc(v.luogo ? v.luogo.etichetta : "Punto scelto sulla mappa") + "</h2>";
      if (v.municipio) h += '<p class="ss-riga">Municipio ' + esc(v.municipio.numero_romano) + "</p>";

      if (R.modo === "cittadino") {
        var e = v.esibizioni || [];
        h += '<div class="rr-blocco"><div class="rr-blocco-t">Chi si esibisce qui (7 giorni, 500 m)</div>' + (e.length
          ? '<ul class="rr-lista">' + e.map(function (x) { return "<li><b>" + esc(x.nome_arte) + "</b> · " + esc(x.disciplina) + '<span class="rr-rif">' + esc(quando(x.inizio)) + " · " + metri(x.distanza_m) + (x.postazione ? " · " + esc(x.postazione) : "") + "</span></li>"; }).join("") + "</ul>"
          : '<p class="ss-riga">Nessuna esibizione annunciata qui. Gli artisti si trovano più spesso nelle postazioni ufficiali qui sotto.</p>') + "</div>";
      }
      h += '<div class="rr-esito ' + v.esito.tono + '"><span class="rr-ic" aria-hidden="true">' + ICONA_ESITO[v.esito.tono] + "</span><span>" +
        esc(R.modo === "artista" ? v.esito.titolo : (v.esito.codice === "no" ? "Qui le esibizioni sono vietate" : v.esito.codice === "probabilmente_no" ? "Qui le esibizioni sono probabilmente vietate" : "Qui gli artisti possono esibirsi")) + "</span></div>";
      if (v.motivi.length) h += '<div class="rr-blocco"><div class="rr-blocco-t">Perché</div><ul class="rr-lista">' + v.motivi.map(htmlMotivo).join("") + "</ul></div>";
      if (R.modo === "artista" && v.condizioni.length) h += '<div class="rr-blocco"><div class="rr-blocco-t">Condizioni qui</div><ul class="rr-lista">' + v.condizioni.slice(0, 5).map(htmlMotivo).join("") + "</ul></div>";
      if (R.modo === "artista" && v.orario) {
        h += '<p class="rr-orario">' + (v.orario.dentro ? "Adesso sei <b>dentro</b> la fascia oraria" : "Adesso sei <b>fuori</b> dalla fascia oraria") +
          ": " + esc(v.orario.testo) + (v.orario.stagione ? " (" + esc(v.orario.stagione) + ")" : "") + ", massimo 2 ore per fascia.</p>";
      }
      var vicine = (v.postazioni_vicine || []).slice(0, 4);
      if (vicine.length) {
        h += '<div class="rr-blocco rr-vicine"><div class="rr-blocco-t">' + (R.modo === "artista" ? "Postazioni e aree vicine" : "Dove trovare artisti qui vicino") + "</div>" +
          vicine.map(function (p) { return '<button type="button" data-vai="' + p.lat + "," + p.lon + '"><span>' + esc(p.nome) + '<span class="rr-rif">' + esc(TIPI_POSTAZIONE[p.tipo] || p.tipo) + "</span></span><span class=\"rr-m\">" + metri(p.distanza_m) + "</span></button>"; }).join("") + "</div>";
      }
      if (R.modo === "artista" && v.cosa_fare.length) h += '<div class="rr-blocco"><div class="rr-blocco-t">Prima di esibirti</div><ul class="rr-lista">' + v.cosa_fare.slice(0, 3).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
      h += '<p class="rr-avvertenza">' + esc(v.avvertenze[0]) + " Fonti: regolamento DAC 24/2012, delibere del Municipio I, dataset Art Spot.</p>";
      return h + "</div>";
    }
    function htmlPostazione(p) {
      var h = '<div class="rr-scheda"><div class="ss-testa"><span class="rr-segno-svg">' + svgIcona("artista") + '</span><span class="ss-cat">' + esc(TIPI_POSTAZIONE[p.tipo] || p.tipo) + "</span></div>";
      h += '<h2 id="scheda-servizio-titolo" tabindex="-1">' + esc(p.nome) + "</h2>";
      if (p.regole) h += '<p class="ss-riga">' + esc(p.regole) + "</p>";
      if (p.fasce) h += '<p class="ss-riga ss-det">' + esc(p.fasce) + "</p>";
      if (p.posizione_stimata) h += '<p class="ss-riga"><span class="rr-etichetta stima">posizione stimata</span> ' + esc(p.nota_posizione || "") + "</p>";
      if (p.fonte_url) h += '<div class="ss-azioni"><div class="ss-link"><a href="' + esc(p.fonte_url) + '" target="_blank" rel="noopener noreferrer">Atto ufficiale <span aria-hidden="true">↗</span></a></div></div>';
      return h + "</div>";
    }
    function htmlEsibizione(p) {
      var h = '<div class="rr-scheda"><div class="ss-testa"><span class="rr-segno-svg">' + svgIcona("artista") + '</span><span class="ss-cat">' + esc(p.disciplina) + "</span></div>";
      h += '<h2 id="scheda-servizio-titolo" tabindex="-1">' + esc(p.nome_arte) + "</h2>";
      h += '<p class="ss-riga"><b>' + esc(quando(p.inizio)) + "</b> – " + esc(new Date(p.fine).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })) + "</p>";
      if (p.postazione || p.luogo) h += '<p class="ss-riga">' + esc(p.postazione || p.luogo) + "</p>";
      if (p.descrizione) h += '<p class="ss-riga">' + esc(p.descrizione) + "</p>";
      if (p.stato === "richiesta") h += '<p class="ss-riga"><span class="rr-etichetta verifica">annuncio dell\'artista</span> non verificato dal Comune</p>';
      if (p.link) h += '<div class="ss-azioni"><div class="ss-link"><a href="' + esc(p.link) + '" target="_blank" rel="noopener noreferrer">Dell\'artista <span aria-hidden="true">↗</span></a></div></div>';
      return h + "</div>";
    }

    // ---------------------------------------------------------------- verifica di un punto
    var marcaPunto = null;
    function verifica(ll, etichetta) {
      R.punto = ll;
      if (marcaPunto) map.removeLayer(marcaPunto);
      marcaPunto = L.marker(ll, { pane: "rrPostazioniPane", interactive: false, keyboard: false,
        icon: L.divIcon({ className: "rr-divicon", iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="rr-punto-scelto"></div>' }) }).addTo(map);
      var url = API + "verifica?lat=" + ll.lat.toFixed(6) + "&lon=" + ll.lng.toFixed(6) + "&attivita=" + R.attivita;
      return getJson(url).then(function (v) {
        if (etichetta) v.luogo = { etichetta: etichetta };
        apriSchedaSu(ll, htmlVerdetto(v), v.esito.titolo, marcaPunto.getElement());
        try { window.parent.postMessage({ tipo: "rr:verdetto", sezione: "artisti-di-strada", esito: v.esito.codice, lat: ll.lat, lon: ll.lng }, location.origin); } catch { /* senza pagina ospite */ }
        return v;
      }).catch(function () { avviso("Non riesco a verificare questo punto. Riprova tra poco."); });
    }
    map.on("click", function (e) { if (R.pronti) verifica(e.latlng); });
    document.getElementById("scheda-servizio").addEventListener("click", function (e) {
      var b = e.target.closest("[data-vai]"); if (!b) return;
      var c = b.getAttribute("data-vai").split(",").map(Number);
      map.flyTo([c[0], c[1]], Math.max(map.getZoom(), 18), { duration: menoMoto() ? 0 : 0.6 });
    });

    // ---------------------------------------------------------------- pannello
    function voce(k, segno, testo, n) {
      return '<label class="rr-voce' + (R.acceso[k] ? "" : " spenta") + '"><input type="checkbox" data-livello="' + k + '"' + (R.acceso[k] ? " checked" : "") +
        "><span>" + segno + "</span><span>" + testo + '</span><span class="rr-n">' + (n == null ? "" : formattaNumero(n)) + "</span></label>";
    }
    function creaPannello() {
      var el = document.createElement("section");
      el.id = "rr-pannello"; el.setAttribute("aria-label", "Arte di strada: modo d'uso e livelli");
      var conta = {}; R.zone.forEach(function (f) { conta[f.properties.esito] = (conta[f.properties.esito] || 0) + 1; });
      var h = '<button type="button" class="rr-testa" aria-expanded="true"><span>Arte di strada</span><span class="caret" aria-hidden="true">&#9660;</span></button><div class="rr-corpo">';
      h += '<div class="rr-modo" role="group" aria-label="Modo d\'uso"><button type="button" data-modo="artista" aria-pressed="true">Sono un artista</button><button type="button" data-modo="cittadino" aria-pressed="false">Voglio vedere artisti</button></div>';
      h += '<label class="rr-campo" id="rr-campo-attivita">Cosa fai<select id="rr-attivita">' + ATTIVITA.map(function (a) { return '<option value="' + a[0] + '">' + a[1] + "</option>"; }).join("") + "</select></label>";
      h += '<p class="rr-aiuto" id="rr-aiuto">Tocca un punto della mappa o cerca una via: ti dico se puoi esibirti lì e a quali condizioni.</p>';
      h += '<div class="rr-gruppo"><div class="rr-gruppo-t">Zone</div>' + ESITI.map(function (e) {
        return voce(e.k, '<span class="rr-campione' + (e.k === "info" ? " tratteggio" : "") + '" style="color:' + COLORI[e.k] + '"></span>', e.t, e.k === "condizioni" ? null : conta[e.k] || 0);
      }).join("") + '<p class="rr-nota">Tratteggio = divieto da verificare (solo stampa) o non in vigore.</p><p class="rr-nota rr-zoom">Avvicinati per vedere le zone vicino a scuole, chiese, ospedali e monumenti.</p></div>';
      h += '<div class="rr-gruppo"><div class="rr-gruppo-t">Luoghi</div>' +
        voce("postazioni", '<span class="rr-punto" style="background:' + COLORI.solo_postazioni + '"></span>', "Postazioni e aree ufficiali", R.postazioni.length) +
        voce("esibizioni", '<span class="rr-segno-svg">' + svgIcona("artista") + "</span>", "Esibizioni in programma", R.esibizioni.length) + "</div>";
      h += '<p class="rr-fonti">Fonti: Regolamento arte di strada DAC 24/2012, delibere del Municipio I, dataset Art Spot (13/11/2026). © OpenStreetMap contributors (ODbL), MIM (IODL 2.0).</p>';
      el.innerHTML = h + "</div>";
      el.querySelector(".rr-testa").addEventListener("click", function () { var c = el.classList.toggle("chiuso"); this.setAttribute("aria-expanded", String(!c)); });
      el.addEventListener("click", function (e) {
        var b = e.target.closest("[data-modo]"); if (!b) return;
        R.modo = b.getAttribute("data-modo");
        el.querySelectorAll("[data-modo]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        document.getElementById("rr-campo-attivita").hidden = R.modo !== "artista";
        document.getElementById("rr-aiuto").textContent = R.modo === "artista"
          ? "Tocca un punto della mappa o cerca una via: ti dico se puoi esibirti lì e a quali condizioni."
          : "Tocca un punto o cerca una via: ti mostro chi si esibisce lì e dove trovare artisti vicino.";
        if (R.punto && schedaSrv.aperta) verifica(R.punto);
      });
      el.addEventListener("change", function (e) {
        var t = e.target;
        if (t.id === "rr-attivita") { R.attivita = t.value; if (R.punto && schedaSrv.aperta) verifica(R.punto); aggiornaZona(); return; }
        var k = t.getAttribute("data-livello"); if (!k) return;
        R.acceso[k] = t.checked; t.closest(".rr-voce").classList.toggle("spenta", !t.checked);
        if (k === "postazioni") disegnaPostazioni(); else if (k === "esibizioni") disegnaEsibizioni(); else if (k === "condizioni") disegnaCondizioni(); else disegnaZone();
      });
      document.getElementById("map-wrap").appendChild(el);
      colloca();
      window.matchMedia(MQ_TELEFONO).addEventListener("change", colloca);
    }
    function colloca() {
      var el = document.getElementById("rr-pannello"); if (!el) return;
      var foglio = document.querySelector("#livelli-foglio .foglio-corpo");
      if (suMobile() && foglio) { el.classList.add("nel-foglio"); foglio.insertBefore(el, foglio.firstChild); }
      else { el.classList.remove("nel-foglio"); document.getElementById("map-wrap").appendChild(el); }
    }

    // ---------------------------------------------------------------- via cercata e area aperta
    var zona = document.createElement("div");
    zona.id = "rr-zona"; zona.hidden = true; zona.setAttribute("aria-live", "polite");
    var infoVia = document.getElementById("info-via");
    infoVia.parentNode.insertBefore(zona, infoVia.nextSibling);

    function lineeDi(t) { var out = []; (function giu(x) { if (x && x.length && typeof x[0].lat === "number") out.push(x); else (x || []).forEach(giu); })(t.getLatLngs()); return out; }
    // Quali zone tocca una via: si controllano i vertici del tracciato (fitti nello stradario)
    function zoneLungo(linee) {
      var trovate = {};
      R.zone.forEach(function (f) {
        var p = f.properties; if (p.esito === "condizioni") return;
        var g = f.geometry;
        for (var i = 0; i < linee.length; i++) for (var j = 0; j < linee[i].length; j++) {
          var ll = linee[i][j];
          if (dentroGeometria(g, ll.lng, ll.lat)) { trovate[p.nome + "|" + p.esito] = p; return; }
        }
      });
      return Object.keys(trovate).map(function (k) { return trovate[k]; }).sort(function (a, b) { return b.priorita - a.priorita; });
    }
    function riga(p) { return '<span><span class="rr-campione' + (p.ufficiale ? "" : " tratteggio") + '" style="color:' + (COLORI[p.esito] || COLORI.info) + '"></span>' + esc(p.nome) + (p.ufficiale ? "" : " (da verificare)") + "</span>"; }
    function aggiornaZona() {
      if (!R.pronti) { zona.hidden = true; return; }
      var h = "";
      var via = viaAttiva && viaAttiva.traccia ? viaAttiva : null;
      if (via) {
        var lungo = zoneLungo(lineeDi(via.traccia));
        h += '<div class="rr-zona-t">Arte di strada lungo ' + esc(via.via.nome) + "</div>";
        h += '<p class="rr-zona-n">' + (lungo.length ? "La via attraversa " + lungo.length + (lungo.length === 1 ? " zona con regole speciali:" : " zone con regole speciali:") : "Nessuna zona con regole speciali lungo la via: valgono le regole generali.") + "</p>";
        if (lungo.length) h += '<div class="rr-righe">' + lungo.slice(0, 8).map(riga).join("") + "</div>";
        h += '<button type="button" class="rr-verifica-qui" data-centro="1">' + (R.modo === "artista" ? "Posso esibirmi qui?" : "Chi si esibisce qui?") + "</button>";
      } else if (R.areaProps) {
        var e = entryDiCodice(R.areaProps.codice), g = e && e.feature.geometry;
        if (g) {
          var b = e.layer.getBounds();
          var post = R.postazioni.filter(function (f) { var c = f.geometry.coordinates; return b.contains([c[1], c[0]]) && dentroGeometria(g, c[0], c[1]); });
          var es = R.esibizioni.filter(function (f) { var c = f.geometry.coordinates; return b.contains([c[1], c[0]]) && dentroGeometria(g, c[0], c[1]); });
          var vieta = R.zone.filter(function (f) { if (f.properties.esito === "condizioni") return false; var c = L.geoJSON(f).getBounds().getCenter(); return b.contains(c) && dentroGeometria(g, c.lng, c.lat); }).map(function (f) { return f.properties; });
          h += '<div class="rr-zona-t">Arte di strada in quest\'area</div>';
          h += '<p class="rr-zona-n"><b>' + post.length + "</b> postazioni o aree ufficiali · <b>" + es.length + "</b> esibizioni in programma" + (vieta.length ? " · <b>" + vieta.length + "</b> zone con regole speciali" : "") + "</p>";
          if (vieta.length) h += '<div class="rr-righe">' + vieta.slice(0, 6).map(riga).join("") + "</div>";
        }
      }
      zona.innerHTML = h; zona.hidden = !h;
    }
    zona.addEventListener("click", function (e) {
      if (!e.target.closest("[data-centro]") || !viaAttiva || !viaAttiva.traccia) return;
      verifica(viaAttiva.traccia.getCenter(), viaAttiva.via.nome);
    });
    var _tracciaVia = tracciaVia;
    tracciaVia = function () { var t = _tracciaVia.apply(this, arguments); setTimeout(aggiornaZona, 0); return t; };
    var _pulisciVia = pulisciVia;
    pulisciVia = function () { var r = _pulisciVia.apply(this, arguments); setTimeout(aggiornaZona, 0); return r; };
    var _mostraInfo = mostraInfo;
    mostraInfo = function (props) { var r = _mostraInfo.apply(this, arguments); R.areaProps = props || null; aggiornaZona(); return r; };
    var _deseleziona = deseleziona;
    deseleziona = function () { var r = _deseleziona.apply(this, arguments); R.areaProps = null; aggiornaZona(); return r; };

    // ---------------------------------------------------------------- testata e pannello "Cos'e'"
    function aggiornaTesta() {
      var ov = document.getElementById("overview-stats");
      var conta = function (esito) { return R.zone.filter(function (f) { return f.properties.esito === esito; }).length; };
      var voci = [
        { n: R.postazioni.filter(function (f) { return f.properties.tipo === "postazione_allegatoB"; }).length, l: "postazioni ufficiali" },
        { n: conta("no") + conta("solo_silenzio"), l: "zone con divieti" },
        { n: R.postazioni.filter(function (f) { return f.properties.tipo !== "postazione_allegatoB"; }).length, l: "aree dedicate" },
        { n: R.esibizioni.length, l: "esibizioni in programma" }
      ];
      if (ov) ov.innerHTML = voci.map(function (s) { return '<div class="stat"><span class="n">' + formattaNumero(s.n) + '</span><span class="l">' + s.l + "</span></div>"; }).join("");
      var btn = document.getElementById("about-btn");
      if (btn) btn.innerHTML = '<span class="ic">i</span> Come leggere la mappa';
      var pan = document.getElementById("about-panel");
      if (pan && !document.getElementById("rr-about")) {
        var a = document.createElement("div"); a.id = "rr-about";
        a.innerHTML = '<div class="ab-kicker">Arte di strada</div><h2>Come leggere questa mappa</h2>' +
          "<p>Nel Comune di Roma ci si può esibire quasi ovunque rispettando le regole generali del regolamento (DAC 24/2012): fasce orarie 10–13 e 16–20 (16–22 d'estate), al massimo 2 ore per fascia, 1 m² occupato, 2 m di marciapiede libero, preavviso al Gruppo di Polizia Locale 3 giorni prima. I colori segnano le eccezioni.</p>" +
          "<p><b style=\"color:" + COLORI.no + "\">Rosso</b>: vietato. <b style=\"color:" + COLORI.solo_silenzio + "\">Arancio</b>: solo esibizioni silenziose. <b style=\"color:" + COLORI.solo_postazioni + "\">Viola</b>: solo nelle postazioni numerate dell'Allegato B. <b style=\"color:" + COLORI.condizioni + "\">Ambra</b>: vicino a scuole, chiese, ospedali e monumenti valgono condizioni. <b style=\"color:" + COLORI.area_dedicata + "\">Verde</b>: aree dedicate (Municipio X, cartomanti, arti figurative). Il tratteggio indica divieti riportati solo dalla stampa: l'atto non è stato trovato.</p>" +
          "<p>Le posizioni delle postazioni sono stimate dalle planimetrie (±10–30 m) e i confini attorno a scuole e chiese sono stime: il regolamento dice «presso». Non sostituisce il regolamento né il parere del Municipio.</p>";
        var chiudi = pan.querySelector(".ab-close");
        pan.insertBefore(a, chiudi ? chiudi.nextSibling : pan.firstChild);
      }
    }

    // ---------------------------------------------------------------- 3D: zone e postazioni anche li'
    var mappe3d = [];
    window.addEventListener("rr:mappa3d", function (e) {
      var m = e.detail; if (!R.pronti || !m || mappe3d.indexOf(m) !== -1) return;
      try {
        m.addSource("rr-zone", { type: "geojson", data: { type: "FeatureCollection", features: R.zone.map(function (f) { return { type: "Feature", properties: { col: COLORI[f.properties.esito] || COLORI.info }, geometry: f.geometry }; }) } });
        m.addLayer({ id: "rr3-zone", type: "line", source: "rr-zone", paint: { "line-color": ["get", "col"], "line-width": 2.2, "line-opacity": 0.95 } });
        m.addSource("rr-postazioni", { type: "geojson", data: { type: "FeatureCollection", features: R.postazioni.map(function (f) { return { type: "Feature", properties: { nome: f.properties.nome }, geometry: f.geometry }; }) } });
        m.addLayer({ id: "rr3-postazioni", type: "circle", source: "rr-postazioni", paint: { "circle-color": COLORI.solo_postazioni, "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 16, 7], "circle-stroke-color": "#fff", "circle-stroke-width": 1.6 } });
        mappe3d.push(m);
      } catch (err) { if (window.console) console.warn("RomaRouter 3D:", err); }
    });

    // ---------------------------------------------------------------- caricamento
    Promise.all([getJson(API + "zone"), getJson(API + "postazioni"), getJson(API + "esibizioni").catch(function () { return { features: [] }; })])
      .then(function (r) {
        R.zone = r[0].features || []; R.postazioni = r[1].features || []; R.esibizioni = r[2].features || [];
        R.pronti = true;
        creaPannello(); aggiornaTesta(); disegnaTutto();
        if (selectedEntry) R.areaProps = selectedEntry.feature.properties;
        aggiornaZona();
        apriDaParametri();
        try { window.parent.postMessage({ tipo: "rr:mappa-pronta", sezione: "artisti-di-strada" }, location.origin); } catch { /* senza pagina ospite */ }
      })
      .catch(function (err) {
        if (window.console) console.error("RomaRouter arte di strada:", err);
        avviso("I dati sull'arte di strada non si sono caricati. Riprova tra poco.");
      });

    // ?lat=&lon=[&attivita=][&modo=cittadino] apre la verifica di un punto
    function apriDaParametri() {
      var q = new URLSearchParams(location.search);
      if (q.get("attivita") && ATTIVITA.some(function (a) { return a[0] === q.get("attivita"); })) { R.attivita = q.get("attivita"); document.getElementById("rr-attivita").value = R.attivita; }
      if (q.get("modo") === "cittadino") document.querySelector('[data-modo="cittadino"]').click();
      var lat = parseFloat(q.get("lat")), lon = parseFloat(q.get("lon"));
      if (isFinite(lat) && isFinite(lon)) { var ll = L.latLng(lat, lon); map.setView(ll, 17, { animate: false }); verifica(ll, q.get("etichetta")); }
    }
    // La pagina che ospita la mappa puo' chiedere la verifica di un punto (stessa origine)
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.tipo === "rr:esibizioni-aggiorna" && R.pronti) {   // un artista ha appena annunciato un'esibizione
        getJson(API + "esibizioni").then(function (fc) { R.esibizioni = fc.features || []; disegnaEsibizioni(); aggiornaTesta(); }).catch(function () {});
        return;
      }
      if (e.data.tipo !== "rr:verifica") return;
      var d = e.data;
      if (d.attivita) { R.attivita = d.attivita; var s = document.getElementById("rr-attivita"); if (s) s.value = d.attivita; }
      if (d.modo && d.modo !== R.modo) { var b = document.querySelector('[data-modo="' + d.modo + '"]'); if (b) b.click(); }
      var ll = L.latLng(d.lat, d.lon);
      map.flyTo(ll, 17, { duration: menoMoto() ? 0 : 0.8 });
      map.once("moveend", function () { verifica(ll, d.etichetta); });
    });
  })();
