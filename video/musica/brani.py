"""Mattoni di composizione condivisi dalle tre cue: pad, arpeggi, basso, groove, melodia."""
from __future__ import annotations

import numpy as np

from sintesi import (ACC, ARP, BEAT, BAR, Mix, accordo_a, battimani, charleston, conga, epiano, fade, hz, ns,
                     pizzico, rullante, satura, seno, shaker, tappeto, tempo)


def sub(f, dur, vel=1.0):
    n = ns(dur)
    t = tempo(n)
    s = seno(f, n) + 0.16 * seno(2 * f, n)
    env = np.minimum(1, t / 0.012)
    r = ns(min(0.08, dur * 0.3))
    env[-r:] *= np.linspace(1, 0, r)
    return satura(s * env * vel, 1.25)


def spazi(prog, t0, t1):
    """Gli intervalli (inizio, fine, accordo) della progressione dentro [t0, t1)."""
    out = []
    for i, (ta, nome) in enumerate(prog):
        tb = prog[i + 1][0] if i + 1 < len(prog) else t1
        a, b = max(ta, t0), min(tb, t1)
        if b > a + 1e-9:
            out.append((a, b, nome))
    return out


def pads(m: Mix, prog, t0, t1, fc=1300, g=0.5, att=0.4, rel=0.6, sala=0.35, voci=5, bus="letto", alza=0):
    for a, b, nome in spazi(prog, t0, t1):
        note = ACC[nome]["pad"]
        if alza:
            note = [n[:-1] + str(int(n[-1]) + alza) for n in note]
        f = fc(a) if callable(fc) else fc
        m.add(bus, a, tappeto(note, b - a + rel * 0.7, f, att, rel, voci, seed=m.seme()), g, sala=sala)


def arpeggio(m: Mix, prog, t0, t1, alto=False, g=0.35, fc_alto=2200, fc_basso=280, tau_a=0.28, passo=0.125,
             schema=ARP, sala=0.25, bus="letto", accenti=True):
    k = 0
    while True:
        t = t0 + k * passo
        if t >= t1 - 1e-9:
            break
        toni = ACC[accordo_a(prog, t)]["arpa" if alto else "arpb"]
        nota = toni[schema[k % len(schema)]]
        v = 1.0 if (not accenti or k % 4 == 0) else 0.72
        fa = fc_alto(t) if callable(fc_alto) else fc_alto
        s = pizzico(hz(nota), 0.5, v, fa, fc_basso, 0.085, tau_a, 0.15, seed=m.seme())
        m.add(bus, t, s, g * v, pan=0.35 if k % 2 else -0.35, sala=sala)
        k += 1


def basso(m: Mix, prog, t0, t1, g=0.6, stile="lungo"):
    for a, b, nome in spazi(prog, t0, t1):
        f = hz(ACC[nome]["basso"])
        if stile == "lungo":
            m.add("basso", a, sub(f, b - a + 0.02), g)
        elif stile == "ottavi":
            k = 0
            while a + k * 0.25 < b - 1e-9:
                t = a + k * 0.25
                ff = f * (2 if k % 2 else 1)
                m.add("basso", t, sub(f, 0.24, 1.0), g * 0.75)
                m.add("basso", t, pizzico(ff, 0.3, 0.8, 900, 140, 0.05, 0.16, 0.5, seed=m.seme()), g * 0.45)
                k += 1
        elif stile == "pulsato":  # sedicesimi sulla fondamentale
            k = 0
            while a + k * 0.125 < b - 1e-9:
                t = a + k * 0.125
                v = 1.0 if k % 4 == 0 else 0.7
                m.add("basso", t, sub(f, 0.12, 1.0), g * 0.6 * v)
                k += 1


def melodia(m: Mix, t0, frasi, g=0.5, sala=0.4, ottava=0, strumento=epiano):
    """frasi: lista di (nota|None, battiti)."""
    t = t0
    for nota, battiti in frasi:
        dur = battiti * BEAT
        if nota:
            f = hz(nota) * 2 ** ottava
            m.add("melodia", t, strumento(f, max(dur * 1.6, 0.9), 0.9, seed=m.seme()), g, sala=sala)
        t += dur


def groove_letto(m: Mix, t0, t1, g=1.0, schiocchi=True, charl=True, shak=True):
    """Groove da letto per la voce: cassa sull'1 e sul 3, schiocco sul 2 e 4, charleston in levare."""
    t = t0
    k = 0
    while t < t1 - 1e-9:
        if k % 2 == 0:
            m.cassa(t, 0.8 * g)
        elif schiocchi:
            m.add("batt", t, battimani(0.28, m.seme()), g, sala=0.3)
        if charl:
            m.add("batt", t + 0.25, charleston(0.36, False, m.seme()), g, pan=0.3)
        if shak:
            for j in range(4):
                m.add("batt", t + j * 0.125, shaker(0.18 if j % 2 else 0.1, m.seme()), g, pan=-0.35)
        k += 1
        t = t0 + k * BEAT


def groove_sport(m: Mix, t0, t1, g=1.0, conghe=True):
    """Groove pieno: cassa in quattro, battimani sul 2 e 4, charleston in sedicesimi, aperto in levare, conghe."""
    k = 0
    while True:
        t = t0 + k * BEAT
        if t >= t1 - 1e-9:
            break
        m.cassa(t, 0.95 * g, morbida=False)
        if k % 2 == 1:
            m.add("batt", t, battimani(0.45, m.seme()), g, sala=0.3)
        for j in range(4):
            v = (0.42, 0.2, 0.28, 0.2)[j]
            if j == 2:
                m.add("batt", t + j * 0.125, charleston(0.32, True, m.seme()), g, pan=0.3)
            else:
                m.add("batt", t + j * 0.125, charleston(v, False, m.seme()), g, pan=0.3)
        if conghe:
            # schema per battuta (4 battiti): sedicesimi scelti
            if k % 4 == 1:
                m.add("batt", t + 0.375, conga(330, 0.35, m.seme()), g, pan=-0.45)
            if k % 4 == 2:
                m.add("batt", t + 0.125, conga(250, 0.3, m.seme()), g, pan=-0.3)
                m.add("batt", t + 0.25, conga(330, 0.25, m.seme()), g, pan=-0.45)
            if k % 4 == 3:
                m.add("batt", t + 0.25, conga(250, 0.35, m.seme()), g, pan=-0.3)
        k += 1


def rullo(m: Mix, t0, t1, g=0.5, cresce=True):
    """Rullata di rullante che accelera (da sedicesimi a trentaduesimi) e cresce."""
    t = t0
    while t < t1 - 1e-9:
        u = (t - t0) / (t1 - t0)
        m.add("batt", t, rullante(0.25 + 0.75 * u if cresce else 1.0, m.seme()), g, sala=0.25)
        t += 0.125 if u < 0.5 else 0.0625
