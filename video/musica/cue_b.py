"""Cue B (36 s, da 99 a 135): Artisti di strada. Mandolino in terzine, fisarmonica, chitarra, tamburello."""
from __future__ import annotations

import sys

import numpy as np

from brani import basso, rullo, spazi
from sintesi import (ACC, BEAT, Mix, battimani, corda, fade, fisarmonica, hz, mandolino, master, salita, scrivi_wav,
                     shaker, tamburello, tempo, tom)

DURATA = 36.0
PROG = [(2.0 * i, c) for i, c in enumerate(["Dm", "Bb", "F", "C"] * 4 + ["Gm", "A7"])]
MANDOLINO = {"Dm": ["D4", "F4", "A4", "D5"], "Bb": ["D4", "F4", "Bb4", "D5"], "F": ["C4", "F4", "A4", "C5"],
             "C": ["C4", "E4", "G4", "C5"], "Gm": ["D4", "G4", "Bb4", "D5"], "A7": ["C#4", "E4", "G4", "A4"]}
SCHEMA = (0, 1, 2, 3, 2, 1)


def componi() -> Mix:
    m = Mix(DURATA)
    # fisarmonica: gli accordi, sempre, che crescono
    for a, b, nome in spazi(PROG, 0.0, DURATA):
        note = ACC[nome]["pad"][2:5] if nome not in ("Gm", "A7") else ACC[nome]["pad"][1:4]
        g = 0.2 if a < 8 else 0.26
        m.add("letto", a, fisarmonica(note, b - a + 0.12, 1.0, m.seme()), g, sala=0.35)
    # mandolino in terzine (12/8 sopra il 4/4): il colore di strada
    k = 0
    while True:
        t = k * BEAT / 3
        if t >= DURATA - 1e-9:
            break
        nome = [c for t0, c in PROG if t0 <= t + 1e-9][-1]
        nota = MANDOLINO[nome][SCHEMA[k % len(SCHEMA)]]
        v = 1.0 if k % 3 == 0 else 0.68
        cresce = 0.75 + 0.25 * min(1.0, t / 16)
        m.add("letto", t, mandolino(hz(nota), 0.9, v, m.seme()), 0.42 * v * cresce, pan=0.3 if k % 2 else -0.1, sala=0.3)
        k += 1
    # chitarra: accordi stoppati sul 2 e sul 4, da battuta 4
    for i in range(4 * 4, int(DURATA / BEAT)):
        if i % 2 == 1:
            t = i * BEAT
            nome = [c for t0, c in PROG if t0 <= t + 1e-9][-1]
            for j, nota in enumerate(ACC[nome]["arpb"]):
                m.add("letto", t + j * 0.011, corda(hz(nota), 0.35, 0.8, t60=0.22, luce=0.45, seed=m.seme()), 0.22, pan=-0.45, sala=0.2)
    # ritmo da battuta 4: cassa morbida sull'1 e sul 3, battimani sul 2 e sul 4, basso
    for i in range(16, int(DURATA / BEAT)):
        t = i * BEAT
        if i % 2 == 0:
            m.cassa(t, 0.72)
        else:
            m.add("batt", t, battimani(0.4, m.seme()), 1.0, sala=0.35)
    basso(m, PROG, 8.0, DURATA, g=0.55)
    for a, b, nome in spazi(PROG, 8.0, DURATA):  # basso pizzicato: fondamentale sull'1, quinta sul 3 in levare
        f = hz(ACC[nome]["basso"]) * 2
        m.add("basso", a, corda(f, 0.9, 1.0, t60=0.7, luce=0.35, seed=m.seme()), 0.5)
        m.add("basso", a + 1.25, corda(f * 1.5, 0.6, 0.8, t60=0.6, luce=0.35, seed=m.seme()), 0.4)
    # tamburello in ottavi da battuta 8, shaker da battuta 12
    for i in range(32, int(DURATA / 0.25)):
        t = i * 0.25
        m.add("batt", t, tamburello(0.21 if i % 2 else 0.12, m.seme()), 1.0, pan=0.4, sala=0.2)
    for i in range(int(24 / 0.125), int(DURATA / 0.125)):
        m.add("batt", i * 0.125, shaker(0.09 if i % 2 else 0.05, m.seme()), 1.0, pan=-0.35)
    # accenti ogni 4 s dal secondo 2
    for k in range(9):
        ta = 2.0 + 4 * k
        m.add("batt", ta, tamburello(0.6, m.seme(), 0.45), 0.8, pan=0.2, sala=0.3)
        m.add("batt", ta, tom(88, 0.6, m.seme()), 0.55, sala=0.2)
    # la salita che si stacca netta a 36,000: dopo canta la ragazza
    m.add("fx", 33.0, salita(3.0, 1.0, 300, 9000, tono="A3", seed=m.seme()), 0.32)
    rullo(m, 34.0, DURATA, g=0.4)
    return m


def chiudi(m: Mix) -> np.ndarray:
    x = m.render()
    t = tempo(x.shape[1])
    x *= np.clip(t / 1.0, 0, 1) ** 1.5  # entra in dissolvenza di 1 s
    return fade(x, 0.0, 0.004)  # stacco netto (4 ms per non fare clic)


if __name__ == "__main__":
    y = master(chiudi(componi()), -16.0, -1.0)
    scrivi_wav(sys.argv[1] if len(sys.argv) > 1 else "../public/musica/cue-b.wav", y)
