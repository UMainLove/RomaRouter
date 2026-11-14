"""Profilo di una cue: loudness a breve termine ogni 2 s e quanta energia sta nella banda della voce (1-4 kHz)."""
from __future__ import annotations

import sys

import numpy as np

from sintesi import SR, eq, leggi_wav, lufs, ns

x = leggi_wav(sys.argv[1])
voce = eq(x, ("hp", 1000), ("lp", 4000))
bassi = eq(x, ("lp", 150))
passo = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
t = 0.0
while t < x.shape[1] / SR - 0.01:
    a, b = ns(t), ns(min(t + passo, x.shape[1] / SR))
    seg = x[:, a:b]
    tot = np.mean(seg ** 2) + 1e-12
    l = lufs(seg) if b - a >= ns(0.4) else -99
    print(f"{t:6.1f}  {l:6.1f} LUFS   voce {10 * np.log10(np.mean(voce[:, a:b] ** 2) / tot + 1e-12):6.1f} dB"
          f"   bassi {10 * np.log10(np.mean(bassi[:, a:b] ** 2) / tot + 1e-12):6.1f} dB"
          f"   L/R corr {np.corrcoef(seg[0], seg[1])[0, 1]:.2f}")
    t += passo
