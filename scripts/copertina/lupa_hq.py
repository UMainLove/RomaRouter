"""
La lupa della copertina, ispirata alla Lupa Capitolina: corpo asciutto con le costole in vista, ventre
retratto, collo con la criniera a riccioli disposti a file, cresta di riccioli sulla schiena, mammelle,
orecchie ritte; bronzo con la patina scura nei solchi e lucido sulle parti in rilievo.

Si modella come uno scultore che sbozza: sezioni (loft) per tronco, collo, testa, zampe, coda; piccoli
pezzi per orecchie, mammelle e riccioli; poi tutto si fonde con un remesh a voxel e si ammorbidisce.
Le articolazioni seguono le ossa della volpe Khronos (CC0, PixelMannen; rig e animazione CC BY 4.0 di
tomkranis), cosi' la lupa usa il suo scheletro e la sua corsa.

    ns = {}; exec(open(".../lupa_hq.py").read(), ns); ns["costruisci_lupa"](collezione, percorso_volpe)

Coordinate nello spazio dell'armatura della volpe (centimetri; muso verso -Y, coda verso +Y, z in alto).
"""

import math
import random

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
# Anatomia (spazio della volpe, cm)

# tronco: y, quota del dorso, quota del ventre, semilarghezza, chiglia
TRONCO = [
    (-31.0, 55.0, 37.0, 5.5, 0.2),
    (-26.0, 58.0, 30.0, 8.2, 0.35),
    (-19.0, 60.5, 26.0, 9.8, 0.45),
    (-11.0, 60.0, 25.0, 10.8, 0.45),
    (-3.0, 59.0, 26.5, 11.0, 0.4),
    (5.0, 57.8, 30.5, 10.2, 0.3),
    (11.0, 57.0, 36.5, 8.4, 0.15),
    (17.0, 56.8, 40.0, 7.4, 0.1),
    (23.0, 57.2, 40.5, 7.9, 0.1),
    (30.0, 57.8, 39.5, 8.6, 0.12),
    (36.0, 57.0, 40.0, 8.4, 0.15),
    (41.0, 54.5, 42.0, 6.8, 0.2),
    (45.5, 50.5, 44.5, 4.0, 0.1),
]

# collo (dal petto alla nuca): centro y, z, semilarghezza, semialtezza sopra, sotto
COLLO = [
    (-20.0, 50.0, 9.0, 10.5, 11.0),
    (-25.0, 53.0, 8.6, 10.0, 9.5),
    (-30.0, 56.5, 7.8, 9.0, 8.0),
    (-34.5, 59.5, 7.0, 7.8, 7.0),
    (-38.0, 61.5, 6.6, 7.0, 6.2),
]

# testa: y, z, semilarghezza, sopra, sotto, esponente
TESTA = [
    (-35.0, 63.0, 5.8, 5.6, 5.4, 2.2),
    (-38.5, 63.6, 6.8, 6.0, 6.0, 2.3),
    (-42.0, 63.0, 6.2, 5.2, 5.8, 2.4),
    (-45.0, 61.6, 4.6, 3.9, 5.0, 2.5),
    (-48.5, 60.4, 3.2, 3.0, 4.2, 2.8),
    (-52.0, 59.6, 2.6, 2.6, 3.5, 2.8),
    (-55.0, 59.3, 2.0, 2.2, 2.8, 2.5),
    (-57.0, 59.4, 1.4, 1.6, 2.0, 2.2),
    (-57.8, 59.5, 0.7, 0.8, 0.9, 2.0),
]

# zampa anteriore (lato +x): punto, semilarghezza (x), semiprofondita' (y); la prima sezione e' dentro il
# tronco, cosi' spalla e coscia si fondono senza gradini
ANTERIORE = [
    ((6.4, -16.0, 47.0), 2.4, 4.6),
    ((7.0, -16.4, 40.0), 3.5, 6.2),
    ((7.3, -16.2, 32.0), 3.3, 4.9),
    ((7.3, -16.6, 26.0), 2.8, 3.6),
    ((7.1, -16.9, 20.0), 2.5, 3.0),
    ((7.0, -17.4, 13.0), 2.0, 2.3),
    ((7.0, -17.8, 7.5), 1.8, 2.0),
    ((7.0, -19.0, 4.0), 1.9, 2.2),
]
ZAMPA_ANT = ((7.0, -22.0, 1.9), (2.6, 4.6, 1.9))

# zampa posteriore: coscia, gamba, metatarso
POSTERIORE = [
    ((6.2, 31.0, 50.0), 2.8, 6.0),
    ((6.9, 30.0, 44.0), 4.1, 8.4),
    ((7.2, 28.6, 37.0), 3.9, 7.2),
    ((7.2, 28.2, 30.5), 3.1, 4.9),
    ((7.1, 32.0, 23.0), 2.5, 3.6),
    ((7.0, 36.5, 17.0), 2.0, 2.8),
    ((7.0, 37.0, 14.0), 1.8, 2.4),
    ((7.0, 35.0, 8.0), 1.6, 2.0),
    ((7.0, 33.2, 3.5), 1.8, 2.1),
]
ZAMPA_POST = ((7.0, 29.5, 1.9), (2.5, 4.4, 1.9))

CODA = [((0, 42.0, 51.5), 3.3), ((0, 47.0, 46.0), 2.6), ((0, 53.0, 39.5), 2.1), ((0, 59.5, 33.0), 1.8),
        ((0, 65.0, 27.5), 1.9), ((0, 68.5, 24.0), 1.5), ((0, 70.5, 21.8), 0.4)]


def _dorso_ventre(y):
    """Quote di dorso e ventre del tronco alla coordinata y (interpolate)."""
    ys = [r[0] for r in TRONCO]
    y = min(max(y, ys[0]), ys[-1])
    for i in range(len(ys) - 1):
        if ys[i] <= y <= ys[i + 1]:
            f = (y - ys[i]) / (ys[i + 1] - ys[i])
            a, b = TRONCO[i], TRONCO[i + 1]
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f
    return TRONCO[-1][1], TRONCO[-1][2], TRONCO[-1][3]


def tronco(p):
    righe = catmull(TRONCO, 40)
    anelli = []
    for y, dorso, ventre, w, ch in righe:
        zc = (dorso + ventre) / 2
        h = (dorso - ventre) / 2
        anelli.append(anello(Vector((0, y, zc)), Vector((1, 0, 0)), Vector((0, 0, 1)), w, h, h, n=2.3, chiglia=ch, punti=40))
    p.loft(anelli)


def collo(p):
    righe = catmull(COLLO, 16)
    centri = [Vector((0, r[0], r[1])) for r in righe]
    anelli = []
    for (T, A, B), c, r in zip(telai(centri), centri, righe):
        anelli.append(anello(c, A, B, r[2], r[3], r[4], n=2.2, punti=36))
    p.loft(anelli)
    return centri, righe


def testa(p):
    righe = catmull(TESTA, 26)
    centri = [Vector((0, r[0], r[1])) for r in righe]
    anelli = []
    for (T, A, B), c, r in zip(telai(centri), centri, righe):
        anelli.append(anello(c, A, B, r[2], r[3], r[4], n=r[5], punti=36))
    p.loft(anelli)
    for s in (-1, 1):
        # arcate sopracciliari, occhi e zigomi appena accennati
        p.ellissoide(Vector((s * 2.9, -44.3, 65.2)), (1.3, 1.8, 0.75), Matrix.Rotation(s * 0.3, 3, "Y"))
        p.ellissoide(Vector((s * 3.65, -45.3, 63.9)), (0.75, 1.0, 0.55))
        p.ellissoide(Vector((s * 5.0, -41.0, 61.9)), (1.2, 3.2, 1.6))
        # orecchie: tronchi di cono schiacciati, ritte e un po' in avanti
        base = Vector((s * 4.6, -38.4, 66.5))
        cima = Vector((s * 5.7, -39.9, 73.6))
        anelli = []
        for i in range(8):
            t = i / 7
            c = base.lerp(cima, t)
            larg, spess = 3.3 * (1 - t) ** 0.85 + 0.25, 1.5 * (1 - t) + 0.2
            anelli.append(anello(c, Vector((1, 0, 0)), Vector((0, 1, 0)), larg, spess, spess * 0.6, n=2.0, punti=16))
        p.loft(anelli)
    # naso
    p.ellissoide(Vector((0, -57.6, 60.4)), (1.5, 1.1, 1.1))


def zampa(p, righe, piede, s):
    dense = catmull([(s * q[0], q[1], q[2], w, d) for q, w, d in righe], 30)
    centri = [Vector(r[:3]) for r in dense]
    anelli = []
    for (T, A, B), c, r in zip(telai(centri, alto=Vector((0, -1, 0))), centri, dense):
        anelli.append(anello(c, A, B, r[3], r[4], r[4], n=2.0, punti=28))
    p.loft(anelli)
    (cx, cy, cz), (sx, sy, sz) = piede
    p.ellissoide(Vector((s * cx, cy, cz)), (sx, sy, sz))
    # dita: quattro cuscinetti allungati
    for k, dx in enumerate((-1.6, -0.55, 0.55, 1.6)):
        avanti = 1.2 if k in (1, 2) else 0.2
        p.ellissoide(Vector((s * cx + dx, cy - sy * 0.75 - avanti, 1.25)), (0.85, 1.5, 1.2))


def coda(p):
    dense = catmull([tuple(q) + (r,) for q, r in CODA], 24)
    p.tubo([Vector(r[:3]) for r in dense], [r[3] for r in dense], lati=14)


def mammelle(p):
    for y in (-4.0, 4.0, 11.0, 17.5):
        _, ventre, w = _dorso_ventre(y)
        for s in (-1, 1):
            base = Vector((s * 3.2, y, ventre + 1.6))
            punta = base + Vector((s * 0.2, 0.3, -3.4 + abs(y - 8) * 0.05))
            pts = [base.lerp(punta, t) for t in (0, 0.4, 0.75, 1.0)]
            p.tubo(pts, [1.7, 1.55, 1.3, 1.0], lati=12)


def riccioli(p, centri_collo, righe_collo, seme=7):
    """La criniera: file di riccioli a spirale sul collo, dalla nuca al garrese."""
    rnd = random.Random(seme)
    fr = telai(centri_collo)
    n_file = 7
    for i in range(n_file):
        t = (i + 0.5) / n_file
        j = t * (len(centri_collo) - 1)
        k = min(int(j), len(centri_collo) - 2)
        f = j - k
        c = centri_collo[k].lerp(centri_collo[k + 1], f)
        T, A, B = fr[k]
        r = [a + (b - a) * f for a, b in zip(righe_collo[k], righe_collo[k + 1])]
        w, ht, hb = r[2], r[3], r[4]
        n_giro = 9 if i < 5 else 8
        for q in range(n_giro):
            ang = math.radians(-105 + 210 * (q + (0.5 if i % 2 else 0.0)) / n_giro) + rnd.uniform(-0.06, 0.06)
            # punto della superficie a quell'angolo (0 = in alto)
            x, z = math.sin(ang), math.cos(ang)
            h = ht if z >= 0 else hb
            sup = c + A * (w * x * 1.02) + B * (h * z * 1.02)
            nrm = (A * (x / w) + B * (z / h)).normalized()
            _ricciolo(p, sup - nrm * 0.5, nrm, T, rnd.uniform(1.75, 2.15), rnd)


def _ricciolo(p, c, nrm, verso, R, rnd):
    t1 = (verso - nrm * verso.dot(nrm)).normalized()
    t2 = nrm.cross(t1)
    a0 = rnd.uniform(0, 2 * math.pi)
    giri = rnd.uniform(1.6, 1.95) * math.pi
    pts, raggi = [], []
    n = 22
    for i in range(n):
        s = i / (n - 1)
        a = a0 + giri * s
        rr = R * (1.0 - 0.82 * s)
        pts.append(c + (t1 * math.cos(a) + t2 * math.sin(a)) * rr + nrm * (0.55 * R * s ** 0.7))
        raggi.append(0.86 * R * 0.5 * (1.0 - 0.45 * s))
    p.tubo(pts, raggi, lati=8)


# ---------------------------------------------------------------------------------------------
# Dopo il remesh: costole e convessita'


def costole(me, inizio=-12.0, fine=6.5, passo=3.7, ampiezza=0.3):
    """Costole in rilievo sui fianchi, inclinate in basso e all'indietro come nella Lupa."""
    for v in me.vertices:
        x, y, z = v.co
        if not (inizio - 2 < y < fine + 2):
            continue
        dorso, ventre, w = _dorso_ventre(y)
        h = dorso - ventre
        if h <= 0 or abs(x) < 0.55 * w:
            continue
        u = (z - ventre) / h  # 0 ventre, 1 dorso
        if not 0.28 < u < 0.74:
            continue
        ys = y + (0.8 - u) * 4.0 + 0.8 * math.sin(3.0 * u)  # costole inclinate e un po' curve
        onda = 0.5 + 0.5 * math.cos(2 * math.pi * (ys - inizio) / passo)
        onda = onda * onda * (3 - 2 * onda)
        bordo = min(1.0, (y - inizio + 2) / 4, (fine + 2 - y) / 4) * math.sin(math.pi * (u - 0.28) / 0.46)
        v.co += v.normal * (ampiezza * onda * max(bordo, 0.0))


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
    for _ in range(giri):
        s = np.zeros(n, dtype=np.float32)
        np.add.at(s, ed[:, 0], c[ed[:, 1]])
        np.add.at(s, ed[:, 1], c[ed[:, 0]])
        c = 0.5 * c + 0.5 * s / np.maximum(cnt, 1)
    scala = np.percentile(np.abs(c), 95) + 1e-6
    val = np.clip(0.5 + 0.5 * c / scala, 0.0, 1.0)
    attr = me.color_attributes.new("convessita", "FLOAT_COLOR", "POINT")
    col = np.repeat(val[:, None], 4, axis=1)
    col[:, 3] = 1.0
    attr.data.foreach_set("color", col.ravel())


def materiale_bronzo(nome="Bronzo Capitolino"):
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
    bsdf = nodo("ShaderNodeBsdfPrincipled", 600, 0, Metallic=1.0)
    L.new(bsdf.outputs[0], out.inputs[0])
    conv = nodo("ShaderNodeAttribute", -900, 200, attribute_name="convessita", attribute_type="GEOMETRY")
    ao = nodo("ShaderNodeAmbientOcclusion", -900, -50, samples=8)
    ao.inputs["Distance"].default_value = 0.06
    tc = nodo("ShaderNodeTexCoord", -1100, -300)
    macchie = nodo("ShaderNodeTexNoise", -900, -300, noise_dimensions="3D")
    macchie.inputs["Scale"].default_value = 0.09
    macchie.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], macchie.inputs["Vector"])
    # quanto e' esposto: rilievo x non occluso x un po' di macchie
    rilievo = nodo("ShaderNodeMapRange", -650, 200)
    rilievo.inputs["From Min"].default_value = 0.47
    rilievo.inputs["From Max"].default_value = 0.85
    L.new(conv.outputs["Fac"], rilievo.inputs["Value"])
    luce = nodo("ShaderNodeMath", -450, 100, operation="MULTIPLY")
    L.new(rilievo.outputs["Result"], luce.inputs[0])
    L.new(ao.outputs["AO"], luce.inputs[1])
    var = nodo("ShaderNodeMapRange", -650, -300)
    var.inputs["From Min"].default_value = 0.3
    var.inputs["From Max"].default_value = 0.7
    var.inputs["To Min"].default_value = 0.65
    var.inputs["To Max"].default_value = 1.15
    L.new(macchie.outputs["Fac"], var.inputs["Value"])
    esposto = nodo("ShaderNodeMath", -250, 50, operation="MULTIPLY", use_clamp=True)
    L.new(luce.outputs[0], esposto.inputs[0])
    L.new(var.outputs["Result"], esposto.inputs[1])
    patina = nodo("ShaderNodeValToRGB", -250, -250)
    cr = patina.color_ramp
    cr.elements[0].position = 0.25
    cr.elements[0].color = (0.05, 0.034, 0.022, 1)
    cr.elements[1].position = 0.8
    cr.elements[1].color = (0.17, 0.105, 0.055, 1)
    e = cr.elements.new(0.55)
    e.color = (0.06, 0.06, 0.04, 1)  # velatura verdastra nei solchi
    L.new(macchie.outputs["Fac"], patina.inputs["Fac"])
    col = nodo("ShaderNodeMix", 100, 100, data_type="RGBA")
    L.new(esposto.outputs[0], col.inputs["Factor"])
    L.new(patina.outputs["Color"], col.inputs["A"])
    col.inputs["B"].default_value = (0.5, 0.31, 0.14, 1)  # bronzo lucidato dalle mani
    L.new(col.outputs["Result"], bsdf.inputs["Base Color"])
    rug = nodo("ShaderNodeMapRange", 100, -150)
    rug.inputs["To Min"].default_value = 0.58
    rug.inputs["To Max"].default_value = 0.22
    L.new(esposto.outputs[0], rug.inputs["Value"])
    L.new(rug.outputs["Result"], bsdf.inputs["Roughness"])
    grana = nodo("ShaderNodeTexNoise", -250, -550, noise_dimensions="3D")
    grana.inputs["Scale"].default_value = 3.0
    grana.inputs["Detail"].default_value = 10
    L.new(tc.outputs["Object"], grana.inputs["Vector"])
    bump = nodo("ShaderNodeBump", 350, -400)
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.002
    L.new(grana.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


# ---------------------------------------------------------------------------------------------
# Costruzione


def scultura(nome=LUPA, voxel=0.3, lisciatura=60):
    """Mesh della lupa (spazio della volpe, cm): pezzi -> remesh a voxel -> ammorbidimento -> costole."""
    p = Pezzi()
    tronco(p)
    cc, rc = collo(p)
    testa(p)
    for s in (-1, 1):
        zampa(p, ANTERIORE, ZAMPA_ANT, s)
        zampa(p, POSTERIORE, ZAMPA_POST, s)
    coda(p)
    mammelle(p)
    riccioli(p, cc, rc)
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
    costole(me)
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    convessita(me)
    return me
