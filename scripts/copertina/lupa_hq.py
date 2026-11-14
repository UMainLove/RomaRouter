"""
La lupa della copertina, rifatta sulla foto ad alta definizione della Lupa Capitolina: corpo pieno con il
ventre quasi piano e le otto mammelle piene a goccia, collo massiccio coperto di ciocche a fiamma a file
sfalsate, bordo di perline tra testa e criniera, treccia dietro la spalla e cresta di ciocche lungo la
schiena, costole, scapola e punta dell'anca, testa grande con la bocca aperta (denti, lingua, labbra),
occhi con pupilla incisa, orecchie a coppa, zampe lunghe con dita e unghie; bronzo scuro con la patina
nei solchi e un velo di cera lucida.

Si modella come uno scultore che sbozza: sezioni (loft) e piccoli pezzi, fusi con un remesh a voxel,
lisciati (Taubin), poi i rilievi incisi spostando i vertici. Le articolazioni seguono le ossa della volpe
Khronos (CC0, PixelMannen; rig e animazione CC BY 4.0 di tomkranis), con la testa abbassata come nella
statua (animazione_hq.adatta_scheletro).

Coordinate nello spazio dell'armatura della volpe (centimetri; muso verso -Y, coda verso +Y, z in alto).
"""

import math

import bpy  # prima di bmesh e mathutils
import bmesh
import numpy as np
from mathutils import Matrix, Vector

LUPA = "Lupa HQ"
SCHELETRO = "Lupa_Scheletro"


# ---------------------------------------------------------------------------------------------
# Strumenti: interpolazione e loft


def catmull(righe, n):
    """n campioni lungo una tabella di righe (tuple di numeri) con Catmull-Rom uniforme."""
    righe = [tuple(float(x) for x in r) for r in righe]
    m = len(righe)
    out = []
    for i in range(n):
        t = i / (n - 1) * (m - 1)
        k = min(int(t), m - 2)
        f = t - k
        p0, p1, p2, p3 = righe[max(k - 1, 0)], righe[k], righe[k + 1], righe[min(k + 2, m - 1)]
        out.append(tuple(0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f ** 3)
                         for a, b, c, d in zip(p0, p1, p2, p3)))
    return out


def _segno_pot(v, e):
    return math.copysign(abs(v) ** e, v)


def anello(c, A, B, w, ht, hb, n=2.4, chiglia=0.0, punti=36):
    """Punti di una sezione: superellisse con semiassi w (lungo A) e ht/hb (sopra/sotto, lungo B);
    'chiglia' stringe la parte bassa (petto a V)."""
    out = []
    e = 2.0 / n
    for k in range(punti):
        phi = 2 * math.pi * k / punti
        s, co = math.sin(phi), math.cos(phi)
        x = w * _segno_pot(co, e) * (1.0 - chiglia * max(0.0, -s) ** 1.5)
        z = (ht if s >= 0 else hb) * _segno_pot(s, e)
        out.append(c + A * x + B * z)
    return out


def telai(centri, alto=Vector((0, 0, 1))):
    """Per ogni centro: tangente, asse laterale A e asse 'alto' B perpendicolari alla tangente."""
    out = []
    for i, c in enumerate(centri):
        T = (centri[min(i + 1, len(centri) - 1)] - centri[max(i - 1, 0)]).normalized()
        B = (alto - T * alto.dot(T)).normalized()
        A = B.cross(T).normalized()
        out.append((T, A, B))
    return out


class Pezzi:
    """Mesh chiuse (anche sovrapposte) da fondere col remesh."""

    def __init__(self):
        self.v, self.f = [], []

    def loft(self, anelli, chiudi=(True, True)):
        base = len(self.v)
        n = len(anelli[0])
        for a in anelli:
            self.v.extend(a)
        for i in range(len(anelli) - 1):
            for k in range(n):
                a0, a1 = base + i * n + k, base + i * n + (k + 1) % n
                self.f.append((a0, a1, a1 + n, a0 + n))
        for estremo, chiudere in ((0, chiudi[0]), (len(anelli) - 1, chiudi[1])):
            if not chiudere:
                continue
            c = sum(anelli[estremo], Vector()) / n
            ic = len(self.v)
            self.v.append(c)
            off = base + estremo * n
            for k in range(n):
                self.f.append((off + k, off + (k + 1) % n, ic))

    def ellissoide(self, c, semiassi, rot=None, seg=24, anelli_n=14):
        rot = rot or Matrix.Identity(3)
        anelli = []
        for j in range(1, anelli_n):
            th = math.pi * j / anelli_n
            r, z = math.sin(th), -math.cos(th)
            anelli.append([c + rot @ Vector((semiassi[0] * r * math.cos(2 * math.pi * k / seg),
                                             semiassi[1] * r * math.sin(2 * math.pi * k / seg), semiassi[2] * z))
                           for k in range(seg)])
        self.loft(anelli)

    def tubo(self, punti, raggi, lati=8, chiudi=(True, True)):
        fr = telai(punti, alto=Vector((0.3, 0.2, 1.0)).normalized())
        anelli = []
        for (T, A, B), p, r in zip(fr, punti, raggi):
            anelli.append([p + (A * math.cos(2 * math.pi * k / lati) + B * math.sin(2 * math.pi * k / lati)) * r for k in range(lati)])
        self.loft(anelli, chiudi)

    def mesh(self, nome):
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in self.v]
        for f in self.f:
            try:
                bm.faces.new([vs[i] for i in f])
            except ValueError:
                pass
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(nome)
        bm.to_mesh(me)
        bm.free()
        return me


# ---------------------------------------------------------------------------------------------
# Anatomia (spazio della volpe, cm), misurata sulla foto della Lupa Capitolina di profilo:
# y = (1320 - x_foto) * 0,05, z = (1385 - y_foto) * 0,05 (dorso a 60 cm, testa bassa come nella statua;
# l'osso della testa si abbassa di conseguenza, vedi animazione_hq.adatta_scheletro)

# tronco: y, dorso, ventre, semilarghezza, chiglia (il ventre e' pieno e quasi piano: allatta)
TRONCO = [
    (-27.0, 59.4, 35.6, 8.6, 0.35),
    (-23.0, 59.8, 33.6, 9.8, 0.35),
    (-18.0, 60.1, 32.4, 10.6, 0.3),
    (-12.0, 60.1, 32.0, 11.2, 0.22),
    (-5.0, 59.8, 32.4, 11.6, 0.12),
    (2.0, 59.6, 32.9, 11.8, 0.06),
    (9.0, 59.6, 33.5, 11.6, 0.05),
    (16.0, 59.6, 34.1, 11.0, 0.05),
    (22.0, 59.5, 34.8, 10.2, 0.08),
    (28.0, 59.3, 37.6, 9.6, 0.1),
    (34.0, 58.4, 40.2, 9.4, 0.12),
    (39.0, 56.4, 42.0, 8.8, 0.15),
    (43.0, 53.2, 44.0, 7.2, 0.2),
    (46.0, 49.4, 45.8, 4.2, 0.1),
]

# collo massiccio, quasi orizzontale: y, quota del centro, semilarghezza, sopra, sotto
COLLO = [
    (-21.0, 47.4, 10.0, 12.3, 13.2),
    (-26.0, 47.9, 10.1, 11.7, 12.3),
    (-30.5, 48.2, 9.9, 11.2, 11.2),
    (-34.5, 48.8, 9.5, 10.8, 10.3),
    (-37.8, 49.6, 9.0, 10.2, 9.8),
]

# testa (cranio e mascella superiore): y, quota, semilarghezza, sopra, sotto, esponente
TESTA = [
    (-35.5, 51.0, 7.6, 9.2, 8.2, 2.2),
    (-39.0, 52.4, 8.2, 8.5, 6.6, 2.3),
    (-42.5, 52.9, 7.6, 7.4, 6.2, 2.4),
    (-45.5, 52.4, 6.0, 6.2, 5.8, 2.5),
    (-48.5, 51.3, 4.9, 4.9, 5.0, 2.7),
    (-52.0, 50.3, 4.3, 3.9, 4.1, 2.8),
    (-54.6, 49.9, 3.9, 3.3, 3.6, 2.7),
    (-56.6, 49.8, 3.4, 2.9, 3.1, 2.5),
    (-57.9, 49.7, 2.2, 2.0, 2.2, 2.2),
    (-58.4, 49.7, 0.8, 0.8, 0.9, 2.0),
]
# mandibola a bocca chiusa, poi ruotata attorno alla cerniera: y, quota, semilarghezza, sopra, sotto
MANDIBOLA = [
    (-40.5, 44.2, 6.0, 2.3, 4.2),
    (-44.5, 44.3, 4.7, 2.0, 3.3),
    (-48.5, 44.5, 3.4, 1.7, 2.4),
    (-52.5, 44.6, 2.9, 1.5, 2.0),
    (-55.2, 44.8, 2.1, 1.2, 1.5),
    (-56.6, 44.9, 0.9, 0.7, 0.9),
]
CERNIERA = Vector((0.0, -41.5, 46.4))
APERTURA = math.radians(17.0)
OCCHIO = Vector((3.75, -46.2, 54.6))  # lato +x; l'altro e' speculare
R_OCCHIO = 0.95
NARICI = [Vector((1.3, -58.35, 50.6)), Vector((-1.3, -58.35, 50.6))]

# zampa anteriore (lato +x): punto, semilarghezza (x), semiprofondita' (y); la prima sezione e' dentro il
# tronco, cosi' spalla e coscia si fondono senza gradini
ANTERIORE = [
    ((6.6, -17.0, 48.0), 3.2, 6.5),
    ((7.4, -17.2, 41.0), 4.2, 7.0),
    ((7.6, -16.5, 34.0), 3.6, 5.6),
    ((7.5, -16.3, 29.0), 3.0, 4.4),
    ((7.3, -16.8, 23.0), 3.0, 3.9),
    ((7.1, -17.3, 15.0), 2.5, 3.0),
    ((7.0, -17.7, 9.0), 2.15, 2.55),
    ((7.0, -18.4, 6.0), 2.25, 2.65),
    ((7.0, -19.8, 3.8), 2.3, 2.6),
]
PIEDE_ANT = Vector((7.0, -21.6, 2.2))
POSTERIORE = [
    ((6.0, 36.0, 52.0), 3.6, 8.0),
    ((7.0, 35.0, 45.0), 5.0, 10.2),
    ((7.5, 34.0, 38.0), 4.8, 8.6),
    ((7.5, 33.3, 32.0), 3.8, 5.8),
    ((7.2, 36.0, 26.0), 2.9, 4.3),
    ((7.1, 40.0, 20.0), 2.7, 3.8),
    ((7.0, 42.5, 15.5), 2.3, 3.1),
    ((7.0, 41.5, 10.0), 1.9, 2.4),
    ((7.0, 39.7, 5.0), 2.0, 2.4),
    ((7.0, 38.0, 3.2), 2.15, 2.55),
]
PIEDE_POST = Vector((7.0, 35.1, 2.1))
SPOSTA_POSTERIORI = 5.5  # di quanto le zampe posteriori della Lupa stanno piu' indietro di quelle della volpe

CODA = [((0, 42.0, 51.5), 3.1), ((0, 47.0, 46.0), 2.6), ((0, 53.0, 39.5), 2.2), ((0, 59.5, 33.0), 1.9),
        ((0, 65.0, 27.5), 1.8), ((0, 68.5, 24.0), 1.4), ((0, 70.5, 21.8), 0.4)]
MAMMELLE_Y = (-6.0, 3.0, 12.0, 19.0)


def _dorso_ventre(y):
    """Quote di dorso e ventre del tronco e semilarghezza alla coordinata y (interpolate)."""
    ys = [r[0] for r in TRONCO]
    y = min(max(y, ys[0]), ys[-1])
    for i in range(len(ys) - 1):
        if ys[i] <= y <= ys[i + 1]:
            f = (y - ys[i]) / (ys[i + 1] - ys[i])
            a, b = TRONCO[i], TRONCO[i + 1]
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f
    return TRONCO[-1][1], TRONCO[-1][2], TRONCO[-1][3]


def tronco(p):
    anelli = []
    for y, dorso, ventre, w, ch in catmull(TRONCO, 44):
        zc = (dorso + ventre) / 2
        h = (dorso - ventre) / 2
        anelli.append(anello(Vector((0, y, zc)), Vector((1, 0, 0)), Vector((0, 0, 1)), w, h, h, n=2.25, chiglia=ch, punti=44))
    p.loft(anelli)
    for s in (-1, 1):
        p.ellissoide(Vector((s * 8.4, -18.0, 45.0)), (2.6, 6.2, 9.0), Matrix.Rotation(s * -0.12, 3, "Y"))  # spalla
        p.ellissoide(Vector((s * 7.4, 39.0, 44.5)), (4.2, 6.2, 8.5))  # natica e coscia dietro
        p.ellissoide(Vector((s * 7.4, -12.6, 29.5)), (1.5, 1.6, 2.0))  # punta del gomito


def collo(p):
    righe = catmull(COLLO, 16)
    centri = [Vector((0, r[0], r[1])) for r in righe]
    p.loft([anello(c, A, B, r[2], r[3], r[4], n=2.2, punti=40) for (T, A, B), c, r in zip(telai(centri), centri, righe)])
    return centri, righe


def _ruota_mandibola(v):
    return CERNIERA + Matrix.Rotation(APERTURA, 3, "X") @ (Vector(v) - CERNIERA)


def testa(p):
    """Cranio, mascella, mandibola aperta con lingua e labbra, naso, occhi con palpebre, sopracciglia,
    zigomi, orecchie a coppa col bordo spesso, bordo di perline tra testa e criniera."""
    righe = catmull(TESTA, 28)
    centri = [Vector((0, r[0], r[1])) for r in righe]
    p.loft([anello(c, A, B, r[2], r[3], r[4], n=r[5], punti=40) for (T, A, B), c, r in zip(telai(centri), centri, righe)])
    righe = catmull(MANDIBOLA, 14)
    centri = [Vector((0, r[0], r[1])) for r in righe]
    anelli = [anello(c, A, B, r[2], r[3], r[4], n=2.5, punti=28) for (T, A, B), c, r in zip(telai(centri), centri, righe)]
    p.loft([[_ruota_mandibola(q) for q in a] for a in anelli])
    # lingua, adagiata nella mandibola
    p.ellissoide(_ruota_mandibola((0, -50.0, 46.0)), (2.0, 4.6, 0.75), Matrix.Rotation(APERTURA, 3, "X"))
    for s in (-1, 1):
        # labbra: rotolo lungo il bordo della mascella e della mandibola, angolo della bocca sotto l'occhio
        su = [Vector((s * 4.3, -42.6, 46.7)), Vector((s * 3.9, -46.0, 46.3)), Vector((s * 3.4, -50.0, 46.1)),
              Vector((s * 2.9, -54.0, 46.1)), Vector((s * 2.0, -56.4, 46.4))]
        p.tubo(su, [0.6, 0.5, 0.44, 0.4, 0.36], lati=8)
        giu = [_ruota_mandibola(q) for q in ((s * 4.4, -42.6, 46.2), (s * 3.9, -46.5, 46.4), (s * 3.2, -50.5, 46.5),
                                            (s * 2.6, -53.6, 46.5), (s * 1.7, -56.0, 46.6))]
        p.tubo(giu, [0.55, 0.45, 0.4, 0.36, 0.32], lati=8)
        p.ellissoide(Vector((s * 4.6, -42.9, 45.6)), (1.1, 1.9, 1.5))  # angolo della bocca
        # occhio: bulbo, palpebre a mandorla, arcata sopracciliare
        oc = Vector((s * OCCHIO.x, OCCHIO.y, OCCHIO.z))
        p.ellissoide(oc, (R_OCCHIO, R_OCCHIO, R_OCCHIO), seg=20, anelli_n=12)
        nrm = Vector((s * 0.55, -0.78, 0.22)).normalized()
        lato = nrm.cross(Vector((0, 0, 1))).normalized()
        alto = lato.cross(nrm).normalized()
        giro = [oc + nrm * 0.42 + (lato * math.cos(a) * 1.2 + alto * math.sin(a) * 0.78) for a in
                (2 * math.pi * k / 24 for k in range(27))]
        p.tubo(giro, [0.24] * len(giro), lati=7)
        p.tubo([Vector((s * 1.9, -47.6, 57.0)), Vector((s * 3.3, -46.9, 57.6)), Vector((s * 4.9, -45.4, 57.1)),
                Vector((s * 5.9, -43.9, 55.9))], [0.9, 1.05, 0.9, 0.6], lati=9)
        p.ellissoide(Vector((s * 2.4, -45.4, 58.0)), (1.6, 1.8, 0.8))  # fronte sopra lo stop
        p.ellissoide(Vector((s * 5.7, -42.4, 51.8)), (1.6, 3.6, 2.4))  # zigomo
        # orecchia: coppa aperta in avanti e un po' in fuori, bordo spesso
        base = Vector((s * 4.9, -38.4, 58.6))
        cima = Vector((s * 6.4, -40.2, 66.6))
        u = (cima - base).normalized()
        f = Vector((s * 0.45, -1.0, 0.0)).normalized()
        wdir = u.cross(f).normalized()
        ddir = wdir.cross(u).normalized()
        if ddir.dot(f) < 0:
            ddir = -ddir
        sezioni = []
        k = 12
        for i in range(11):
            t = i / 10
            c = base.lerp(cima, t)
            W = 3.2 * (1 - t) ** 0.6 * (0.75 + 0.25 * math.cos(t * math.pi / 2)) + 0.55 * math.sin(math.pi * min(t, 0.999)) ** 0.5 * (t > 0.6)
            D = 1.6 * (1 - t) ** 0.9 + 0.12
            th = 0.6 * (1 - 0.5 * t)
            fuori = [c + wdir * (W * math.sin(a)) - ddir * (D * math.cos(a)) for a in
                     (math.radians(-105 + 210 * j / (k - 1)) for j in range(k))]
            dentro = [c + wdir * ((W - th) * math.sin(a)) - ddir * ((D - th * 0.8) * math.cos(a)) + ddir * th * 0.2 for a in
                      (math.radians(105 - 210 * j / (k - 1)) for j in range(k))]
            sezioni.append(fuori + dentro)
        p.loft(sezioni)
        # perline: dalla nuca, dietro l'orecchio, fino alla gola
        linea = [Vector((s * 0.6, -37.4, 60.4)), Vector((s * 4.0, -37.7, 59.6)), Vector((s * 7.4, -38.1, 55.5)),
                 Vector((s * 9.0, -38.3, 50.5)), Vector((s * 8.4, -38.5, 45.0)), Vector((s * 5.6, -38.7, 41.0)),
                 Vector((s * 1.4, -38.9, 39.5))]
        dense = catmull([tuple(q) for q in linea], 200)
        lung = 0.0
        prec = Vector(dense[0])
        prossima = 0.0
        for q in dense:
            q = Vector(q)
            lung += (q - prec).length
            prec = q
            if lung >= prossima:
                p.ellissoide(q, (0.46, 0.46, 0.46), seg=10, anelli_n=6)
                prossima += 1.0
    p.ellissoide(Vector((0, -57.3, 50.9)), (2.8, 1.35, 1.75))  # naso


def _zampa(p, righe, s, piede, anteriore):
    dense = catmull([(s * q[0], q[1], q[2], w, d) for q, w, d in righe], 32)
    centri = [Vector(r[:3]) for r in dense]
    p.loft([anello(c, A, B, r[3], r[4], r[4], n=2.05, punti=28) for (T, A, B), c, r in
            zip(telai(centri, alto=Vector((0, -1, 0))), centri, dense)])
    c = Vector((s * piede.x, piede.y, piede.z))
    p.ellissoide(c, (2.7, 3.4, 2.1))
    for dx, avanti in ((-2.0, 0.6), (-0.7, 1.6), (0.7, 1.6), (2.0, 0.6)):
        b = c + Vector((s * dx * 0.8, -1.6, 0.4))
        m = c + Vector((s * dx * 1.0, -3.4 - avanti, 0.6))
        t = c + Vector((s * dx * 1.08, -5.0 - avanti, -1.0))
        p.tubo([b, m, t], [1.15, 0.95, 0.68], lati=10)
        p.tubo([t + Vector((0, 0.3, 0.15)), t + Vector((0, -0.9, -0.55)), t + Vector((0, -1.6, -1.05))], [0.42, 0.28, 0.06], lati=7)
    if anteriore:
        p.tubo([c + Vector((s * 2.4, 2.4, 3.6)), c + Vector((s * 2.7, 1.6, 2.6))], [0.6, 0.35], lati=7)  # sperone
    else:
        p.ellissoide(Vector((s * 7.0, 44.2, 16.2)), (1.1, 1.5, 1.8))  # punta del garretto


def zampe(p):
    for s in (-1, 1):
        _zampa(p, ANTERIORE, s, PIEDE_ANT, True)
        _zampa(p, POSTERIORE, s, PIEDE_POST, False)


def coda(p):
    dense = catmull([tuple(q) + (r,) for q, r in CODA], 24)
    p.tubo([Vector(r[:3]) for r in dense], [r[3] for r in dense], lati=14)


def mammelle(p):
    """Otto mammelle piene a goccia (gonfie in alto, poi si affusolano), come nella statua."""
    for y in MAMMELLE_Y:
        _, ventre, _ = _dorso_ventre(y)
        for s in (-1, 1):
            base = Vector((s * 3.9, y, ventre + 1.5))
            punta = Vector((s * 4.2, y + 0.4, ventre - 5.2))
            pts = [base.lerp(punta, t) for t in (0.0, 0.22, 0.42, 0.62, 0.8, 0.93, 1.0)]
            p.tubo(pts, [2.6, 2.75, 2.45, 1.85, 1.2, 0.8, 0.6], lati=14)
            p.ellissoide(punta + Vector((0, 0, -0.2)), (0.42, 0.42, 0.5), seg=10, anelli_n=6)


def denti():
    """Denti come mesh a parte (non passano dal remesh, sono troppo fini): canini, incisivi, premolari."""
    p = Pezzi()

    def dente(base, punta, r):
        p.tubo([base, base.lerp(punta, 0.5), punta], [r, r * 0.72, 0.04], lati=8)

    for s in (-1, 1):
        dente(Vector((s * 2.2, -54.0, 46.9)), Vector((s * 2.35, -54.4, 44.6)), 0.72)  # canino superiore
        for y in (-51.8, -50.0, -48.2):
            dente(Vector((s * 3.05, y, 46.6)), Vector((s * 3.1, y, 45.5)), 0.5)  # premolari
        for x in (0.45, 1.25):
            dente(Vector((s * x, -56.3, 47.0)), Vector((s * x, -56.4, 45.8)), 0.36)  # incisivi superiori
        cb = _ruota_mandibola(Vector((s * 1.9, -53.4, 45.7)))
        dente(cb, cb + Matrix.Rotation(APERTURA, 3, "X") @ Vector((0, -0.2, 2.0)), 0.62)  # canino inferiore
        for x in (0.4, 1.1):
            ib = _ruota_mandibola(Vector((x * s, -55.6, 45.6)))
            dente(ib, ib + Matrix.Rotation(APERTURA, 3, "X") @ Vector((0, -0.1, 1.0)), 0.32)
    return p.mesh(LUPA + " denti")


# ---------------------------------------------------------------------------------------------
# Rilievi dopo il remesh: criniera a ciocche, treccia, cresta, costole, occhi, narici


def _quota_centro(y):
    return np.interp(y, [-40, -34, -28, -20, -10, 0, 20, 46], [49.6, 48.8, 48.0, 47.2, 46.2, 46.2, 47.0, 47.6])


def _ciocca(a, b, L, Wd, alto):
    """Altezza di una ciocca a fiamma (coordinate locali a lungo la ciocca, b di traverso): radice larga,
    punta che si stringe e si arriccia, due solchi paralleli in mezzo."""
    u = (a + 0.35 * L) / L  # 0 radice, 1 punta
    dentro = (u > 0) & (u < 1)
    uc = np.clip(u, 0, 1)
    b0 = 0.95 * Wd * uc ** 2.0  # la punta si piega di lato (il ricciolo)
    w = Wd * (1.0 - 0.72 * uc) * np.sqrt(np.clip(np.sin(np.pi * np.clip(uc * 0.92 + 0.04, 0, 1)), 0, 1))
    w = np.maximum(w, 1e-3)
    q = (b - b0) / w
    prof = np.clip(1 - q * q, 0, None)
    lungo = np.clip(uc / 0.14, 0, 1) ** 0.6 * (1.0 - 0.62 * uc) * np.clip((1 - uc) / 0.1, 0, 1) ** 0.5
    solchi = 0.8 + 0.2 * np.cos(2 * np.pi * q * 1.25)
    return np.where(dentro, alto * prof * lungo * solchi, 0.0)


def rilievi(me):
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    nr = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("normal", nr)
    nr = nr.reshape(n, 3)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    zc = _quota_centro(y)
    th = np.arctan2(x, z - zc)  # 0 sul dorso, +-pi sotto
    R = 10.4
    t = th * R
    spost = np.zeros(n)
    # criniera: ciocche a file sfalsate, verso dietro e in basso; davanti c'e' il bordo di perline
    bordo = -16.0 - 3.4 * np.clip(np.abs(th) / 2.3, 0, 1) + 0.9 * np.sin(t * 1.9)
    criniera = (y < bordo) & (y > -37.55) & (np.abs(th) < 2.85)
    Ls, Lt, beta = 2.05, 1.72, math.radians(32)
    migliore = np.zeros(n)
    idx = np.nonzero(criniera)[0]
    yy, tt = y[idx], t[idx]
    r0 = np.floor(yy / Ls)
    for dr in (0, 1, -1):
        r = r0 + dr
        off = np.where(np.mod(r, 2) == 0, 0.0, Lt / 2)
        c0 = np.round((tt - off) / Lt)
        for dc in (-1, 0, 1):
            cy = r * Ls
            ct = (c0 + dc) * Lt + off
            sg = np.where(ct >= 0, 1.0, -1.0)
            caso = np.mod(np.sin(r * 12.9898 + (c0 + dc) * 78.233) * 43758.5453, 1.0)
            caso2 = np.mod(np.sin(r * 39.346 + (c0 + dc) * 11.135) * 24634.6345, 1.0)
            dy, dt = yy - cy - (caso - 0.5) * 0.5, tt - ct - (caso2 - 0.5) * 0.4
            # direzione della ciocca: indietro (+y) piegata verso il basso del fianco
            a = dy * math.cos(beta) + dt * sg * math.sin(beta)
            b = -dy * math.sin(beta) + dt * sg * math.cos(beta)
            h = _ciocca(a, b * sg, 3.0 * (0.9 + 0.2 * caso), 0.95, 0.42)
            migliore[idx] = np.maximum(migliore[idx], h)
    sfuma = np.clip((bordo[idx] - yy) / 0.8, 0, 1) * np.clip((yy + 37.55) / 0.6, 0, 1)
    spost[idx] += migliore[idx] * sfuma
    # treccia dietro la spalla: fascia rialzata con corda a S, dal dorso fin sotto il fianco
    yb, wb = -9.2, 1.65
    tr = (np.abs(y - yb) < wb) & (np.abs(th) < 2.2)
    q = (y[tr] - yb) / wb
    fascia = np.sqrt(np.clip(1 - q * q, 0, None))
    corda = np.clip(np.cos(2 * np.pi * (t[tr] / 1.45 + q * 0.55)), 0, None) ** 1.5
    spost[tr] += (0.22 + 0.26 * corda) * fascia * np.clip((2.2 - np.abs(th[tr])) / 0.3, 0, 1)
    # cresta di ciocche lungo la spina dorsale, dal garrese alla groppa
    cr = (np.abs(x) < 2.2) & (y > -16.5) & (y < 43.0) & (nr[:, 2] > 0.55)
    ky = np.round((y[cr] + 16.5) / 3.0)
    a = y[cr] - (ky * 3.0 - 16.5)
    spost[cr] = np.maximum(spost[cr], _ciocca(a, x[cr], 2.9, 1.15, 0.36))
    # costole
    dorso = np.interp(y, [r[0] for r in TRONCO], [r[1] for r in TRONCO])
    ventre = np.interp(y, [r[0] for r in TRONCO], [r[2] for r in TRONCO])
    largo = np.interp(y, [r[0] for r in TRONCO], [r[3] for r in TRONCO])
    uu = (z - ventre) / np.maximum(dorso - ventre, 1e-3)
    co_ = (y > -5) & (y < 14) & (np.abs(x) > 0.6 * largo) & (uu > 0.3) & (uu < 0.76)
    ys = y[co_] + (0.8 - uu[co_]) * 4.0
    onda = 0.5 + 0.5 * np.cos(2 * np.pi * (ys + 5) / 3.5)
    spost[co_] += 0.2 * onda * onda * np.sin(np.pi * (uu[co_] - 0.3) / 0.46) * np.clip(np.minimum(y[co_] + 5, 14 - y[co_]) / 3, 0, 1)
    # occhi: pupilla e iride incise sul bulbo
    for s in (-1, 1):
        oc = np.array([s * OCCHIO.x, OCCHIO.y, OCCHIO.z])
        fronte = oc + R_OCCHIO * np.array([s * 0.55, -0.78, 0.22]) / np.linalg.norm([0.55, -0.78, 0.22])
        d = np.linalg.norm(co - fronte, axis=1)
        vicino = np.linalg.norm(co - oc, axis=1) < R_OCCHIO + 0.12
        spost[vicino & (d < 0.42)] -= 0.3 * (1 - (d[vicino & (d < 0.42)] / 0.42) ** 2)
        anello_ = vicino & (d > 0.66) & (d < 0.84)
        spost[anello_] -= 0.1
        # orbita: conca a mandorla attorno al bulbo (il bulbo resta in rilievo dentro)
        dal_centro = np.linalg.norm(co - oc, axis=1)
        rel = co - oc
        nrm_o = np.array([s * 0.55, -0.78, 0.22]) / np.linalg.norm([0.55, -0.78, 0.22])
        lato_o = np.cross(nrm_o, [0, 0, 1.0])
        lato_o /= np.linalg.norm(lato_o)
        alto_o = np.cross(lato_o, nrm_o)
        e = (rel @ lato_o / 2.0) ** 2 + (rel @ alto_o / 1.35) ** 2
        conca = (e < 1.0) & (dal_centro > R_OCCHIO + 0.08) & (rel @ nrm_o > -0.6)
        spost[conca] -= 0.55 * (1 - e[conca]) ** 0.7
    # anatomia del fianco vista di profilo (come nella foto): cresta della scapola, massa del tricipite
    # dietro la spalla, punta dell'anca, piega tra fianco e coscia. Solo sulle superfici di lato.
    di_lato = np.abs(nr[:, 0]) > 0.35
    yl, zl = y[di_lato], z[di_lato]

    def _segmento2d(p0, p1, w):
        a, b = np.array(p0), np.array(p1)
        ab = b - a
        q = np.stack([yl, zl], axis=1) - a
        tt_ = np.clip(q @ ab / (ab @ ab), 0, 1)
        d = np.linalg.norm(q - tt_[:, None] * ab, axis=1)
        return np.exp(-(d / w) ** 2)

    def _bozza2d(c, ry, rz):
        e = ((yl - c[0]) / ry) ** 2 + ((zl - c[1]) / rz) ** 2
        return np.clip(1 - e, 0, None) ** 2

    anatomia = (0.5 * _segmento2d((-19.0, 56.0), (-22.0, 44.5), 1.5) + 0.45 * _bozza2d((-12.5, 41.0), 3.5, 4.5)
                + 0.55 * _bozza2d((31.0, 55.5), 2.2, 2.0) - 0.4 * _segmento2d((27.5, 45.0), (25.0, 35.0), 0.9))
    spost[di_lato] += anatomia * (np.abs(x[di_lato]) > 4.0)
    # solco sotto il naso (filtro)
    fil = (np.abs(x) < 0.8) & (y < -56.6) & (y > -59.2) & (z > 48.2) & (z < 50.4)
    spost[fil] -= 0.3 * np.exp(-(x[fil] / 0.28) ** 2)
    for nn in NARICI:
        d = np.linalg.norm(co - np.array(nn), axis=1)
        m = d < 0.62
        spost[m] -= 0.5 * (1 - (d[m] / 0.62) ** 2)
    co += nr * spost[:, None]
    me.vertices.foreach_set("co", co.astype(np.float32).ravel())
    me.update()


def _archi(me):
    ed = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", ed)
    return ed.reshape(-1, 2)


def taubin(me, iterazioni=24, lam=0.5, mu=-0.53):
    """Lisciatura che non rimpicciolisce: toglie i gradini del remesh a voxel, tiene le forme."""
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    ed = _archi(me)
    cnt = np.maximum(np.bincount(ed.ravel(), minlength=n), 1).astype(np.float64)

    def lap(x):
        out = np.empty_like(x)
        for k in range(3):
            out[:, k] = (np.bincount(ed[:, 0], weights=x[ed[:, 1], k], minlength=n)
                         + np.bincount(ed[:, 1], weights=x[ed[:, 0], k], minlength=n)) / cnt
        return out - x

    for _ in range(iterazioni):
        co += lam * lap(co)
        co += mu * lap(co)
    me.vertices.foreach_set("co", co.astype(np.float32).ravel())
    me.update()


def convessita(me, giri=8):
    """Attributo 'convessita' per vertice (0 incavo, 0,5 piano, 1 rilievo): la patina si deposita nei
    solchi, il bronzo resta lucido dove si tocca. Funziona sia in EEVEE sia in Cycles."""
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    nr = np.empty(n * 3, dtype=np.float32)
    me.vertices.foreach_get("normal", nr)
    nr = nr.reshape(n, 3)
    ed = np.empty(len(me.edges) * 2, dtype=np.int32)
    me.edges.foreach_get("vertices", ed)
    ed = ed.reshape(-1, 2)
    somma = np.zeros((n, 3), dtype=np.float32)
    cnt = np.zeros(n, dtype=np.float32)
    for a, b in ((0, 1), (1, 0)):
        np.add.at(somma, ed[:, a], co[ed[:, b]])
        np.add.at(cnt, ed[:, a], 1)
    media = somma / np.maximum(cnt, 1)[:, None]
    c = -np.einsum("ij,ij->i", media - co, nr)  # > 0 sporge
    c = np.sign(c) * np.maximum(np.abs(c) - 0.006, 0.0)  # zona morta: le minime ondulazioni del remesh non contano
    for _ in range(giri):
        s = np.zeros(n, dtype=np.float32)
        np.add.at(s, ed[:, 0], c[ed[:, 1]])
        np.add.at(s, ed[:, 1], c[ed[:, 0]])
        c = 0.5 * c + 0.5 * s / np.maximum(cnt, 1)
    val = np.clip(0.5 + 0.5 * c / 0.05, 0.0, 1.0)
    attr = me.color_attributes.new("convessita", "FLOAT_COLOR", "POINT")
    col = np.repeat(val[:, None], 4, axis=1)
    col[:, 3] = 1.0
    attr.data.foreach_set("color", col.ravel())


def materiale_bronzo(nome="Bronzo Capitolino"):
    """Bronzo scuro come la Lupa: patina bruna quasi nera nei solchi, satinato sulle superfici, appena
    piu' chiaro sui rilievi consumati; piccole porosita' della fusione."""
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    if getattr(m, "node_tree", None) is None:
        m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    for x in list(N):
        N.remove(x)

    def nodo(tipo, x, y, **kv):
        q = N.new(tipo)
        q.location = (x, y)
        for k, v in kv.items():
            if k in q.inputs:
                q.inputs[k].default_value = v
            else:
                setattr(q, k, v)
        return q

    out = nodo("ShaderNodeOutputMaterial", 900, 0)
    bsdf = nodo("ShaderNodeBsdfPrincipled", 600, 0)
    # cera da museo: un velo lucido sopra la patina
    for k, v in (("Coat Weight", 0.3), ("Coat Roughness", 0.2)):
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    L.new(bsdf.outputs[0], out.inputs[0])
    conv = nodo("ShaderNodeAttribute", -900, 200, attribute_name="convessita", attribute_type="GEOMETRY")
    ao = nodo("ShaderNodeAmbientOcclusion", -900, -50, samples=8)
    ao.inputs["Distance"].default_value = 0.05
    tc = nodo("ShaderNodeTexCoord", -1100, -300)
    macchie = nodo("ShaderNodeTexNoise", -900, -300, noise_dimensions="3D")
    macchie.inputs["Scale"].default_value = 0.07
    macchie.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], macchie.inputs["Vector"])
    rilievo = nodo("ShaderNodeMapRange", -650, 200)
    rilievo.inputs["From Min"].default_value = 0.5
    rilievo.inputs["From Max"].default_value = 0.92
    L.new(conv.outputs["Fac"], rilievo.inputs["Value"])
    luce = nodo("ShaderNodeMath", -450, 100, operation="MULTIPLY")
    L.new(rilievo.outputs["Result"], luce.inputs[0])
    L.new(ao.outputs["AO"], luce.inputs[1])
    var = nodo("ShaderNodeMapRange", -650, -300)
    var.inputs["From Min"].default_value = 0.3
    var.inputs["From Max"].default_value = 0.7
    var.inputs["To Min"].default_value = 0.7
    var.inputs["To Max"].default_value = 1.1
    L.new(macchie.outputs["Fac"], var.inputs["Value"])
    esposto = nodo("ShaderNodeMath", -250, 50, operation="MULTIPLY", use_clamp=True)
    L.new(luce.outputs[0], esposto.inputs[0])
    L.new(var.outputs["Result"], esposto.inputs[1])
    patina = nodo("ShaderNodeValToRGB", -250, -250)
    cr = patina.color_ramp
    cr.elements[0].position = 0.25
    cr.elements[0].color = (0.045, 0.03, 0.019, 1)
    cr.elements[1].position = 0.8
    cr.elements[1].color = (0.13, 0.085, 0.05, 1)
    e = cr.elements.new(0.55)
    e.color = (0.08, 0.058, 0.038, 1)
    L.new(macchie.outputs["Fac"], patina.inputs["Fac"])
    col = nodo("ShaderNodeMix", 100, 100, data_type="RGBA")
    L.new(esposto.outputs[0], col.inputs["Factor"])
    L.new(patina.outputs["Color"], col.inputs["A"])
    col.inputs["B"].default_value = (0.42, 0.27, 0.15, 1)
    L.new(col.outputs["Result"], bsdf.inputs["Base Color"])
    rug = nodo("ShaderNodeMapRange", 100, -150)
    rug.inputs["To Min"].default_value = 0.42
    rug.inputs["To Max"].default_value = 0.26
    L.new(esposto.outputs[0], rug.inputs["Value"])
    L.new(rug.outputs["Result"], bsdf.inputs["Roughness"])
    # la patina e' un ossido (in parte dielettrico), il metallo vivo affiora sui rilievi
    met = nodo("ShaderNodeMapRange", 100, -300)
    met.inputs["To Min"].default_value = 0.6
    met.inputs["To Max"].default_value = 1.0
    L.new(esposto.outputs[0], met.inputs["Value"])
    L.new(met.outputs["Result"], bsdf.inputs["Metallic"])
    # porosita' della fusione e grana
    pori = nodo("ShaderNodeTexVoronoi", -250, -550, feature="F1")
    pori.inputs["Scale"].default_value = 1.6
    L.new(tc.outputs["Object"], pori.inputs["Vector"])
    buchi = nodo("ShaderNodeMapRange", -50, -550)
    buchi.inputs["From Min"].default_value = 0.0
    buchi.inputs["From Max"].default_value = 0.09
    buchi.inputs["To Min"].default_value = -1.0
    buchi.inputs["To Max"].default_value = 0.0
    L.new(pori.outputs["Distance"], buchi.inputs["Value"])
    grana = nodo("ShaderNodeTexNoise", -250, -750, noise_dimensions="3D")
    grana.inputs["Scale"].default_value = 4.0
    grana.inputs["Detail"].default_value = 10
    L.new(tc.outputs["Object"], grana.inputs["Vector"])
    somma = nodo("ShaderNodeMath", 150, -650, operation="MULTIPLY_ADD")
    L.new(grana.outputs["Fac"], somma.inputs[0])
    somma.inputs[1].default_value = 0.3
    L.new(buchi.outputs["Result"], somma.inputs[2])
    bump = nodo("ShaderNodeBump", 350, -450)
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.002
    L.new(somma.outputs[0], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


# ---------------------------------------------------------------------------------------------
# Costruzione


def scultura(nome=LUPA, voxel=0.25, lisciatura=90):
    """Mesh della lupa (spazio della volpe, cm): pezzi -> remesh a voxel -> lisciatura -> rilievi.
    Restituisce (corpo, denti)."""
    p = Pezzi()
    tronco(p)
    collo(p)
    testa(p)
    zampe(p)
    coda(p)
    mammelle(p)
    grezza = p.mesh(nome + " pezzi")
    ob = bpy.data.objects.new(nome + " pezzi", grezza)
    bpy.context.scene.collection.objects.link(ob)
    rm = ob.modifiers.new("Remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel
    rm.adaptivity = 0.0
    rm.use_smooth_shade = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me.name = nome
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.meshes.remove(grezza)
    taubin(me, iterazioni=lisciatura)
    rilievi(me)
    for poly in me.polygons:
        poly.use_smooth = True
    convessita(me)
    d = denti()
    for poly in d.polygons:
        poly.use_smooth = True
    return me, d
