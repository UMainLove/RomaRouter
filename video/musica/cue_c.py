"""Cue C (49 s, da 139 a 188): 04 Antenne e il finale con il logo a 38,000."""
from __future__ import annotations

import sys

import numpy as np

from brani import arpeggio, basso, groove_sport, melodia, pads, rullo, spazi, sub
from sintesi import (ACC, Mix, battimani, bronzo, charleston, eco, epiano, fade, hz, impatto, master, ns, ottoni, piatto, ping,
                     salita, scrivi_wav, seno, tappeto, tempo, timpano, tom)

DURATA = 49.0
ANTENNE = [(0, "Dm"), (4, "Bb"), (8, "Dm"), (12, "Bb"), (16, "Gm"), (20, "Bb"), (24, "Gm"), (28, "Csus"), (29, "C")]
FINALE = [(30, "F"), (32, "C"), (34, "Dm"), (36, "Bb")]
PEDALE = (0, 0, 1, 0, 2, 0, 1, 3)


def componi() -> Mix:
    m = Mix(DURATA)
    rng = np.random.default_rng(41)

    # ------------------------------------------------------------- 0-30: antenne
    pads(m, ANTENNE, 0.0, 30.0, fc=lambda t: 700 + 1000 * t / 30, g=0.42, att=0.8, rel=0.6)
    arpeggio(m, ANTENNE, 0.0, 29.5, g=0.27, fc_alto=lambda t: 600 + 1500 * t / 30, schema=PEDALE, tau_a=0.18, sala=0.2)
    basso(m, ANTENNE, 0.0, 16.0, g=0.45)
    basso(m, ANTENNE, 16.0, 29.5, g=0.55, stile="pulsato")
    for k in range(8):  # il ping del radar ogni due battute
        tp = 4.0 * k
        s = eco(ping(hz("A6" if k % 2 == 0 else "D7"), 1.0, m.seme()), 0.375, 0.42, 6)
        m.add("fx", tp, s, 0.21, sala=0.35)
    t = 8.0
    while t < 29.9:  # dati: piccoli bip sopra la voce
        if rng.random() < 0.18:
            n = ns(0.014)
            b = seno(rng.uniform(5200, 8200), n) * np.hanning(n)
            m.add("fx", t, b, 0.035, pan=float(rng.uniform(-0.8, 0.8)))
        t += 0.125
    for i in range(int(8 / 0.125), int(29.5 / 0.125)):  # charleston in sedicesimi
        tt = i * 0.125
        v = (0.3, 0.14, 0.22, 0.14)[i % 4] * (0.7 + 0.3 * tt / 30)
        m.add("batt", tt, charleston(v, False, m.seme()), 1.0, pan=0.3)
    for i in range(12, 15):  # cassa sull'1, poi in quattro
        m.cassa(i * 2.0, 0.8)
    for i in range(40, 59):
        m.cassa(i * 0.5, 0.85)
        if i % 2 == 1:
            m.add("batt", i * 0.5, battimani(0.35, m.seme()), 1.0, sala=0.3)
    m.add("fx", 26.0, salita(4.0, 1.0, 200, 9500, tono="C3", seed=m.seme()), 0.34)
    rullo(m, 28.0, 30.0, g=0.42)
    for j, f in enumerate((180, 150, 120, 95)):
        m.add("batt", 29.0 + j * 0.25, tom(f, 0.7, m.seme()), 0.5, pan=0.5 - 0.33 * j, sala=0.2)

    # ------------------------------------------------------------- 30-38: il finale
    m.add("fx", 30.0, impatto(0.9, 3.0, m.seme()), 0.7, grande=0.3)
    m.add("fx", 30.0, piatto(0.8, 3.0, m.seme()), 0.36, sala=0.3)
    m.add("fx", 30.0, bronzo(hz("F3"), 3.5, 0.9, 0.9, m.seme()), 0.2, grande=0.4)
    pads(m, FINALE, 30.0, 38.0, fc=2800, g=0.42, att=0.1, rel=0.4)
    for a, b, nome in spazi(FINALE, 30.0, 38.0):
        m.add("melodia", a, ottoni(ACC[nome]["pad"][1:4], b - a + 0.1, 0.85, att=0.25, seed=m.seme()), 0.2, sala=0.4)
    arpeggio(m, FINALE, 30.0, 37.75, alto=True, g=0.26, fc_alto=3300, sala=0.3)
    basso(m, FINALE, 30.0, 37.75, g=0.5, stile="ottavi")
    groove_sport(m, 30.0, 37.5, g=0.9)
    rullo(m, 37.0, 38.0, g=0.45)
    m.add("fx", 36.0, salita(2.0, 1.0, 300, 10000, tono="F3", seed=m.seme()), 0.34)
    tema = [("A4", 1.5), ("C5", 0.5), ("F5", 1), ("E5", 1), ("G4", 1.5), ("C5", 0.5), ("E5", 1), ("D5", 1),
            ("F4", 1.5), ("A4", 0.5), ("D5", 1), ("C5", 1), ("D5", 1.5), ("C5", 0.5), ("Bb4", 1), ("C5", 1)]
    melodia(m, 30.0, tema, g=0.46)
    melodia(m, 30.0, tema, g=0.14, ottava=1, sala=0.6)

    # ------------------------------------------------------------- 38,000: il logo
    m.add("fx", 38.0, impatto(1.0, 4.5, m.seme()), 0.9, grande=0.45)
    m.add("fx", 38.0, bronzo(hz("F3"), 7.0, 1.0, 0.9, m.seme()), 0.4, grande=0.55)
    m.add("fx", 38.0, bronzo(hz("C5"), 4.0, 1.0, 1.0, m.seme()), 0.12, grande=0.5)
    m.add("batt", 38.0, timpano(hz("F2"), 1.0, 3.0, m.seme()), 0.6, grande=0.25)
    m.add("fx", 38.0, piatto(1.0, 4.5, m.seme()), 0.38, sala=0.3)
    m.cassa(38.0, 1.0, morbida=False)
    m.add("letto", 38.0, tappeto(["F2", "C3", "F3", "A3", "C4", "G4", "A4"], 10.5, fc=2800, att=0.02, rel=8.5, voci=7, seed=m.seme()), 0.55, sala=0.5)
    m.add("melodia", 38.0, ottoni(["F3", "C4", "F4", "A4"], 3.0, 0.95, att=0.06, seed=m.seme()), 0.26, sala=0.5)
    for nota in ("F4", "A4", "C5", "F5"):
        m.add("melodia", 38.0, epiano(hz(nota), 6.0, 0.9, m.seme()), 0.22, sala=0.5)
    m.add("basso", 38.0, sub(hz("F2"), 6.0, 1.0) * np.exp(-tempo(ns(6.0)) / 1.6), 0.6)
    for ts, nota, g in ((40.0, "A6", 0.07), (42.5, "C7", 0.05)):
        m.add("fx", ts, bronzo(hz(nota), 2.5, 1.0, 1.0, m.seme()), g, sala=0.7)
    return m


def chiudi(m: Mix) -> np.ndarray:
    x = m.render()
    t = tempo(x.shape[1])
    x *= np.where(t < 38.0, 10 ** ((np.clip((t - 30.0) / 8.0, 0, 1) * 2.5 - 2.5) / 20), 1.0)  # crescendo verso il logo
    coda = np.clip((49.0 - t) / 2.6, 0, 1)
    x *= np.where(t > 46.4, 0.5 - 0.5 * np.cos(np.pi * coda), 1.0)
    return fade(x, 0.005, 0.01)


if __name__ == "__main__":
    y = master(chiudi(componi()), -16.0, -1.0)
    scrivi_wav(sys.argv[1] if len(sys.argv) > 1 else "../public/musica/cue-c.wav", y)
