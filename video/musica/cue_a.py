"""Cue A (0-84 s): la lupa, la home, 01 Oggetti smarriti, 02 Impianti sportivi, cartello 03 Artisti."""
from __future__ import annotations

import sys

import numpy as np

from brani import arpeggio, basso, groove_letto, groove_sport, melodia, pads, sub
from sintesi import (Mix, bronzo, conga, eq, fade, fruscio, hz, impatto, lp_var, master, ns, ottoni, piatto,
                     risucchio, salita, scrivi_wav, tappeto, tempo, timpano, tom)

DURATA = 84.0
TEMA = [("A4", 1.5), ("D5", 0.5), ("F5", 1), ("E5", 1)]


def quattro(t0, n_giri, giro=("Dm", "Bb", "F", "C")):
    return [(t0 + 8 * i + 2 * j, c) for i in range(n_giri) for j, c in enumerate(giro)]


def componi() -> Mix:
    m = Mix(DURATA)

    # ------------------------------------------------------------- 0-6: la lupa, tempo libero
    m.add("letto", 0.0, tappeto(["D2", "A2", "D3"], 6.4, fc=520, att=1.6, rel=0.5, det=9, seed=m.seme()), 0.6, sala=0.4)
    m.add("letto", 0.4, tappeto(["F3", "A3", "E4"], 5.9, fc=850, att=2.6, rel=0.5, det=10, seed=m.seme()), 0.22, sala=0.5)
    s = sub(hz("D2"), 6.05, 1.0) * np.minimum(1, tempo(ns(6.05)) / 1.5)
    m.add("basso", 0.0, s, 0.3)
    # aria della sera
    n = ns(6.2)
    t = tempo(n)
    rng = np.random.default_rng(3)
    aria = lp_var(eq(rng.standard_normal((2, n)), ("hp", 300)), 900 + 500 * np.sin(2 * np.pi * 0.35 * t), 0.7, 256)
    m.add("fx", 0.0, aria * np.minimum(1, t / 1.2) * np.minimum(1, (6.2 - t) / 0.3), 0.05)
    # il galoppo (0,75-3,76): tre colpi per falcata, sempre piu' forte
    falcate = [0.75, 1.21, 1.66, 2.10, 2.54, 2.99, 3.47]
    for i, f0 in enumerate(falcate):
        v = 0.45 + 0.5 * i / (len(falcate) - 1)
        for off, a, nota in ((0.0, 0.55, "A1"), (0.085, 0.7, "A1"), (0.17, 1.0, "D2")):
            m.add("batt", f0 + off, timpano(hz(nota), a * v, 1.4, m.seme()), 0.5, sala=0.25, grande=0.15)
    m.add("melodia", 2.3, ottoni(["D2", "A2", "D3", "F3"], 2.42, 0.7, att=1.2, fc_max=1500, seed=m.seme()), 0.3, sala=0.4)
    # il balzo (3,76) e l'atterraggio (4,67)
    m.add("fx", 3.76, salita(0.91, 1.0, 300, 7000, tono="D3", seed=m.seme()), 0.32, grande=0.2)
    m.add("fx", 4.67, impatto(1.0, 3.5, m.seme()), 0.8, grande=0.35)
    m.add("fx", 4.67, bronzo(hz("D3"), 5.5, 1.0, 0.8, m.seme()), 0.42, grande=0.5)
    m.add("batt", 4.67, timpano(hz("D2"), 1.0, 2.0, m.seme()), 0.65, grande=0.2)
    # la posa (5,25)
    m.add("fx", 5.25, bronzo(hz("A3"), 3.5, 1.0, 1.0, m.seme()), 0.45, grande=0.45)
    m.add("batt", 5.25, timpano(hz("A2"), 0.7, 1.4, m.seme()), 0.4, grande=0.2)
    m.add("fx", 5.25, impatto(0.35, 2.0, m.seme()), 0.35)
    # risucchio verso il drop
    m.add("fx", 5.75, risucchio(0.25, 1.0, m.seme()), 0.38)
    m.add("batt", 6.0, timpano(hz("D2"), 0.9, 1.6, m.seme()), 0.45, grande=0.2)

    # ------------------------------------------------------------- 6-16: la home
    casa = [(6.0, "Dm"), (8.0, "Bb"), (10.0, "F"), (12.0, "C"), (14.0, "Asus"), (15.0, "A")]
    m.add("fx", 6.0, impatto(0.6, 2.5, m.seme()), 0.6, grande=0.2)
    m.add("fx", 6.0, piatto(0.5, 2.6, m.seme()), 0.3, sala=0.2)
    pads(m, casa, 6.0, 16.0, fc=2400, g=0.42, att=0.12, rel=0.4)
    arpeggio(m, casa, 6.0, 16.0, alto=True, g=0.26, fc_alto=3200, sala=0.3)
    basso(m, casa, 6.0, 16.0, g=0.55)
    groove_letto(m, 6.0, 10.0, g=0.85, schiocchi=False, charl=False, shak=False)
    groove_letto(m, 10.0, 15.5, g=0.85, schiocchi=True, charl=True, shak=False)
    melodia(m, 6.0, TEMA + [("F4", 1.5), ("Bb4", 0.5), ("D5", 1), ("C5", 1),
                            ("A4", 1.5), ("C5", 0.5), ("F5", 1), ("E5", 1),
                            ("G4", 1), ("C5", 1), ("E5", 1), ("D5", 1),
                            ("E5", 2), ("C#5", 1), ("E5", 1)], g=0.42)
    for t_acc, nota in ((8.0, "D6"), (12.0, "A5")):  # i titoli
        m.add("fx", t_acc - 0.5, risucchio(0.5, 0.4, m.seme()), 0.16)
        m.add("fx", t_acc, bronzo(hz(nota), 1.8, 1.0, 1.0, m.seme()), 0.11, sala=0.5)
    m.add("fx", 15.5, salita(0.5, 1.0, 400, 8000, seed=m.seme()), 0.3)

    # ------------------------------------------------------------- 16-48: 01 Oggetti smarriti
    p1 = quattro(16.0, 4)
    m.add("fx", 16.0, impatto(0.6, 3.0, m.seme()), 0.55, grande=0.25)
    m.add("fx", 16.0, bronzo(hz("D4"), 3.0, 0.9, 1.0, m.seme()), 0.18, grande=0.4)
    m.add("fx", 16.0, piatto(0.45, 2.6, m.seme()), 0.28, sala=0.2)
    melodia(m, 16.0, TEMA, g=0.4)
    pads(m, p1, 16.0, 48.0, fc=1150, g=0.4)
    arpeggio(m, p1, 16.0, 47.5, alto=False, g=0.3, fc_alto=1700)
    basso(m, p1, 16.0, 48.0, g=0.55)
    groove_letto(m, 16.0, 47.5, g=0.9)
    for k in range(8):  # piccoli riempimenti ogni 4 s
        tf = 18.0 + 4 * k
        m.add("fx", tf - 0.5, risucchio(0.5, 0.35, m.seme()), 0.1)
        m.add("fx", tf, bronzo(hz("A6" if k % 2 else "D7"), 1.2, 1.0, 1.0, m.seme()), 0.06, sala=0.6)
    m.add("fx", 47.5, fruscio(0.5, 1.0, -0.8, 0.8, m.seme()), 0.22, sala=0.2)

    # ------------------------------------------------------------- 48-80: 02 Impianti sportivi
    p2 = quattro(48.0, 4)
    m.add("fx", 48.0, impatto(0.85, 3.0, m.seme()), 0.75, grande=0.25)
    m.add("batt", 48.0, timpano(hz("D2"), 0.9, 1.6, m.seme()), 0.45, grande=0.15)
    m.add("fx", 48.0, piatto(0.6, 2.8, m.seme()), 0.35, sala=0.2)
    m.add("melodia", 48.0, ottoni(["D4", "F4", "A4"], 0.6, 0.9, att=0.05, seed=m.seme()), 0.22, sala=0.4)
    melodia(m, 48.0, TEMA, g=0.4)
    pads(m, p2, 48.0, 80.0, fc=1300, g=0.36)
    arpeggio(m, p2, 48.0, 79.75, alto=False, g=0.28, fc_alto=2000)
    basso(m, p2, 48.0, 79.5, g=0.5, stile="ottavi")
    groove_sport(m, 48.0, 79.5, g=0.85)
    for k in range(8):
        tf = 50.0 + 4 * k
        if k % 2 == 0:
            for j, f in enumerate((210, 170, 130)):
                m.add("batt", tf - 0.375 + j * 0.125, tom(f, 0.55, m.seme()), 0.5, pan=0.4 - 0.4 * j, sala=0.2)
        else:
            for j, f in enumerate((330, 330, 250, 250)):
                m.add("batt", tf - 0.5 + j * 0.125, conga(f, 0.4, m.seme()), 0.6, pan=-0.4, sala=0.15)
    m.add("fx", 79.5, salita(0.5, 1.0, 400, 9000, seed=m.seme()), 0.35)

    # ------------------------------------------------------------- 80-84: cartello 03 Artisti
    m.add("fx", 80.0, impatto(1.0, 4.0, m.seme()), 0.85, grande=0.4)
    m.add("fx", 80.0, bronzo(hz("D3"), 4.0, 1.0, 0.9, m.seme()), 0.38, grande=0.5)
    m.add("batt", 80.0, timpano(hz("D2"), 1.0, 2.5, m.seme()), 0.6, grande=0.2)
    m.add("fx", 80.0, piatto(0.8, 3.5, m.seme()), 0.33, sala=0.3)
    m.add("letto", 80.0, tappeto(["D3", "A3", "D4", "F4", "A4", "E5"], 4.0, fc=2600, att=0.02, rel=3.2, voci=7, seed=m.seme()), 0.55, sala=0.5)
    m.add("melodia", 80.0, ottoni(["D3", "A3", "D4", "F4"], 1.8, 0.9, att=0.08, seed=m.seme()), 0.28, sala=0.4)
    melodia(m, 80.0, TEMA, g=0.42)
    return m


def chiudi(m: Mix) -> np.ndarray:
    x = m.render()
    # silenzio garantito alla fine: dopo c'e' l'audio del video degli artisti
    t = tempo(x.shape[1])
    coda = np.clip((84.0 - t) / 1.4, 0, 1)
    x *= np.where(t > 82.6, 0.5 - 0.5 * np.cos(np.pi * coda), 1.0)
    return fade(x, 0.01, 0.01)


if __name__ == "__main__":
    y = master(chiudi(componi()), -16.0, -1.0)
    scrivi_wav(sys.argv[1] if len(sys.argv) > 1 else "../public/musica/cue-a.wav", y)
