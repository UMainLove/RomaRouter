"use client";

import { useEffect, useMemo, useState } from "react";
import { INDIRIZZI_ESEMPIO, ZONE } from "@/data/esempi";
import { distanzaMetri, normalizza } from "@/lib/geo";
import {
  MACRO_AREE,
  type CategoriaPuntoRiconsegna,
  type PuntoRiconsegnaPubblico,
} from "@/lib/oggetti/costanti";
import { BarraAgente } from "../agente/BarraAgente";
import { Mappa } from "../mappa/Mappa";
import { PUNTO_UFFICIO, type PuntoMappa } from "../mappa/punti";
import { useFiltri } from "../vista/Filtri";
import { VistaAmbito } from "../vista/VistaAmbito";
import { AccessoOggetti, type ContattoMagicLinkClient, type SessioneClient } from "./AccessoOggetti";
import {
  ElencoPuntiRiconsegna,
  type CentroPosizione,
  type PuntoRiconsegnaConDistanza,
} from "./ElencoPuntiRiconsegna";
import { PannelloPerso } from "./PannelloPerso";
import { PannelloTrovato } from "./PannelloTrovato";

type Scheda = "perso" | "trovato";

const RAGGIO_RICONSEGNA_M = 2500;
const CENTRO_DEFAULT_ROMA: CentroPosizione = {
  lat: 41.8959,
  lon: 12.4823,
  etichetta: "Piazza Venezia (centro Roma)",
  esatto: false,
};

function geocodificaLuogo(testo: string): CentroPosizione | null {
  const t = normalizza(testo);
  if (!t) return null;
  for (const [chiave, ind] of Object.entries(INDIRIZZI_ESEMPIO)) {
    if (t.includes(chiave) || chiave.includes(t)) return { ...ind, esatto: true };
  }
  for (const [chiave, z] of Object.entries(ZONE)) {
    if (t.includes(chiave)) return { etichetta: z.nome, lat: z.lat, lon: z.lon, esatto: false };
  }
  for (const [chiave, z] of Object.entries(MACRO_AREE)) {
    if (chiave !== "altro" && (t.includes(normalizza(chiave)) || t.includes(normalizza(z.nome)))) {
      return { etichetta: z.nome, lat: z.lat, lon: z.lon, esatto: false };
    }
  }
  return null;
}

export function VistaOggetti() {
  const { parametri, imposta, azzera } = useFiltri("/oggetti");
  const schedaIniziale = parametri.get("scheda");
  const scheda: Scheda = schedaIniziale === "trovato" ? "trovato" : "perso";

  const categoria = parametri.get("categoria") ?? "";
  const zona = parametri.get("zona") ?? "";
  const soloH24 = parametri.get("h24") === "1";
  const indirizzoUrl = parametri.get("indirizzo") ?? "";
  const latUrl = Number(parametri.get("lat"));
  const lonUrl = Number(parametri.get("lon"));
  const firma = `${indirizzoUrl}|${parametri.get("lat") ?? ""}|${parametri.get("lon") ?? ""}`;

  const [sessione, setSessione] = useState<SessioneClient | null>(null);
  const [contattoMagicLink, setContattoMagicLink] = useState<ContattoMagicLinkClient | null>(null);
  const [refreshSessione, setRefreshSessione] = useState(0);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [testoFiltro, setTestoFiltro] = useState("");
  const [puntiDb, setPuntiDb] = useState<PuntoRiconsegnaPubblico[]>([]);
  const [caricamentoPunti, setCaricamentoPunti] = useState(true);
  const [errorePunti, setErrorePunti] = useState<string | null>(null);
  const [posizione, setPosizione] = useState<{ luogo: CentroPosizione; firma: string } | null>(null);
  const [errorePosizione, setErrorePosizione] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    fetch("/api/oggetti/punti", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Errore caricamento punti (${res.status})`);
        return res.json() as Promise<{ punti: PuntoRiconsegnaPubblico[] }>;
      })
      .then((dati) => {
        if (!attivo) return;
        setPuntiDb(Array.isArray(dati.punti) ? dati.punti : []);
        setErrorePunti(null);
      })
      .catch((err) => {
        if (!attivo) return;
        setErrorePunti(err instanceof Error ? err.message : "Impossibile caricare i punti di riconsegna.");
      })
      .finally(() => {
        if (attivo) setCaricamentoPunti(false);
      });
    return () => {
      attivo = false;
    };
  }, []);

  // Se il permesso GPS è già concesso dal browser, aggancia automaticamente la posizione esatta
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions) return;
    let attivo = true;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((stato) => {
        if (!attivo || stato.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          (p) => {
            if (!attivo) return;
            setPosizione((prev) =>
              prev ?? {
                luogo: {
                  lat: p.coords.latitude,
                  lon: p.coords.longitude,
                  etichetta: "La tua posizione esatta",
                  esatto: true,
                  precisioneMetri: p.coords.accuracy,
                },
                firma,
              },
            );
          },
          () => {},
          { enableHighAccuracy: true, timeout: 6000 },
        );
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, [firma]);

  const centroEsatto = useMemo<CentroPosizione | null>(() => {
    if (posizione && posizione.firma === firma) return posizione.luogo;
    if (latUrl && lonUrl) return { lat: latUrl, lon: lonUrl, etichetta: "Posizione esatta sulla mappa", esatto: true };
    return indirizzoUrl ? geocodificaLuogo(indirizzoUrl) : null;
  }, [posizione, firma, latUrl, lonUrl, indirizzoUrl]);

  const centroRiferimento = centroEsatto ?? CENTRO_DEFAULT_ROMA;

  const puntiFiltrati = useMemo<PuntoRiconsegnaConDistanza[]>(() => {
    const qNorm = normalizza(testoFiltro);
    const base = puntiDb.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (zona && p.macroArea !== zona) return false;
      if (soloH24 && !p.h24) return false;
      if (qNorm) {
        const testo = normalizza(`${p.nome} ${p.ente} ${p.indirizzo} ${p.zonaNome} ${p.municipio} ${p.note ?? ""}`);
        if (!testo.includes(qNorm)) return false;
      }
      return true;
    });

    const conDistanza = base.map((p) => ({
      ...p,
      distanza: distanzaMetri(centroRiferimento, p),
    }));

    conDistanza.sort((a, b) => a.distanza - b.distanza);
    return conDistanza;
  }, [puntiDb, categoria, zona, soloH24, testoFiltro, centroRiferimento]);

  const conteggiCategoria = useMemo(() => {
    const counts: Partial<Record<CategoriaPuntoRiconsegna, number>> = {};
    for (const p of puntiDb) {
      counts[p.categoria] = (counts[p.categoria] ?? 0) + 1;
    }
    return counts;
  }, [puntiDb]);

  const conteggioMisericordieH24 = useMemo(
    () => puntiDb.filter((p) => p.categoria === "misericordia" && p.h24).length,
    [puntiDb],
  );

  const puntiMappa = useMemo<PuntoMappa[]>(() => {
    if (!puntiFiltrati.length && caricamentoPunti) return [PUNTO_UFFICIO];
    return puntiFiltrati.map((p) => ({
      id: p.id,
      ambito: "oggetti",
      nome: p.nome,
      dettaglio: `${p.indirizzo} · ${p.orari}`,
      href: "/oggetti#punti-riconsegna",
      lat: p.lat,
      lon: p.lon,
    }));
  }, [puntiFiltrati, caricamentoPunti]);

  const cambiaScheda = (prossima: Scheda) => {
    imposta({ scheda: prossima === "perso" ? null : prossima });
  };

  const usaPosizione = () => {
    if (!navigator.geolocation) {
      setErrorePosizione("Il browser non permette di usare la posizione: inserisci la tua via esatta nel campo qui sotto.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setErrorePosizione(null);
        setPosizione({
          luogo: {
            lat: p.coords.latitude,
            lon: p.coords.longitude,
            etichetta: "La tua posizione esatta",
            esatto: true,
            precisioneMetri: p.coords.accuracy,
          },
          firma,
        });
      },
      () => setErrorePosizione("Posizione GPS non disponibile: controlla i permessi del browser oppure scrivi la tua via nello stradario qui sotto."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const suMappa = (id: string) => {
    setSelezionato(id);
  };

  const suElenco = (id: string) => {
    setSelezionato((prev) => (prev === id ? null : id));
  };

  return (
    <VistaAmbito
      voceId="oggetti"
      barra={<BarraAgente voceId="oggetti" />}
      mappa={
        <Mappa
          titolo="Mappa dei luoghi dove riconsegnare oggetti smarriti a Roma"
          punti={puntiMappa}
          selezionato={selezionato}
          onSeleziona={suMappa}
          centro={centroEsatto}
          raggioMetri={centroEsatto ? RAGGIO_RICONSEGNA_M : undefined}
        />
      }
    >
      <div className="flex flex-col gap-2 rounded-panel border border-line bg-bg-sink p-2.5">
        <div role="tablist" aria-label="Funzioni del servizio Oggetti smarriti" className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={scheda === "perso"}
            onClick={() => cambiaScheda("perso")}
            className={`min-h-11 rounded-card px-2.5 text-xs font-bold sm:text-sm ${
              scheda === "perso" ? "bg-amaranto text-white" : "bg-panel text-ink hover:border-campo"
            }`}
          >
            Ho perso (protetto)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scheda === "trovato"}
            onClick={() => cambiaScheda("trovato")}
            className={`min-h-11 rounded-card px-2.5 text-xs font-bold sm:text-sm ${
              scheda === "trovato" ? "bg-oggetti text-white" : "bg-panel text-ink hover:border-campo"
            }`}
          >
            Ho trovato
          </button>
        </div>
      </div>

      {scheda === "perso" && (
        <div className="flex flex-col gap-4">
          <AccessoOggetti
            refreshKey={refreshSessione}
            onCambioSessione={setSessione}
            onCambioContattoMagicLink={setContattoMagicLink}
          />
          <PannelloPerso
            sessione={sessione}
            contattoMagicLink={contattoMagicLink}
            onRegistrata={() => setRefreshSessione((n) => n + 1)}
          />
        </div>
      )}

      {scheda === "trovato" && (
        <div className="flex flex-col gap-4">
          <AccessoOggetti
            refreshKey={refreshSessione}
            onCambioSessione={setSessione}
            onCambioContattoMagicLink={setContattoMagicLink}
          />
          <PannelloTrovato
            sessione={sessione}
            onRegistrato={() => setRefreshSessione((n) => n + 1)}
          />
        </div>
      )}

      <ElencoPuntiRiconsegna
        punti={puntiFiltrati}
        totaleComplessivo={puntiDb.length}
        conteggiCategoria={conteggiCategoria}
        conteggioMisericordieH24={conteggioMisericordieH24}
        caricamento={caricamentoPunti}
        erroreCaricamento={errorePunti}
        selezionato={selezionato}
        onSeleziona={suElenco}
        categoria={categoria}
        zona={zona}
        soloH24={soloH24}
        testoFiltro={testoFiltro}
        onCategoria={(v) => imposta({ categoria: v || null })}
        onZona={(v) => imposta({ zona: v || null })}
        onSoloH24={() => imposta({ h24: soloH24 ? null : "1" })}
        onTestoFiltro={setTestoFiltro}
        onAzzeraFiltri={() => {
          setTestoFiltro("");
          azzera(["categoria", "zona", "h24"]);
        }}
        centro={centroRiferimento}
        haPosizioneEsatta={Boolean(centroEsatto?.esatto)}
        errorePosizione={errorePosizione}
        onUsaPosizione={usaPosizione}
        onScegliIndirizzoEsatto={(scelta) => {
          setErrorePosizione(null);
          setPosizione({
            luogo: {
              lat: scelta.lat,
              lon: scelta.lon,
              etichetta: scelta.etichetta,
              esatto: true,
            },
            firma,
          });
        }}
        onTogliPosizione={() => {
          setPosizione(null);
          imposta({ indirizzo: null, lat: null, lon: null });
        }}
      />
    </VistaAmbito>
  );
}
