"""Contributo di ogni bus, per bande, in una finestra di tempo: python diagnosi.py cue_a 18 46"""
import importlib, sys
import numpy as np
from sintesi import eq, ns
mod = importlib.import_module(sys.argv[1])
a, b = float(sys.argv[2]), float(sys.argv[3])
m = mod.componi()
BANDE = (("<80", ("lp", 80)), ("80-250", ("hp", 80), ("lp", 250)), ("250-1k", ("hp", 250), ("lp", 1000)),
         ("1-4k", ("hp", 1000), ("lp", 4000)), (">4k", ("hp", 4000)))
tutti = dict(m.bus, **{"sala*": m.mandate["sala"] * 0.32, "grande*": m.mandate["grande"] * 0.3})
print("bus        " + "".join(f"{n:>9}" for n, *_ in BANDE) + "   totale")
for k, x in tutti.items():
    seg = x[:, ns(a):ns(b)]
    vals = [10 * np.log10(np.mean(eq(seg, *f) ** 2) + 1e-14) for _, *f in BANDE]
    print(f"{k:10} " + "".join(f"{v:9.1f}" for v in vals) + f"   {10*np.log10(np.mean(seg**2)+1e-14):6.1f}")
