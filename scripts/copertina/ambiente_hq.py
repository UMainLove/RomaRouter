"""
Ambiente della copertina HQ, da eseguire dopo copertina_hq.py nello stesso namespace (usa ELL, U_OVEST,
_n, _nodi, materiale_sampietrini...). Come nella foto di riferimento: la strada di sampietrini che punta
dritta alla rottura del Colosseo, il marciapiede rialzato a sinistra con il cordolo di peperino, a destra
il cordolo, la ringhiera e il prato; alberi romani (lecci, cipressi, pini domestici) con il fogliame
istanziato da geometry nodes; foschia leggera.

Il riferimento della strada e' la camera: C (a terra sotto la camera), F (avanti), R (destra);
un punto e' C + F*a + R*b.
"""

import math
import random

import bpy  # prima di bmesh e mathutils
import bmesh
from mathutils import Matrix, Vector, noise

SEMI_STRADA = 6.0  # meta' larghezza della strada


# ---------------------------------------------------------------------------------------------
# Riferimenti


def locale(x, y):
    """(u, v) di un punto del piano: u del punto piu' vicino dell'ellisse, v distanza (con segno)."""
    P = ELL.perimetro
    n = 360
    best = None
    for i in range(n):
        u = P * i / n
        p, _, _ = ELL.telaio(u)
        d = (x - p.x) ** 2 + (y - p.y) ** 2
        if best is None or d < best[0]:
            best = (d, u)
    u, passo = best[1], P / n
    while passo > 0.002:
        migliore = False
        for du in (-passo, passo):
            p, _, _ = ELL.telaio(u + du)
            d = (x - p.x) ** 2 + (y - p.y) ** 2
            if d < best[0]:
                best, u, migliore = (d, u + du), u + du, True
                break
        if not migliore:
            passo /= 2
    p, _, nr = ELL.telaio(u)
    v = (x - p.x) * nr.x + (y - p.y) * nr.y
    u = ((u - U_OVEST + P / 2) % P) - P / 2 + U_OVEST  # vicino all'asse ovest, come le u della scena
    return u, v


def telaio_strada(pos, mira):
    C = ELL.mappa(pos[0], pos[1], 0.0)
    T = ELL.mappa(mira[0], mira[1], 0.0)
    F = T - C
    F.z = 0.0
    F.normalize()
    R = Vector((F.y, -F.x, 0.0))
    return C, F, R


def azimut(vettore):
    return math.degrees(math.atan2(vettore.y, vettore.x))


def fine_verso_monumento(C, F, R, b, v_stop, z=0.0):
    """Primo a (lungo F) in cui la retta C + R*b + F*a arriva a distanza v_stop dalla facciata."""
    a = 0.0
    while a < 400.0:
        p = C + F * a + R * b
        if locale(p.x, p.y)[1] < v_stop:
            break
        a += 1.0
    lo, hi = a - 1.0, a
    for _ in range(14):
        m = (lo + hi) / 2
        p = C + F * m + R * b
        if locale(p.x, p.y)[1] < v_stop:
            hi = m
        else:
            lo = m
    return lo


# ---------------------------------------------------------------------------------------------
# Poligoni in coordinate mondo con UV in metri


class Poli:
    def __init__(self):
        self.lista = []

    def faccia(self, pts, uv=None, mat=0, liscia=False):
        pts = [Vector(p) for p in pts]
        if uv is None:
            n = Vector((0, 0, 0))
            for i in range(len(pts)):
                a, b = pts[i], pts[(i + 1) % len(pts)]
                n.x += (a.y - b.y) * (a.z + b.z)
                n.y += (a.z - b.z) * (a.x + b.x)
                n.z += (a.x - b.x) * (a.y + b.y)
            ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
            if az >= ax and az >= ay:
                uv = [(p.x, p.y) for p in pts]
            elif ax >= ay:
                uv = [(p.y, p.z) for p in pts]
            else:
                uv = [(p.x, p.z) for p in pts]
        self.lista.append((pts, uv, liscia, mat))

    def prisma(self, base, z0, z1, mat=0, sotto=False):
        """Base: punti (x, y) antiorari."""
        base = [Vector((p[0], p[1], 0.0)) for p in base]
        n = len(base)
        self.faccia([(p.x, p.y, z1) for p in base], [(p.x, p.y) for p in base], mat)
        if sotto:
            self.faccia([(p.x, p.y, z0) for p in reversed(base)], [(p.x, p.y) for p in reversed(base)], mat)
        s = 0.0
        for i in range(n):
            a, b = base[i], base[(i + 1) % n]
            lung = (b - a).length
            self.faccia([(a.x, a.y, z0), (b.x, b.y, z0), (b.x, b.y, z1), (a.x, a.y, z1)],
                        [(s, z0), (s + lung, z0), (s + lung, z1), (s, z1)], mat)
            s += lung

    def oggetto(self, nome, col, materiali, doppi=0.0004):
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.new("UVMap")
        for pts, uv, liscia, mat in self.lista:
            vs = [bm.verts.new(p) for p in pts]
            try:
                fc = bm.faces.new(vs)
            except ValueError:
                continue
            fc.smooth = liscia
            fc.material_index = mat
            for loop, (x, y) in zip(fc.loops, uv):
                loop[uvl].uv = (x, y)
        if doppi:
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=doppi)
        me = bpy.data.meshes.new(nome)
        bm.to_mesh(me)
        bm.free()
        for m in materiali:
            me.materials.append(m)
        ob = bpy.data.objects.new(nome, me)
        col.objects.link(ob)
        return ob


def rettangolo(p0, p1, larghezza, scarto=0.0):
    """Rettangolo antiorario lungo il segmento p0-p1, spostato a sinistra di 'scarto'."""
    d = Vector((p1.x - p0.x, p1.y - p0.y, 0.0)).normalized()
    n = Vector((-d.y, d.x, 0.0))
    a, b = scarto - larghezza / 2, scarto + larghezza / 2
    return [p0 + n * a, p1 + n * a, p1 + n * b, p0 + n * b]


def poligono_pieno(nome, contorno, z, col, materiale, uv_di):
    """Poligono semplice (anche concavo) triangolato, UV dalla funzione uv_di(punto)."""
    bm = bmesh.new()
    vs = [bm.verts.new((p.x, p.y, z)) for p in contorno]
    es = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=es, normal=(0.0, 0.0, 1.0))
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            loop[uvl].uv = uv_di(loop.vert.co)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(materiale)
    ob = bpy.data.objects.new(nome, me)
    col.objects.link(ob)
    return ob


# ---------------------------------------------------------------------------------------------
# Materiali


def materiale_peperino(nome="Peperino"):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 900, 0)
    bsdf = _n(N, "ShaderNodeBsdfPrincipled", 600, 0, Roughness=0.7)
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = _n(N, "ShaderNodeTexCoord", -800, 0)
    grana = _n(N, "ShaderNodeTexNoise", -500, 150, noise_dimensions="3D")
    grana.inputs["Scale"].default_value = 22
    grana.inputs["Detail"].default_value = 10
    grana.inputs["Roughness"].default_value = 0.65
    L.new(tc.outputs["Object"], grana.inputs["Vector"])
    macchie = _n(N, "ShaderNodeTexNoise", -500, -150, noise_dimensions="3D")
    macchie.inputs["Scale"].default_value = 0.8
    L.new(tc.outputs["Object"], macchie.inputs["Vector"])
    rampa = _n(N, "ShaderNodeValToRGB", -250, 150)
    rampa.color_ramp.elements[0].color = (0.06, 0.058, 0.055, 1)
    rampa.color_ramp.elements[1].color = (0.24, 0.225, 0.205, 1)
    L.new(grana.outputs["Fac"], rampa.inputs["Fac"])
    sporco = _n(N, "ShaderNodeMix", 100, 100, data_type="RGBA", blend_type="MULTIPLY")
    L.new(macchie.outputs["Fac"], sporco.inputs["Factor"])
    L.new(rampa.outputs["Color"], sporco.inputs["A"])
    sporco.inputs["B"].default_value = (0.55, 0.5, 0.45, 1)
    L.new(sporco.outputs["Result"], bsdf.inputs["Base Color"])
    bump = _n(N, "ShaderNodeBump", 300, -250)
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.008
    L.new(grana.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def materiale_ferro(nome="Ferro"):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 700, 0)
    bsdf = _n(N, "ShaderNodeBsdfPrincipled", 400, 0, Metallic=0.65, Roughness=0.48)
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = _n(N, "ShaderNodeTexCoord", -600, 0)
    rug = _n(N, "ShaderNodeTexNoise", -400, 0, noise_dimensions="3D")
    rug.inputs["Scale"].default_value = 6
    rug.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], rug.inputs["Vector"])
    col = _n(N, "ShaderNodeValToRGB", -150, 0)
    col.color_ramp.elements[0].position = 0.45
    col.color_ramp.elements[0].color = (0.03, 0.028, 0.026, 1)
    col.color_ramp.elements[1].position = 0.75
    col.color_ramp.elements[1].color = (0.11, 0.055, 0.03, 1)
    L.new(rug.outputs["Fac"], col.inputs["Fac"])
    L.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def materiale_prato(nome="Prato"):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 900, 0)
    bsdf = _n(N, "ShaderNodeBsdfPrincipled", 600, 0, Roughness=0.92)
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = _n(N, "ShaderNodeTexCoord", -900, 0)
    chiazze = _n(N, "ShaderNodeTexNoise", -600, 200, noise_dimensions="3D")
    chiazze.inputs["Scale"].default_value = 0.12
    chiazze.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], chiazze.inputs["Vector"])
    rampa = _n(N, "ShaderNodeValToRGB", -350, 200)
    rampa.color_ramp.elements[0].position = 0.35
    rampa.color_ramp.elements[0].color = (0.035, 0.06, 0.018, 1)
    rampa.color_ramp.elements[1].position = 0.7
    rampa.color_ramp.elements[1].color = (0.12, 0.11, 0.045, 1)
    L.new(chiazze.outputs["Fac"], rampa.inputs["Fac"])
    fili = _n(N, "ShaderNodeTexNoise", -600, -150, noise_dimensions="3D")
    fili.inputs["Scale"].default_value = 60
    fili.inputs["Detail"].default_value = 4
    L.new(tc.outputs["Object"], fili.inputs["Vector"])
    mescola = _n(N, "ShaderNodeMix", 100, 100, data_type="RGBA", blend_type="OVERLAY")
    mescola.inputs["Factor"].default_value = 0.5
    L.new(rampa.outputs["Color"], mescola.inputs["A"])
    L.new(fili.outputs["Color"], mescola.inputs["B"])
    L.new(mescola.outputs["Result"], bsdf.inputs["Base Color"])
    cam = _n(N, "ShaderNodeCameraData", -600, -450)
    lontano = _n(N, "ShaderNodeMapRange", -350, -450)
    lontano.inputs["From Min"].default_value = 8.0
    lontano.inputs["From Max"].default_value = 40.0
    lontano.inputs["To Min"].default_value = 0.5
    lontano.inputs["To Max"].default_value = 0.0
    L.new(cam.outputs["View Distance"], lontano.inputs["Value"])
    bump = _n(N, "ShaderNodeBump", 350, -250)
    bump.inputs["Distance"].default_value = 0.02
    L.new(lontano.outputs["Result"], bump.inputs["Strength"])
    L.new(fili.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def materiale_foglie(nome, scuro, chiaro, traslucenza=0.25):
    """Colore diverso per ogni ciuffo istanziato (Object Info > Random), un po' di luce passante."""
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 1000, 0)
    bsdf = _n(N, "ShaderNodeBsdfPrincipled", 450, 150, Roughness=0.55)
    trasl = _n(N, "ShaderNodeBsdfTranslucent", 450, -150)
    mix = _n(N, "ShaderNodeMixShader", 750, 0)
    mix.inputs[0].default_value = traslucenza
    L.new(bsdf.outputs[0], mix.inputs[1])
    L.new(trasl.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs[0])
    info = _n(N, "ShaderNodeObjectInfo", -600, 150)
    rampa = _n(N, "ShaderNodeValToRGB", -350, 150)
    rampa.color_ramp.elements[0].color = (*scuro, 1)
    rampa.color_ramp.elements[1].color = (*chiaro, 1)
    L.new(info.outputs["Random"], rampa.inputs["Fac"])
    L.new(rampa.outputs["Color"], bsdf.inputs["Base Color"])
    gialla = _n(N, "ShaderNodeMix", 150, -150, data_type="RGBA", blend_type="MULTIPLY")
    gialla.inputs["Factor"].default_value = 1.0
    L.new(rampa.outputs["Color"], gialla.inputs["A"])
    gialla.inputs["B"].default_value = (1.6, 1.8, 0.9, 1)
    L.new(gialla.outputs["Result"], trasl.inputs["Color"])
    try:
        m.use_backface_culling = False
    except AttributeError:
        pass
    return m


def materiale_corteccia(nome, chiaro, scuro):
    m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 900, 0)
    bsdf = _n(N, "ShaderNodeBsdfPrincipled", 600, 0, Roughness=0.9)
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = _n(N, "ShaderNodeTexCoord", -900, 0)
    stira = _n(N, "ShaderNodeMapping", -700, 0)
    stira.inputs["Scale"].default_value = (3.0, 3.0, 0.9)
    L.new(tc.outputs["Object"], stira.inputs["Vector"])
    placche = _n(N, "ShaderNodeTexVoronoi", -450, 100, feature="DISTANCE_TO_EDGE")
    placche.inputs["Scale"].default_value = 2.5
    L.new(stira.outputs["Vector"], placche.inputs["Vector"])
    solchi = _n(N, "ShaderNodeMapRange", -250, 100)
    solchi.inputs["From Min"].default_value = 0.0
    solchi.inputs["From Max"].default_value = 0.08
    L.new(placche.outputs["Distance"], solchi.inputs["Value"])
    col = _n(N, "ShaderNodeMix", 50, 100, data_type="RGBA", blend_type="MIX")
    L.new(solchi.outputs["Result"], col.inputs["Factor"])
    col.inputs["A"].default_value = (*scuro, 1)
    col.inputs["B"].default_value = (*chiaro, 1)
    L.new(col.outputs["Result"], bsdf.inputs["Base Color"])
    bump = _n(N, "ShaderNodeBump", 350, -200)
    bump.inputs["Strength"].default_value = 0.8
    bump.inputs["Distance"].default_value = 0.03
    L.new(solchi.outputs["Result"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


# ---------------------------------------------------------------------------------------------
# Strada, cordoli, ringhiera, prato


def curva_offset(u0, u1, v, z, passo=2.0):
    n = max(2, int(abs(u1 - u0) / passo))
    return [ELL.mappa(u0 + (u1 - u0) * i / n, v, z) for i in range(n + 1)]


def cordolo(poli, p0, p1, larghezza, z0, z1, blocco=1.1, giunto=0.012, mat=0):
    d = p1 - p0
    d.z = 0.0
    lung = d.length
    d.normalize()
    s = 0.0
    while s < lung - 0.05:
        e = min(s + blocco, lung)
        a, b = p0 + d * s, p0 + d * (e - giunto)
        poli.prisma([(q.x, q.y) for q in rettangolo(a, b, larghezza)], z0, z1, mat=mat)
        s = e


def ringhiera(poli, punti, z0, altezza=1.0, passo_montanti=2.2, passo_sbarre=0.12):
    """Ringhiera di ferro lungo una spezzata: montanti, due correnti, sbarre verticali."""
    lun = [0.0]
    for i in range(1, len(punti)):
        lun.append(lun[-1] + (Vector((punti[i].x, punti[i].y, 0)) - Vector((punti[i - 1].x, punti[i - 1].y, 0))).length)
    totale = lun[-1]

    def a_distanza(s):
        for i in range(1, len(punti)):
            if lun[i] >= s:
                t = (s - lun[i - 1]) / max(lun[i] - lun[i - 1], 1e-9)
                p = punti[i - 1].lerp(punti[i], t)
                d = Vector((punti[i].x - punti[i - 1].x, punti[i].y - punti[i - 1].y, 0)).normalized()
                return Vector((p.x, p.y, z0)), d
        d = Vector((punti[-1].x - punti[-2].x, punti[-1].y - punti[-2].y, 0)).normalized()
        return Vector((punti[-1].x, punti[-1].y, z0)), d

    def quadrato(c, d, lato):
        n = Vector((-d.y, d.x, 0))
        h = lato / 2
        return [(c - d * h - n * h), (c + d * h - n * h), (c + d * h + n * h), (c - d * h + n * h)]

    s = 0.0
    while s <= totale + 1e-6:
        c, d = a_distanza(s)
        poli.prisma([(q.x, q.y) for q in quadrato(c, d, 0.055)], z0, z0 + altezza + 0.08)
        poli.prisma([(q.x, q.y) for q in quadrato(c, d, 0.085)], z0 + altezza + 0.08, z0 + altezza + 0.12)
        s += passo_montanti
    s = passo_sbarre / 2
    while s < totale:
        c, d = a_distanza(s)
        poli.prisma([(q.x, q.y) for q in quadrato(c, d, 0.016)], z0 + 0.08, z0 + altezza - 0.02)
        s += passo_sbarre
    for zc, hc in ((z0 + 0.08, 0.035), (z0 + altezza - 0.04, 0.04)):
        for i in range(1, len(punti)):
            a = Vector((punti[i - 1].x, punti[i - 1].y, 0))
            b = Vector((punti[i].x, punti[i].y, 0))
            poli.prisma([(q.x, q.y) for q in rettangolo(a, b, 0.022)], zc - hc / 2, zc + hc / 2)


def strada(col, C, F, R, mira_u):
    """Marciapiede rialzato a sinistra, cordoli, prato con ringhiera a destra."""
    s = SEMI_STRADA
    sampietrini = materiale_sampietrini()
    peperino = materiale_peperino()
    prato = materiale_prato()
    ferro = materiale_ferro()

    def uv_strada(p):
        return ((p - C).dot(R), (p - C).dot(F))

    dietro = -25.0
    # sinistra: marciapiede di sampietrini a +0,16 fino a 9 m dalla facciata, poi attorno al monumento
    a_sx = fine_verso_monumento(C, F, R, -(s + 0.35), 9.0)
    p0, p1 = C + F * dietro - R * (s + 0.35), C + F * a_sx - R * (s + 0.35)
    u1 = locale(p1.x, p1.y)[0]
    curva = curva_offset(u1, u1 - 170.0, 9.0, 0.0)
    lontano = ELL.mappa(u1 - 170.0, 260.0, 0.0)
    contorno = [p0, p1] + curva[1:] + [lontano, C + F * dietro - R * 260.0]
    poligono_pieno("Marciapiede HQ", contorno, 0.16, col, sampietrini, uv_strada)
    # destra: prato a +0,1 fino a 13 m dalla facciata
    a_dx = fine_verso_monumento(C, F, R, s + 0.35, 13.0)
    q0, q1 = C + F * dietro + R * (s + 0.35), C + F * a_dx + R * (s + 0.35)
    v1 = locale(q1.x, q1.y)[0]
    curva_dx = curva_offset(v1, v1 + 150.0, 13.0, 0.0)
    lontano_dx = ELL.mappa(v1 + 150.0, 260.0, 0.0)
    contorno_dx = [q0, q1] + curva_dx[1:] + [lontano_dx, C + F * dietro + R * 260.0]
    contorno_dx.reverse()
    poligono_pieno("Prato HQ", contorno_dx, 0.1, col, prato, lambda p: (p.x, p.y))
    # cordoli di peperino lungo i due bordi della strada e attorno al marciapiede verso il monumento
    pc = Poli()
    cordolo(pc, C + F * dietro - R * (s + 0.175), C + F * a_sx - R * (s + 0.175), 0.35, -0.03, 0.18)
    cordolo(pc, C + F * dietro + R * (s + 0.175), C + F * a_dx + R * (s + 0.175), 0.35, -0.03, 0.15)
    for i in range(len(curva) - 1):
        if i > 40:
            break
        cordolo(pc, curva[i], curva[i + 1], 0.3, -0.03, 0.18, blocco=2.0)
    for i in range(len(curva_dx) - 1):
        if i > 40:
            break
        cordolo(pc, curva_dx[i], curva_dx[i + 1], 0.3, -0.03, 0.15, blocco=2.0)
    cordoli = pc.oggetto("Cordoli HQ", col, [peperino])
    bev = cordoli.modifiers.new("Smusso", "BEVEL")
    bev.width = 0.012
    bev.segments = 2
    bev.limit_method = "ANGLE"
    # ringhiera sul prato, a 0,6 m dal cordolo, poi lungo la curva del prato
    pr = Poli()
    linea = [C + F * (dietro + 2.0) + R * (s + 0.95), C + F * (a_dx - 0.6) + R * (s + 0.95)]
    vv = locale(linea[-1].x, linea[-1].y)[0]
    linea += curva_offset(vv + 0.8, vv + 70.0, 13.6, 0.0)
    ringhiera(pr, linea, 0.1)
    pr.oggetto("Ringhiera HQ", col, [ferro], doppi=0.0)
    return {"a_sx": round(a_sx, 1), "a_dx": round(a_dx, 1)}


# ---------------------------------------------------------------------------------------------
# Alberi


def ciuffo(nome, col, n_foglie, lung, larg, raggio, seme, materiale, aghi=False):
    """Mesh di un ciuffo di foglie (o di aghi) attorno all'origine, rivolto verso +Z: l'istanza delle chiome."""
    rnd = random.Random(seme)
    verts, facce = [], []
    for _ in range(n_foglie):
        if aghi:
            # aghi di pino: dal centro verso fuori, a raggiera nella semisfera alta
            d = Vector((rnd.gauss(0, 0.7), rnd.gauss(0, 0.7), abs(rnd.gauss(0.6, 0.5)))).normalized()
            base = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.6))) * raggio * 0.35
            lato = d.orthogonal().normalized() * larg * rnd.uniform(0.6, 1.3) / 2
            l = lung * rnd.uniform(0.6, 1.2)
            k = len(verts)
            verts += [base - lato, base + lato, base + d * l + lato * 0.2, base + d * l - lato * 0.2]
            facce += [(k, k + 1, k + 2), (k, k + 2, k + 3)]
            continue
        while True:
            c = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.35, 1)))
            if c.length <= 1.0:
                break
        c *= raggio
        nrm = Vector((rnd.gauss(0, 0.55), rnd.gauss(0, 0.55), 1.0)).normalized()
        asse = Matrix.Rotation(rnd.uniform(0, 2 * math.pi), 3, nrm) @ nrm.orthogonal().normalized()
        lato = nrm.cross(asse).normalized()
        l, w = lung * rnd.uniform(0.7, 1.25), larg * rnd.uniform(0.7, 1.25)
        p0, p2 = c - asse * l / 2, c + asse * l / 2
        p1 = c + lato * w / 2 - nrm * w * 0.18
        p3 = c - lato * w / 2 - nrm * w * 0.18
        k = len(verts)
        verts += [p0, p1, p2, p3]
        facce += [(k, k + 1, k + 2), (k, k + 2, k + 3)]
    me = bpy.data.meshes.new(nome)
    me.from_pydata([tuple(v) for v in verts], [], facce)
    me.materials.append(materiale)
    ob = bpy.data.objects.new(nome, me)
    col.objects.link(ob)
    ob.location = (0.0, 0.0, -60.0)  # sotto terra: serve solo come sorgente delle istanze
    ob.hide_render = True
    return ob


def _socket(nodo, lista, nome, tipo):
    for s in getattr(nodo, lista):
        if s.name == nome and s.type == tipo:
            return s
    raise KeyError((nodo.bl_idname, nome, tipo))


def gruppo_fogliame(nome, ciuffo_ob, densita, scala=(0.75, 1.35), seme=0, spinta=0.12):
    """Geometry nodes: ciuffi distribuiti sulla superficie della chioma, orientati sulla normale."""
    ng = bpy.data.node_groups.get(nome)
    if ng is not None:
        bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new(nome, "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput")
    go = N.new("NodeGroupOutput")
    dist = N.new("GeometryNodeDistributePointsOnFaces")
    dist.distribute_method = "RANDOM"
    dist.inputs["Density"].default_value = densita
    dist.inputs["Seed"].default_value = seme
    info = N.new("GeometryNodeObjectInfo")
    info.inputs["Object"].default_value = ciuffo_ob
    info.inputs["As Instance"].default_value = True
    ist = N.new("GeometryNodeInstanceOnPoints")
    giro = N.new("FunctionNodeRandomValue")
    giro.data_type = "FLOAT_VECTOR"
    _socket(giro, "inputs", "Min", "VECTOR").default_value = (-0.5, -0.5, 0.0)
    _socket(giro, "inputs", "Max", "VECTOR").default_value = (0.5, 0.5, 2 * math.pi)
    _socket(giro, "inputs", "Seed", "INT").default_value = seme + 1
    eul = N.new("FunctionNodeEulerToRotation")
    ruota = N.new("FunctionNodeRotateRotation")
    try:
        ruota.rotation_space = "LOCAL"
    except (AttributeError, TypeError):
        pass
    sc = N.new("FunctionNodeRandomValue")
    sc.data_type = "FLOAT"
    _socket(sc, "inputs", "Min", "VALUE").default_value = scala[0]
    _socket(sc, "inputs", "Max", "VALUE").default_value = scala[1]
    _socket(sc, "inputs", "Seed", "INT").default_value = seme + 2
    unisci = N.new("GeometryNodeJoinGeometry")
    L.new(gi.outputs[0], dist.inputs["Mesh"])
    L.new(dist.outputs["Points"], ist.inputs["Points"])
    L.new(info.outputs["Geometry"], ist.inputs["Instance"])
    L.new(_socket(giro, "outputs", "Value", "VECTOR"), eul.inputs["Euler"])
    L.new(dist.outputs["Rotation"], ruota.inputs["Rotation"])
    L.new(eul.outputs["Rotation"], ruota.inputs["Rotate By"])
    L.new(ruota.outputs["Rotation"], ist.inputs["Rotation"])
    L.new(_socket(sc, "outputs", "Value", "VALUE"), ist.inputs["Scale"])
    # ciuffi un po' fuori dalla nuvola: formano uno strato di foglie che nasconde la superficie liscia
    fuori = N.new("GeometryNodeTranslateInstances")
    try:
        fuori.inputs["Local Space"].default_value = True
    except KeyError:
        pass
    fuori.inputs["Translation"].default_value = (0.0, 0.0, spinta)
    L.new(ist.outputs["Instances"], fuori.inputs["Instances"])
    L.new(fuori.outputs["Instances"], unisci.inputs["Geometry"])
    L.new(gi.outputs[0], unisci.inputs["Geometry"])
    L.new(unisci.outputs["Geometry"], go.inputs[0])
    return ng


def _tubo(bm, punti, raggi, lati=9):
    anelli = []
    a = None
    for i, p in enumerate(punti):
        d = (punti[min(i + 1, len(punti) - 1)] - punti[max(i - 1, 0)]).normalized()
        if a is None:
            a = d.orthogonal().normalized()
        else:
            a = (a - d * a.dot(d)).normalized()
        b = d.cross(a)
        anelli.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / lati) + b * math.sin(2 * math.pi * k / lati)) * raggi[i])
                       for k in range(lati)])
    for r0, r1 in zip(anelli, anelli[1:]):
        for k in range(lati):
            f = bm.faces.new((r0[k], r0[(k + 1) % lati], r1[(k + 1) % lati], r1[k]))
            f.smooth = True
    try:
        bm.faces.new(list(reversed(anelli[-1])))
    except ValueError:
        pass


def _ramo(p0, p1, curva, n=6):
    """Spezzata da p0 a p1 incurvata verso l'alto di 'curva' metri."""
    return [p0.lerp(p1, t) + Vector((0, 0, curva * math.sin(math.pi * t))) for t in (i / n for i in range(n + 1))]


def _chioma(nuvole, seme, ampiezza=0.24, frequenza=0.55, suddivisioni=4):
    """Nuvole di foglie (ellissoidi deformati dal rumore) senza le facce nascoste dentro le altre.
    Restituisce (vertici, facce)."""
    off = Vector((seme * 17.3, seme * 5.1, seme * 11.7))
    verts, facce = [], []
    for i, (c, r) in enumerate(nuvole):
        bm = bmesh.new()
        m = Matrix.Diagonal((r[0], r[1], r[2], 1.0))
        m.translation = c
        bmesh.ops.create_icosphere(bm, subdivisions=suddivisioni, radius=1.0, matrix=m)
        rm = (r[0] + r[1] + r[2]) / 3
        for v in bm.verts:
            d = v.co - c
            dn = Vector((d.x / r[0], d.y / r[1], d.z / r[2])).normalized()
            p = v.co * frequenza + off
            k = noise.noise(p) * 0.65 + noise.noise(p * 2.4) * 0.35
            v.co += dn * (k * ampiezza * rm)
        bm.verts.index_update()
        bm.verts.ensure_lookup_table()
        dentro = []
        for v in bm.verts:
            nascosto = False
            for j, (c2, r2) in enumerate(nuvole):
                if j != i:
                    d = v.co - c2
                    if (d.x / r2[0]) ** 2 + (d.y / r2[1]) ** 2 + (d.z / r2[2]) ** 2 < 0.8:
                        nascosto = True
                        break
            dentro.append(nascosto)
        nuovi = {}
        for f in bm.faces:
            idx = [v.index for v in f.verts]
            if all(dentro[k] for k in idx):
                continue
            riga = []
            for k in idx:
                if k not in nuovi:
                    nuovi[k] = len(verts)
                    verts.append(tuple(bm.verts[k].co))
                riga.append(nuovi[k])
            facce.append(riga)
        bm.free()
    return verts, facce


def _forma_leccio(rnd, H):
    """Leccio: tronco corto che si apre in rami, chioma larga e irregolare fatta di nuvole separate."""
    ht = 0.24 * H
    pende = Vector((rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), 0.0))
    cima = Vector((0, 0, ht)) + pende
    cc = cima + Vector((0, 0, 0.33 * H))
    Rh, Rv = 0.44 * H, 0.27 * H
    nuvole = [(cc + Vector((0, 0, 0.05 * H)), (0.55 * Rh, 0.55 * Rh, 0.75 * Rv))]
    rami = []
    k = 17
    for i in range(k):
        phi = 2 * math.pi * i / k + rnd.uniform(-0.25, 0.25)
        el = rnd.uniform(-0.55, 0.9)
        rr = rnd.uniform(0.6, 0.92)
        c = cc + Vector((math.cos(phi) * math.sqrt(1 - el * el) * Rh * rr, math.sin(phi) * math.sqrt(1 - el * el) * Rh * rr, el * Rv * rr))
        r = rnd.uniform(0.26, 0.4) * Rh
        nuvole.append((c, (r, r * rnd.uniform(0.8, 1.15), r * rnd.uniform(0.62, 0.85))))
        if el < 0.35 and len(rami) < 7:
            attacco = cima + Vector((0, 0, rnd.uniform(-0.05, 0.08) * H))
            rami.append((_ramo(attacco, attacco.lerp(c, 0.78), 0.05 * H), 0.016 * H))
    tronco = [Vector((0, 0, -0.3)), Vector((0, 0, ht * 0.5)) + pende * 0.4, cima]
    return tronco, 0.03 * H, rami, nuvole


def _forma_pino(rnd, H):
    ht = 0.64 * H
    pende = Vector((rnd.uniform(-1.6, 1.6), rnd.uniform(-1.6, 1.6), 0.0))
    tronco = [Vector((0, 0, -0.3)), Vector((0, 0, ht * 0.35)) + pende * 0.15 + Vector((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), 0)),
              Vector((0, 0, ht * 0.7)) + pende * 0.6, Vector((0, 0, ht)) + pende]
    cima = tronco[-1]
    Rc = 0.43 * H
    zc = 0.86 * H
    centro = Vector((cima.x, cima.y, zc))
    nuvole = [(centro + Vector((0, 0, 0.02 * H)), (0.62 * Rc, 0.62 * Rc, 0.13 * H))]
    k = rnd.randint(7, 9)
    rami = []
    for i in range(k):
        phi = 2 * math.pi * i / k + rnd.uniform(-0.25, 0.25)
        rr = rnd.uniform(0.55, 0.72) * Rc
        c = centro + Vector((math.cos(phi) * rr, math.sin(phi) * rr, rnd.uniform(-0.05, 0.02) * H))
        r = rnd.uniform(0.34, 0.44) * Rc
        nuvole.append((c, (r, r * rnd.uniform(0.8, 1.05), 0.09 * H * rnd.uniform(0.85, 1.15))))
        attacco = cima + Vector((0, 0, rnd.uniform(-0.04, 0.02) * H))
        fine = c - Vector((0, 0, 0.05 * H))
        rami.append((_ramo(attacco, attacco.lerp(fine, 0.85), 0.04 * H), 0.012 * H))
    for i in range(3):
        phi = rnd.uniform(0, 2 * math.pi)
        c = centro + Vector((math.cos(phi) * Rc * 0.25, math.sin(phi) * Rc * 0.25, 0.08 * H))
        nuvole.append((c, (0.3 * Rc, 0.3 * Rc, 0.08 * H)))
    return tronco, 0.024 * H, rami, nuvole


def _cipresso(rnd, H, seme):
    """Fuso stretto e bitorzoluto: (vertici, facce), tronco, raggio del tronco."""
    Rmax = 0.085 * H
    anelli, lati = 46, 22
    off = Vector((seme * 3.1, seme * 9.7, seme * 1.3))
    verts, facce = [], []
    for i in range(anelli + 1):
        t = i / anelli
        z = 0.06 * H + t * 0.94 * H
        f = math.sqrt(t / 0.28) if t < 0.28 else ((1 - t) / 0.72) ** 0.8
        r = max(Rmax * f, 0.02)
        for k in range(lati):
            a = 2 * math.pi * k / lati
            p = Vector((math.cos(a) * r, math.sin(a) * r, z))
            q = p * 0.75 + off
            d = noise.noise(q) * 0.6 + noise.noise(q * 2.6) * 0.4
            p += Vector((math.cos(a), math.sin(a), 0.0)) * d * (0.3 + 0.25 * r)
            verts.append(tuple(p))
    for i in range(anelli):
        for k in range(lati):
            a, b = i * lati + k, i * lati + (k + 1) % lati
            facce.append([a, b, b + lati, a + lati])
    facce.append(list(reversed(range(lati))))
    cima = len(verts)
    verts.append((0.0, 0.0, H + 0.3))
    ultimo = anelli * lati
    for k in range(lati):
        facce.append([ultimo + k, ultimo + (k + 1) % lati, cima])
    tronco = [Vector((0, 0, -0.3)), Vector((0, 0, 0.12 * H))]
    return (verts, facce), tronco, 0.016 * H


def albero(col, specie, pos, H, seme, risorse):
    """risorse: dizionario con materiali, ciuffi e gruppi di nodi per specie."""
    rnd = random.Random(seme)
    bm_l = bmesh.new()
    if specie == "cipresso":
        (cv, cf), tronco, rt = _cipresso(rnd, H, seme)
        rami = []
    else:
        tronco, rt, rami, nuvole = (_forma_pino if specie == "pino" else _forma_leccio)(rnd, H)
        cv, cf = _chioma(nuvole, seme, ampiezza=0.42 if specie == "leccio" else 0.3, frequenza=0.75 if specie == "leccio" else 0.55)
    _tubo(bm_l, tronco, [rt * (1.25 - 0.45 * i / (len(tronco) - 1)) for i in range(len(tronco))])
    for punti, r in rami:
        _tubo(bm_l, punti, [r * (1.0 - 0.6 * i / (len(punti) - 1)) for i in range(len(punti))], lati=7)
    nome = f"{specie.capitalize()} {seme}"
    me_l = bpy.data.meshes.new(nome + " legno")
    bm_l.to_mesh(me_l)
    bm_l.free()
    me_l.materials.append(risorse[specie]["corteccia"])
    legno = bpy.data.objects.new(nome + " legno", me_l)
    legno.location = pos
    col.objects.link(legno)
    me_c = bpy.data.meshes.new(nome + " chioma")
    me_c.from_pydata(cv, [], cf)
    me_c.polygons.foreach_set("use_smooth", [True] * len(me_c.polygons))
    me_c.materials.append(risorse[specie]["interno"])
    chioma = bpy.data.objects.new(nome + " chioma", me_c)
    chioma.location = pos
    chioma.rotation_euler.z = rnd.uniform(0, 2 * math.pi)
    legno.rotation_euler.z = chioma.rotation_euler.z
    col.objects.link(chioma)
    mod = chioma.modifiers.new("Fogliame", "NODES")
    mod.node_group = risorse[specie]["gruppo"]
    return chioma


def risorse_alberi(col):
    r = {}
    foglie_leccio = materiale_foglie("Foglie leccio", (0.035, 0.055, 0.022), (0.11, 0.12, 0.05))
    foglie_pino = materiale_foglie("Aghi pino", (0.028, 0.045, 0.018), (0.085, 0.1, 0.04), traslucenza=0.3)
    foglie_cipresso = materiale_foglie("Foglie cipresso", (0.014, 0.028, 0.012), (0.045, 0.065, 0.026), traslucenza=0.15)
    interno = {k: materiale_foglie("Chioma interna " + k, s, c, traslucenza=0.0) for k, s, c in (
        ("leccio", (0.01, 0.017, 0.008), (0.03, 0.04, 0.016)),
        ("pino", (0.014, 0.022, 0.009), (0.035, 0.045, 0.02)),
        ("cipresso", (0.008, 0.015, 0.007), (0.02, 0.03, 0.013)))}
    c_leccio = ciuffo("Ciuffo leccio", col, 70, 0.13, 0.06, 0.5, 1, foglie_leccio)
    c_pino = ciuffo("Ciuffo pino", col, 70, 0.17, 0.014, 0.28, 2, foglie_pino, aghi=True)
    c_cipresso = ciuffo("Ciuffo cipresso", col, 40, 0.06, 0.035, 0.18, 3, foglie_cipresso)
    r["leccio"] = dict(corteccia=materiale_corteccia("Corteccia leccio", (0.12, 0.1, 0.085), (0.03, 0.026, 0.022)),
                       interno=interno["leccio"], gruppo=gruppo_fogliame("Fogliame leccio", c_leccio, 7.5, seme=11, spinta=0.25))
    r["pino"] = dict(corteccia=materiale_corteccia("Corteccia pino", (0.2, 0.11, 0.07), (0.05, 0.035, 0.03)),
                     interno=interno["pino"], gruppo=gruppo_fogliame("Fogliame pino", c_pino, 7.0, seme=12))
    r["cipresso"] = dict(corteccia=materiale_corteccia("Corteccia cipresso", (0.14, 0.1, 0.075), (0.04, 0.03, 0.025)),
                         interno=interno["cipresso"], gruppo=gruppo_fogliame("Fogliame cipresso", c_cipresso, 16.0, (0.8, 1.4), seme=13, spinta=0.1))
    return r


# alberi nel riferimento della strada: (specie, a avanti, b a destra, altezza, seme)
ALBERI = [
    ("leccio", 20.0, -23.0, 13.0, 1),
    ("cipresso", 30.0, -27.0, 20.0, 2),
    ("cipresso", 37.0, -31.5, 22.5, 3),
    ("leccio", 15.0, -32.0, 13.0, 4),
    ("pino", 140.0, -103.0, 19.0, 5),
    ("leccio", 150.0, -110.0, 15.0, 6),
    ("pino", 175.0, -120.0, 21.0, 7),
    ("leccio", 120.0, -96.0, 12.0, 15),
    ("pino", 112.0, 92.0, 19.0, 8),
    ("leccio", 80.0, 66.0, 11.5, 9),
    ("pino", 130.0, 112.0, 21.5, 10),
    ("pino", 92.0, 104.0, 17.5, 11),
    ("leccio", 150.0, 140.0, 15.0, 12),
    ("pino", 175.0, 118.0, 22.0, 13),
    ("cipresso", 70.0, 50.0, 15.0, 14),
    ("leccio", 58.0, 44.0, 10.0, 16),
    ("pino", 150.0, 96.0, 20.0, 17),
    ("cipresso", 95.0, 72.0, 17.0, 18),
    ("leccio", 125.0, 84.0, 13.0, 19),
]


def pianta_alberi(col, C, F, R, alberi=ALBERI, distanza_minima=12.0):
    risorse = risorse_alberi(col)
    piantati, scartati = [], []
    for specie, a, b, H, seme in alberi:
        p = C + F * a + R * b
        u, v = locale(p.x, p.y)
        if v < distanza_minima + (0.4 * H if specie != "cipresso" else 2.0):
            scartati.append((specie, a, b, round(v, 1)))
            continue
        albero(col, specie, Vector((p.x, p.y, 0.1)), H, seme, risorse)
        piantati.append((specie, a, b, round(v, 1)))
    return {"piantati": len(piantati), "scartati": scartati}


# ---------------------------------------------------------------------------------------------
# Foschia e camera


def foschia(col, densita=0.0005, colore=(1.0, 0.8, 0.6), anisotropia=0.5, scena=None):
    """Foschia in un grande parallelepipedo (un volume nel mondo in EEVEE assorbirebbe tutto il cielo)."""
    m = bpy.data.materials.get("Foschia") or bpy.data.materials.new("Foschia")
    nt, N, L = _nodi(m)
    out = _n(N, "ShaderNodeOutputMaterial", 400, 0)
    vol = _n(N, "ShaderNodeVolumePrincipled", 100, 0)
    vol.inputs["Density"].default_value = densita
    vol.inputs["Color"].default_value = (*colore, 1)
    vol.inputs["Anisotropy"].default_value = anisotropia
    L.new(vol.outputs[0], out.inputs["Volume"])
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    me = bpy.data.meshes.new("Foschia")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(m)
    ob = bpy.data.objects.new("Foschia", me)
    ob.scale = (1400.0, 1400.0, 260.0)
    ob.location = (0.0, 0.0, 125.0)
    col.objects.link(ob)
    if scena is not None:
        ee = scena.eevee
        for k, v in {"volumetric_start": 1.0, "volumetric_end": 500.0, "volumetric_tile_size": "8",
                     "volumetric_samples": 64, "volumetric_sample_distribution": 0.85, "use_volumetric_shadows": False,
                     "volumetric_shadow_samples": 16}.items():
            try:
                setattr(ee, k, v)
            except (AttributeError, TypeError):
                pass
    return ob


def camera_strada(col, pos, mira, focale=18.0, shift_y=0.2, nome="Camera HQ"):
    """Camera a livello (verticali dritte) con decentramento in alto, come nelle foto di architettura."""
    cam = bpy.data.cameras.new(nome)
    cam.lens = focale
    cam.sensor_width = 36.0
    cam.sensor_fit = "HORIZONTAL"
    cam.shift_y = shift_y
    cam.clip_start = 0.1
    cam.clip_end = 4000.0
    ob = bpy.data.objects.new(nome, cam)
    col.objects.link(ob)
    p = ELL.mappa(*pos)
    m = ELL.mappa(mira[0], mira[1], pos[2])
    ob.location = p
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (m - p).to_track_quat("-Z", "Y")
    return ob
