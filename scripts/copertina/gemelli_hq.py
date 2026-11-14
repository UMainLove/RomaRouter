"""
Romolo e Remo in bronzo, nelle pose della Lupa Capitolina: uno in ginocchio, uno seduto con le gambe in
avanti, tutti e due con la testa all'indietro e la bocca alle mammelle. Statue ferme sul capitello.

Si esegue dopo lupa_hq.py nello stesso namespace (Pezzi, catmull, anello, telai, taubin, convessita,
materiale_bronzo). Coordinate nello spazio della volpe (cm), con la lupa ferma sul capitello: l'oggetto
prende la stessa trasformazione dell'armatura nella posa finale.
"""

import random

import bpy  # prima di mathutils
from mathutils import Matrix, Vector


def _orienta(asse, su=Vector((0, 0, 1))):
    """Rotazione che porta l'asse Y locale su 'asse' (per ellissoidi allungati)."""
    y = Vector(asse).normalized()
    x = y.cross(su)
    if x.length < 1e-4:
        x = y.cross(Vector((1, 0, 0)))
    x.normalize()
    z = x.cross(y).normalized()
    return Matrix((x, y, z)).transposed()


# pose: punti delle articolazioni (spazio della volpe, cm), 'fronte' = dove guarda il petto,
# 'viso' = dove guarda la faccia (in alto, verso le mammelle)
IN_GINOCCHIO = dict(
    fronte=(-0.5, -0.85, 0.0), viso=(-0.25, -0.35, 0.9),
    testa=(-3.4, 20.6, 25.2), collo=(-3.2, 21.6, 20.6), petto=(-3.0, 22.2, 16.8), bacino=(-2.8, 22.8, 9.8),
    anca_s=(-0.6, 21.8, 9.2), ginocchio_s=(-0.8, 15.6, 9.8), caviglia_s=(-0.9, 16.6, 1.6), punta_s=(0.0, -1.0, 0.0),
    anca_d=(-5.0, 23.4, 9.0), ginocchio_d=(-5.6, 21.0, 1.7), caviglia_d=(-5.6, 27.8, 1.5), punta_d=(0.0, 1.0, -0.3),
    spalla_d=(-6.6, 22.0, 18.6), gomito_d=(-8.8, 22.6, 21.8), polso_d=(-7.2, 20.8, 25.6),
    spalla_s=(0.6, 21.8, 18.6), gomito_s=(1.6, 18.6, 21.4), polso_s=(1.2, 15.6, 24.6),
)
SEDUTO = dict(
    fronte=(-0.9, -0.2, 0.0), viso=(-0.3, -0.1, 0.95),
    testa=(-3.0, 4.0, 24.0), collo=(-2.6, 4.2, 19.6), petto=(-2.6, 4.4, 15.4), bacino=(-3.4, 4.8, 5.4),
    anca_s=(-4.6, 2.2, 4.4), ginocchio_s=(-9.4, 0.4, 4.2), caviglia_s=(-14.0, -1.2, 2.0), punta_s=(-0.5, -0.2, 0.85),
    anca_d=(-4.6, 7.4, 4.4), ginocchio_d=(-9.0, 10.4, 8.6), caviglia_d=(-10.8, 9.4, 1.6), punta_d=(-1.0, 0.2, 0.0),
    spalla_d=(-2.8, 8.4, 17.8), gomito_d=(-5.6, 9.2, 21.0), polso_d=(-5.4, 6.6, 24.4),
    spalla_s=(-2.4, 0.2, 17.6), gomito_s=(-3.6, -3.6, 15.4), polso_s=(-5.2, -6.4, 15.6),
)


def _mano(p, polso, gomito, aperta=True, seme=0):
    rnd = random.Random(seme)
    d = (Vector(polso) - Vector(gomito)).normalized()
    c = Vector(polso) + d * 1.1
    rot = _orienta(d)
    p.ellissoide(c, (1.25, 1.45, 0.62), rot)
    lato = rot @ Vector((1, 0, 0))
    palmo = rot @ Vector((0, 0, 1))
    for k, off in enumerate((-0.75, -0.25, 0.25, 0.75)):
        b = c + d * 1.0 + lato * off
        dirf = (d + lato * off * (0.45 if aperta else 0.1) + palmo * (0.15 + rnd.uniform(-0.1, 0.1))).normalized()
        lung = 1.5 if k in (1, 2) else 1.3
        p.tubo([b, b + dirf * lung * 0.55, b + dirf * lung], [0.36, 0.32, 0.26], lati=8)
    pol = c - d * 0.2 + lato * 1.1
    p.tubo([pol, pol + (lato * 0.9 + d * 0.8).normalized() * 1.2], [0.4, 0.3], lati=8)


def _piede(p, caviglia, punta):
    d = Vector(punta).normalized()
    c = Vector(caviglia) + d * 1.6
    rot = _orienta(d)
    p.ellissoide(c, (1.25, 2.4, 0.95), rot)
    lato = rot @ Vector((1, 0, 0))
    for off in (-0.8, -0.4, 0.0, 0.4, 0.8):
        p.ellissoide(c + d * 2.3 + lato * off, (0.32, 0.38, 0.34), seg=10, anelli_n=6)


def bambino(p, g, seme=0):
    V = {k: Vector(v) for k, v in g.items()}
    fronte = V["fronte"].normalized()
    viso = V["viso"].normalized()
    # tronco paffuto: bacino, pancia tonda, petto, spalle, collo
    spina = [V["bacino"] - (V["petto"] - V["bacino"]).normalized() * 1.6, V["bacino"], V["bacino"].lerp(V["petto"], 0.5),
             V["petto"], V["petto"].lerp(V["collo"], 0.6), V["collo"]]
    raggi = [(3.0, 2.4), (4.3, 3.6), (4.6, 4.2), (4.2, 3.4), (4.3, 2.9), (1.9, 1.9)]
    dense = catmull([tuple(c) + r for c, r in zip(spina, raggi)], 18)
    centri = [Vector(d[:3]) for d in dense]
    p.loft([anello(c, A, B, d[3], d[4], d[4], n=2.0, punti=28) for (T, A, B), c, d in zip(telai(centri, alto=fronte), centri, dense)])
    dietro = -fronte
    for s in (-1, 1):
        lat = fronte.cross(Vector((0, 0, 1))).normalized() * s
        p.ellissoide(V["bacino"] + dietro * 2.0 + lat * 1.9 - Vector((0, 0, 0.6)), (2.4, 2.4, 2.2))  # natiche
    # testa tonda con guance, naso, orecchie e riccioli
    c = V["testa"]
    lat = viso.cross(Vector((0, 0, 1)))
    if lat.length < 1e-3:
        lat = Vector((1, 0, 0))
    lat.normalize()
    p.ellissoide(c, (4.2, 4.5, 4.3), _orienta(viso))
    for s in (-1, 1):
        p.ellissoide(c + viso * 2.7 + lat * (s * 2.2) - fronte * 0.2, (1.5, 1.5, 1.5), seg=14, anelli_n=8)  # guance
        p.ellissoide(c + lat * (s * 4.0) - viso * 0.5, (0.6, 1.0, 1.3), _orienta(viso), seg=10, anelli_n=6)  # orecchie
    p.ellissoide(c + viso * 4.2, (0.55, 0.6, 0.55), seg=10, anelli_n=6)  # naso
    rnd = random.Random(seme)
    for _ in range(26):
        d = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), rnd.gauss(0, 1))).normalized()
        if d.dot(viso) > 0.15:
            d = (d - viso * (d.dot(viso) + 0.4)).normalized()
        p.ellissoide(c + d * 4.0, (0.95, 0.95, 0.95), seg=10, anelli_n=6)  # riccioli
    # braccia e mani
    for s in ("s", "d"):
        sp, go, po = V["spalla_" + s], V["gomito_" + s], V["polso_" + s]
        p.tubo([sp, sp.lerp(go, 0.5), go, go.lerp(po, 0.5), po], [2.0, 2.05, 1.45, 1.55, 1.05], lati=14)
        _mano(p, po, go, seme=seme + (1 if s == "s" else 2))
        an, gi, ca = V["anca_" + s], V["ginocchio_" + s], V["caviglia_" + s]
        p.tubo([an, an.lerp(gi, 0.5), gi, gi.lerp(ca, 0.45), ca], [3.0, 3.05, 2.2, 2.2, 1.35], lati=16)
        _piede(p, ca, V["punta_" + s])


def gemelli_mesh(voxel=0.18):
    p = Pezzi()
    bambino(p, IN_GINOCCHIO, seme=3)
    bambino(p, SEDUTO, seme=8)
    grezza = p.mesh("Gemelli pezzi")
    ob = bpy.data.objects.new("Gemelli pezzi", grezza)
    bpy.context.scene.collection.objects.link(ob)
    rm = ob.modifiers.new("Remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel
    rm.adaptivity = 0.0
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me.name = "Romolo e Remo"
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.meshes.remove(grezza)
    taubin(me, iterazioni=30)
    for poly in me.polygons:
        poly.use_smooth = True
    convessita(me)
    return me


def gemelli_in_scena(col, matrice):
    """matrice: trasformazione dell'armatura della lupa nella posa finale (sul capitello)."""
    me = gemelli_mesh()
    me.materials.append(materiale_bronzo())
    ob = bpy.data.objects.new("Romolo e Remo", me)
    ob.matrix_world = matrice
    col.objects.link(ob)
    return ob
