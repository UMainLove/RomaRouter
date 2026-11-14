import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { MUSICA, SFX } from "./sorgenti";

/** Clic e tasti nei tempi giusti (fotogrammi della scena). */
export function Suoni({ eventi, volume = 1 }: { eventi: Array<{ f: number; tipo: "clic" | "tasti" | "fruscio" }>; volume?: number }) {
  if (!MUSICA) return null;
  return (
    <>
      {eventi.map((e, i) => (
        <Sequence key={i} from={e.f} durationInFrames={e.tipo === "fruscio" ? 30 : 8} layout="none">
          <Audio src={staticFile(SFX[e.tipo])} volume={volume * (e.tipo === "tasti" ? 0.8 : 1)} />
        </Sequence>
      ))}
    </>
  );
}
