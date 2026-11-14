"""
Capitello corinzio su un rocchio di colonna scanalato: il piedistallo dove la lupa salta e dove la
aspettano Romolo e Remo, in fondo alla strada davanti alla rottura del Colosseo. Marmo consumato.

Si esegue dopo lupa_hq.py nello stesso namespace (usa Pezzi, anello, telai, taubin, convessita).
Misure in metri, origine al centro della base del rocchio.
"""

import math

import bpy  # prima di bmesh e mathutils
import numpy as np
from mathutils import Matrix, Vector

R_FUSTO = 1.05  # raggio del rocchio
H_ROCCHIO = 0.9
H_CAPITELLO = 2.15
MEZZO_LATO_ABACO = 1.45  # abaco quadrato di 2,9 m di lato, con i lati concavi
H_ABACO = 0.3
CIMA = H_ROCCHIO + H_CAPITELLO  # quota del piano su cui sta la lupa


def _campana(z):
    """Raggio della campana (kalathos) alla quota z."""
    tb = min(max((z - H_ROCCHIO) / (H_CAPITELLO - H_ABACO), 0.0), 1.0)
    return R_FUSTO * 0.97 + 0.28 * tb ** 1.6


def _foglia(p, base_ang, z0, alt, sporgenza, larghezza, lobi=5, seme=0, stacco=0.03):
    """Foglia d'acanto: sale staccandosi sempre piu' dalla campana, larga e concava con la costola in
    mezzo, i bordi frastagliati in lobi; in cima la punta si arriccia in fuori e in giu'."""
    asse = Vector((math.cos(base_ang), math.sin(base_ang), 0.0))
    lato = Vector((-asse.y, asse.x, 0.0))
    # linea mediana nel piano (raggio, quota)
    mediana = []
    n_su = 14
    for i in range(n_su):
        t = i / (n_su - 1)
        z = z0 + alt * 0.84 * t
        mediana.append((_campana(z) + stacco + sporgenza * t ** 1.8, z, t))
    r, z, _ = mediana[-1]
    ra, za, _ = mediana[-2]
    ang0 = math.atan2(r - ra, z - za)  # 0 = verso l'alto, pi/2 = in fuori
    n_ricciolo, lung = 9, alt * 0.3
    for i in range(1, n_ricciolo + 1):
        q = i / n_ricciolo
        ang = ang0 + (2.5 - ang0) * q ** 0.8
        r += math.sin(ang) * lung / n_ricciolo
        z += math.cos(ang) * lung / n_ricciolo
        mediana.append((r, z, 1.0 + q * 0.3))
    righe = []
    m = len(mediana)
    for i in range(m):
        r, z, t = mediana[i]
        ra, za, _ = mediana[max(i - 1, 0)]
        rb, zb, _ = mediana[min(i + 1, m - 1)]
        dr, dz = rb - ra, zb - za
        lt = math.hypot(dr, dz) or 1.0
        N = asse * (dz / lt) + Vector((0, 0, -dr / lt))  # normale esterna della lama
        if t <= 1.0:
            w = larghezza * (math.sin(math.pi * (0.12 + 0.8 * t)) ** 0.7 * (1.0 - 0.35 * t ** 3) + 0.06)
            w *= 0.82 + 0.3 * abs(math.sin(math.pi * lobi * t + seme)) ** 0.6  # lobi frastagliati
        else:
            q = (t - 1.0) / 0.3
            w = larghezza * (0.55 * (1.0 - q) + 0.12)
        c = asse * r + Vector((0, 0, z))
        spessore = 0.1 * (1.0 - 0.45 * min(t, 1.0)) + 0.04
        k = 12
        sez = []
        for j in range(k):
            a = -1.0 + 2.0 * j / (k - 1)
            fuori = 0.07 * w * (1 - a * a) + 0.1 * w * a ** 4 + 0.025 * math.exp(-(a / 0.14) ** 2)
            sez.append(c + lato * (a * w) + N * fuori)
        for j in range(k):
            a = 1.0 - 2.0 * j / (k - 1)
            fuori = 0.07 * w * (1 - a * a) + 0.1 * w * a ** 4 - spessore
            sez.append(c + lato * (a * w * 0.9) + N * fuori)
        righe.append(sez)
    p.loft(righe)


def _voluta(p, centro, verso, raggio, larghezza, giri=2.2):
    """Voluta a spirale (sotto gli spigoli dell'abaco): nastro arrotolato attorno a un asse orizzontale."""
    asse = Vector((-verso.y, verso.x, 0.0)).normalized()
    pts, rr = [], []
    n = 40
    for i in range(n):
        t = i / (n - 1)
        a = giri * 2 * math.pi * t
        r = raggio * (1.0 - 0.82 * t)
        pts.append(centro + verso * (r * math.cos(a)) + Vector((0, 0, r * math.sin(a))))
        rr.append(larghezza * (1.0 - 0.5 * t))
    # nastro: tubo schiacciato lungo l'asse della voluta
    fr = telai(pts, alto=asse)
    anelli = []
    for (T, A, B), q, w in zip(fr, pts, rr):
        anelli.append([q + B * (w * math.cos(2 * math.pi * k / 10)) + A * (0.35 * w * math.sin(2 * math.pi * k / 10)) for k in range(10)])
    p.loft(anelli)
    p.ellissoide(pts[-1], (larghezza * 0.6, larghezza * 0.6, larghezza * 0.6), seg=12, anelli_n=8)


def capitello_mesh(voxel=0.016):
    p = Pezzi()
    # rocchio scanalato (24 scanalature) con il collarino
    anelli = []
    for i in range(7):
        z = H_ROCCHIO * i / 6
        anelli.append([Vector((math.cos(a) * r, math.sin(a) * r, z)) for a, r in
                       ((2 * math.pi * k / 192, R_FUSTO * (1 - 0.028 * (0.5 + 0.5 * math.cos(24 * 2 * math.pi * k / 192)) ** 0.6)) for k in range(192))])
    p.loft(anelli)
    p.tubo([Vector((math.cos(a) * (R_FUSTO + 0.02), math.sin(a) * (R_FUSTO + 0.02), H_ROCCHIO - 0.05)) for a in
            (2 * math.pi * k / 48 for k in range(50))], [0.075] * 50, lati=10)
    # campana (kalathos)
    anelli = []
    for i in range(12):
        t = i / 11
        r = R_FUSTO * 0.97 + 0.28 * t ** 1.6
        z = H_ROCCHIO + (H_CAPITELLO - H_ABACO) * t
        anelli.append([Vector((math.cos(2 * math.pi * k / 96) * r, math.sin(2 * math.pi * k / 96) * r, z)) for k in range(96)])
    p.loft(anelli)
    # due giri di otto foglie d'acanto
    for k in range(8):
        a = 2 * math.pi * k / 8
        _foglia(p, a, H_ROCCHIO + 0.02, 0.8, 0.2, 0.44, seme=k, stacco=0.05)
        _foglia(p, a + math.pi / 8, H_ROCCHIO + 0.1, 1.3, 0.24, 0.46, seme=k + 3, stacco=0.01)
    # caulicoli e volute: quattro grandi agli spigoli, quattro piccole al centro dei lati
    zv = H_ROCCHIO + H_CAPITELLO - H_ABACO - 0.28
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        verso = Vector((math.cos(a), math.sin(a), 0.0))
        p.tubo([verso * 1.15 + Vector((0, 0, H_ROCCHIO + 1.15)), verso * 1.35 + Vector((0, 0, zv - 0.1)),
                verso * 1.6 + Vector((0, 0, zv))], [0.09, 0.08, 0.07], lati=10)
        _voluta(p, verso * 1.66 + Vector((0, 0, zv)), verso, 0.26, 0.11)
        b = k * math.pi / 2
        vb = Vector((math.cos(b), math.sin(b), 0.0))
        _voluta(p, vb * 1.3 + Vector((0, 0, zv + 0.04)), vb, 0.13, 0.06)
    # abaco a lati concavi, con la modanatura e il fiore al centro di ogni lato
    za = H_ROCCHIO + H_CAPITELLO - H_ABACO
    for i_z, (z0, z1, rid) in enumerate(((za, za + 0.12, 0.06), (za + 0.12, za + H_ABACO, 0.0))):
        anelli = []
        for z in (z0, z1):
            pts = []
            for k in range(160):
                a = 2 * math.pi * k / 160 + math.pi / 4
                # quadrato a lati concavi: rientra a meta' lato, spigoli appena smussati
                r = (MEZZO_LATO_ABACO - rid) / max(abs(math.cos(a)), abs(math.sin(a)))
                r -= 0.13 * (1 - abs(math.sin(2 * a))) ** 1.5
                r = min(r, (MEZZO_LATO_ABACO - rid) * math.sqrt(2) - 0.06)
                pts.append(Vector((math.cos(a) * r, math.sin(a) * r, z)))
            anelli.append(pts)
        p.loft(anelli)
    for k in range(4):
        b = k * math.pi / 2
        vb = Vector((math.cos(b), math.sin(b), 0.0))
        r_lato = MEZZO_LATO_ABACO - 0.13
        p.ellissoide(vb * (r_lato + 0.06) + Vector((0, 0, za + 0.15)), (0.14, 0.14, 0.14), Matrix.Rotation(b, 3, "Z"))
    grezza = p.mesh("Capitello pezzi")
    ob = bpy.data.objects.new("Capitello pezzi", grezza)
    bpy.context.scene.collection.objects.link(ob)
    rm = ob.modifiers.new("Remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel
    rm.adaptivity = 0.0
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me.name = "Capitello HQ"
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.meshes.remove(grezza)
    taubin(me, iterazioni=12)
    # spigoli consumati e scheggiature: un rumore leggero verso l'interno
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    nr = np.empty(n * 3)
    me.vertices.foreach_get("normal", nr)
    nr = nr.reshape(n, 3)
    rumore = np.sin(co[:, 0] * 23.1 + co[:, 2] * 7.3) * np.sin(co[:, 1] * 19.7 - co[:, 2] * 11.1) * np.sin(co[:, 2] * 29.3 + co[:, 0] * 5.1)
    co -= nr * (np.clip(rumore, 0, None) ** 3 * 0.003)[:, None]
    me.vertices.foreach_set("co", co.astype(np.float32).ravel())
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    convessita(me)
    return me


def materiale_marmo(nome="Marmo consumato"):
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
    bsdf = nodo("ShaderNodeBsdfPrincipled", 600, 0, Roughness=0.72)
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = nodo("ShaderNodeTexCoord", -1100, 0)
    venature = nodo("ShaderNodeTexWave", -800, 200, wave_type="BANDS")
    venature.inputs["Scale"].default_value = 0.8
    venature.inputs["Distortion"].default_value = 14.0
    venature.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], venature.inputs["Vector"])
    macchie = nodo("ShaderNodeTexNoise", -800, -50, noise_dimensions="3D")
    macchie.inputs["Scale"].default_value = 2.2
    macchie.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], macchie.inputs["Vector"])
    base = nodo("ShaderNodeValToRGB", -550, 150)
    base.color_ramp.elements[0].color = (0.36, 0.31, 0.25, 1)
    base.color_ramp.elements[1].color = (0.54, 0.48, 0.39, 1)
    L.new(macchie.outputs["Fac"], base.inputs["Fac"])
    vena = nodo("ShaderNodeMix", -300, 150, data_type="RGBA", blend_type="MULTIPLY")
    L.new(base.outputs["Color"], vena.inputs["A"])
    soglia = nodo("ShaderNodeMapRange", -550, 350)
    soglia.inputs["From Min"].default_value = 0.85
    soglia.inputs["From Max"].default_value = 1.0
    soglia.inputs["To Max"].default_value = 0.12
    L.new(venature.outputs["Fac"], soglia.inputs["Value"])
    L.new(soglia.outputs["Result"], vena.inputs["Factor"])
    vena.inputs["B"].default_value = (0.36, 0.31, 0.26, 1)
    conv = nodo("ShaderNodeAttribute", -800, -300, attribute_name="convessita", attribute_type="GEOMETRY")
    sporco = nodo("ShaderNodeMapRange", -550, -300)
    sporco.inputs["From Min"].default_value = 0.2
    sporco.inputs["From Max"].default_value = 0.5
    sporco.inputs["To Min"].default_value = 0.85
    sporco.inputs["To Max"].default_value = 0.0
    L.new(conv.outputs["Fac"], sporco.inputs["Value"])
    ao = nodo("ShaderNodeAmbientOcclusion", -550, -500, samples=8)
    ao.inputs["Distance"].default_value = 0.25
    nero = nodo("ShaderNodeMix", -50, 50, data_type="RGBA", blend_type="MIX")
    L.new(sporco.outputs["Result"], nero.inputs["Factor"])
    L.new(vena.outputs["Result"], nero.inputs["A"])
    nero.inputs["B"].default_value = (0.14, 0.12, 0.1, 1)
    occl = nodo("ShaderNodeMix", 150, 50, data_type="RGBA", blend_type="MULTIPLY")
    occl.inputs["Factor"].default_value = 0.7
    L.new(nero.outputs["Result"], occl.inputs["A"])
    L.new(ao.outputs["Color"], occl.inputs["B"])
    L.new(occl.outputs["Result"], bsdf.inputs["Base Color"])
    bump = nodo("ShaderNodeBump", 350, -250)
    bump.inputs["Strength"].default_value = 0.3
    bump.inputs["Distance"].default_value = 0.01
    L.new(macchie.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def capitello_in_scena(col, posizione, rotazione_z=0.0):
    me = capitello_mesh()
    me.materials.append(materiale_marmo())
    ob = bpy.data.objects.new("Capitello HQ", me)
    ob.location = posizione
    ob.rotation_euler.z = rotazione_z
    col.objects.link(ob)
    return ob
