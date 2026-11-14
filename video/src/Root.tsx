import React from "react";
import { Composition } from "remotion";
import { DURATA_LANCIO, FPS, Lancio } from "./Lancio";
import { H, W } from "./tempi";

export function Root() {
  return <Composition id="Lancio" component={Lancio} durationInFrames={DURATA_LANCIO} fps={FPS} width={W} height={H} />;
}
