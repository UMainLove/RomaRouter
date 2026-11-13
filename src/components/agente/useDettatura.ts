"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Dettatura con la Web Speech API del browser (Chrome, Edge, Safari), in italiano.
// È il ripiego senza chiavi: con ElevenLabs si sostituisce solo questo hook.

interface RisultatoRiconoscimento {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Riconoscitore {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RisultatoRiconoscimento) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type CostruttoreRiconoscitore = new () => Riconoscitore;

function costruttore(): CostruttoreRiconoscitore | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: CostruttoreRiconoscitore;
    webkitSpeechRecognition?: CostruttoreRiconoscitore;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const nessunaIscrizione = () => () => {};

export type StatoDettatura = "non-disponibile" | "pronta" | "ascolto";

export function useDettatura(suTesto: (testo: string) => void) {
  // Sul server e al primo render la dettatura risulta non disponibile; nel browser si verifica davvero.
  const disponibile = useSyncExternalStore(nessunaIscrizione, () => costruttore() !== null, () => false);
  const [ascolto, setAscolto] = useState(false);
  const rif = useRef<Riconoscitore | null>(null);
  const callback = useRef(suTesto);

  useEffect(() => {
    callback.current = suTesto;
  }, [suTesto]);

  useEffect(() => () => rif.current?.stop(), []);

  const avvia = useCallback(() => {
    const C = costruttore();
    if (!C) return;
    if (ascolto) {
      rif.current?.stop();
      return;
    }
    const r = new C();
    r.lang = "it-IT";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const testo = e.results[0]?.[0]?.transcript?.trim();
      if (testo) callback.current(testo);
    };
    r.onend = () => setAscolto(false);
    r.onerror = () => setAscolto(false);
    rif.current = r;
    setAscolto(true);
    r.start();
  }, [ascolto]);

  const stato: StatoDettatura = !disponibile ? "non-disponibile" : ascolto ? "ascolto" : "pronta";
  return { stato, avvia };
}
