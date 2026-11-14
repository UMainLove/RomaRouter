"""
Copertina RomaRouter: il Colosseo procedurale, la lupa e la camera.

Lo stesso file gira in due modi:
  - nel Blender con interfaccia (anche dal connettore MCP): si esegue il file, poi costruisci()
    e costruisci_lupa() (scarica la volpe da GitHub);
  - senza interfaccia (pip install bpy==5.3.0), come per il file in public/copertina:
        RR_CLI=1 python3 scripts/copertina/colosseo.py -- --ao --glb colosseo-raw.glb [--volpe Fox.glb] [--blend copertina.blend]
    poi la compressione con gltf-transform (vedi docs/COPERTINA.md).

Geometria: ellisse 188 x 156 m, 80 campate, tre ordini di archi (tuscanico, ionico, corinzio)
e l'attico con lesene, finestre e mensole. Solo il tratto che la camera vede, con l'ambulacro
dietro gli archi. Tutto in coordinate locali (u lungo la facciata, v verso l'esterno, z in alto)
piegate sull'ellisse, cosi' pilastri e archi restano allineati in senso radiale.
"""

import bisect
import math
import os
import sys

import bpy  # prima di bmesh e mathutils: con il modulo pip li rende importabili
import bmesh
from mathutils import Quaternion, Vector

# ---------------------------------------------------------------------------------------------
# Parametri

A, B = 94.0, 78.0  # semiassi della facciata esterna (m)
N_CAMPATE = 80
K_DA, K_A = -9, 22  # campate costruite (0 = asse minore, ingresso principale verso -Y)

D_MURO = 2.6  # profondita' dei pilastri esterni
SEMI_ARCO = 2.1  # luce degli archi esterni: 4,2 m

# Ordini: base, altezza totale, trabeazione, davanzale (parapetto), chiave dell'arco,
# raggio della semicolonna, piedistallo, base e capitello della colonna, profilo della cornice.
CORNICE_TUSCANICA = [(0, 0), (0.62, 0), (0.62, 0.62), (0.54, 0.66), (0.54, 1.24), (0.72, 1.3),
                     (0.72, 1.44), (1.08, 1.6), (1.08, 1.9), (0, 1.9)]
CORNICE_IONICA = [(0, 0), (0.56, 0), (0.56, 0.3), (0.6, 0.32), (0.6, 0.66), (0.5, 0.72), (0.5, 1.36),
                  (0.7, 1.42), (0.7, 1.6), (1.06, 1.78), (1.06, 2.1), (0, 2.1)]
CORNICE_CORINZIA = [(0, 0), (0.54, 0), (0.54, 0.34), (0.58, 0.36), (0.58, 0.7), (0.48, 0.76), (0.48, 1.32),
                    (0.66, 1.38), (0.66, 1.56), (1.1, 1.76), (1.1, 2.1), (0, 2.1)]

ORDINI = [
    dict(nome="tuscanico", z0=0.0, h=10.5, he=1.9, davanzale=0.0, chiave=7.05, r=0.55,
         piedistallo=0.0, base=0.32, capitello=0.55, cornice=CORNICE_TUSCANICA,
         volta=7.35, w1=4.6, w2=3.6, chiave2=6.0),
    dict(nome="ionico", z0=10.5, h=11.85, he=2.1, davanzale=1.55, chiave=8.0, r=0.5,
         piedistallo=1.55, base=0.3, capitello=0.62, cornice=CORNICE_IONICA,
         volta=8.25, w1=4.1, w2=3.0, chiave2=6.6),
    dict(nome="corinzio", z0=22.35, h=11.6, he=2.1, davanzale=1.5, chiave=7.95, r=0.47,
         piedistallo=1.5, base=0.28, capitello=0.95, cornice=CORNICE_CORINZIA,
         volta=8.2, w1=4.1, w2=3.0, chiave2=6.6),
]
ATTICO = dict(z0=33.95, h=14.2)
PROFILO_BASE_ATTICO = [(0, 0), (0.32, 0), (0.32, 0.86), (0.16, 1.05), (0, 1.05)]
PROFILO_CIMA_ATTICO = [(0, 0), (0.36, 0), (0.36, 0.5), (0.62, 0.62), (0.62, 1.0), (1.14, 1.26),
                       (1.14, 1.7), (0, 1.7)]

D_ANELLO2 = 2.0
SEMI_ARCO2 = 1.9

# Colori (lineari) per l'anteprima in Blender; sul web li decide il materiale Three.js.
TRAVERTINO = (0.80, 0.70, 0.55, 1.0)
SUOLO = (0.62, 0.57, 0.50, 1.0)
CIELO = (0.92, 0.88, 0.82)

COLLEZIONE = "RomaRouter_Copertina"
SCENA = "Copertina"

# ---------------------------------------------------------------------------------------------
# Ellisse parametrizzata per lunghezza d'arco


class Ellisse:
    def __init__(self, a, b, n=40000):
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
        """Punto, tangente (u crescente) e normale esterna sulla facciata."""
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
W = ELL.perimetro / N_CAMPATE  # passo delle campate, circa 6,77 m

# ---------------------------------------------------------------------------------------------
# Raccolta delle facce in coordinate locali


class Facce:
    def __init__(self):
        self.lista = []  # (punti mondo, liscia)

    def faccia(self, punti, normale, liscia=False):
        """punti: (u, v, z) locali; normale: direzione locale (du, dv, dz) verso cui deve guardare."""
        pw = [ELL.mappa(*p) for p in punti]
        uc = sum(p[0] for p in punti) / len(punti)
        nw = ELL.direzione(uc, *normale)
        n = Vector((0, 0, 0))
        for i in range(len(pw)):
            a, b = pw[i], pw[(i + 1) % len(pw)]
            n.x += (a.y - b.y) * (a.z + b.z)
            n.y += (a.z - b.z) * (a.x + b.x)
            n.z += (a.x - b.x) * (a.y + b.y)
        if n.length < 1e-9:
            return
        if n.dot(nw) < 0:
            pw.reverse()
        self.lista.append((pw, liscia))

    def rettangolo_v(self, u0, u1, v, z0, z1, verso):
        """Rettangolo sul piano v = costante; verso = +1 guarda fuori, -1 dentro."""
        if u1 - u0 < 1e-6 or z1 - z0 < 1e-6:
            return
        self.faccia([(u0, v, z0), (u1, v, z0), (u1, v, z1), (u0, v, z1)], (0, verso, 0))

    def scatola(self, u0, u1, v0, v1, z0, z1, salta=()):
        """Parallelepipedo locale; salta: lati da omettere tra 'u0','u1','v0','v1','z0','z1'."""
        if "v1" not in salta:
            self.faccia([(u0, v1, z0), (u1, v1, z0), (u1, v1, z1), (u0, v1, z1)], (0, 1, 0))
        if "v0" not in salta:
            self.faccia([(u0, v0, z0), (u1, v0, z0), (u1, v0, z1), (u0, v0, z1)], (0, -1, 0))
        if "u0" not in salta:
            self.faccia([(u0, v0, z0), (u0, v1, z0), (u0, v1, z1), (u0, v0, z1)], (-1, 0, 0))
        if "u1" not in salta:
            self.faccia([(u1, v0, z0), (u1, v1, z0), (u1, v1, z1), (u1, v0, z1)], (1, 0, 0))
        if "z1" not in salta:
            self.faccia([(u0, v0, z1), (u1, v0, z1), (u1, v1, z1), (u0, v1, z1)], (0, 0, 1))
        if "z0" not in salta:
            self.faccia([(u0, v0, z0), (u1, v0, z0), (u1, v1, z0), (u0, v1, z0)], (0, 0, -1))

    def fascia(self, us, profilo, z_base, segno=1):
        """Profilo (v, z) estruso lungo i punti us. segno=-1 rispecchia verso l'interno."""
        for j in range(len(profilo) - 1):
            (va, za), (vb, zb) = profilo[j], profilo[j + 1]
            dv, dz = vb - va, zb - za
            n = (dz * segno, -dv)  # normale esterna di un profilo antiorario
            for i in range(len(us) - 1):
                u0, u1 = us[i], us[i + 1]
                self.faccia([(u0, segno * va, z_base + za), (u1, segno * va, z_base + za),
                             (u1, segno * vb, z_base + zb), (u0, segno * vb, z_base + zb)],
                            (0, n[0], n[1]))

    def mezzacolonna(self, uc, r, z0, z1, segmenti=8):
        for j in range(segmenti):
            f0, f1 = math.pi * j / segmenti, math.pi * (j + 1) / segmenti
            fm = (f0 + f1) / 2
            p0 = (uc + r * math.cos(f0), r * math.sin(f0))
            p1 = (uc + r * math.cos(f1), r * math.sin(f1))
            self.faccia([(p0[0], p0[1], z0), (p1[0], p1[1], z0), (p1[0], p1[1], z1), (p0[0], p0[1], z1)],
                        (math.cos(fm), math.sin(fm), 0), liscia=True)


def punti_u(u0, u1, per_campata=2):
    n = max(1, round((u1 - u0) / W * per_campata))
    return [u0 + (u1 - u0) * i / n for i in range(n + 1)]


def arco(uc, a, z_imposta, segmenti=12):
    """Punti dell'arco da sinistra (theta = pi) a destra (theta = 0)."""
    return [(uc + a * math.cos(math.pi - math.pi * i / segmenti), z_imposta + a * math.sin(math.pi - math.pi * i / segmenti),
             math.pi - math.pi * i / segmenti) for i in range(segmenti + 1)]


# ---------------------------------------------------------------------------------------------
# Arcate


def parete_con_arco(f, u0, u1, uc, a, v, verso, zb, zs, zsp, zt):
    """Faccia di una campata sul piano v con l'apertura ad arco (davanzale zs, imposta zsp)."""
    uL, uR = uc - a, uc + a
    for (ua, ub) in ((u0, uL), (uR, u1)):
        f.rettangolo_v(ua, ub, v, zb, zs, verso)
        f.rettangolo_v(ua, ub, v, zs, zsp, verso)
        f.rettangolo_v(ua, ub, v, zsp, zt, verso)
    f.rettangolo_v(uL, uR, v, zb, zs, verso)  # parapetto (vuoto se zs == zb)
    pts = arco(uc, a, zsp)
    for i in range(len(pts) - 1):
        (ua, za, _), (ub, zb2, _) = pts[i], pts[i + 1]
        f.faccia([(ua, v, za), (ub, v, zb2), (ub, v, zt), (ua, v, zt)], (0, verso, 0))


def vano_arco(f, uc, a, v_fuori, v_dentro, zs, zsp, davanzale=True):
    """Spalle, intradosso e davanzale di un'apertura che attraversa il muro tra v_dentro e v_fuori."""
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


def archivolto(f, uc, a, zsp, larghezza=0.42, sporgenza=0.12):
    interno = arco(uc, a, zsp)
    esterno = arco(uc, a + larghezza, zsp)
    for i in range(len(interno) - 1):
        (ui0, zi0, t0), (ui1, zi1, t1) = interno[i], interno[i + 1]
        (ue0, ze0, _), (ue1, ze1, _) = esterno[i], esterno[i + 1]
        tm = (t0 + t1) / 2
        f.faccia([(ui0, sporgenza, zi0), (ui1, sporgenza, zi1), (ue1, sporgenza, ze1), (ue0, sporgenza, ze0)], (0, 1, 0))
        f.faccia([(ue0, 0, ze0), (ue1, 0, ze1), (ue1, sporgenza, ze1), (ue0, sporgenza, ze0)], (math.cos(tm), 0, math.sin(tm)))
        f.faccia([(ui0, 0, zi0), (ui1, 0, zi1), (ui1, sporgenza, zi1), (ui0, sporgenza, zi0)], (-math.cos(tm), 0, -math.sin(tm)))
    for (ui, zi, _), (ue, ze, _) in ((interno[0], esterno[0]), (interno[-1], esterno[-1])):
        f.faccia([(ui, 0, zi), (ue, 0, ze), (ue, sporgenza, ze), (ui, sporgenza, zi)], (0, 0, -1))


def colonna(f, o, up, zb, zt):
    r = o["r"]
    zp = zb + o["piedistallo"]
    if o["piedistallo"] > 0:
        f.scatola(up - (r + 0.26), up + (r + 0.26), 0, r + 0.26, zb, zp, salta=("v0", "z0"))
    rb = r + 0.13
    f.scatola(up - rb, up + rb, 0, rb, zp, zp + o["base"], salta=("v0", "z0"))
    zc = zt - o["capitello"]
    f.mezzacolonna(up, r, zp + o["base"], zc)
    if o["nome"] == "corinzio":
        # campana corinzia: un tronco che si allarga sotto l'abaco
        f.scatola(up - (r + 0.06), up + (r + 0.06), 0, r + 0.06, zc, zt - 0.28, salta=("v0",))
        f.scatola(up - (r + 0.24), up + (r + 0.24), 0, r + 0.24, zt - 0.28, zt, salta=("v0",))
    elif o["nome"] == "ionico":
        f.scatola(up - (r + 0.08), up + (r + 0.08), 0, r + 0.1, zc, zc + 0.3, salta=("v0",))
        f.scatola(up - (r + 0.26), up + (r + 0.26), 0, r + 0.2, zc + 0.3, zt, salta=("v0",))
    else:
        f.scatola(up - (r + 0.07), up + (r + 0.07), 0, r + 0.07, zc, zc + 0.25, salta=("v0",))
        f.scatola(up - (r + 0.2), up + (r + 0.2), 0, r + 0.2, zc + 0.25, zt, salta=("v0",))


def ordine(f, o, ks):
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
        # muro esterno: facciata, retro, vano
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO, 0.0, 1, zb, zs, zsp, zt)
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO, v1, -1, zb, zs, zsp, zv)
        vano_arco(f, uc, SEMI_ARCO, 0.0, v1, zs, zsp, davanzale=o["davanzale"] > 0)
        archivolto(f, uc, SEMI_ARCO, zsp)
        # imposte sui pilastri, tra colonna e arco
        for ua, ub in ((u0 + o["r"] + 0.02, uc - SEMI_ARCO), (uc + SEMI_ARCO, u1 - o["r"] - 0.02)):
            f.scatola(ua, ub, 0, 0.12, zsp - 0.3, zsp, salta=("v0",))
        colonna(f, o, u0, zb, zt)
        if o["davanzale"] > 0:
            # coronamento del podio, continuo sotto gli archi
            f.scatola(u0, u1, 0, 0.3, zs - 0.24, zs, salta=("v0", "u0", "u1"))

        # anello 2: archi piu' bassi allineati in senso radiale
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO2, v2, 1, zb, zb, zsp2, zv)
        parete_con_arco(f, u0, u1, uc, SEMI_ARCO2, v3, -1, zb, zb, zsp2, zv2)
        vano_arco(f, uc, SEMI_ARCO2, v2, v3, zb, zsp2, davanzale=False)
        # anello 3: muro pieno in fondo al secondo ambulacro
        f.rettangolo_v(u0, u1, v4, zb, zv2, 1)

    # volte a botte dei due ambulacri e pavimenti dei piani alti
    us = punti_u(ks[0] * W - W / 2, ks[-1] * W + W / 2, per_campata=2)
    for (va, vb, zimp) in ((v1, v2, zv), (v3, v4, zv2)):
        vc, rv = (va + vb) / 2, (va - vb) / 2
        seg = 8
        for j in range(seg):
            p0, p1 = math.pi * j / seg, math.pi * (j + 1) / seg
            pm = (p0 + p1) / 2
            a0 = (vc + rv * math.cos(p0), zimp + rv * math.sin(p0))
            a1 = (vc + rv * math.cos(p1), zimp + rv * math.sin(p1))
            for i in range(len(us) - 1):
                f.faccia([(us[i], a0[0], a0[1]), (us[i + 1], a0[0], a0[1]), (us[i + 1], a1[0], a1[1]), (us[i], a1[0], a1[1])],
                         (0, -math.cos(pm), -math.sin(pm)))
    if zb > 0:
        for i in range(len(us) - 1):
            for (va, vb) in ((0.0, v1), (v1, v2), (v2, v3), (v3, v4)):
                f.faccia([(us[i], va, zb), (us[i + 1], va, zb), (us[i + 1], vb, zb), (us[i], vb, zb)], (0, 0, 1))

    # trabeazione continua
    f.fascia(us, o["cornice"], zt)
    # chiusura in alto dietro la cornice (fino al piano successivo)
    for i in range(len(us) - 1):
        f.faccia([(us[i], 0, zb + o["h"]), (us[i + 1], 0, zb + o["h"]), (us[i + 1], v1, zb + o["h"]), (us[i], v1, zb + o["h"])], (0, 0, 1))


def attico(f, ks):
    zb = ATTICO["z0"]
    ztop = zb + ATTICO["h"]
    zf0 = zb + PROFILO_BASE_ATTICO[-1][1]
    zf1 = ztop - PROFILO_CIMA_ATTICO[-1][1]
    us = punti_u(ks[0] * W - W / 2, ks[-1] * W + W / 2, per_campata=2)
    f.fascia(us, PROFILO_BASE_ATTICO, zb)
    f.fascia(us, PROFILO_CIMA_ATTICO, zf1)
    for k in ks:
        uc = k * W
        u0, u1 = uc - W / 2, uc + W / 2
        if k % 2 == 0:
            # finestra rettangolare a campate alterne, cieca: nicchia profonda
            fw, fz0, fz1, prof = 0.85, zb + 4.3, zb + 7.0, 0.8
            f.rettangolo_v(u0, uc - fw, 0, zf0, zf1, 1)
            f.rettangolo_v(uc + fw, u1, 0, zf0, zf1, 1)
            f.rettangolo_v(uc - fw, uc + fw, 0, zf0, fz0, 1)
            f.rettangolo_v(uc - fw, uc + fw, 0, fz1, zf1, 1)
            f.scatola(uc - fw, uc + fw, -prof, 0, fz0, fz1, salta=("v1",))
        else:
            f.rettangolo_v(u0, u1, 0, zf0, zf1, 1)
        # lesena corinzia sul pilastro e capitello piatto
        f.scatola(u0 - 0.52, u0 + 0.52, 0, 0.2, zf0, zf1 - 0.7, salta=("v0",))
        f.scatola(u0 - 0.64, u0 + 0.64, 0, 0.3, zf1 - 0.7, zf1, salta=("v0",))
        # mensole per i pali del velario, tre per campata
        for du in (-1.75, 0.0, 1.75):
            f.scatola(uc + du - 0.2, uc + du + 0.2, 0, 0.55, zf1 - 1.85, zf1 - 1.3, salta=("v0",))
    # tetto del muro
    for i in range(len(us) - 1):
        f.faccia([(us[i], 0, ztop), (us[i + 1], 0, ztop), (us[i + 1], -D_MURO, ztop), (us[i], -D_MURO, ztop)], (0, 0, 1))
        f.faccia([(us[i], -D_MURO, zb), (us[i + 1], -D_MURO, zb), (us[i + 1], -D_MURO, ztop), (us[i], -D_MURO, ztop)], (0, -1, 0))


def suolo(f, ks):
    # il suolo va molto oltre il tratto costruito: a destra l'inquadratura scorre lungo la curva
    us = punti_u(-150.0, 260.0, per_campata=1)
    o = ORDINI[0]
    v_int = -(D_MURO + o["w1"] + D_ANELLO2 + o["w2"])
    vs = [v_int, -(D_MURO + o["w1"] + D_ANELLO2), -(D_MURO + o["w1"]), -(D_MURO + o["w1"] / 2), -D_MURO,
          0.0, 0.8, 2.0, 4.0, 8.0, 15.0, 28.0, 55.0, 110.0, 220.0, 420.0]
    for i in range(len(us) - 1):
        for j in range(len(vs) - 1):
            f.faccia([(us[i], vs[j], 0), (us[i + 1], vs[j], 0), (us[i + 1], vs[j + 1], 0), (us[i], vs[j + 1], 0)], (0, 0, 1))


# ---------------------------------------------------------------------------------------------
# Blender: oggetti, materiali, luce


def materiale(nome, colore, ruvidita=0.9, metallo=0.0):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    if getattr(m, "node_tree", None) is None:
        m.use_nodes = True
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = m.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        out = next(n for n in m.node_tree.nodes if n.type == "OUTPUT_MATERIAL")
        m.node_tree.links.new(bsdf.outputs[0], out.inputs[0])
    bsdf.inputs["Base Color"].default_value = colore
    bsdf.inputs["Roughness"].default_value = ruvidita
    bsdf.inputs["Metallic"].default_value = metallo
    m.diffuse_color = colore
    return m


def oggetto_da_facce(nome, facce, mat, collezione):
    bm = bmesh.new()
    for pts, liscia in facce.lista:
        vs = [bm.verts.new(p) for p in pts]
        try:
            fc = bm.faces.new(vs)
            fc.smooth = liscia
        except ValueError:
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nome, me)
    collezione.objects.link(ob)
    return ob


def prepara_scena():
    if bpy.context.window is None:
        # senza interfaccia la scena attiva non si cambia: si usa quella di partenza, svuotata
        scena = bpy.context.scene
        if scena.name != SCENA:
            for ob in list(scena.objects):
                bpy.data.objects.remove(ob, do_unlink=True)
            scena.name = SCENA
    else:
        scena = bpy.data.scenes.get(SCENA) or bpy.data.scenes.new(SCENA)
        bpy.context.window.scene = scena
    col = bpy.data.collections.get(COLLEZIONE)
    if col is None:
        col = bpy.data.collections.new(COLLEZIONE)
        scena.collection.children.link(col)
    # si rigenera solo cio' che questo script ha creato
    for ob in list(col.objects):
        dati = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if dati is not None and dati.users == 0:
            if isinstance(dati, bpy.types.Mesh):
                bpy.data.meshes.remove(dati)
            elif isinstance(dati, bpy.types.Camera):
                bpy.data.cameras.remove(dati)
            elif isinstance(dati, bpy.types.Light):
                bpy.data.lights.remove(dati)
    mondo = bpy.data.worlds.get("Copertina") or bpy.data.worlds.new("Copertina")
    if getattr(mondo, "node_tree", None) is None:
        mondo.use_nodes = True
    sfondo = next((n for n in mondo.node_tree.nodes if n.type == "BACKGROUND"), None)
    if sfondo is not None:
        sfondo.inputs["Color"].default_value = (*CIELO, 1.0)
        sfondo.inputs["Strength"].default_value = 0.9
    mondo.color = CIELO
    scena.world = mondo
    scena.render.fps = 30
    scena.frame_start = 1
    scena.frame_end = 180
    return scena, col


def sole(col, azimut_gradi=-128.0, altezza_gradi=24.0, forza=4.0):
    luce = bpy.data.lights.new("Sole", type="SUN")
    luce.energy = forza
    luce.angle = math.radians(1.2)
    luce.color = (1.0, 0.93, 0.82)
    ob = bpy.data.objects.new("Sole", luce)
    col.objects.link(ob)
    # direzione verso cui guarda il sole (asse -Z della lampada)
    az, al = math.radians(azimut_gradi), math.radians(altezza_gradi)
    verso_sole = Vector((math.cos(az) * math.cos(al), math.sin(az) * math.cos(al), math.sin(al)))
    ob.rotation_euler = (-verso_sole).to_track_quat("-Z", "Y").to_euler()
    return ob


def guarda(ob, da, verso):
    ob.location = da
    ob.rotation_euler = (verso - da).to_track_quat("-Z", "Y").to_euler()


def camera(col, nome="Camera_Copertina", fov_v_gradi=50.0):
    cam = bpy.data.cameras.new(nome)
    cam.sensor_fit = "VERTICAL"
    cam.angle_y = math.radians(fov_v_gradi)
    cam.clip_start = 0.1
    cam.clip_end = 900.0
    ob = bpy.data.objects.new(nome, cam)
    col.objects.link(ob)
    return ob


def vista_camera(ob_cam, sfumatura="RENDERED"):
    """Nel Blender con interfaccia: inquadra dalla camera nella vista 3D."""
    scena = bpy.context.scene
    scena.camera = ob_cam
    if bpy.context.window is None:
        return
    for area in bpy.context.window.screen.areas:
        if area.type == "VIEW_3D":
            spazio = area.spaces.active
            spazio.shading.type = sfumatura
            spazio.region_3d.view_perspective = "CAMERA"
            spazio.overlay.show_overlays = False


def costruisci():
    scena, col = prepara_scena()
    ks = list(range(K_DA, K_A + 1))
    f = Facce()
    for o in ORDINI:
        ordine(f, o, ks)
    attico(f, ks)
    trav = materiale("Travertino", TRAVERTINO, 0.92)
    colosseo = oggetto_da_facce("Colosseo", f, trav, col)
    g = Facce()
    suolo(g, ks)
    terra = oggetto_da_facce("Suolo", g, materiale("Suolo", SUOLO, 0.95), col)
    sole(col)
    cam = camera(col)
    guarda(cam, ELL.mappa(-10, 26, 1.7), ELL.mappa(16, 0, 10))
    scena.render.resolution_x, scena.render.resolution_y = 1600, 1000
    vista_camera(cam)
    return {
        "campata_m": round(W, 3),
        "perimetro_m": round(ELL.perimetro, 2),
        "colosseo_triangoli": sum(len(p.vertices) - 2 for p in colosseo.data.polygons),
        "colosseo_vertici": len(colosseo.data.vertices),
        "suolo_vertici": len(terra.data.vertices),
    }


# ---------------------------------------------------------------------------------------------
# Lupa: volpe Khronos come segnaposto (modello CC0 di PixelMannen, rig e animazione CC-BY 4.0
# di @tomkranis), ricolorata in bronzo. Corre lungo uno slalom tra gli archi del piano terra.

URL_VOLPE = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb"
SCALA_LUPA = 0.0185  # la volpe e' in centimetri: muso-coda circa 2,6 m, una lupa da leggenda
BRONZO = (0.42, 0.27, 0.12, 1.0)

FPS = 30
DURATA = 4.6  # secondi della clip: 2 s fermi, 2 s di slalom, coda per la dissolvenza
T_FERMA = 2.0  # fino a qui camera immobile: il poster coincide col primo fotogramma
T_FINE_SLALOM = 4.0  # la lupa passa l'ultimo pilastro
PERIODO_CORSA = 0.39  # s per ciclo di galoppo (la clip originale dura 1,16 s)
V_FUORI, V_DENTRO = 1.5, -4.0  # davanti ai pilastri / dentro l'ambulacro
ARCO_USCITA = 3  # indice dell'arco da cui esce (u = ARCO_USCITA * W)
PILASTRO_FINALE = -1.5  # in campate: l'ultimo pilastro, davanti al quale finisce lo slalom


def scarica_volpe(destinazione):
    import urllib.request
    if not os.path.exists(destinazione):
        urllib.request.urlretrieve(URL_VOLPE, destinazione)
    return destinazione


def importa_volpe(percorso, col):
    prima = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=percorso)
    nuovi = [o for o in bpy.data.objects if o not in prima]
    for o in nuovi:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        col.objects.link(o)
    arm = next(o for o in nuovi if o.type == "ARMATURE")
    mesh = next(o for o in nuovi if o.type == "MESH" and o.parent == arm)
    arm.name, mesh.name = "Lupa_Scheletro", "Lupa"
    for pb in arm.pose.bones:
        pb.custom_shape = None
    for o in nuovi:
        if o not in (arm, mesh):
            bpy.data.objects.remove(o, do_unlink=True)
    # solo la corsa: via le altre azioni, la Run in loop su tutta la scena
    ad = arm.animation_data
    corsa = bpy.data.actions["Run"]
    corsa.name = "Corsa"
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    ad.action = None
    # nel Blender la corsa gira in loop a ritmo di galoppo; sul web lo stesso ritmo e' timeScale
    traccia = ad.nla_tracks.new()
    traccia.name = "Corsa"
    durata = corsa.frame_range[1] - corsa.frame_range[0]
    striscia = traccia.strips.new("Corsa", 0, corsa)
    striscia.scale = PERIODO_CORSA * FPS / durata
    striscia.repeat = math.ceil(DURATA / PERIODO_CORSA) + 1
    for nome in ("Survey", "Walk"):
        a = bpy.data.actions.get(nome)
        if a is not None and a.users == 0:
            bpy.data.actions.remove(a)
    # bronzo al posto della pelliccia
    mesh.data.materials.clear()
    mesh.data.materials.append(materiale("Bronzo", BRONZO, 0.38, 0.75))
    for tex in [i for i in bpy.data.images if i.users == 0]:
        bpy.data.images.remove(tex)
    radice = bpy.data.objects.new("Lupa_Percorso", None)
    radice.empty_display_size = 1.0
    col.objects.link(radice)
    arm.parent = radice
    arm.location = (0, 0, 0)
    arm.rotation_euler = (0, 0, 0)
    arm.scale = (SCALA_LUPA,) * 3
    return radice, arm, mesh


def punti_slalom():
    """Polilinea (u, v): dietro il pilastro dentro l'ambulacro, slalom tra gli archi, corsa oltre."""
    c, a = (V_FUORI + V_DENTRO) / 2, (V_FUORI - V_DENTRO) / 2
    u_ini = (ARCO_USCITA + 0.5) * W  # dietro il pilastro, dentro l'ambulacro: non si vede
    u_fin = PILASTRO_FINALE * W
    pts = []
    n = int((u_ini - u_fin) / 0.05)
    for i in range(n + 1):
        u = u_ini - (u_ini - u_fin) * i / n
        pts.append((u, c - a * math.cos(math.pi * (u - u_ini) / W)))
    # dopo l'ultimo pilastro prosegue dritta, poi apre leggermente verso la camera
    p0 = Vector(pts[-1])
    p1 = Vector((u_fin - 6.0, p0.y))
    p2 = Vector((u_fin - 13.0, p0.y + 3.0))
    for i in range(1, 121):
        t = i / 120
        q = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2
        pts.append((q.x, q.y))
    return pts


def campiona_percorso():
    """Punti mondo e lunghezze cumulate."""
    loc = punti_slalom()
    mondo = [ELL.mappa(u, v, 0.0) for (u, v) in loc]
    s = [0.0]
    for i in range(1, len(mondo)):
        s.append(s[-1] + (mondo[i] - mondo[i - 1]).length)
    return loc, mondo, s


def sul_percorso(mondo, s, d):
    d = min(max(d, 0.0), s[-1])
    i = min(max(bisect.bisect_right(s, d) - 1, 0), len(s) - 2)
    f = (d - s[i]) / max(s[i + 1] - s[i], 1e-9)
    return mondo[i].lerp(mondo[i + 1], f)


def tempi_slalom(loc, s):
    """Distanze sul percorso dell'uscita dal primo arco e dell'ultimo pilastro."""
    i_arco = min(range(len(loc)), key=lambda i: abs(loc[i][0] - ARCO_USCITA * W) + (0 if loc[i][1] > -2.0 else 99))
    i_fine = min(range(len(loc)), key=lambda i: abs(loc[i][0] - PILASTRO_FINALE * W))
    return s[i_arco], s[i_fine]


def posizione_lupa(mondo, s, t, t0, vel):
    return sul_percorso(mondo, s, max(0.0, (t - t0) * vel))


def anima_lupa(radice, arm):
    loc, mondo, s = campiona_percorso()
    d_arco, d_fine = tempi_slalom(loc, s)
    # dall'uscita dal primo arco (T_FERMA) all'ultimo pilastro (T_FINE_SLALOM)
    vel = (d_fine - d_arco) / (T_FINE_SLALOM - T_FERMA)
    t0 = T_FERMA - d_arco / vel
    radice.animation_data_clear()
    n = int(DURATA * FPS)
    for fr in range(n + 1):
        t = fr / FPS
        d = max(0.0, (t - t0) * vel)
        p = sul_percorso(mondo, s, d)
        avanti = (sul_percorso(mondo, s, d + 0.5) - sul_percorso(mondo, s, max(0.0, d - 0.5)))
        avanti.z = 0
        avanti.normalize()
        ind = sul_percorso(mondo, s, d - 1.2)
        av = sul_percorso(mondo, s, d + 1.2)
        k = ((av - p).normalized().to_2d().angle_signed((p - ind).normalized().to_2d(), 0.0)) / 1.2 if d > 1.2 else 0.0
        rollio = max(-0.3, min(0.3, -math.atan(vel ** 2 * k / 9.81) * 0.3))
        imb = math.atan2(avanti.x, -avanti.y)
        q = Quaternion((0, 0, 1), imb) @ Quaternion((0, -1, 0), rollio)
        radice.location = p
        radice.rotation_mode = "QUATERNION"
        radice.rotation_quaternion = q
        radice.keyframe_insert("location", frame=fr)
        radice.keyframe_insert("rotation_quaternion", frame=fr)
    return {"t0": round(t0, 3), "velocita": round(vel, 2), "lunghezza_m": round(s[-1], 1),
            "percorso": (loc, mondo, s, t0, vel)}


def liscio(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


CAMERA_POS = (-15.0, 17.0, 1.5)  # (u, v, z) locali
CAMERA_MIRA = (19.0, -2.0, 12.5)
CAMERA_DERIVA = (-0.7, 0.25, 0.08)  # piccolo carrello durante l'inseguimento
SEGUI_ALTEZZA = 4.0  # quota del punto seguito: la lupa resta nel terzo basso, poco suolo
SEGUI_ANTICIPO = 2.0  # metri davanti alla lupa: spazio libero nella direzione di corsa
SEGUI_ATTACCO = 0.75  # secondi in cui la panoramica entra (ease-in)


def entrata(x):
    """Smootherstep: la panoramica parte da ferma, accelera e si aggancia alla lupa senza scatti."""
    x = min(max(x, 0.0), 1.0)
    return x * x * x * (x * (6 * x - 15) + 10)


def anima_camera(ob, percorso):
    loc, mondo, s, t0, vel = percorso
    ob.animation_data_clear()
    ob.rotation_mode = "QUATERNION"
    mira0 = ELL.mappa(*CAMERA_MIRA)

    def u_lupa(t):
        # u della lupa mediato su mezzo secondo: segue la corsa, non l'andirivieni dello slalom
        campioni = [posizione_lupa(mondo, s, t + dt, t0, vel) for dt in (-0.3, -0.2, -0.1, 0.0, 0.1)]
        us = []
        for p in campioni:
            # proiezione sulla facciata: cerca il punto del percorso piu' vicino in u
            i = min(range(0, len(mondo), 8), key=lambda k: (mondo[k] - p).length_squared)
            us.append(loc[i][0])
        return sum(us) / len(us)

    n = int(DURATA * FPS)
    for fr in range(n + 1):
        t = fr / FPS
        w = entrata((t - T_FERMA) / SEGUI_ATTACCO) if t > T_FERMA else 0.0
        segui = ELL.mappa(u_lupa(t) - SEGUI_ANTICIPO, (V_FUORI + V_DENTRO) / 2, SEGUI_ALTEZZA)
        mira = mira0.lerp(segui, w)
        x = liscio((t - T_FERMA) / (DURATA - T_FERMA)) if t > T_FERMA else 0.0
        pos = ELL.mappa(*[CAMERA_POS[i] + CAMERA_DERIVA[i] * x for i in range(3)])
        ob.location = pos
        ob.rotation_quaternion = (mira - pos).to_track_quat("-Z", "Y")
        ob.keyframe_insert("location", frame=fr)
        ob.keyframe_insert("rotation_quaternion", frame=fr)


def costruisci_lupa(percorso_volpe=None):
    scena = bpy.data.scenes[SCENA]
    col = bpy.data.collections[COLLEZIONE]
    for nome in ("Lupa_Percorso", "Lupa_Scheletro", "Lupa"):
        ob = bpy.data.objects.get(nome)
        if ob is not None:
            bpy.data.objects.remove(ob, do_unlink=True)
    if percorso_volpe is None:
        percorso_volpe = scarica_volpe(os.path.join(bpy.app.tempdir or "/tmp", "Fox.glb"))
    radice, arm, mesh = importa_volpe(percorso_volpe, col)
    info = anima_lupa(radice, arm)
    cam = bpy.data.objects["Camera_Copertina"]
    anima_camera(cam, info.pop("percorso"))
    scena.render.fps = FPS
    scena.frame_start, scena.frame_end = 0, int(DURATA * FPS)
    return info


# ---------------------------------------------------------------------------------------------
# Occlusione ambientale nei colori dei vertici ed esportazione GLB


def cuoci_ao(campioni=96, distanza=6.0):
    """AO di Cycles nei colori dei vertici di Colosseo e Suolo (la lupa non fa ombra)."""
    scena = bpy.data.scenes[SCENA]
    scena.render.engine = "CYCLES"
    scena.cycles.device = "CPU"
    scena.cycles.samples = campioni
    scena.world.light_settings.distance = distanza
    lupa = [bpy.data.objects.get(n) for n in ("Lupa", "Lupa_Scheletro")]
    for ob in lupa:
        if ob is not None:
            ob.hide_render = True
    for nome in ("Colosseo", "Suolo"):
        ob = bpy.data.objects[nome]
        me = ob.data
        # per vertice: senza normali nel file i vertici restano condivisi tra le facce (file piu' leggero)
        attr = me.color_attributes.get("AO") or me.color_attributes.new("AO", "BYTE_COLOR", "POINT")
        me.color_attributes.active_color = attr
        me.color_attributes.render_color_index = me.color_attributes.find("AO")
        for o in scena.objects:
            o.select_set(False)
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS", use_clear=True)
        ob.select_set(False)
    for ob in lupa:
        if ob is not None:
            ob.hide_render = False


def esporta_glb(percorso):
    scena = bpy.data.scenes[SCENA]
    for ob, nome in ((bpy.data.objects["Lupa_Percorso"], "Percorso"), (bpy.data.objects["Camera_Copertina"], "Camera")):
        if ob.animation_data and ob.animation_data.action:
            ob.animation_data.action.name = nome
    da_esportare = {"Colosseo", "Suolo", "Lupa_Percorso", "Lupa_Scheletro", "Lupa", "Camera_Copertina"}
    for o in scena.objects:
        o.select_set(o.name in da_esportare)
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(percorso), export_format="GLB", use_selection=True, use_active_scene=True,
        export_cameras=True, export_lights=False, export_yup=True, export_apply=True,
        # niente normali: Three.js ombreggia a facce piatte con le derivate, anche la lupa
        export_texcoords=False, export_normals=False,
        export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
        export_optimize_animation_size=True, export_def_bones=False, export_morph=False,
        export_skins=True, export_extras=False,
    )


def main(argv):
    import argparse
    ap = argparse.ArgumentParser(description="Copertina RomaRouter: Colosseo e lupa")
    ap.add_argument("--volpe", help="Fox.glb gia' scaricato (altrimenti lo scarica)")
    ap.add_argument("--blend", help="salva il file .blend")
    ap.add_argument("--glb", help="esporta la scena per Three.js")
    ap.add_argument("--ao", action="store_true", help="cuoce l'occlusione ambientale (Cycles, lento)")
    args = ap.parse_args(argv)
    print(costruisci())
    print(costruisci_lupa(args.volpe))
    if args.ao:
        cuoci_ao()
    if args.glb:
        esporta_glb(args.glb)
    if args.blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.blend))


if __name__ == "__main__" and os.environ.get("RR_CLI"):
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
