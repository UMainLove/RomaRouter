/*
 * Il film intero: scene, cartelli, spazi per i video degli artisti, musica ed effetti.
 * Scaletta e tempi in tempi.ts e PRODUZIONE.md.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Cartello } from "./Cartello";
import { caricaFont } from "./font";
import { Antenne } from "./scene/Antenne";
import { Arte } from "./scene/Arte";
import { Finale } from "./scene/Finale";
import { Home } from "./scene/Home";
import { Lupa } from "./scene/Lupa";
import { Oggetti } from "./scene/Oggetti";
import { Sport } from "./scene/Sport";
import { Onda, Slot } from "./Slot";
import { C } from "./stile";
import { Suoni } from "./Suoni";
import { CUE_A, CUE_B, CUE_C, INIZIO_ARTISTI_1, INIZIO_ARTISTI_2, MUSICA, VIDEO_ARTISTI_1, VIDEO_ARTISTI_2 } from "./sorgenti";
import { CUE, f, FERMO_B, FPS, SLOT_A, SLOT_B, T } from "./tempi";

caricaFont();

/** Il cartello parte 0,6 s prima del capitolo: la strada lo copre tutto esattamente sul battere. */
const ANTICIPO = 0.6;
/** fotogrammi del tuffo nel telefono (la mappa sotto parte quando finisce il video) */
const TUFFO = 8;
/** dove sta lo schermo del telefono nell'ultimo fotogramma della prima parte */
const TELEFONO = { x: 0.447, y: 0.53 };
/** fotogrammi dell'onda che apre «La donna è mobile» */
const ONDA = 12;

export function Lancio() {
  const cartello = (sec: number) => f(sec - ANTICIPO);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 1. home sotto, lupa sopra (si apre a cerchio) */}
      <Sequence from={f(T.home)} durationInFrames={f(T.oggetti - T.home) + 2}>
        <Home durata={f(T.oggetti - T.home)} />
      </Sequence>
      <Sequence durationInFrames={f(T.rivela) + 30}>
        <Lupa />
      </Sequence>

      {/* 2. i capitoli */}
      <Sequence from={f(T.oggetti)} durationInFrames={f(T.sport - T.oggetti) + 2}>
        <Oggetti />
      </Sequence>
      <Sequence from={f(T.sport)} durationInFrames={f(T.arteCartello - T.sport) + 2}>
        <Sport />
      </Sequence>
      {/* «La donna è mobile» sotto; sopra gli artisti che si aprono a onda sul suo primo fotogramma */}
      <Sequence from={f(T.slotB)} durationInFrames={f(SLOT_B + FERMO_B) + 2}>
        <Slot titolo="Video artisti · parte 2" durata={f(SLOT_B)} file={VIDEO_ARTISTI_2} inizio={f(INIZIO_ARTISTI_2)} coda={f(FERMO_B) + 2} />
      </Sequence>
      <Sequence from={f(T.arte)} durationInFrames={f(T.arteDurata) + ONDA}>
        <Onda da={f(T.arteDurata)} durata={ONDA} cx={960} cy={540} colore={C.arte}>
          <Arte durata={f(T.arteDurata)} />
        </Onda>
      </Sequence>
      {/* la prima parte sopra la mappa degli artisti: si entra nel telefono e se ne esce sulla mappa vera */}
      <Sequence from={f(T.slotA)} durationInFrames={f(SLOT_A) + TUFFO}>
        <Slot titolo="Video artisti · parte 1" durata={f(SLOT_A)} file={VIDEO_ARTISTI_1} inizio={f(INIZIO_ARTISTI_1)} tuffo={TELEFONO} coda={TUFFO} />
      </Sequence>
      <Sequence from={f(T.antenne)} durationInFrames={f(T.antenneDurata) + 2}>
        <Antenne />
      </Sequence>
      <Sequence from={f(T.finale)} durationInFrames={f(T.finaleDurata)}>
        <Finale durata={f(T.finaleDurata)} />
      </Sequence>

      {/* 3. i cartelli, sopra a tutto */}
      <Sequence from={cartello(T.oggetti)} durationInFrames={f(ANTICIPO + 2)}>
        <Cartello ambito="oggetti" durata={f(ANTICIPO + 2)} />
      </Sequence>
      <Sequence from={cartello(T.sport)} durationInFrames={f(ANTICIPO + 2)}>
        <Cartello ambito="sport" durata={f(ANTICIPO + 2)} />
      </Sequence>
      <Sequence from={cartello(T.arteCartello)} durationInFrames={f(T.slotA - T.arteCartello + ANTICIPO)}>
        <Cartello ambito="arte" durata={f(T.slotA - T.arteCartello + ANTICIPO) + 14} />
      </Sequence>
      <Sequence from={cartello(T.antenne)} durationInFrames={f(ANTICIPO + 2)}>
        <Cartello ambito="antenne" durata={f(ANTICIPO + 2)} />
      </Sequence>

      {/* 4. musica: tre cue, ferma durante i video degli artisti */}
      {MUSICA && (
        <>
          <Sequence from={f(CUE.a)} durationInFrames={f(T.slotA) + 6}>
            <Audio src={staticFile(CUE_A)} />
          </Sequence>
          <Sequence from={f(CUE.b)} durationInFrames={f(T.arteDurata)}>
            <Audio src={staticFile(CUE_B)} />
          </Sequence>
          <Sequence from={f(CUE.c)}>
            <Audio src={staticFile(CUE_C)} />
          </Sequence>
          <Suoni
            eventi={[T.oggetti, T.sport, T.arteCartello, T.antenne].map((s) => ({ f: cartello(s) - 2, tipo: "fruscio" as const }))}
            volume={0.9}
          />
        </>
      )}
    </AbsoluteFill>
  );
}

export const DURATA_LANCIO = f(T.fine);
export { FPS };
