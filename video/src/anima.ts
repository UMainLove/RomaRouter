import { Easing, interpolate } from "remotion";

export const morbida = Easing.bezier(0.45, 0, 0.15, 1); // entra e si posa
export const uscita = Easing.bezier(0.7, 0, 0.84, 0);
export const arrivo = Easing.bezier(0.16, 1, 0.3, 1); // veloce poi lentissima (expo out)

/** Interpola fra fotogrammi chiave [fotogramma, valore], con una curva per tratto. */
export function kf(frame: number, chiavi: Array<[number, number]>, curva = morbida): number {
  if (chiavi.length === 1) return chiavi[0][1];
  return interpolate(
    frame,
    chiavi.map((c) => c[0]),
    chiavi.map((c) => c[1]),
    { easing: curva, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

/** 0→1 fra a e b. */
export const tra = (frame: number, a: number, b: number, curva = morbida) =>
  interpolate(frame, [a, b], [0, 1], { easing: curva, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Interpola oggetti di numeri (cornici, camere) fra fotogrammi chiave. */
export function kfo<T extends Record<string, number | undefined>>(frame: number, chiavi: Array<[number, T]>, curva = morbida): T {
  const out: Record<string, number> = {};
  const nomi = new Set(chiavi.flatMap(([, o]) => Object.keys(o)));
  for (const n of nomi) {
    const punti = chiavi.filter(([, o]) => o[n] !== undefined).map(([fr, o]) => [fr, o[n] as number] as [number, number]);
    out[n] = kf(frame, punti, curva);
  }
  return out as T;
}
