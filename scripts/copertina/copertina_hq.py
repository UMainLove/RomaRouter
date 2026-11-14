"""
Copertina RomaRouter, versione per il video (render EEVEE): Colosseo ad alta definizione, suolo e cielo
al tramonto. L'ambiente, la lupa e l'animazione sono in ambiente_hq.py, lupa_hq.py, animazione_hq.py;
costruisci_hq.py mette tutto insieme e salva il .blend (vedi docs/COPERTINA.md).

Tutto avviene nella scena "Copertina HQ": la scena "Copertina" (versione leggera) resta com'e'.
Geometria in coordinate locali (u lungo la facciata, v verso l'esterno, z in alto) piegate
sull'ellisse 188 x 156 m; ogni faccia ha UV in metri, cosi' i materiali procedurali (blocchi di
travertino, buchi delle grappe, sampietrini) hanno la scala giusta ovunque.
"""

import bisect
import math
import os

import random

import bpy  # prima di bmesh e mathutils
import bmesh
from mathutils import Vector

SCENA = "Copertina HQ"
COLLEZIONE = "Copertina HQ"
CARTELLA = os.environ.get("RR_CARTELLA", os.path.expanduser("~/Movies/RomaRouter-copertina"))

A, B = 94.0, 78.0
N_CAMPATE = 80
D_MURO = 2.6
SEMI_ARCO = 2.1
D_ANELLO2 = 2.0
SEMI_ARCO2 = 1.9
SEG_ARCO = 24
SEG_COLONNA = 16


# ---------------------------------------------------------------------------------------------
# Ellisse per lunghezza d'arco


class Ellisse:
    def __init__(self, a, b, n=60000):
        self.a, self.b = a, b
        self.ts = [-math.pi / 2 + 2 * math.pi * i / n for i in range(n + 1)]
        s = [0.0]
        px, py = a * math.cos(self.ts[0]), b * math.sin(self.ts[0])
        for t in self.ts[1:]:
            x, y = a * math.cos(t), b * math.sin(t)
            s.append(s[-1] + math.hypot(x - px, y - py))
            px, py = x, y
        self.s = s
        self.perimetro = s[-1]

    def t(self, u):
        u = u % self.perimetro
        i = min(max(bisect.bisect_right(self.s, u) - 1, 0), len(self.s) - 2)
        f = (u - self.s[i]) / (self.s[i + 1] - self.s[i])
        return self.ts[i] + f * (self.ts[i + 1] - self.ts[i])

    def telaio(self, u):
        t = self.t(u)
        p = Vector((self.a * math.cos(t), self.b * math.sin(t), 0.0))
        tg = Vector((-self.a * math.sin(t), self.b * math.cos(t), 0.0)).normalized()
        nr = Vector((self.b * math.cos(t), self.a * math.sin(t), 0.0)).normalized()
        return p, tg, nr

    def mappa(self, u, v, z):
        p, _, nr = self.telaio(u)
        return Vector((p.x + v * nr.x, p.y + v * nr.y, z))

    def direzione(self, u, du, dv, dz):
        _, tg, nr = self.telaio(u)
        return tg * du + nr * dv + Vector((0, 0, dz))


ELL = Ellisse(A, B)
W = ELL.perimetro / N_CAMPATE
U_OVEST = -ELL.perimetro / 4  # estremo ovest dell'asse maggiore: la camera lo guarda


# ---------------------------------------------------------------------------------------------
# Facce con UV in metri e indice di materiale


class Facce:
    def __init__(self):
        self.lista = []  # (punti mondo, uv, liscia, materiale)

    def faccia(self, punti, normale, liscia=False, mat=0):
        nu, nv, nz = (abs(x) for x in normale)
        if nz >= nu and nz >= nv:
            uv = [(p[0], p[1]) for p in punti]
        elif nv >= nu:
            uv = [(p[0], p[2]) for p in punti]
        else:
            uv = [(p[1], p[2]) for p in punti]
        pw = [ELL.mappa(*p) for p in punti]
        uc = sum(p[0] for p in punti) / len(punti)
        nw = ELL.direzione(uc, *normale)
        n = Vector((0, 0, 0))
        for i in range(len(pw)):
            a, b = pw[i], pw[(i + 1) % len(pw)]
            n.x += (a.y - b.y) * (a.z + b.z)
            n.y += (a.z - b.z) * (a.x + b.x)
            n.z += (a.x - b.x) * (a.y + b.y)
        if n.length < 1e-10:
            return
        if n.dot(nw) < 0:
            pw.reverse()
            uv.reverse()
        self.lista.append((pw, uv, liscia, mat))

    def rettangolo_v(self, u0, u1, v, z0, z1, verso, mat=0):
        if u1 - u0 < 1e-6 or z1 - z0 < 1e-6:
            return
        self.faccia([(u0, v, z0), (u1, v, z0), (u1, v, z1), (u0, v, z1)], (0, verso, 0), mat=mat)

    def scatola(self, u0, u1, v0, v1, z0, z1, salta=(), mat=0):
        if "v1" not in salta:
            self.faccia([(u0, v1, z0), (u1, v1, z0), (u1, v1, z1), (u0, v1, z1)], (0, 1, 0), mat=mat)
        if "v0" not in salta:
            self.faccia([(u0, v0, z0), (u1, v0, z0), (u1, v0, z1), (u0, v0, z1)], (0, -1, 0), mat=mat)
        if "u0" not in salta:
            self.faccia([(u0, v0, z0), (u0, v1, z0), (u0, v1, z1), (u0, v0, z1)], (-1, 0, 0), mat=mat)
        if "u1" not in salta:
            self.faccia([(u1, v0, z0), (u1, v1, z0), (u1, v1, z1), (u1, v0, z1)], (1, 0, 0), mat=mat)
        if "z1" not in salta:
            self.faccia([(u0, v0, z1), (u1, v0, z1), (u1, v1, z1), (u0, v1, z1)], (0, 0, 1), mat=mat)
        if "z0" not in salta:
            self.faccia([(u0, v0, z0), (u1, v0, z0), (u1, v1, z0), (u0, v1, z0)], (0, 0, -1), mat=mat)

    def fascia(self, us, profilo, z_base, segno=1, mat=0):
        """Profilo (v, z) antiorario estruso lungo us."""
        for j in range(len(profilo) - 1):
            (va, za), (vb, zb) = profilo[j], profilo[j + 1]
            n = ((zb - za) * segno, -(vb - va))
            for i in range(len(us) - 1):
                u0, u1 = us[i], us[i + 1]
                self.faccia([(u0, segno * va, z_base + za), (u1, segno * va, z_base + za),
                             (u1, segno * vb, z_base + zb), (u0, segno * vb, z_base + zb)],
                            (0, n[0], n[1]), mat=mat)

    def tornio(self, uc, profilo, segmenti=SEG_COLONNA, liscia=True, mat=0):
        """Mezzo solido di rotazione (v >= 0) attorno all'asse verticale in (uc, 0); profilo (r, z) dal basso."""
        for j in range(len(profilo) - 1):
            (ra, za), (rb, zb) = profilo[j], profilo[j + 1]
            nr, nzp = (zb - za), -(rb - ra)
            for i in range(segmenti):
                f0, f1 = math.pi * i / segmenti, math.pi * (i + 1) / segmenti
                fm = (f0 + f1) / 2
                pts = [(uc + ra * math.cos(f0), ra * math.sin(f0), za), (uc + ra * math.cos(f1), ra * math.sin(f1), za),
                       (uc + rb * math.cos(f1), rb * math.sin(f1), zb), (uc + rb * math.cos(f0), rb * math.sin(f0), zb)]
                if ra < 1e-6:
                    pts = [pts[0], pts[2], pts[3]]
                elif rb < 1e-6:
                    pts = [pts[0], pts[1], pts[2]]
                self.faccia(pts, (nr * math.cos(fm), nr * math.sin(fm), nzp), liscia=liscia, mat=mat)


def punti_u(u0, u1, per_campata=4):
    n = max(1, round((u1 - u0) / W * per_campata))
    return [u0 + (u1 - u0) * i / n for i in range(n + 1)]


def arco(uc, a, z_imposta, segmenti=SEG_ARCO):
    out = []
    for i in range(segmenti + 1):
        t = math.pi - math.pi * i / segmenti
        out.append((uc + a * math.cos(t), z_imposta + a * math.sin(t), t))
    return out


def quarto(r0, z0, r1, z1, n=4, convesso=True):
    """Punti di un quarto di cerchio (modanature) da (r0, z0) a (r1, z1)."""
    pts = []
    for i in range(n + 1):
        a = math.pi / 2 * i / n
        if convesso:
            pts.append((r0 + (r1 - r0) * math.sin(a), z0 + (z1 - z0) * (1 - math.cos(a))))
        else:
            pts.append((r0 + (r1 - r0) * (1 - math.cos(a)), z0 + (z1 - z0) * math.sin(a)))
    return pts


# ---------------------------------------------------------------------------------------------
# Ordini architettonici

# profili delle trabeazioni (v, z) dal muro in basso, antiorari: architrave a fasce, fregio, cornice
def profilo_trabeazione(h, sporto):
    p = [(0, 0), (0.5, 0), (0.5, 0.18), (0.54, 0.2), (0.54, 0.4), (0.58, 0.42), (0.58, 0.62)]
    p += [(0.5, 0.66), (0.5, h - 0.72)]
    p += quarto(0.5, h - 0.72, 0.7, h - 0.58, 3)
    p += [(0.7, h - 0.5), (0.86, h - 0.46)]
    p += quarto(0.86, h - 0.46, sporto, h - 0.3, 3, convesso=False)
    p += [(sporto, h), (0, h)]
    return p


ORDINI = [
    dict(nome="tuscanico", z0=0.0, h=10.5, he=1.9, davanzale=0.0, chiave=7.05, r=0.56, piedistallo=0.0,
         volta=7.35, w1=4.6, w2=3.6, chiave2=6.0),
    dict(nome="ionico", z0=10.5, h=11.85, he=2.1, davanzale=1.55, chiave=8.0, r=0.5, piedistallo=1.55,
         volta=8.25, w1=4.1, w2=3.0, chiave2=6.6),
    dict(nome="corinzio", z0=22.35, h=11.6, he=2.1, davanzale=1.5, chiave=7.95, r=0.47, piedistallo=1.5,
         volta=8.2, w1=4.1, w2=3.0, chiave2=6.6),
]
ATTICO = dict(z0=33.95, h=14.2)


def parete_con_arco(f, u0, u1, uc, a, v, verso, zb, zs, zsp, zt, mat=0):
    uL, uR = uc - a, uc + a
    for (ua, ub) in ((u0, uL), (uR, u1)):
        f.rettangolo_v(ua, ub, v, zb, zs, verso, mat=mat)
        f.rettangolo_v(ua, ub, v, zs, zsp, verso, mat=mat)
        f.rettangolo_v(ua, ub, v, zsp, zt, verso, mat=mat)
    f.rettangolo_v(uL, uR, v, zb, zs, verso, mat=mat)
    pts = arco(uc, a, zsp)
    for i in range(len(pts) - 1):
        (ua, za, _), (ub, zb2, _) = pts[i], pts[i + 1]
        f.faccia([(ua, v, za), (ub, v, zb2), (ub, v, zt), (ua, v, zt)], (0, verso, 0), mat=mat)


def vano_arco(f, uc, a, v_fuori, v_dentro, zs, zsp, davanzale=True):
    uL, uR = uc - a, uc + a
    f.faccia([(uL, v_dentro, zs), (uL, v_fuori, zs), (uL, v_fuori, zsp), (uL, v_dentro, zsp)], (1, 0, 0))
    f.faccia([(uR, v_dentro, zs), (uR, v_fuori, zs), (uR, v_fuori, zsp), (uR, v_dentro, zsp)], (-1, 0, 0))
    pts = arco(uc, a, zsp)
    for i in range(len(pts) - 1):
        (ua, za, ta), (ub, zb, tb) = pts[i], pts[i + 1]
        tm = (ta + tb) / 2
        f.faccia([(ua, v_fuori, za), (ub, v_fuori, zb), (ub, v_dentro, zb), (ua, v_dentro, za)],
                 (-math.cos(tm), 0, -math.sin(tm)))
    if davanzale:
        f.faccia([(uL, v_fuori, zs), (uR, v_fuori, zs), (uR, v_dentro, zs), (uL, v_dentro, zs)], (0, 0, 1))


def archivolto(f, uc, a, zsp):
    """Archivolto a due fasce."""
    for (r0, r1, sp) in ((a, a + 0.26, 0.09), (a + 0.26, a + 0.44, 0.15)):
        interno = arco(uc, r0, zsp)
        esterno = arco(uc, r1, zsp)
        for i in range(len(interno) - 1):
            (ui0, zi0, t0), (ui1, zi1, t1) = interno[i], interno[i + 1]
            (ue0, ze0, _), (ue1, ze1, _) = esterno[i], esterno[i + 1]
            tm = (t0 + t1) / 2
            f.faccia([(ui0, sp, zi0), (ui1, sp, zi1), (ue1, sp, ze1), (ue0, sp, ze0)], (0, 1, 0))
            f.faccia([(ue0, 0, ze0), (ue1, 0, ze1), (ue1, sp, ze1), (ue0, sp, ze0)], (math.cos(tm), 0, math.sin(tm)))
            f.faccia([(ui0, 0, zi0), (ui1, 0, zi1), (ui1, sp, zi1), (ui0, sp, zi0)], (-math.cos(tm), 0, -math.sin(tm)))
        for (ui, zi, _), (ue, ze, _) in ((interno[0], esterno[0]), (interno[-1], esterno[-1])):
            f.faccia([(ui, 0, zi), (ue, 0, ze), (ue, sp, ze), (ui, sp, zi)], (0, 0, -1))


def colonna(f, o, up, zb, zt):
    r = o["r"]
    zp = zb + o["piedistallo"]
    if o["piedistallo"] > 0:
        # piedistallo con zoccolo e cimasa
        f.scatola(up - (r + 0.3), up + (r + 0.3), 0, r + 0.3, zb, zb + 0.22, salta=("v0", "z0"))
        f.scatola(up - (r + 0.24), up + (r + 0.24), 0, r + 0.24, zb + 0.22, zp - 0.2, salta=("v0", "z0"))
        f.scatola(up - (r + 0.31), up + (r + 0.31), 0, r + 0.31, zp - 0.2, zp, salta=("v0",))
    # base: plinto quadrato + toro + scozia + toro (attica), solo plinto + toro per il tuscanico
    f.scatola(up - (r + 0.16), up + (r + 0.16), 0, r + 0.16, zp, zp + 0.14, salta=("v0", "z0"))
    base = [(r + 0.14, zp + 0.14)] + [(r + 0.02 + 0.12 * math.sin(math.pi * k / 6), zp + 0.14 + 0.13 * (1 - math.cos(math.pi * k / 6)) / 2 * 2)
                                      for k in range(1, 7)]
    if o["nome"] != "tuscanico":
        base += [(r - 0.03, zp + 0.34), (r + 0.06, zp + 0.42), (r + 0.02, zp + 0.48)]
    base += [(r, base[-1][1] + 0.04)]
    f.tornio(up, base)
    z_fusto = base[-1][1]
    zc = zt - {"tuscanico": 0.62, "ionico": 0.72, "corinzio": 1.25}[o["nome"]]
    # fusto con entasi
    fusto = [(r * (1 - 0.1 * (k / 6) ** 1.6), z_fusto + (zc - z_fusto) * k / 6) for k in range(7)]
    f.tornio(up, fusto)
    rt = fusto[-1][0]
    if o["nome"] == "tuscanico":
        # collarino, echino e abaco
        cap = [(rt, zc), (rt + 0.05, zc + 0.04), (rt + 0.05, zc + 0.12), (rt, zc + 0.14)]
        cap += quarto(rt, zc + 0.14, rt + 0.22, zc + 0.34, 4)
        f.tornio(up, cap)
        f.scatola(up - (rt + 0.26), up + (rt + 0.26), 0, rt + 0.26, zc + 0.34, zt, salta=("v0",))
    elif o["nome"] == "ionico":
        cap = [(rt, zc)] + quarto(rt, zc, rt + 0.14, zc + 0.24, 4)
        f.tornio(up, cap)
        # volute: due rotoli ai lati dell'echino
        for lato in (-1, 1):
            uc = up + lato * (rt + 0.08)
            for i in range(10):
                a0, a1 = 2 * math.pi * i / 10, 2 * math.pi * (i + 1) / 10
                pts = [(uc + 0.17 * math.cos(a0), 0.0, zc + 0.3 + 0.17 * math.sin(a0)),
                       (uc + 0.17 * math.cos(a1), 0.0, zc + 0.3 + 0.17 * math.sin(a1)),
                       (uc + 0.17 * math.cos(a1), rt + 0.2, zc + 0.3 + 0.17 * math.sin(a1)),
                       (uc + 0.17 * math.cos(a0), rt + 0.2, zc + 0.3 + 0.17 * math.sin(a0))]
                am = (a0 + a1) / 2
                f.faccia(pts, (math.cos(am), 0, math.sin(am)), liscia=True)
            f.faccia([(uc + 0.17 * math.cos(2 * math.pi * i / 10), rt + 0.2, zc + 0.3 + 0.17 * math.sin(2 * math.pi * i / 10))
                      for i in range(10)], (0, 1, 0))
        f.scatola(up - (rt + 0.3), up + (rt + 0.3), 0, rt + 0.24, zc + 0.47, zt, salta=("v0",))
    else:
        # campana corinzia con due giri di foglie appena accennati
        cap = [(rt, zc), (rt + 0.03, zc + 0.08), (rt + 0.1, zc + 0.12), (rt + 0.06, zc + 0.42),
               (rt + 0.16, zc + 0.48), (rt + 0.12, zc + 0.8), (rt + 0.26, zc + 0.9), (rt + 0.2, zc + 0.98)]
        f.tornio(up, cap)
        f.scatola(up - (rt + 0.32), up + (rt + 0.32), 0, rt + 0.3, zc + 0.98, zt, salta=("v0",))


def tratti(ks):
    """Campate consecutive: [(prima, ultima), ...]."""
    out = []
    for k in sorted(ks):
        if out and k == out[-1][1] + 1:
            out[-1][1] = k
        else:
            out.append([k, k])
    return [tuple(t) for t in out]


def ordine(f, o, ks, ks_interno=None):
    """ks: campate col muro esterno; ks_interno: campate dove resta solo l'anello interno (rudere)."""
    ks_interno = ks_interno or []
    zb = o["z0"]
    zt = zb + o["h"] - o["he"]
    zs = zb + o["davanzale"]
    zap = zb + o["chiave"]
    zsp = zap - SEMI_ARCO
    zv = zb + o["volta"]
    v1 = -D_MURO
    v2 = v1 - o["w1"]
    v3 = v2 - D_ANELLO2
    v4 = v3 - o["w2"]
    zap2 = zb + o["chiave2"]
    zsp2 = zap2 - SEMI_ARCO2
    zv2 = zap2 + 0.35
    for k in ks:
        uc = k * W
        u0, u1 = uc - W / 2, uc + W / 2
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO, 0.0, 1, zb, zs, zsp, zt)
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO, v1, -1, zb, zs, zsp, zv, mat=1)
        vano_arco(f, uc, SEMI_ARCO, 0.0, v1, zs, zsp, davanzale=o["davanzale"] > 0)
        archivolto(f, uc, SEMI_ARCO, zsp)
        for ua, ub in ((u0 + o["r"] + 0.05, uc - SEMI_ARCO), (uc + SEMI_ARCO, u1 - o["r"] - 0.05)):
            f.scatola(ua, ub, 0, 0.13, zsp - 0.32, zsp - 0.12, salta=("v0",))
            f.scatola(ua, ub, 0, 0.18, zsp - 0.12, zsp, salta=("v0",))
        colonna(f, o, u0, zb, zt)
        if o["davanzale"] > 0:
            f.scatola(u0, u1, 0, 0.32, zs - 0.26, zs, salta=("v0", "u0", "u1"))
            f.scatola(u0, u1, 0, 0.18, zb, zb + 0.3, salta=("v0", "u0", "u1"))
    for k in sorted(set(ks) | set(ks_interno)):
        uc = k * W
        u0, u1 = uc - W / 2, uc + W / 2
        # anello 2: dentro l'ambulacro, o facciata del rudere dove il muro esterno e' crollato
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO2, v2, 1, zb, zb, zsp2, zv if k in ks else zb + o["h"], mat=1 if k in ks else 0)
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO2, v3, -1, zb, zb, zsp2, zv2, mat=1)
        vano_arco(f, uc, SEMI_ARCO2, v2, v3, zb, zsp2, davanzale=False)
        f.rettangolo_v(u0, u1, v4, zb, zv2, 1, mat=1)
    for (ka, kb) in tratti(set(ks) | set(ks_interno)):
        us = punti_u(ka * W - W / 2, kb * W + W / 2)
        vc, rv = (v3 + v4) / 2, (v3 - v4) / 2
        volta(f, us, vc, rv, zv2, mat=1)
        if zb > 0:
            for i in range(len(us) - 1):
                for (va, vb) in ((v2, v3), (v3, v4)):
                    f.faccia([(us[i], va, zb), (us[i + 1], va, zb), (us[i + 1], vb, zb), (us[i], vb, zb)], (0, 0, 1), mat=1)
        for i in range(len(us) - 1):
            f.faccia([(us[i], v2, zb + o["h"]), (us[i + 1], v2, zb + o["h"]), (us[i + 1], v4, zb + o["h"]), (us[i], v4, zb + o["h"])], (0, 0, 1))
    for (ka, kb) in tratti(ks):
        us = punti_u(ka * W - W / 2, kb * W + W / 2)
        volta(f, us, (v1 + v2) / 2, (v1 - v2) / 2, zv, mat=1)
        if zb > 0:
            for i in range(len(us) - 1):
                for (va, vb) in ((0.0, v1), (v1, v2)):
                    f.faccia([(us[i], va, zb), (us[i + 1], va, zb), (us[i + 1], vb, zb), (us[i], vb, zb)], (0, 0, 1), mat=1)
        prof = profilo_trabeazione(o["he"], 1.12)
        f.fascia(us, prof, zt)
        for i in range(len(us) - 1):
            f.faccia([(us[i], 0, zb + o["h"]), (us[i + 1], 0, zb + o["h"]), (us[i + 1], v1, zb + o["h"]), (us[i], v1, zb + o["h"])], (0, 0, 1))
        # testate dove il muro esterno si interrompe: sezione del muro, della volta e della cornice
        for (uu, verso) in ((ka * W - W / 2, -1), (kb * W + W / 2, 1)):
            f.faccia([(uu, v1, zb), (uu, 0, zb), (uu, 0, zb + o["h"]), (uu, v1, zb + o["h"])], (verso, 0, 0))
            f.faccia([(uu, v2, zv), (uu, v1, zv), (uu, v1, zb + o["h"]), (uu, v2, zb + o["h"])], (verso, 0, 0))
            f.faccia([(uu, v, zt + z) for (v, z) in prof], (verso, 0, 0))


def volta(f, us, vc, rv, zimp, seg=12, mat=0):
    for j in range(seg):
        p0, p1 = math.pi * j / seg, math.pi * (j + 1) / seg
        pm = (p0 + p1) / 2
        a0 = (vc + rv * math.cos(p0), zimp + rv * math.sin(p0))
        a1 = (vc + rv * math.cos(p1), zimp + rv * math.sin(p1))
        for i in range(len(us) - 1):
            f.faccia([(us[i], a0[0], a0[1]), (us[i + 1], a0[0], a0[1]), (us[i + 1], a1[0], a1[1]), (us[i], a1[0], a1[1])],
                     (0, -math.cos(pm), -math.sin(pm)), liscia=True, mat=mat)


def attico(f, ks):
    zb = ATTICO["z0"]
    ztop = zb + ATTICO["h"]
    base = [(0, 0), (0.36, 0), (0.36, 0.5)] + quarto(0.36, 0.5, 0.2, 0.8, 3, convesso=False) + [(0.18, 1.05), (0, 1.05)]
    cima = [(0, 0), (0.38, 0), (0.38, 0.4)] + quarto(0.38, 0.4, 0.62, 0.62, 3) + [(0.62, 0.95)]
    cima += quarto(0.62, 0.95, 1.16, 1.3, 4, convesso=False) + [(1.16, 1.75), (0, 1.75)]
    zf0 = zb + base[-1][1]
    zf1 = ztop - cima[-1][1]
    for (ka, kb) in tratti(ks):
        us = punti_u(ka * W - W / 2, kb * W + W / 2)
        f.fascia(us, base, zb)
        f.fascia(us, cima, zf1)
        for i in range(len(us) - 1):
            f.faccia([(us[i], 0, ztop), (us[i + 1], 0, ztop), (us[i + 1], -D_MURO, ztop), (us[i], -D_MURO, ztop)], (0, 0, 1))
            f.faccia([(us[i], -D_MURO, zb), (us[i + 1], -D_MURO, zb), (us[i + 1], -D_MURO, ztop), (us[i], -D_MURO, ztop)], (0, -1, 0))
        for (uu, verso) in ((ka * W - W / 2, -1), (kb * W + W / 2, 1)):
            f.faccia([(uu, -D_MURO, zb), (uu, 0, zb), (uu, 0, ztop), (uu, -D_MURO, ztop)], (verso, 0, 0))
    for k in ks:
        uc = k * W
        u0, u1 = uc - W / 2, uc + W / 2
        if k % 2 == 0:
            fw, fz0, fz1, prof = 0.85, zb + 4.3, zb + 7.0, 0.9
            f.rettangolo_v(u0, uc - fw, 0, zf0, zf1, 1)
            f.rettangolo_v(uc + fw, u1, 0, zf0, zf1, 1)
            f.rettangolo_v(uc - fw, uc + fw, 0, zf0, fz0, 1)
            f.rettangolo_v(uc - fw, uc + fw, 0, fz1, zf1, 1)
            f.scatola(uc - fw, uc + fw, -prof, 0, fz0, fz1, salta=("v1",))
            # cornice della finestra
            f.scatola(uc - fw - 0.16, uc + fw + 0.16, 0, 0.08, fz1, fz1 + 0.18, salta=("v0",))
            f.scatola(uc - fw - 0.1, uc + fw + 0.1, 0, 0.1, fz0 - 0.16, fz0, salta=("v0",))
        else:
            f.rettangolo_v(u0, u1, 0, zf0, zf1, 1)
        f.scatola(u0 - 0.52, u0 + 0.52, 0, 0.2, zf0, zf1 - 0.7, salta=("v0",))
        f.scatola(u0 - 0.6, u0 + 0.6, 0, 0.26, zf1 - 0.7, zf1 - 0.25, salta=("v0",))
        f.scatola(u0 - 0.68, u0 + 0.68, 0, 0.32, zf1 - 0.25, zf1, salta=("v0",))
        for du in (-1.75, 0.0, 1.75):
            f.scatola(uc + du - 0.2, uc + du + 0.2, 0, 0.55, zf1 - 1.85, zf1 - 1.45, salta=("v0",))
            f.scatola(uc + du - 0.16, uc + du + 0.16, 0, 0.42, zf1 - 2.05, zf1 - 1.85, salta=("v0",))


def cresta(f, u0, u1, v0, v1, z, seme, alt_max=2.6):
    """Blocchi di altezza casuale lungo la cima di un muro rotto: la sagoma del rudere."""
    rnd = random.Random(seme)
    u = u0
    while u < u1 - 0.2:
        lung = min(rnd.uniform(0.5, 1.6), u1 - u)
        alt = rnd.uniform(0.0, alt_max) * rnd.choice((0.3, 0.7, 1.0, 1.0))
        if alt > 0.12:
            dv = rnd.uniform(0.0, 0.5)
            f.scatola(u, u + lung, v0 + dv, v1 - rnd.uniform(0.0, 0.4), z, z + alt, salta=("z0",))
        u += lung


# ---------------------------------------------------------------------------------------------
# Materiali procedurali (Cycles)


def _nodi(m):
    if getattr(m, "node_tree", None) is None:
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt, nt.nodes, nt.links


def _n(nodi, tipo, x, y, **valori):
    n = nodi.new(tipo)
    n.location = (x, y)
    for k, v in valori.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


def materiale_travertino(nome="Travertino HQ", scala_blocchi=1.0, scurisci=1.0):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 1400, 0)
    bsdf = _n(N, "ShaderNodeBsdfPrincipled", 1100, 0, Roughness=0.86)
    L.new(bsdf.outputs[0], out.inputs[0])
    uv = _n(N, "ShaderNodeTexCoord", -1400, 0)
    geo = _n(N, "ShaderNodeNewGeometry", -1400, -400)
    # blocchi di travertino: corsi alti circa 0,6-1,2 m, giunti sottili
    blocchi = _n(N, "ShaderNodeTexBrick", -1000, 300, offset=0.5, offset_frequency=2, squash=1.0, squash_frequency=2)
    blocchi.inputs["Scale"].default_value = 1.0
    blocchi.inputs["Mortar Size"].default_value = 0.012
    blocchi.inputs["Mortar Smooth"].default_value = 0.4
    blocchi.inputs["Brick Width"].default_value = 1.55 * scala_blocchi
    blocchi.inputs["Row Height"].default_value = 0.62 * scala_blocchi
    blocchi.inputs["Color1"].default_value = (0.84, 0.72, 0.54, 1)
    blocchi.inputs["Color2"].default_value = (0.74, 0.62, 0.46, 1)
    L.new(uv.outputs["UV"], blocchi.inputs["Vector"])
    # variazione di colore a macchie
    macchie = _n(N, "ShaderNodeTexNoise", -1000, 0, noise_dimensions="3D")
    macchie.inputs["Scale"].default_value = 0.35
    macchie.inputs["Detail"].default_value = 6
    macchie.inputs["Roughness"].default_value = 0.6
    L.new(uv.outputs["Object"], macchie.inputs["Vector"])
    rampa = _n(N, "ShaderNodeValToRGB", -760, 0)
    rampa.color_ramp.elements[0].position = 0.38
    rampa.color_ramp.elements[0].color = (0.48, 0.36, 0.24, 1)
    rampa.color_ramp.elements[1].position = 0.68
    rampa.color_ramp.elements[1].color = (0.88, 0.74, 0.53, 1)
    L.new(macchie.outputs["Fac"], rampa.inputs["Fac"])
    # pori del travertino e erosione
    pori = _n(N, "ShaderNodeTexVoronoi", -1000, -300, feature="SMOOTH_F1")
    pori.inputs["Scale"].default_value = 22
    L.new(uv.outputs["UV"], pori.inputs["Vector"])
    erosione = _n(N, "ShaderNodeTexNoise", -1000, -600, noise_dimensions="3D")
    erosione.inputs["Scale"].default_value = 3.5
    erosione.inputs["Detail"].default_value = 10
    erosione.inputs["Roughness"].default_value = 0.7
    L.new(uv.outputs["Object"], erosione.inputs["Vector"])
    # buchi delle grappe di ferro asportate: tondi scuri sparsi sui giunti
    buchi = _n(N, "ShaderNodeTexVoronoi", -1000, -900, feature="F1")
    buchi.inputs["Scale"].default_value = 0.85
    L.new(uv.outputs["UV"], buchi.inputs["Vector"])
    soglia = _n(N, "ShaderNodeMapRange", -760, -900)
    soglia.inputs["From Min"].default_value = 0.035
    soglia.inputs["From Max"].default_value = 0.06
    soglia.inputs["To Min"].default_value = 1.0
    soglia.inputs["To Max"].default_value = 0.0
    L.new(buchi.outputs["Distance"], soglia.inputs["Value"])
    # sporco: piu' scuro in basso e nelle cavita'
    quota = _n(N, "ShaderNodeSeparateXYZ", -1200, -1200)
    L.new(geo.outputs["Position"], quota.inputs[0])
    sporco = _n(N, "ShaderNodeMapRange", -1000, -1200)
    sporco.inputs["From Min"].default_value = 0.0
    sporco.inputs["From Max"].default_value = 9.0
    sporco.inputs["To Min"].default_value = 0.62
    sporco.inputs["To Max"].default_value = 1.0
    L.new(quota.outputs["Z"], sporco.inputs["Value"])
    ao = _n(N, "ShaderNodeAmbientOcclusion", -1000, -1450, samples=8)
    ao.inputs["Distance"].default_value = 1.6
    # colore: macchie x blocchi x giunti x buchi x sporco
    m1 = _n(N, "ShaderNodeMix", -500, 200, data_type="RGBA", blend_type="MULTIPLY")
    m1.inputs["Factor"].default_value = 0.55
    L.new(rampa.outputs["Color"], m1.inputs["A"])
    L.new(blocchi.outputs["Color"], m1.inputs["B"])
    giunto = _n(N, "ShaderNodeMix", -300, 200, data_type="RGBA", blend_type="MIX")
    L.new(blocchi.outputs["Fac"], giunto.inputs["Factor"])
    L.new(m1.outputs["Result"], giunto.inputs["A"])
    giunto.inputs["B"].default_value = (0.36, 0.3, 0.24, 1)
    buco = _n(N, "ShaderNodeMix", -100, 200, data_type="RGBA", blend_type="MIX")
    L.new(soglia.outputs["Result"], buco.inputs["Factor"])
    L.new(giunto.outputs["Result"], buco.inputs["A"])
    buco.inputs["B"].default_value = (0.12, 0.1, 0.08, 1)
    scuro = _n(N, "ShaderNodeMix", 100, 200, data_type="RGBA", blend_type="MULTIPLY")
    scuro.inputs["Factor"].default_value = 1.0
    L.new(buco.outputs["Result"], scuro.inputs["A"])
    grigio = _n(N, "ShaderNodeCombineColor", -100, -100)
    L.new(sporco.outputs["Result"], grigio.inputs[0])
    L.new(sporco.outputs["Result"], grigio.inputs[1])
    L.new(sporco.outputs["Result"], grigio.inputs[2])
    L.new(grigio.outputs[0], scuro.inputs["B"])
    cav = _n(N, "ShaderNodeMix", 300, 200, data_type="RGBA", blend_type="MULTIPLY")
    cav.inputs["Factor"].default_value = 0.65
    L.new(scuro.outputs["Result"], cav.inputs["A"])
    L.new(ao.outputs["Color"], cav.inputs["B"])
    colature = _n(N, "ShaderNodeTexNoise", -1000, -1700, noise_dimensions="3D")
    colature.inputs["Scale"].default_value = 1.6
    colature.inputs["Detail"].default_value = 5
    stira = _n(N, "ShaderNodeMapping", -1200, -1700)
    stira.inputs["Scale"].default_value = (1.0, 1.0, 0.12)
    L.new(uv.outputs["Object"], stira.inputs["Vector"])
    L.new(stira.outputs["Vector"], colature.inputs["Vector"])
    crosta = _n(N, "ShaderNodeMapRange", -760, -1700)
    crosta.inputs["From Min"].default_value = 0.52
    crosta.inputs["From Max"].default_value = 0.68
    crosta.inputs["To Max"].default_value = 0.72
    L.new(colature.outputs["Fac"], crosta.inputs["Value"])
    nero = _n(N, "ShaderNodeMix", 500, 200, data_type="RGBA", blend_type="MIX")
    L.new(crosta.outputs["Result"], nero.inputs["Factor"])
    L.new(cav.outputs["Result"], nero.inputs["A"])
    nero.inputs["B"].default_value = (0.16, 0.14, 0.12, 1)
    ombra = _n(N, "ShaderNodeMix", 700, 200, data_type="RGBA", blend_type="MULTIPLY")
    ombra.inputs["Factor"].default_value = 1.0
    L.new(nero.outputs["Result"], ombra.inputs["A"])
    ombra.inputs["B"].default_value = (scurisci, scurisci * 0.96, scurisci * 0.9, 1)  # interni: piu' scuri e sporchi
    L.new(ombra.outputs["Result"], bsdf.inputs["Base Color"])
    # rilievo: giunti e buchi incavati, pori ed erosione
    h1 = _n(N, "ShaderNodeMath", -500, -400, operation="MULTIPLY_ADD")
    L.new(pori.outputs["Distance"], h1.inputs[0])
    h1.inputs[1].default_value = 0.35
    L.new(erosione.outputs["Fac"], h1.inputs[2])
    h2 = _n(N, "ShaderNodeMath", -300, -400, operation="MULTIPLY_ADD")
    L.new(blocchi.outputs["Fac"], h2.inputs[0])
    h2.inputs[1].default_value = -0.9
    L.new(h1.outputs[0], h2.inputs[2])
    h3 = _n(N, "ShaderNodeMath", -100, -400, operation="MULTIPLY_ADD")
    L.new(soglia.outputs["Result"], h3.inputs[0])
    h3.inputs[1].default_value = -1.4
    L.new(h2.outputs[0], h3.inputs[2])
    bump = _n(N, "ShaderNodeBump", 600, -300)
    bump.inputs["Strength"].default_value = 0.75
    bump.inputs["Distance"].default_value = 0.035
    L.new(h3.outputs[0], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def materiale_sampietrini(nome="Sampietrini"):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 1000, 0)
    bsdf = _n(N, "ShaderNodeBsdfPrincipled", 700, 0, Roughness=0.62)
    L.new(bsdf.outputs[0], out.inputs[0])
    uv = _n(N, "ShaderNodeTexCoord", -1000, 0)
    pietre = _n(N, "ShaderNodeTexBrick", -700, 200, offset=0.5, offset_frequency=2)
    pietre.inputs["Scale"].default_value = 1.0
    pietre.inputs["Mortar Size"].default_value = 0.014
    pietre.inputs["Mortar Smooth"].default_value = 0.6
    pietre.inputs["Brick Width"].default_value = 0.125
    pietre.inputs["Row Height"].default_value = 0.125
    pietre.inputs["Color1"].default_value = (0.15, 0.142, 0.135, 1)
    pietre.inputs["Color2"].default_value = (0.3, 0.282, 0.262, 1)
    storto = _n(N, "ShaderNodeTexNoise", -1200, 300)
    storto.inputs["Scale"].default_value = 7.0
    L.new(uv.outputs["UV"], storto.inputs["Vector"])
    centra = _n(N, "ShaderNodeVectorMath", -1000, 300, operation="SUBTRACT")
    L.new(storto.outputs["Color"], centra.inputs[0])
    centra.inputs[1].default_value = (0.5, 0.5, 0.5)
    piega = _n(N, "ShaderNodeVectorMath", -900, 300, operation="MULTIPLY_ADD")
    L.new(centra.outputs["Vector"], piega.inputs[0])
    piega.inputs[1].default_value = (0.022, 0.022, 0.0)
    L.new(uv.outputs["UV"], piega.inputs[2])
    L.new(piega.outputs["Vector"], pietre.inputs["Vector"])
    var = _n(N, "ShaderNodeTexNoise", -700, -150)
    var.inputs["Scale"].default_value = 9
    var.inputs["Detail"].default_value = 4
    L.new(uv.outputs["UV"], var.inputs["Vector"])
    tinta = _n(N, "ShaderNodeMix", -400, 200, data_type="RGBA", blend_type="OVERLAY")
    tinta.inputs["Factor"].default_value = 0.6
    L.new(pietre.outputs["Color"], tinta.inputs["A"])
    L.new(var.outputs["Color"], tinta.inputs["B"])
    fuga = _n(N, "ShaderNodeMix", -200, 200, data_type="RGBA", blend_type="MIX")
    L.new(pietre.outputs["Fac"], fuga.inputs["Factor"])
    L.new(tinta.outputs["Result"], fuga.inputs["A"])
    fuga.inputs["B"].default_value = (0.08, 0.07, 0.06, 1)
    # da lontano il disegno delle pietre diventa piu' fine dei pixel (moire'): si sfuma in un grigio
    # medio a chiazze larghe, prima il rilievo (6-24 m) poi il colore (10-45 m)
    cam = _n(N, "ShaderNodeCameraData", -700, 500)
    lontano = _n(N, "ShaderNodeMapRange", -400, 500)
    lontano.inputs["From Min"].default_value = 6.0
    lontano.inputs["From Max"].default_value = 24.0
    L.new(cam.outputs["View Distance"], lontano.inputs["Value"])
    lontano_c = _n(N, "ShaderNodeMapRange", -400, 700)
    lontano_c.inputs["From Min"].default_value = 10.0
    lontano_c.inputs["From Max"].default_value = 45.0
    L.new(cam.outputs["View Distance"], lontano_c.inputs["Value"])
    chiazze = _n(N, "ShaderNodeTexNoise", -700, 800, noise_dimensions="3D")
    chiazze.inputs["Scale"].default_value = 0.18
    chiazze.inputs["Detail"].default_value = 5
    L.new(uv.outputs["Object"], chiazze.inputs["Vector"])
    grigio = _n(N, "ShaderNodeValToRGB", -400, 900)
    grigio.color_ramp.elements[0].position = 0.3
    grigio.color_ramp.elements[0].color = (0.1, 0.095, 0.09, 1)
    grigio.color_ramp.elements[1].position = 0.75
    grigio.color_ramp.elements[1].color = (0.2, 0.19, 0.178, 1)
    L.new(chiazze.outputs["Fac"], grigio.inputs["Fac"])
    medio = _n(N, "ShaderNodeMix", 0, 300, data_type="RGBA", blend_type="MIX")
    L.new(lontano_c.outputs["Result"], medio.inputs["Factor"])
    L.new(fuga.outputs["Result"], medio.inputs["A"])
    L.new(grigio.outputs["Color"], medio.inputs["B"])
    L.new(medio.outputs["Result"], bsdf.inputs["Base Color"])
    cupola = _n(N, "ShaderNodeTexNoise", -700, -400)
    cupola.inputs["Scale"].default_value = 30
    cupola.inputs["Detail"].default_value = 3
    L.new(uv.outputs["UV"], cupola.inputs["Vector"])
    h = _n(N, "ShaderNodeMath", -300, -300, operation="MULTIPLY_ADD")
    L.new(pietre.outputs["Fac"], h.inputs[0])
    h.inputs[1].default_value = -1.0
    L.new(cupola.outputs["Fac"], h.inputs[2])
    bump = _n(N, "ShaderNodeBump", 400, -300)
    bump.inputs["Distance"].default_value = 0.02
    forza = _n(N, "ShaderNodeMapRange", 200, -500)
    forza.inputs["To Min"].default_value = 0.9
    forza.inputs["To Max"].default_value = 0.0
    L.new(lontano.outputs["Result"], forza.inputs["Value"])
    L.new(forza.outputs["Result"], bump.inputs["Strength"])
    L.new(h.outputs[0], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    # lucidi dove si cammina, opachi nelle fughe
    rug = _n(N, "ShaderNodeMapRange", 300, -100)
    rug.inputs["To Min"].default_value = 0.5
    rug.inputs["To Max"].default_value = 0.95
    L.new(pietre.outputs["Fac"], rug.inputs["Value"])
    L.new(rug.outputs["Result"], bsdf.inputs["Roughness"])
    return m


# ---------------------------------------------------------------------------------------------
# Costruzione


def oggetto_da_facce(nome, facce, materiali, collezione):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    for pts, uv, liscia, mat in facce.lista:
        vs = [bm.verts.new(p) for p in pts]
        try:
            fc = bm.faces.new(vs)
        except ValueError:
            continue
        fc.smooth = liscia
        fc.material_index = mat
        for loop, (x, y) in zip(fc.loops, uv):
            loop[uvl].uv = (x, y)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    for m in materiali:
        me.materials.append(m)
    ob = bpy.data.objects.new(nome, me)
    collezione.objects.link(ob)
    return ob


def prepara_scena():
    scena = bpy.data.scenes.get(SCENA) or bpy.data.scenes.new(SCENA)
    if bpy.context.window is not None:
        bpy.context.window.scene = scena
    col = bpy.data.collections.get(COLLEZIONE)
    if col is None:
        col = bpy.data.collections.new(COLLEZIONE)
        scena.collection.children.link(col)
    for ob in list(col.objects):
        if ob.get("rr_hq") == "lupa":
            continue  # la lupa ha un suo script
        dati = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if dati is not None and getattr(dati, "users", 1) == 0:
            for coll in (bpy.data.meshes, bpy.data.cameras, bpy.data.lights, bpy.data.curves):
                if dati.name in coll and coll[dati.name] == dati:
                    coll.remove(dati)
                    break
    return scena, col


def mondo(scena, hdri="the_sky_is_on_fire_4k.hdr", rotazione_gradi=0.0, forza=1.0, forza_luce=0.3, calore=0.25,
          bagliore=None, saturazione=0.45):
    """Cielo HDRI corretto come una foto al tramonto: colori dell'HDRI in parte desaturati e ritinti con una
    sfumatura calda all'orizzonte e grigio-azzurra allo zenit, piu' il bagliore attorno al sole (azimut,
    altezza in gradi). Per le riprese pieno, per l'illuminazione piu' tenue (la luce la da' il sole)."""
    w = bpy.data.worlds.get("Copertina HQ") or bpy.data.worlds.new("Copertina HQ")
    nt, N, L = _nodi(w)
    out = _n(N, "ShaderNodeOutputWorld", 1500, 0)
    bg = _n(N, "ShaderNodeBackground", 1100, 100, Strength=forza)
    bgl = _n(N, "ShaderNodeBackground", 1100, -100, Strength=forza_luce)
    lp = _n(N, "ShaderNodeLightPath", 1100, 300)
    mix = _n(N, "ShaderNodeMixShader", 1300, 0)
    L.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
    L.new(bgl.outputs[0], mix.inputs[1])
    L.new(bg.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs["Surface"])
    tc = _n(N, "ShaderNodeTexCoord", -900, 0)
    mp = _n(N, "ShaderNodeMapping", -700, 0)
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(rotazione_gradi))
    env = _n(N, "ShaderNodeTexEnvironment", -450, 0)
    percorso = os.path.join(CARTELLA, "hdri", hdri)
    img = bpy.data.images.get(hdri) or bpy.data.images.load(percorso, check_existing=True)
    env.image = img
    L.new(tc.outputs["Generated"], mp.inputs["Vector"])
    L.new(mp.outputs["Vector"], env.inputs["Vector"])
    # vicino all'orizzonte l'HDRI ha palazzi, colline e un lampione: sotto i 14 gradi si sfuma verso la media
    # di sei campioni del cielo presi a 15 e 19 gradi, allargati di +-4 gradi in azimut (niente righe verticali)
    d = _n(N, "ShaderNodeSeparateXYZ", -1500, 500)
    L.new(tc.outputs["Generated"], d.inputs[0])
    piano = _n(N, "ShaderNodeCombineXYZ", -1300, 450)
    L.new(d.outputs["X"], piano.inputs[0])
    L.new(d.outputs["Y"], piano.inputs[1])
    pn = _n(N, "ShaderNodeVectorMath", -1150, 450, operation="NORMALIZE")
    L.new(piano.outputs[0], pn.inputs[0])
    somma = None
    k = 0
    for el in (15.0, 19.0):
        sc_ = _n(N, "ShaderNodeVectorMath", -1000, 450 - k * 60, operation="SCALE")
        L.new(pn.outputs["Vector"], sc_.inputs[0])
        sc_.inputs["Scale"].default_value = math.cos(math.radians(el))
        de = _n(N, "ShaderNodeVectorMath", -850, 450 - k * 60, operation="ADD")
        L.new(sc_.outputs["Vector"], de.inputs[0])
        de.inputs[1].default_value = (0.0, 0.0, math.sin(math.radians(el)))
        for daz in (-4.0, 0.0, 4.0):
            mk = _n(N, "ShaderNodeMapping", -700, 450 - k * 60)
            mk.inputs["Rotation"].default_value = (0, 0, math.radians(rotazione_gradi + daz))
            L.new(de.outputs["Vector"], mk.inputs["Vector"])
            ek = _n(N, "ShaderNodeTexEnvironment", -500, 450 - k * 60)
            ek.image = img
            L.new(mk.outputs["Vector"], ek.inputs["Vector"])
            if somma is None:
                somma = ek.outputs["Color"]
            else:
                ad = _n(N, "ShaderNodeMix", -300, 450 - k * 60, data_type="RGBA", blend_type="ADD")
                ad.inputs["Factor"].default_value = 1.0
                L.new(somma, ad.inputs["A"])
                L.new(ek.outputs["Color"], ad.inputs["B"])
                somma = ad.outputs["Result"]
            k += 1
    media = _n(N, "ShaderNodeMix", -150, 450, data_type="RGBA", blend_type="MULTIPLY")
    media.inputs["Factor"].default_value = 1.0
    L.new(somma, media.inputs["A"])
    media.inputs["B"].default_value = (1 / 6, 1 / 6, 1 / 6, 1)
    basso = _n(N, "ShaderNodeMapRange", -350, 650, interpolation_type="SMOOTHSTEP")
    basso.inputs["From Min"].default_value = math.sin(math.radians(5.0))
    basso.inputs["From Max"].default_value = math.sin(math.radians(14.0))
    basso.inputs["To Min"].default_value = 1.0
    basso.inputs["To Max"].default_value = 0.0
    L.new(d.outputs["Z"], basso.inputs["Value"])
    pulito = _n(N, "ShaderNodeMix", 50, 450, data_type="RGBA", blend_type="MIX")
    L.new(basso.outputs["Result"], pulito.inputs["Factor"])
    L.new(env.outputs["Color"], pulito.inputs["A"])
    L.new(media.outputs["Result"], pulito.inputs["B"])
    # viraggio come nella foto: il cielo scuro tra le nuvole grigio-azzurro, le nuvole accese arancio e oro
    # (colore = luminanza dell'HDRI x tinta scelta dalla luminanza), poi un po' dei colori originali
    lum = _n(N, "ShaderNodeRGBToBW", 250, 300)
    L.new(pulito.outputs["Result"], lum.inputs[0])
    lumn = _n(N, "ShaderNodeMapRange", 400, 300)
    lumn.inputs["From Min"].default_value = 0.5
    lumn.inputs["From Max"].default_value = 1.8
    L.new(lum.outputs[0], lumn.inputs["Value"])
    viraggio = _n(N, "ShaderNodeValToRGB", 550, 300)
    rv = viraggio.color_ramp
    rv.elements[0].position = 0.0
    rv.elements[0].color = (0.6, 0.72, 1.12, 1)
    rv.elements[1].position = 1.0
    rv.elements[1].color = (1.45, 1.08, 0.6, 1)
    for pos_, col_ in ((0.3, (1.2, 0.8, 0.66, 1)), (0.62, (1.55, 0.86, 0.45, 1))):
        e = rv.elements.new(pos_)
        e.color = col_
    L.new(lumn.outputs["Result"], viraggio.inputs["Fac"])
    grigio = _n(N, "ShaderNodeCombineColor", 400, 150)
    for k in range(3):
        L.new(lum.outputs[0], grigio.inputs[k])
    tinto = _n(N, "ShaderNodeMix", 700, 250, data_type="RGBA", blend_type="MULTIPLY")
    tinto.inputs["Factor"].default_value = 1.0
    L.new(grigio.outputs[0], tinto.inputs["A"])
    L.new(viraggio.outputs["Color"], tinto.inputs["B"])
    smorto = _n(N, "ShaderNodeHueSaturation", 550, 50)
    smorto.inputs["Saturation"].default_value = saturazione
    L.new(pulito.outputs["Result"], smorto.inputs["Color"])
    parte = _n(N, "ShaderNodeMix", 850, 150, data_type="RGBA", blend_type="MIX")
    parte.inputs["Factor"].default_value = calore
    L.new(tinto.outputs["Result"], parte.inputs["A"])
    L.new(smorto.outputs["Color"], parte.inputs["B"])
    # sfumatura in altezza (direzione di vista non ruotata)
    sep = _n(N, "ShaderNodeSeparateXYZ", -450, -300)
    L.new(tc.outputs["Generated"], sep.inputs[0])
    quota = _n(N, "ShaderNodeMapRange", -250, -300)
    quota.inputs["From Min"].default_value = 0.0
    quota.inputs["From Max"].default_value = 0.6
    L.new(sep.outputs["Z"], quota.inputs["Value"])
    rampa = _n(N, "ShaderNodeValToRGB", -50, -300)
    rampa.color_ramp.elements[0].position = 0.0
    rampa.color_ramp.elements[0].color = (1.12, 0.88, 0.66, 1)
    rampa.color_ramp.elements[1].position = 1.0
    rampa.color_ramp.elements[1].color = (0.4, 0.46, 0.62, 1)
    el = rampa.color_ramp.elements.new(0.32)
    el.color = (0.95, 0.84, 0.76, 1)
    L.new(quota.outputs["Result"], rampa.inputs["Fac"])
    tinta = rampa.outputs["Color"]
    if bagliore is not None:
        az, alt = math.radians(bagliore[0]), math.radians(bagliore[1])
        dirs = _n(N, "ShaderNodeCombineXYZ", -450, -600)
        dirs.inputs[0].default_value = math.cos(az) * math.cos(alt)
        dirs.inputs[1].default_value = math.sin(az) * math.cos(alt)
        dirs.inputs[2].default_value = math.sin(alt)
        dot = _n(N, "ShaderNodeVectorMath", -250, -600, operation="DOT_PRODUCT")
        L.new(tc.outputs["Generated"], dot.inputs[0])
        L.new(dirs.outputs[0], dot.inputs[1])
        vic = _n(N, "ShaderNodeMapRange", -50, -600)
        vic.inputs["From Min"].default_value = 0.55
        vic.inputs["From Max"].default_value = 1.0
        L.new(dot.outputs["Value"], vic.inputs["Value"])
        pot = _n(N, "ShaderNodeMath", 150, -600, operation="POWER")
        pot.inputs[1].default_value = 2.2
        L.new(vic.outputs["Result"], pot.inputs[0])
        glow = _n(N, "ShaderNodeMix", 350, -400, data_type="RGBA", blend_type="MIX")
        L.new(pot.outputs[0], glow.inputs["Factor"])
        L.new(tinta, glow.inputs["A"])
        glow.inputs["B"].default_value = (1.7, 1.0, 0.5, 1)
        tinta = glow.outputs["Result"]
    cielo = _n(N, "ShaderNodeMix", 1000, 0, data_type="RGBA", blend_type="MULTIPLY")
    cielo.inputs["Factor"].default_value = 1.0
    L.new(parte.outputs["Result"], cielo.inputs["A"])
    L.new(tinta, cielo.inputs["B"])
    L.new(cielo.outputs["Result"], bg.inputs["Color"])
    # luce d'ambiente un po' piu' calda del cielo visto (rimbalzi sul travertino e sui sampietrini)
    ambiente = _n(N, "ShaderNodeMix", 1100, -250, data_type="RGBA", blend_type="MIX")
    ambiente.inputs["Factor"].default_value = 0.35
    L.new(cielo.outputs["Result"], ambiente.inputs["A"])
    ambiente.inputs["B"].default_value = (1.0, 0.68, 0.45, 1)
    L.new(ambiente.outputs["Result"], bgl.inputs["Color"])
    scena.world = w
    return w


def sole(col, azimut_gradi, altezza_gradi, forza=4.5, colore=(1.0, 0.72, 0.45)):
    luce = bpy.data.lights.new("Sole HQ", type="SUN")
    luce.energy = forza
    luce.angle = math.radians(0.9)
    luce.color = colore
    ob = bpy.data.objects.new("Sole HQ", luce)
    col.objects.link(ob)
    az, al = math.radians(azimut_gradi), math.radians(altezza_gradi)
    verso = Vector((math.cos(az) * math.cos(al), math.sin(az) * math.cos(al), math.sin(al)))
    ob.rotation_euler = (-verso).to_track_quat("-Z", "Y").to_euler()
    return ob


def suolo(f_trav, f_pietre, u0, u1):
    us = punti_u(u0, u1, per_campata=2)
    o = ORDINI[0]
    v_int = -(D_MURO + o["w1"] + D_ANELLO2 + o["w2"])
    # dentro il monumento e la fascia di travertino attorno
    vs_t = [v_int, -(D_MURO + o["w1"] + D_ANELLO2), -(D_MURO + o["w1"]), -D_MURO, 0.0, 1.5, 4.0, 8.0]
    for i in range(len(us) - 1):
        for j in range(len(vs_t) - 1):
            f_trav.faccia([(us[i], vs_t[j], 0), (us[i + 1], vs_t[j], 0), (us[i + 1], vs_t[j + 1], 0), (us[i], vs_t[j + 1], 0)], (0, 0, 1))
    vs_p = [8.0, 14.0, 24.0, 40.0, 70.0, 120.0, 200.0, 320.0]
    for i in range(len(us) - 1):
        for j in range(len(vs_p) - 1):
            f_pietre.faccia([(us[i], vs_p[j], -0.02), (us[i + 1], vs_p[j], -0.02), (us[i + 1], vs_p[j + 1], -0.02), (us[i], vs_p[j + 1], -0.02)], (0, 0, 1))


# Il crollo (come sul lato sud del Colosseo vero): a destra della camera il muro esterno scende a
# gradini e oltre resta l'anello interno con due ordini di archi.
ROTTURA = 4  # campate dopo l'asse ovest in cui il muro esterno e' ancora intero


def costruisci_hq(hdri="the_sky_is_on_fire_4k.hdr", rotazione_cielo=0.0, rottura=ROTTURA, crollo=22):
    scena, col = prepara_scena()
    k0 = round(U_OVEST / W)
    tutte = list(range(k0 - N_CAMPATE // 2, k0 + N_CAMPATE // 2))
    kr = k0 + rottura
    # da kr in poi il muro esterno sparisce a gradini, poi riappare dall'altra parte dell'ellisse
    crollate = set(range(kr + 3, kr + 3 + crollo))
    esterno = [
        [k for k in tutte if k not in crollate and not (kr + 2 < k <= kr + 2)],          # piano terra
        [k for k in tutte if k not in crollate and k not in (kr + 2,)],                  # secondo ordine
        [k for k in tutte if k not in crollate and k not in (kr + 1, kr + 2)],          # terzo ordine
    ]
    attico_ks = [k for k in tutte if k not in crollate and k not in (kr, kr + 1, kr + 2)]
    f = Facce()
    for i, o in enumerate(ORDINI):
        interno = sorted(crollate | ({kr + 2} if i else set()) | ({kr + 1} if i == 2 else set())) if i < 2 else []
        ordine(f, o, esterno[i], interno)
    attico(f, attico_ks)
    # creste irregolari sui muri rotti
    o2 = ORDINI[1]
    for n, k in enumerate(sorted(crollate)):
        cresta(f, k * W - W / 2, k * W + W / 2, -(D_MURO + o2["w1"] + D_ANELLO2), -(D_MURO + o2["w1"]), o2["z0"] + o2["h"], 100 + n)
    o3 = ORDINI[2]
    cresta(f, kr * W - W / 2, kr * W + W / 2, -D_MURO, 0.0, ATTICO["z0"], 7, alt_max=4.5)
    cresta(f, (kr + 1) * W - W / 2, (kr + 1) * W + W / 2, -D_MURO, 0.0, o3["z0"], 8, alt_max=5.0)
    cresta(f, (kr + 2) * W - W / 2, (kr + 2) * W + W / 2, -D_MURO, 0.0, o2["z0"], 9, alt_max=3.5)
    ks = tutte
    trav = materiale_travertino()
    colosseo = oggetto_da_facce("Colosseo HQ", f, [trav, materiale_travertino("Travertino interno", scurisci=0.42)], col)
    ft, fp = Facce(), Facce()
    suolo(ft, fp, ks[0] * W, ks[-1] * W + W)
    pav = oggetto_da_facce("Pavimento HQ", ft, [materiale_travertino("Travertino pavimento", 1.4)], col)
    pie = oggetto_da_facce("Sampietrini HQ", fp, [materiale_sampietrini()], col)
    # piano di fondo: arena, e oltre i sampietrini fino all'orizzonte
    me = bpy.data.meshes.new("Fondo HQ")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3000)
    bm.to_mesh(me)
    bm.free()
    fondo = bpy.data.objects.new("Fondo HQ", me)
    fondo.location.z = -0.08
    me.materials.append(materiale_sampietrini())
    col.objects.link(fondo)
    mondo(scena, hdri, rotazione_cielo)
    return {"campate": (ks[0], ks[-1]), "triangoli": sum(len(p.vertices) - 2 for p in colosseo.data.polygons),
            "vertici": len(colosseo.data.vertices), "pavimento": len(pav.data.polygons), "sampietrini": len(pie.data.polygons)}


def camera_hq(col, pos, mira, focale=30.0, nome="Camera HQ"):
    """pos e mira in coordinate locali (u, v, z)."""
    cam = bpy.data.cameras.new(nome)
    cam.lens = focale
    cam.sensor_width = 36.0
    cam.sensor_fit = "HORIZONTAL"
    cam.clip_start = 0.2
    cam.clip_end = 3000.0
    ob = bpy.data.objects.new(nome, cam)
    col.objects.link(ob)
    p, m = ELL.mappa(*pos), ELL.mappa(*mira)
    ob.location = p
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (m - p).to_track_quat("-Z", "Y")
    return ob


def impostazioni_render(scena, campioni=128, larghezza=1920, altezza=1080, percentuale=100):
    scena.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.refresh_devices()
        for d in prefs.devices:
            d.use = d.type != "CPU"
    except Exception:
        pass
    scena.cycles.device = "GPU"
    scena.cycles.samples = campioni
    scena.cycles.use_denoising = True
    scena.cycles.adaptive_threshold = 0.02
    scena.cycles.max_bounces = 8
    scena.cycles.caustics_reflective = False
    scena.cycles.caustics_refractive = False
    scena.render.resolution_x = larghezza
    scena.render.resolution_y = altezza
    scena.render.resolution_percentage = percentuale
    scena.view_settings.view_transform = "AgX"
    try:
        scena.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    scena.render.film_transparent = False


def direzione_piu_luminosa(hdri):
    """Azimut (gradi, da +X antiorario) e altezza della zona piu' luminosa del cielo nell'HDRI."""
    img = bpy.data.images.get(hdri) or bpy.data.images.load(os.path.join(CARTELLA, "hdri", hdri), check_existing=True)
    w, h = img.size
    px = img.pixels[:]
    passo = 8
    migliore, best = -1.0, (0, 0)
    for y in range(h // 2, h, passo):  # meta' alta (il cielo)
        riga = y * w * 4
        for x in range(0, w, passo):
            i = riga + x * 4
            lum = px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722
            if lum > migliore:
                migliore, best = lum, (x, y)
    u, v = (best[0] + 0.5) / w, (best[1] + 0.5) / h
    alfa = (u - 0.5) * 2 * math.pi
    azimut = math.degrees(math.atan2(math.sin(alfa), -math.cos(alfa)))
    altezza = math.degrees((v - 0.5) * math.pi)
    return azimut, altezza, migliore


def impostazioni_eevee(scena, campioni=64, larghezza=1920, altezza=1080, percentuale=100):
    scena.render.engine = "BLENDER_EEVEE"
    ee = scena.eevee
    for k, v in {"taa_render_samples": campioni, "use_raytracing": True, "ray_tracing_method": "SCREEN", "use_shadows": True,
                 "shadow_ray_count": 2, "shadow_step_count": 8, "use_fast_gi": True, "fast_gi_method": "GLOBAL_ILLUMINATION",
                 "fast_gi_resolution": "2", "shadow_resolution_scale": 1.0, "use_volumetric_shadows": True}.items():
        try:
            setattr(ee, k, v)
        except (AttributeError, TypeError):
            pass
    try:
        ee.ray_tracing_options.resolution_scale = "1"
        ee.ray_tracing_options.use_denoise = True
    except AttributeError:
        pass
    scena.render.resolution_x = larghezza
    scena.render.resolution_y = altezza
    scena.render.resolution_percentage = percentuale
    scena.view_settings.view_transform = "AgX"
    try:
        scena.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
