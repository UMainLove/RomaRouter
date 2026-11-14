"""Suoni singoli per il montaggio: clic del cursore, fruscio della transizione 'strada', tasto premuto."""
from __future__ import annotations

import numpy as np

from sintesi import eq, fade, fruscio, ns, riverbera, ir_riverbero, scrivi_wav, seno, stereo, tempo


def normalizza(x, picco_db):
    return x / (np.max(np.abs(x)) + 1e-12) * 10 ** (picco_db / 20)


def clic():
    """Tic morbido e caldo, da legno: corpo a 950 Hz che cala, un soffio di attacco, un piccolo tonfo sotto."""
    n = ns(0.11)
    t = tempo(n)
    rng = np.random.default_rng(5)
    corpo = seno(950 * (1 + 0.25 * np.exp(-t / 0.004)), n) * np.exp(-t / 0.018)
    tonfo = seno(190 * (1 + 0.4 * np.exp(-t / 0.005)), n) * np.exp(-t / 0.028) * 0.55
    attacco = eq(rng.standard_normal(n), ("bp", 2600, 1.2)) * np.exp(-t / 0.0018) * 0.35
    x = eq(corpo + tonfo + attacco, ("lp", 4500), ("hp", 90)) * np.minimum(1, t / 0.0006)
    x = stereo(x) + riverbera(stereo(x), ir_riverbero(0.35, 0.004, 0.6, seed=2)) * 0.08
    return fade(normalizza(x, -12.0), 0.0, 0.02)


def strada():
    """Whoosh di 0,6 s che sale e attraversa lo schermo da sinistra a destra, con un filo di corpo sotto."""
    x = fruscio(0.6, 1.0, -0.9, 0.9, seed=9)
    n = x.shape[1]
    t = tempo(n)
    u = t / 0.6
    corpo = seno(70 + 90 * u, n) * (u ** 1.5) * (1 - u) ** 0.4 * 0.35
    ang = (-0.9 + 1.8 * u + 1) * np.pi / 4
    x = x + np.vstack([corpo * np.cos(ang), corpo * np.sin(ang)]) * np.sqrt(2)
    return fade(normalizza(x, -8.0), 0.005, 0.01)


def tasto():
    """Un tasto morbido: lo scatto in alto e il fondo corsa 18 ms dopo, piu' leggero."""
    n = ns(0.04)
    t = tempo(n)
    rng = np.random.default_rng(13)
    x = np.zeros(n)
    for t0, a in ((0.0, 1.0), (0.018, 0.45)):
        m = t >= t0
        tt = t[m] - t0
        x[m] += a * (eq(rng.standard_normal(m.sum()), ("bp", 3200, 1.4)) * np.exp(-tt / 0.0016) * 0.5
                     + np.sin(2 * np.pi * 420 * tt) * np.exp(-tt / 0.006))
    x = eq(x, ("lp", 6500), ("hp", 150))
    return fade(normalizza(stereo(x), -18.0), 0.0, 0.006)


if __name__ == "__main__":
    scrivi_wav("../public/musica/clic.wav", clic())
    scrivi_wav("../public/musica/fruscio.wav", strada())
    scrivi_wav("../public/musica/tasti.wav", tasto())
