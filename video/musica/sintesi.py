"""
Sintesi della colonna sonora del film di RomaRouter: strumenti, effetti, mix e master.

Tutto e' generato da codice (nessun campione), con semi fissi: rigenerando si ottiene lo stesso file.
Oscillatori con anti-aliasing polyBLEP, filtri biquad (anche variabili nel tempo, a blocchi),
corde pizzicate Karplus-Strong accordate con un ritardo frazionario, riverbero a convoluzione con una
risposta all'impulso generata, sidechain sulla cassa, limitatore true-peak, misura del loudness
secondo ITU-R BS.1770.
"""
from __future__ import annotations

import struct

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 48000
BEAT = 0.5  # 120 BPM
BAR = 2.0


def ns(t: float) -> int:
    return int(round(t * SR))


def tempo(n: int) -> np.ndarray:
    return np.arange(n) / SR


_NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
         "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi(n) -> float:
    if isinstance(n, (int, float)):
        return float(n)
    return 12 * (int(n[-1]) + 1) + _NOTE[n[:-1]]


def hz(n) -> float:
    return 440.0 * 2 ** ((midi(n) - 69) / 12)


def fade(x: np.ndarray, fi: float = 0.002, fo: float = 0.005) -> np.ndarray:
    x = np.array(x, dtype=float, copy=True)
    n = x.shape[-1]
    a, b = min(ns(fi), n // 2), min(ns(fo), n // 2)
    if a:
        x[..., :a] *= np.linspace(0, 1, a)
    if b:
        x[..., -b:] *= np.linspace(1, 0, b)
    return x


def satura(x, drive: float = 1.5):
    return np.tanh(drive * x) / np.tanh(drive)


def stereo(s: np.ndarray, pan: float = 0.0) -> np.ndarray:
    """Mono -> stereo a potenza costante (al centro guadagno 1 per canale); stereo -> bilanciamento."""
    s = np.asarray(s, dtype=float)
    a = (pan + 1) * np.pi / 4
    gl, gr = np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)
    if s.ndim == 1:
        return np.vstack([s * gl, s * gr])
    return np.vstack([s[0] * min(1.0, gl), s[1] * min(1.0, gr)])


# ------------------------------------------------------------------------------------- oscillatori
def _fase(f, n: int, ph0: float = 0.0):
    f = np.broadcast_to(np.asarray(f, dtype=float), (n,))
    inc = f / SR
    ph = (ph0 + np.concatenate(([0.0], np.cumsum(inc[:-1])))) % 1.0
    return ph, inc


def _blep(t, dt):
    y = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    y[m] = x + x - x * x - 1
    m = t > 1 - dt
    x = (t[m] - 1) / dt[m]
    y[m] = x * x + x + x + 1
    return y


def saw(f, n, ph0=0.0):
    t, dt = _fase(f, n, ph0)
    return 2 * t - 1 - _blep(t, dt)


def quadra(f, n, ph0=0.0, pw=0.5):
    t, dt = _fase(f, n, ph0)
    y = np.where(t < pw, 1.0, -1.0)
    y += _blep(t, dt) - _blep((t + 1 - pw) % 1.0, dt)
    return y


def seno(f, n, ph0=0.0):
    t, _ = _fase(f, n, ph0)
    return np.sin(2 * np.pi * t)


# ------------------------------------------------------------------------------------------ filtri
def _biquad(tipo, f, q=0.707, g=0.0):
    A = 10 ** (g / 40)
    w = 2 * np.pi * min(f, SR * 0.47) / SR
    c, s = np.cos(w), np.sin(w)
    al = s / (2 * q)
    if tipo == "lp":
        b, a = [(1 - c) / 2, 1 - c, (1 - c) / 2], [1 + al, -2 * c, 1 - al]
    elif tipo == "hp":
        b, a = [(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]
    elif tipo == "bp":
        b, a = [al, 0.0, -al], [1 + al, -2 * c, 1 - al]
    elif tipo == "pk":
        b, a = [1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A]
    elif tipo == "ls":
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    elif tipo == "hs":
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        raise ValueError(tipo)
    b, a = np.array(b, float), np.array(a, float)
    return np.concatenate([b / a[0], a / a[0]])


def eq(x, *bande):
    """bande: ('lp'|'hp'|'bp', f[, q]) oppure ('pk'|'ls'|'hs', f, q, guadagno_dB)."""
    sos = np.array([_biquad(*b) for b in bande])
    return signal.sosfilt(sos, x, axis=-1)


def lp_var(x, fc, q=0.707, blocco=128):
    """Passa-basso risonante con frequenza di taglio che cambia nel tempo (coefficienti a blocchi)."""
    if x.ndim == 2:
        return np.vstack([lp_var(c, fc, q, blocco) for c in x])
    n = len(x)
    fc = np.broadcast_to(np.asarray(fc, dtype=float), (n,))
    y = np.empty_like(x)
    zi = np.zeros(2)
    for i in range(0, n, blocco):
        sos = _biquad("lp", float(np.clip(fc[min(i + blocco // 2, n - 1)], 20.0, SR * 0.45)), q)
        y[i:i + blocco], zi = signal.lfilter(sos[:3], sos[3:], x[i:i + blocco], zi=zi)
    return y


# --------------------------------------------------------------------------------------- riverbero
def ir_riverbero(t60=2.3, predelay=0.018, scuro=0.5, larghezza=1.0, seed=7):
    n = ns(t60 * 1.15)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    env = 10 ** (-3 * t / t60)
    w = np.exp(-t / (0.05 + t60 * 0.22 * (1 - scuro)))  # gli acuti si spengono prima
    comune = rng.standard_normal(n)
    canali = []
    for _ in range(2):
        r = (1 - larghezza) * comune + larghezza * rng.standard_normal(n)
        chiaro = eq(r, ("hp", 180), ("lp", 9500))
        buio = eq(r, ("hp", 160), ("lp", 1700))
        y = (chiaro * w + buio * (1 - w)) * env
        y[: ns(0.01)] *= np.linspace(0, 1, ns(0.01))
        canali.append(np.concatenate([np.zeros(ns(predelay)), y]))
    ir = np.vstack(canali)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def riverbera(x, ir):
    n = x.shape[1]
    return np.vstack([signal.oaconvolve(x[c], ir[c])[:n] for c in range(2)])


# --------------------------------------------------------------------------------------- batteria
def cassa(vel=1.0, morbida=True, seed=0):
    n = ns(0.7)
    t = tempo(n)
    f = 48 + 105 * np.exp(-t / 0.026) + 28 * np.exp(-t / 0.11)
    corpo = seno(f, n) * np.exp(-t / 0.23)
    rng = np.random.default_rng(seed)
    clic = eq(rng.standard_normal(n), ("hp", 3000), ("lp", 9000)) * np.exp(-t / 0.0035) * (0.06 if morbida else 0.16)
    return fade(satura(corpo * 1.15 + clic, 1.7) * vel, 0.0004, 0.03)


def timpano(f, vel=1.0, dur=2.0, seed=0):
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    ff = f * (1 + 0.035 * np.exp(-t / 0.06))
    x = np.zeros(n)
    for r, a, tau in ((1.0, 1.0, 0.95), (1.5, 0.42, 0.55), (1.98, 0.28, 0.42), (2.44, 0.16, 0.33), (2.9, 0.09, 0.25)):
        x += a * seno(ff * r, n, rng.random()) * np.exp(-t / tau)
    mazza = eq(rng.standard_normal(n), ("lp", 1400), ("hp", 70)) * np.exp(-t / 0.014) * 0.35
    x = (x + mazza) * np.minimum(1, t / 0.0015)
    return fade(satura(x * 0.8, 1.3) * vel, 0.0004, 0.06)


def charleston(vel=1.0, aperto=False, seed=0):
    n = ns(0.4 if aperto else 0.09)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    s = eq(rng.standard_normal(n), ("hp", 7200), ("pk", 10500, 1.0, 4.0))
    return fade(s * np.exp(-t / (0.13 if aperto else 0.021)) * vel, 0.0003, 0.01)


def shaker(vel=1.0, seed=0):
    n = ns(0.12)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    s = eq(rng.standard_normal(n), ("hp", 4500), ("lp", 11500))
    env = (t / 0.012) * np.exp(1 - t / 0.012)
    return fade(s * env * vel * 0.8, 0.0, 0.01)


def battimani(vel=1.0, seed=0):
    n = ns(0.4)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    out = []
    for c in range(2):
        r = rng.standard_normal(n)
        env = np.zeros(n)
        for k, a in ((0.0, 0.8), (0.011, 0.7), (0.022, 0.9)):
            m = t >= k
            env[m] += a * np.exp(-(t[m] - k) / 0.0045)
        m = t >= 0.026
        env[m] += 0.55 * np.exp(-(t[m] - 0.026) / 0.085)
        out.append(eq(r, ("bp", 1250 if c == 0 else 1380, 0.9), ("hp", 450)) * env)
    return fade(np.vstack(out) * vel * 1.6, 0.0002, 0.02)


def rullante(vel=1.0, seed=0):
    n = ns(0.3)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    corpo = seno(185 * (1 + 0.3 * np.exp(-t / 0.01)), n) * np.exp(-t / 0.07) * 0.55
    fili = eq(rng.standard_normal(n), ("hp", 1800), ("lp", 9000)) * np.exp(-t / 0.11) * 0.6
    return fade((corpo + fili) * vel, 0.0002, 0.02)


def tamburello(vel=1.0, seed=0, dur=0.28):
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    r = rng.standard_normal(n)
    s = sum(eq(r, ("bp", f, 7.0)) for f in (6100, 7650, 9300, 11300))
    s = s * np.exp(-t / 0.085) * np.minimum(1, t / 0.004) * 2.2
    pelle = eq(rng.standard_normal(n), ("lp", 500)) * np.exp(-t / 0.018) * 0.25
    return fade((s + pelle) * vel, 0.0002, 0.02)


def conga(f, vel=1.0, seed=0):
    n = ns(0.45)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    s = seno(f * (1 + 0.22 * np.exp(-t / 0.008)), n) * np.exp(-t / 0.15)
    s += eq(rng.standard_normal(n), ("bp", 1900, 1.0)) * np.exp(-t / 0.006) * 0.3
    return fade(s * vel, 0.0003, 0.02)


def tom(f, vel=1.0, seed=0):
    n = ns(0.7)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    s = seno(f * (1 + 0.35 * np.exp(-t / 0.02)), n) * np.exp(-t / 0.26)
    s += eq(rng.standard_normal(n), ("lp", 2500)) * np.exp(-t / 0.01) * 0.25
    return fade(satura(s * 1.1, 1.4) * vel, 0.0003, 0.03)


def piatto(vel=1.0, dur=2.6, seed=0):
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(2):
        r = rng.standard_normal(n)
        s = eq(r, ("hp", 3800), ("pk", 7500, 0.8, 3.0)) * np.exp(-t / (dur * 0.33))
        met = sum(np.sin(2 * np.pi * f * t + rng.random() * 6.28) * np.exp(-t / (dur * 0.2)) for f in rng.uniform(3200, 9800, 14)) * 0.05
        out.append((s + met) * np.minimum(1, t / 0.002))
    return fade(np.vstack(out) * vel * 0.7, 0.0002, 0.3)


# --------------------------------------------------------------------------------------- strumenti
def pizzico(f, dur, vel=1.0, fc_alto=2600, fc_basso=300, tau_f=0.1, tau_a=0.3, sub=0.3, seed=0):
    """Pluck da sintetizzatore: due seghe detunate (una per canale) + quadra un'ottava sotto, filtro a inviluppo."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    out = []
    for d in (+6, -6):
        fd = f * 2 ** (d / 1200)
        s = 0.6 * saw(fd, n, rng.random()) + sub * quadra(fd / 2, n, rng.random(), 0.42)
        fc = fc_basso + (fc_alto - fc_basso) * min(vel, 1.2) * np.exp(-t / tau_f)
        out.append(lp_var(s, fc, 0.85))
    x = np.vstack(out) * np.exp(-t / tau_a) * np.minimum(1, t / 0.0015) * vel
    return fade(x, 0.0, 0.03)


def epiano(f, dur, vel=1.0, seed=0):
    """Piano elettrico FM a due operatori (rapporto 1:1) con il 'tine' a 14:1 e un chorus leggero."""
    n = ns(dur)
    t = tempo(n)
    out = []
    for det in (1.0, 1.0019):
        fm = f * det
        ph, _ = _fase(fm, n)
        idx = (1.5 * vel + 0.3) * np.exp(-t / 0.45) + 0.35
        s = np.sin(2 * np.pi * ph + idx * np.sin(2 * np.pi * ph))
        if fm * 14 < 17000:
            s += np.sin(2 * np.pi * _fase(fm * 14, n)[0]) * np.exp(-t / 0.022) * 0.07 * vel
        out.append(s)
    amp = np.exp(-t / 1.5) * np.minimum(1, t / 0.003)
    return fade(np.vstack(out) * amp * vel * 0.6, 0.0, 0.1)


def tappeto(note, dur, fc=1400, att=0.5, rel=1.0, voci=5, det=12, vel=1.0, lfo=0.12, seed=0):
    """Pad: per ogni nota 'voci' seghe detunate sparse nello stereo, passa-basso che respira."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    L, R = np.zeros(n), np.zeros(n)
    for nota in note:
        f = hz(nota)
        for v in range(voci):
            u = (v - (voci - 1) / 2) / ((voci - 1) / 2) if voci > 1 else 0.0
            s = saw(f * 2 ** (u * det / 1200), n, rng.random())
            a = (0.8 * u + 1) * np.pi / 4
            L += s * np.cos(a)
            R += s * np.sin(a)
    norm = np.sqrt(2) / np.sqrt(len(note) * voci)
    fcv = np.asarray(fc, dtype=float) * (1 + lfo * np.sin(2 * np.pi * 0.17 * t + rng.random() * 6.28))
    x = lp_var(np.vstack([L, R]) * norm, fcv, 0.6, 256)
    env = np.clip(t / max(att, 1e-3), 0, 1)
    env = env * env * (3 - 2 * env)
    r = ns(min(rel, dur * 0.9))
    if r:
        env[-r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return x * env * vel


def ottoni(note, dur, vel=1.0, att=0.35, fc_max=2800, seed=0):
    """Ottoni sintetici: tre seghe per nota, filtro che si apre con l'attacco, vibrato tardivo."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    vib = 1 + 0.0028 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.45) / 0.4, 0, 1)
    L, R = np.zeros(n), np.zeros(n)
    for nota in note:
        f = hz(nota)
        for d, p in ((-7, -0.5), (0, 0.0), (7, 0.5)):
            s = saw(f * 2 ** (d / 1200) * vib, n, rng.random())
            a = (p + 1) * np.pi / 4
            L += s * np.cos(a)
            R += s * np.sin(a)
    norm = np.sqrt(2) / np.sqrt(len(note) * 3)
    fc = 250 + (fc_max - 250) * vel * (1 - np.exp(-t / att)) * (0.85 + 0.15 * np.exp(-t / 1.5))
    x = lp_var(np.vstack([L, R]) * norm, fc, 1.1, 128)
    env = np.minimum(1, t / (att * 0.7))
    r = ns(min(0.35, dur * 0.5))
    env[-r:] *= np.linspace(1, 0, r)
    return satura(x * env * 1.2, 1.3) * vel


def fisarmonica(note, dur, vel=1.0, seed=0):
    """Fisarmonica: tre ance per nota (accordatura musette), mantice con tremolo leggero."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    L, R = np.zeros(n), np.zeros(n)
    for nota in note:
        f = hz(nota)
        for d, p in ((-9, -0.6), (0, 0.0), (9, 0.6)):
            fd = f * 2 ** (d / 1200)
            s = 0.6 * quadra(fd, n, rng.random(), 0.33) + 0.4 * saw(fd, n, rng.random())
            a = (p + 1) * np.pi / 4
            L += s * np.cos(a)
            R += s * np.sin(a)
    norm = np.sqrt(2) / np.sqrt(len(note) * 3)
    x = eq(np.vstack([L, R]) * norm, ("lp", 2300, 0.7), ("pk", 1100, 0.8, 2.0), ("hp", 160))
    env = np.minimum(1, t / 0.07) * (1 + 0.035 * np.sin(2 * np.pi * 5.3 * t))
    r = ns(min(0.18, dur * 0.4))
    env[-r:] *= np.linspace(1, 0, r)
    return x * env * vel


def corda(f, dur, vel=1.0, t60=1.2, luce=0.55, pos=0.17, seed=0):
    """Corda pizzicata Karplus-Strong con ritardo frazionario (sempre filtrata): accordata entro pochi centesimi."""
    n = ns(dur)
    D = SR / f
    N = int(np.floor(D - 0.5))
    dd = D - 0.5 - N
    h0, h1, h2 = 0.5 * (1 - dd), 0.5, 0.5 * dd
    rho = 10 ** (-3 / (t60 * f))
    rng = np.random.default_rng(seed)
    ecc = rng.uniform(-1, 1, N + 2)
    ecc = signal.lfilter([luce], [1, -(1 - luce)], ecc)
    k = max(1, int(pos * N))
    ecc = ecc - np.concatenate([np.zeros(k), ecc[:-k]])
    pad = N + 2
    x = np.zeros(n + pad)
    x[pad:pad + len(ecc)] = ecc * vel
    y = np.zeros(n + pad)
    i = pad
    while i < n + pad:
        e = min(i + N, n + pad)
        y[i:e] = x[i:e] + rho * (h0 * y[i - N:e - N] + h1 * y[i - N - 1:e - N - 1] + h2 * y[i - N - 2:e - N - 2])
        i = e
    return fade(y[pad:], 0.0, 0.03)


def mandolino(f, dur, vel=1.0, seed=0):
    """Due corde per nota (le coppie del mandolino), leggermente scordate tra loro, con la cassa armonica."""
    a = corda(f, dur, vel, t60=0.9, luce=0.62, seed=seed)
    b = corda(f * 1.0013, dur, vel * 0.85, t60=0.85, luce=0.6, seed=seed + 1000)
    b = np.concatenate([np.zeros(ns(0.004)), b])[: len(a)]
    x = np.vstack([a * 0.9 + b * 0.35, b * 0.9 + a * 0.35])
    return eq(x, ("hp", 140), ("pk", 260, 1.0, 3.0), ("pk", 3200, 1.0, -3.0), ("lp", 7000))


# ------------------------------------------------------------------------------------ bronzo e fx
def bronzo(f, dur=5.0, vel=1.0, chiaro=1.0, seed=0):
    """Colpo di bronzo: parziali di campana (hum, prime, terza minore, quinta, nominale...) con battimenti."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    L, R = np.zeros(n), np.zeros(n)
    parz = ((0.5, 0.8, 0.95), (1.0, 1.0, 0.7), (1.183, 0.55, 0.5), (1.506, 0.45, 0.42), (2.0, 0.65, 0.33),
            (2.514, 0.32, 0.22), (2.662, 0.28, 0.2), (3.011, 0.24, 0.16), (4.166, 0.17 * chiaro, 0.1),
            (5.433, 0.11 * chiaro, 0.07), (6.79, 0.07 * chiaro, 0.05))
    for i, (r, a, fr) in enumerate(parz):
        fq = f * r
        if fq > 15000:
            continue
        env = np.exp(-t / (dur * fr))
        s1 = seno(fq, n, rng.random())
        s2 = seno(fq * 1.0008, n, rng.random())
        p = 0.25 if i % 2 else -0.25
        L += a * env * (s1 * (0.6 + p) + s2 * 0.35)
        R += a * env * (s2 * (0.6 - p) + s1 * 0.35)
    colpo = eq(rng.standard_normal(n), ("bp", 2600, 1.0)) * np.exp(-t / 0.006) * 0.4 * chiaro
    x = np.vstack([L + colpo, R + colpo]) * np.minimum(1, t / 0.0008)
    x /= np.max(np.abs(x)) + 1e-9
    return fade(x * vel, 0.0, 0.25)


def impatto(vel=1.0, dur=3.5, seed=0):
    """Colpo basso cinematografico: caduta di tono, raffica di rumore e rimbombo."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    corpo = satura(seno(33 + 85 * np.exp(-t / 0.1), n) * np.exp(-t / 0.85) * 1.5, 2.0)
    out = []
    for _ in range(2):
        raffica = eq(rng.standard_normal(n), ("lp", 4200)) * np.exp(-t / 0.05) * 0.45
        rombo = eq(rng.standard_normal(n), ("lp", 240)) * np.exp(-t / 0.7) * 0.9
        out.append(corpo + raffica + rombo)
    x = np.vstack(out) * np.minimum(1, t / 0.001)
    return fade(x * vel, 0.0, 0.3)


def salita(dur, vel=1.0, f_da=250, f_a=9000, tono=None, seed=0):
    """Riser: rumore con passa-basso che sale e volume che cresce; finisce secco."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    u = t / dur
    fc = f_da * (f_a / f_da) ** (u ** 1.3)
    x = lp_var(eq(rng.standard_normal((2, n)), ("hp", 150)), fc, 1.5, 128) * u ** 2.2
    if tono is not None:
        f0 = hz(tono)
        s = saw(f0 * 2 ** (u * 1.0), n) + saw(f0 * 1.006 * 2 ** (u * 1.0), n)
        x += stereo(lp_var(s, 300 + 3000 * u ** 2, 1.0) * u ** 2 * 0.35)
    return fade(x * vel, 0.01, 0.003)


def risucchio(dur, vel=1.0, seed=0):
    """Whoosh rovesciato: una raffica che si spegne, girata al contrario, che sfocia nel punto d'arrivo."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    fc = 9000 * np.exp(-t / (dur * 0.4)) + 300
    x = lp_var(rng.standard_normal((2, n)), fc, 0.9, 128) * np.exp(-t / (dur * 0.3))
    x += stereo(seno(140 * np.exp(-t / (dur * 0.5)) + 50, n) * np.exp(-t / (dur * 0.35)) * 0.4)
    return fade(x[:, ::-1] * vel, 0.01, 0.002)


def fruscio(dur, vel=1.0, da=-0.8, a=0.8, seed=0):
    """Whoosh di transizione che attraversa lo stereo."""
    n = ns(dur)
    t = tempo(n)
    rng = np.random.default_rng(seed)
    u = t / dur
    fc = 350 + 6500 * np.sin(np.pi * np.clip(u * 1.15, 0, 1)) ** 2
    amp = (u ** 1.6) * (1 - u) ** 0.35
    amp /= amp.max()
    mono = lp_var(eq(rng.standard_normal(n), ("hp", 200)), fc, 1.3, 128) * amp
    p = da + (a - da) * u
    ang = (p + 1) * np.pi / 4
    return fade(np.vstack([mono * np.cos(ang), mono * np.sin(ang)]) * np.sqrt(2) * vel, 0.005, 0.01)


def ping(f, vel=1.0, seed=0):
    n = ns(0.9)
    t = tempo(n)
    s = seno(f, n) * np.exp(-t / 0.22) + 0.22 * seno(f * 2.76, n) * np.exp(-t / 0.06) + 0.1 * seno(f * 0.5, n) * np.exp(-t / 0.3)
    return fade(s * np.minimum(1, t / 0.002) * vel, 0.0, 0.05)


def eco(x, ritardo, fb=0.45, ripetizioni=6, scuro=3500.0):
    """Eco ping-pong: le ripetizioni rimbalzano tra i canali e si scuriscono."""
    x = stereo(x) if x.ndim == 1 else x
    d = ns(ritardo)
    out = np.zeros((2, x.shape[1] + d * ripetizioni))
    out[:, : x.shape[1]] += x
    cur = x.mean(axis=0)
    for k in range(1, ripetizioni + 1):
        cur = eq(cur, ("lp", scuro)) * fb
        c = k % 2
        out[c, d * k: d * k + len(cur)] += cur
    return out


# ------------------------------------------------------------------------------------------ mix
BUS = ("batt", "basso", "letto", "melodia", "fx")


class Mix:
    def __init__(self, durata: float):
        self.durata = durata
        self.n = ns(durata)
        self.bus = {k: np.zeros((2, self.n)) for k in BUS}
        self.mandate = {k: np.zeros((2, self.n)) for k in ("sala", "grande")}
        self.casse: list[float] = []
        self._seme = 0

    def seme(self) -> int:
        self._seme += 1
        return self._seme

    def _metti(self, dove, t, s):
        i = ns(t)
        if i < 0:
            s = s[:, -i:]
            i = 0
        m = min(s.shape[1], self.n - i)
        if m > 0:
            dove[:, i:i + m] += s[:, :m]

    def add(self, bus, t, s, g=1.0, pan=0.0, sala=0.0, grande=0.0):
        s2 = stereo(s, pan) * g
        self._metti(self.bus[bus], t, s2)
        if sala:
            self._metti(self.mandate["sala"], t, s2 * sala)
        if grande:
            self._metti(self.mandate["grande"], t, s2 * grande)

    def cassa(self, t, vel=1.0, morbida=True, g=1.0):
        self.casse.append(t)
        self.add("batt", t, cassa(vel, morbida, self.seme()), g)

    def ducking(self, profondita, rilascio=0.16, attacco=0.004):
        g = np.ones(self.n)
        for tk in self.casse:
            i0, i1 = max(0, ns(tk - attacco)), min(self.n, ns(tk + 6 * rilascio))
            if i1 <= i0:
                continue
            tt = np.arange(i0, i1) / SR - tk
            d = np.where(tt < 0, (tt + attacco) / attacco, np.exp(-tt / rilascio))
            g[i0:i1] = np.minimum(g[i0:i1], 1 - profondita * d)
        return g

    def render(self, sala_t60=2.3, grande_t60=4.2, letto_eq=True):
        b = self.bus
        letto = b["letto"]
        if letto_eq:  # il letto lascia spazio alla voce
            letto = eq(letto, ("hp", 110), ("pk", 2400, 0.8, -4.5), ("pk", 1200, 1.0, -1.5))
        letto = letto * self.ducking(0.35)
        basso = eq(b["basso"], ("hp", 30)) * self.ducking(0.7, 0.14)
        batt = satura(b["batt"] * 1.1, 1.2)
        melodia = eq(b["melodia"], ("hp", 160))
        sala = riverbera(self.mandate["sala"], ir_riverbero(sala_t60, 0.02, 0.45, seed=11)) * self.ducking(0.25)
        grande = riverbera(self.mandate["grande"], ir_riverbero(grande_t60, 0.03, 0.55, seed=23))
        x = batt + basso * 0.6 + letto * 1.35 + melodia + b["fx"] + sala * 0.32 + grande * 0.3
        return eq(x, ("hp", 26), ("ls", 90, 0.7, 0.8), ("hs", 11000, 0.7, -1.0))


# ------------------------------------------------------------------------------------- master
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def lufs(x) -> float:
    """Loudness integrato ITU-R BS.1770-4 (48 kHz, stereo)."""
    k = signal.lfilter(*_K2, signal.lfilter(*_K1, x, axis=1), axis=1)
    blk, hop = ns(0.4), ns(0.1)
    if x.shape[1] < blk:
        return -120.0
    q = np.cumsum(np.concatenate([np.zeros((2, 1)), k ** 2], axis=1), axis=1)
    starts = np.arange(0, x.shape[1] - blk + 1, hop)
    z = (q[:, starts + blk] - q[:, starts]) / blk
    zs = z.sum(axis=0)
    l = -0.691 + 10 * np.log10(zs + 1e-20)
    m = l > -70
    if not m.any():
        return -120.0
    rel = -0.691 + 10 * np.log10(zs[m].mean()) - 10
    m &= l > rel
    return float(-0.691 + 10 * np.log10(zs[m].mean()))


def picco_vero(x) -> float:
    up = signal.resample_poly(x, 4, 1, axis=1)
    return float(20 * np.log10(np.max(np.abs(up)) + 1e-12))


def limitatore(x, soglia_db=-1.4, avanti=0.0015, rilascio=0.09):
    thr = 10 ** (soglia_db / 20)
    n = x.shape[1]
    up = signal.resample_poly(x, 4, 1, axis=1)
    pk = np.max(np.abs(up), axis=0)[: 4 * n].reshape(n, 4).max(axis=1)
    rid = np.maximum(0.0, 20 * np.log10(np.maximum(pk, 1e-9) / thr))
    L = ns(avanti)
    rid = maximum_filter1d(rid, size=2 * L + 1, mode="nearest")
    if rid.any():
        a = np.exp(-1 / (rilascio * SR))  # rilascio esponenziale della riduzione (in dB)
        out = rid.tolist()
        prev = 0.0
        for i, v in enumerate(out):
            prev = v if v > prev else prev * a
            out[i] = prev
        rid = np.asarray(out)
        rid = uniform_filter1d(rid, size=L + 1, mode="nearest")
    return x * 10 ** (-rid / 20)


def master(x, obiettivo=-16.0, tetto=-1.0):
    """Porta il brano a 'obiettivo' LUFS con picco vero sotto 'tetto' dBTP."""
    g = 10 ** ((obiettivo - lufs(x)) / 20)
    y = x
    for _ in range(5):
        y = limitatore(x * g, tetto - 0.45)
        diff = obiettivo - lufs(y)
        if abs(diff) < 0.15:
            break
        g *= 10 ** (diff / 20)
    pv = picco_vero(y)
    if pv > tetto - 0.1:
        y *= 10 ** ((tetto - 0.15 - pv) / 20)
    return y


def scrivi_wav(percorso, x):
    """WAV PCM 24 bit stereo."""
    x = np.clip(x, -1.0, 1.0 - 1 / 8388608)
    pcm = np.ascontiguousarray(np.round(x.T * 8388607).astype("<i4"))
    dati = pcm.view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with open(percorso, "wb") as f:
        f.write(b"RIFF" + struct.pack("<I", 36 + len(dati)) + b"WAVE")
        f.write(b"fmt " + struct.pack("<IHHIIHH", 16, 1, 2, SR, SR * 6, 6, 24))
        f.write(b"data" + struct.pack("<I", len(dati)) + dati)


def leggi_wav(percorso):
    with open(percorso, "rb") as f:
        b = f.read()
    i = b.index(b"data") + 8
    raw = np.frombuffer(b[i:], dtype=np.uint8).reshape(-1, 3)
    v = (raw[:, 0].astype(np.int32) | (raw[:, 1].astype(np.int32) << 8) | (raw[:, 2].astype(np.int32) << 16))
    v = np.where(v >= 1 << 23, v - (1 << 24), v)
    return (v.reshape(-1, 2).T / 8388608.0)


# --------------------------------------------------------------------------------------- armonia
ACC = {
    "Dm": dict(pad=["D3", "A3", "D4", "F4", "A4"], arpb=["D3", "A3", "D4", "F4"], arpa=["D4", "A4", "D5", "F5"], basso="D2"),
    "Bb": dict(pad=["Bb2", "F3", "Bb3", "D4", "F4"], arpb=["Bb2", "F3", "Bb3", "D4"], arpa=["Bb3", "F4", "Bb4", "D5"], basso="Bb1"),
    "F": dict(pad=["F3", "A3", "C4", "F4", "A4"], arpb=["F3", "C4", "F4", "A4"], arpa=["F4", "C5", "F5", "A5"], basso="F2"),
    "C": dict(pad=["C3", "G3", "C4", "E4", "G4"], arpb=["C3", "G3", "C4", "E4"], arpa=["C4", "G4", "C5", "E5"], basso="C2"),
    "Csus": dict(pad=["C3", "G3", "C4", "F4", "G4"], arpb=["C3", "G3", "C4", "F4"], arpa=["C4", "G4", "C5", "F5"], basso="C2"),
    "Gm": dict(pad=["G2", "D3", "G3", "Bb3", "D4"], arpb=["G2", "D3", "G3", "Bb3"], arpa=["G3", "D4", "G4", "Bb4"], basso="G1"),
    "A": dict(pad=["A2", "E3", "A3", "C#4", "E4"], arpb=["A2", "E3", "A3", "C#4"], arpa=["A3", "E4", "A4", "C#5"], basso="A1"),
    "Asus": dict(pad=["A2", "E3", "A3", "D4", "E4"], arpb=["A2", "E3", "A3", "D4"], arpa=["A3", "E4", "A4", "D5"], basso="A1"),
    "A7": dict(pad=["A2", "E3", "G3", "C#4", "E4"], arpb=["A2", "E3", "G3", "C#4"], arpa=["A3", "E4", "G4", "C#5"], basso="A1"),
}
ARP = (0, 2, 1, 3, 2, 3, 1, 2)


def accordo_a(prog, t):
    """prog: lista di (inizio, nome) ordinata; il nome dell'accordo in vigore al tempo t."""
    nome = prog[0][1]
    for t0, a in prog:
        if t0 <= t + 1e-9:
            nome = a
    return nome
