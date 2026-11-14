"""
Animazione della copertina HQ, da eseguire dopo copertina_hq.py, ambiente_hq.py e lupa_hq.py nello stesso
namespace. La lupa di bronzo, sullo scheletro della volpe, sta ferma come una statua per 2 secondi; poi
corre a slalom dentro e fuori dagli archi del piano terra. La camera resta ferma e poi la segue con una
panoramica che parte piano, mentre si avvicina e stringe lo zoom (come un operatore che insegue l'azione).

Tempi come nella copertina del sito: 2 s fermi + 2 s di corsa, 30 fotogrammi al secondo.
"""

import math

import bpy  # prima di mathutils
import numpy as np
from mathutils import Matrix, Vector

FPS = 30
T_FERMA = 2.0
T_FINE = 4.6  # la clip continua sotto l'apertura a cerchio della home (da 3,6 s, dura 0,95 s)
T_CORSA = 2.0  # durata di riferimento dell'inseguimento: oltre, carrello e zoom proseguono senza fermarsi
SCALA_LUPA = 0.033  # cm della volpe -> metri; spalla a circa 2 m, passa comoda negli archi (4,2 x 7 m)
VELOCITA = 10.5  # m/s a regime
CICLO = 0.42  # s per falcata di galoppo

# ossa che deformano: segmento (testa, coda) nello spazio della volpe, raggio d'influenza (cm)
SEGMENTI = {
    "b_Hip_01": (((0, 26.0, 50.0), (0, 42.0, 50.0)), 9.0),
    "b_Spine01_02": (((0, 22.2, 53.0), (0, 0.6, 52.0)), 11.0),
    "b_Spine02_03": (((0, 0.6, 52.0), (0, -25.1, 51.0)), 11.0),
    "b_Neck_04": (((0, -25.1, 53.2), (0, -36.2, 60.7)), 8.0),
    "b_Head_05": (((0, -36.2, 61.5), (0, -58.0, 60.0)), 7.0),
    "b_Tail01_012": (((0, 40.2, 52.6), (0, 48.6, 43.5)), 4.0),
    "b_Tail02_013": (((0, 48.6, 43.5), (0, 67.3, 28.1)), 3.5),
    "b_Tail03_014": (((0, 67.3, 28.1), (0, 74.0, 19.0)), 3.0),
}
for _lato, _s in (("Left", 1), ("Right", -1)):
    _ia, _ib = ("09", "010", "011") if _lato == "Left" else ("06", "07", "08"), ("015", "016", "017", "018") if _lato == "Left" else ("019", "020", "021", "022")
    SEGMENTI.update({
        f"b_{_lato}UpperArm_{_ia[0]}": (((_s * 7.2, -17.0, 44.0), (_s * 7.2, -16.8, 26.0)), 4.6),
        f"b_{_lato}ForeArm_{_ia[1]}": (((_s * 7.1, -16.8, 26.0), (_s * 7.0, -17.8, 6.7)), 3.4),
        f"b_{_lato}Hand_{_ia[2]}": (((_s * 7.0, -17.8, 6.7), (_s * 7.0, -25.0, 1.5)), 3.2),
        f"b_{_lato}Leg01_{_ib[0]}": (((_s * 7.0, 30.0, 46.0), (_s * 7.2, 28.0, 30.5)), 5.6),
        f"b_{_lato}Leg02_{_ib[1]}": (((_s * 7.2, 28.0, 30.5), (_s * 7.0, 37.0, 15.0)), 3.6),
        f"b_{_lato}Foot01_{_ib[2]}": (((_s * 7.0, 37.0, 15.0), (_s * 7.0, 33.0, 1.5)), 3.0),
        f"b_{_lato}Foot02_{_ib[3]}": (((_s * 7.0, 33.0, 1.5), (_s * 7.0, 25.5, 1.5)), 3.0),
    })


def importa_scheletro(percorso, col):
    """Armatura della volpe e la sua corsa dal file della copertina leggera."""
    with bpy.data.libraries.load(percorso, link=False) as (_src, dst):
        dst.objects = [SCHELETRO]
        dst.actions = ["Corsa"]
    arm = next(o for o in dst.objects if o is not None)
    corsa = next(a for a in dst.actions if a is not None)
    col.objects.link(arm)
    genitore = arm.parent
    arm.parent = None
    if genitore is not None and genitore.users <= 1:
        bpy.data.objects.remove(genitore, do_unlink=True)
    arm.animation_data_clear()
    arm.matrix_world = Matrix.Identity(4)
    for b in arm.data.bones:
        b.use_deform = b.name in SEGMENTI
    return arm, corsa


def _distanza_segmento(co, a, b):
    a, b = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    ab = b - a
    t = np.clip(((co - a) @ ab) / max(ab @ ab, 1e-9), 0.0, 1.0)
    return np.linalg.norm(co - (a + t[:, None] * ab), axis=1)


def pesi(ob, giri=6):
    """Pesi delle ossa: vicinanza ai segmenti dello scheletro, con i limiti anatomici (le zampe non tirano il
    tronco, la coda e la testa restano loro), poi ammorbiditi sulla mesh."""
    me = ob.data
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    nomi = list(SEGMENTI)
    W = np.zeros((n, len(nomi)))
    for j, nome in enumerate(nomi):
        (a, b), r = SEGMENTI[nome]
        d = _distanza_segmento(co, a, b)
        w = np.exp(-(d / r) ** 2)
        if "Left" in nome:
            w *= np.clip((x - 1.0) / 2.5, 0, 1)
        if "Right" in nome:
            w *= np.clip((-x - 1.0) / 2.5, 0, 1)
        if "Arm" in nome or "Hand" in nome:
            w *= np.clip((48.0 - z) / 8.0, 0, 1) * np.clip((-y - 8.0) / 4.0, 0, 1)
        if "Leg" in nome or "Foot" in nome:
            w *= np.clip((50.0 - z) / 8.0, 0, 1) * np.clip((y - 18.0) / 4.0, 0, 1)
        if "Tail" in nome:
            w *= np.clip((y - 41.0) / 2.0, 0, 1)
        if "Head" in nome:
            w *= np.clip((-y - 34.0) / 3.0, 0, 1)
        if "Neck" in nome:
            w *= np.clip((y + 40.5) / 3.0, 0, 1)
        W[:, j] = w
    W += 1e-6
    ed = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", ed)
    ed = ed.reshape(-1, 2)
    cnt = np.maximum(np.bincount(ed.ravel(), minlength=n), 1).astype(np.float64)
    for _ in range(giri):
        S = np.empty_like(W)
        for j in range(W.shape[1]):
            S[:, j] = (np.bincount(ed[:, 0], weights=W[ed[:, 1], j], minlength=n)
                       + np.bincount(ed[:, 1], weights=W[ed[:, 0], j], minlength=n)) / cnt
        W = 0.5 * W + 0.5 * S
    W /= W.sum(axis=1, keepdims=True)
    W = np.round(W, 2)
    for j, nome in enumerate(nomi):
        g = ob.vertex_groups.new(name=nome)
        col = W[:, j]
        for val in np.unique(col):
            if val <= 0.0:
                continue
            g.add(np.nonzero(col == val)[0].tolist(), float(val), "REPLACE")


def lupa_in_scena(col, percorso_volpe, voxel=0.3):
    """Scultura + materiale + scheletro con la corsa in NLA. Restituisce (armatura, mesh)."""
    arm, corsa = importa_scheletro(percorso_volpe, col)
    me = scultura(LUPA, voxel=voxel)
    me.materials.append(materiale_bronzo())
    ob = bpy.data.objects.new(LUPA, me)
    col.objects.link(ob)
    ob["rr_hq"] = "lupa"
    arm["rr_hq"] = "lupa"
    pesi(ob)
    ob.parent = arm
    mod = ob.modifiers.new("Scheletro", "ARMATURE")
    mod.object = arm
    # corsa: il ciclo della volpe (34,75 fotogrammi) stretto a una falcata di galoppo
    ad = arm.animation_data_create()
    tr = ad.nla_tracks.new()
    tr.name = "Corsa"
    inizio = 1 + round(T_FERMA * FPS)
    st = tr.strips.new("Corsa", inizio, corsa)
    durata = corsa.frame_range[1] - corsa.frame_range[0]
    st.scale = CICLO * FPS / durata
    st.repeat = math.ceil((T_FINE - T_FERMA) / CICLO) + 2
    st.blend_in = 6
    st.extrapolation = "NOTHING"
    try:
        if not st.action_slot and corsa.slots:
            st.action_slot = corsa.slots[0]
    except AttributeError:
        pass
    arm.scale = (SCALA_LUPA,) * 3
    return arm, ob


# ---------------------------------------------------------------------------------------------
# Percorso a slalom e camera


def percorso_slalom(k_primo, ampiezza=3.3, v_medio=-1.3):
    """Linea della corsa nel piano locale: fuori davanti a un pilastro, dentro dall'arco k_primo, fuori
    dall'arco successivo... Restituisce funzione u -> (u, v) e l'intervallo di u."""
    uc0 = k_primo * W

    def punto(u):
        return u, v_medio + ampiezza * math.cos(math.pi * (u - (uc0 - W / 2)) / W)

    return punto, uc0 - W / 2, uc0 + 3 * W


def anima_lupa(arm, punto, u0, u1, sc):
    """Chiavi per fotogramma della posizione e dell'orientamento (con inclinazione in curva)."""
    us = np.linspace(u0, u1, 4000)
    pts = [ELL.mappa(*punto(u), 0.0) for u in us]
    lung = np.concatenate([[0.0], np.cumsum([(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)])])
    n_fot = round(T_FINE * FPS)
    s, vel, dt = 0.0, 0.0, 1.0 / FPS
    stato = []
    for f in range(1, n_fot + 2):
        t = (f - 1) / FPS
        if t > T_FERMA:
            x = min((t - T_FERMA) / 0.45, 1.0)
            vel = VELOCITA * x * x * (3 - 2 * x)
            s += vel * dt
        stato.append((f, s, vel))

    def a_distanza(sd):
        i = int(np.clip(np.searchsorted(lung, sd), 1, len(lung) - 1))
        fr = (sd - lung[i - 1]) / max(lung[i] - lung[i - 1], 1e-9)
        return pts[i - 1].lerp(pts[i], fr), (pts[i] - pts[i - 1]).normalized()

    arm.rotation_mode = "XYZ"
    posizioni = {}
    for f, sd, vel in stato:
        p, d = a_distanza(sd)
        _, d2 = a_distanza(sd + 0.6)
        _, d0 = a_distanza(max(sd - 0.6, 0.0))
        ang = math.atan2(d0.x * d2.y - d0.y * d2.x, d0.dot(d2))
        curv = ang / 1.2
        rollio = max(-0.35, min(0.35, 0.6 * math.atan(vel * vel * curv / 9.81)))
        arm.location = p
        arm.rotation_euler = (0.0, rollio, math.atan2(d.x, -d.y))
        arm.keyframe_insert("location", frame=f)
        arm.keyframe_insert("rotation_euler", frame=f)
        posizioni[f] = (p.copy(), d.copy())
    # rotazione continua (niente salti di 2 pi)
    if arm.animation_data and arm.animation_data.action:
        _srotola(arm)
    return posizioni


def _srotola(ob):
    try:
        curve = ob.animation_data.action.fcurves
    except AttributeError:
        curve = [c for strato in ob.animation_data.action.layers for st in strato.strips
                 for cb in st.channelbags for c in cb.fcurves]
    for c in curve:
        if c.data_path == "rotation_euler" and c.array_index == 2:
            prec = None
            for k in c.keyframe_points:
                if prec is not None:
                    while k.co.y - prec > math.pi:
                        k.co.y -= 2 * math.pi
                    while k.co.y - prec < -math.pi:
                        k.co.y += 2 * math.pi
                prec = k.co.y
        for k in c.keyframe_points:
            k.interpolation = "LINEAR"


def anima_camera(cam, pos, mira, posizioni, focale=(18.0, 70.0), carrello=20.0, shift=(0.2, 0.1), anticipo=2.0, gru=1.4):
    """Ferma fino a T_FERMA, poi panoramica che parte piano verso la lupa, carrello in avanti e zoom."""
    p0 = ELL.mappa(*pos)
    m0 = ELL.mappa(mira[0], mira[1], pos[2])
    avanti = (m0 - p0)
    avanti.z = 0
    avanti.normalize()
    cam.rotation_mode = "QUATERNION"
    for f, (pl, dl) in sorted(posizioni.items()):
        t = (f - 1) / FPS
        tau = max((t - T_FERMA) / T_CORSA, 0.0)
        w_pan = 1.0 if tau >= 1.0 else tau ** 1.5 * (1.6 - 0.6 * tau)  # parte piano, poi aggancia la lupa
        w_zoom = tau * tau
        p = p0 + avanti * (carrello * w_zoom) + Vector((0.0, 0.0, gru * w_zoom))
        bersaglio = pl + dl * anticipo
        bersaglio.z = p.z
        m = m0.lerp(bersaglio, min(w_pan, 1.0))
        cam.location = p
        cam.rotation_quaternion = (m - p).to_track_quat("-Z", "Y")
        cam.data.lens = focale[0] + (focale[1] - focale[0]) * w_zoom
        cam.data.shift_y = shift[0] + (shift[1] - shift[0]) * w_zoom
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
        cam.data.keyframe_insert("lens", frame=f)
        cam.data.keyframe_insert("shift_y", frame=f)


def impostazioni_animazione(sc, cartella_fotogrammi):
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = round(T_FINE * FPS)
    sc.render.filepath = cartella_fotogrammi.rstrip("/") + "/f_"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.45
    try:
        sc.eevee.motion_blur_steps = 2
    except AttributeError:
        pass
