"""Misure sui file prodotti: durata, loudness integrato, picco vero, tempi dei colpi, silenzi alle code."""
from __future__ import annotations

import sys

import numpy as np

from sintesi import SR, leggi_wav, lufs, ns, picco_vero
from scipy.ndimage import uniform_filter1d

COLPI = {
    "cue-a.wav": [4.67, 5.25, 6.0, 8.0, 12.0, 16.0, 48.0, 80.0],
    "cue-b.wav": [2.0, 6.0, 10.0, 18.0, 34.0],
    "cue-c.wav": [0.0, 4.0, 8.0, 30.0, 38.0],
}


def attacco(x, T):
    """L'attacco piu' ripido vicino a T: massimo della derivata dell'energia (finestra di 2 ms) in +/-40 ms."""
    e = uniform_filter1d((x ** 2).sum(axis=0), ns(0.002))
    d = np.diff(np.log10(e + 1e-10), prepend=0.0)
    d = uniform_filter1d(d, ns(0.001))
    a, b = max(1, ns(T - 0.04)), min(len(d), ns(T + 0.04))
    i = a + int(np.argmax(d[a:b]))
    prima = e[max(0, i - ns(0.02)):max(1, i - ns(0.003))].mean()
    dopo = e[i:i + ns(0.02)].mean()
    return i / SR, 10 * np.log10(dopo / (prima + 1e-12) + 1e-12)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


for nome in sys.argv[1:]:
    x = leggi_wav(nome)
    chiave = nome.replace("\\", "/").split("/")[-1]
    print(f"{chiave}: {x.shape[1] / SR:.3f} s  {lufs(x):.2f} LUFS  picco vero {picco_vero(x):.2f} dBTP"
          f"  inizio {rms_db(x[:, :ns(0.01)]):.0f} dBFS  ultimi 50 ms {rms_db(x[:, -ns(0.05):]):.0f} dBFS")
    for T in COLPI.get(chiave, []):
        t, salto = attacco(x, T)
        print(f"   colpo atteso {T:7.3f}  misurato {t:7.3f}  ({(t - T) * 1000:+.1f} ms, +{salto:.0f} dB sul fondo)")
