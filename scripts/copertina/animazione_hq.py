"""
Animazione della copertina HQ, da eseguire dopo copertina_hq.py, ambiente_hq.py, lupa_hq.py,
capitello_hq.py e gemelli_hq.py nello stesso namespace.

La lupa di bronzo, sullo scheletro della volpe, sta ferma come una statua per 0,75 s; poi corre a
slalom attorno a tre pilastri del piano terra, esce dall'ultimo arco verso la camera e salta sul
capitello in fondo alla strada, dove la aspettano Romolo e Remo: in volo si gira di fianco, appoggia
prima le zampe anteriori e poi le posteriori, e si ferma nella posa della Lupa Capitolina (testa
girata verso di noi, coda giu'). La camera resta ferma, poi la segue con una panoramica che parte
piano mentre avanza e stringe lo zoom; durante il balzo allarga l'inquadratura (pan out) e sale
all'altezza della statua, che alla fine e' inquadrata come nella foto.

30 fotogrammi al secondo; i tempi del sito (costanti.ts) vengono da TEMPI, calcolati qui.
"""

import math

import bpy  # prima di mathutils
import numpy as np
from mathutils import Euler, Matrix, Vector

FPS = 30
T_FERMA = 0.75  # s di statua: il poster del sito
SCALA_LUPA = 0.033  # cm della volpe -> metri; spalla a circa 2 m, passa comoda negli archi (4,2 x 7 m)
VELOCITA = 15.0  # m/s a regime nello slalom
ACCELERA = 0.45  # s per arrivare a regime
CICLO = 0.38  # s per falcata di galoppo
FRENATA = 5.0  # m prima dello stacco in cui rallenta fino alla velocita' del balzo
G_SALTO = 19.0  # m/s^2: gravita' "da cartone" del balzo, piu' secco di quello vero
CULMINE = 0.8  # m sopra l'appoggio nel punto piu' alto del volo
SALTO = 7.5  # m in pianta dallo stacco all'atterraggio
DIREZIONE_SALTO = 58.0  # gradi tra la facciata (+u) e la direzione del balzo (verso la camera, +v)
CAPITELLO_UV = (7.0, 10.5)  # campate dopo l'asse ovest (centro della prima campata crollata), m dalla facciata
T_IMPENNA = 0.15  # s: prima dello stacco si alza sulle zampe posteriori
T_ASSESTA = 0.24  # s dall'appoggio delle zampe anteriori a quello delle posteriori
T_POSA = 0.58  # s dall'appoggio alla posa ferma
T_TENUTA = 1.55  # s di posa ferma fino alla fine del video (la home si apre dopo T_GUARDA)
T_GUARDA = 0.5  # s di posa prima che il sito apra la home
BECCHEGGIO_STACCO = math.radians(-22.0)  # muso in alto (rotazione X negativa)
BECCHEGGIO_APPOGGIO = math.radians(10.0)  # muso in basso: tocca prima con le zampe anteriori

# punti della volpe (cm, spazio dell'armatura): baricentro e appoggi delle zampe
BARICENTRO = Vector((0.0, 9.5, 40.0))
ZAMPA_ANTERIORE = Vector((0.0, -22.0, 1.5))
ZAMPA_POSTERIORE = Vector((0.0, 9.5 + 31.0, 1.5))

# ossa che deformano: segmento (testa, coda) nello spazio della volpe, raggio d'influenza (cm).
# Sono quelle della Lupa (lupa_hq): testa piu' bassa della volpe, zampe posteriori piu' indietro.
SEGMENTI = {
    "b_Hip_01": (((0, 27.0, 50.0), (0, 44.0, 49.0)), 9.0),
    "b_Spine01_02": (((0, 22.2, 53.0), (0, 0.6, 52.0)), 11.0),
    "b_Spine02_03": (((0, 0.6, 52.0), (0, -25.1, 51.0)), 11.0),
    "b_Neck_04": (((0, -24.0, 50.0), (0, -37.0, 50.5)), 8.5),
    "b_Head_05": (((0, -37.0, 51.0), (0, -58.0, 49.5)), 8.0),
    "b_Tail01_012": (((0, 40.2, 52.6), (0, 48.6, 43.5)), 4.0),
    "b_Tail02_013": (((0, 48.6, 43.5), (0, 67.3, 28.1)), 3.5),
    "b_Tail03_014": (((0, 67.3, 28.1), (0, 74.0, 19.0)), 3.0),
}
ZAMPE = {}
for _lato, _s in (("Left", 1), ("Right", -1)):
    _ia, _ib = ("09", "010", "011") if _lato == "Left" else ("06", "07", "08"), ("015", "016", "017", "018") if _lato == "Left" else ("019", "020", "021", "022")
    _p = 5.5  # SPOSTA_POSTERIORI di lupa_hq
    SEGMENTI.update({
        f"b_{_lato}UpperArm_{_ia[0]}": (((_s * 7.2, -17.0, 44.0), (_s * 7.2, -16.8, 26.0)), 4.6),
        f"b_{_lato}ForeArm_{_ia[1]}": (((_s * 7.1, -16.8, 26.0), (_s * 7.0, -17.8, 6.7)), 3.4),
        f"b_{_lato}Hand_{_ia[2]}": (((_s * 7.0, -17.8, 6.7), (_s * 7.0, -25.0, 1.5)), 3.2),
        f"b_{_lato}Leg01_{_ib[0]}": (((_s * 7.0, 30.0 + _p, 46.0), (_s * 7.2, 28.0 + _p, 30.5)), 5.6),
        f"b_{_lato}Leg02_{_ib[1]}": (((_s * 7.2, 28.0 + _p, 30.5), (_s * 7.0, 37.0 + _p, 15.0)), 3.6),
        f"b_{_lato}Foot01_{_ib[2]}": (((_s * 7.0, 37.0 + _p, 15.0), (_s * 7.0, 33.0 + _p, 1.5)), 3.0),
        f"b_{_lato}Foot02_{_ib[3]}": (((_s * 7.0, 33.0 + _p, 1.5), (_s * 7.0, 25.5 + _p, 1.5)), 3.0),
    })
    ZAMPE[_lato] = dict(spalla=f"b_{_lato}UpperArm_{_ia[0]}", gomito=f"b_{_lato}ForeArm_{_ia[1]}", mano=f"b_{_lato}Hand_{_ia[2]}",
                        anca=f"b_{_lato}Leg01_{_ib[0]}", ginocchio=f"b_{_lato}Leg02_{_ib[1]}",
                        garretto=f"b_{_lato}Foot01_{_ib[2]}", piede=f"b_{_lato}Foot02_{_ib[3]}")
# ossa spostate rispetto alla volpe (testa e coda insieme: l'orientamento resta quello della corsa)
SPOSTAMENTI = {"b_Head_05": (0.0, -0.8, -9.2)}
for _z in ZAMPE.values():
    for _k in ("anca", "ginocchio", "garretto", "piede"):
        SPOSTAMENTI[_z[_k]] = (0.0, 5.5, 0.0)


def importa_scheletro(percorso, col):
    """Armatura della volpe e la sua corsa dal file della copertina leggera, adattata alla Lupa."""
    with bpy.data.libraries.load(percorso, link=False) as (_src, dst):
        dst.objects = [SCHELETRO]
        dst.actions = ["Corsa"]
    arm = next(o for o in dst.objects if o is not None)
    corsa = next(a for a in dst.actions if a is not None)
    genitore = arm.parent
    arm.parent = None
    if genitore is not None and genitore.users <= 1:
        bpy.data.objects.remove(genitore, do_unlink=True)
    arm.animation_data_clear()
    arm.matrix_world = Matrix.Identity(4)
    adatta_scheletro(arm)
    col.objects.link(arm)
    for b in arm.data.bones:
        b.use_deform = b.name in SEGMENTI
    return arm, corsa


def adatta_scheletro(arm):
    """Sposta le ossa in modalita' modifica (nella scena attiva, poi l'armatura torna fuori)."""
    sc = bpy.context.scene
    sc.collection.objects.link(arm)
    vl = bpy.context.view_layer
    vl.update()
    vl.objects.active = arm
    arm.select_set(True)
    with bpy.context.temp_override(active_object=arm, object=arm, edit_object=arm, selected_objects=[arm],
                                   selected_editable_objects=[arm], view_layer=vl, scene=sc):
        bpy.ops.object.mode_set(mode="EDIT")
        for nome, d in SPOSTAMENTI.items():
            eb = arm.data.edit_bones[nome]
            eb.head += Vector(d)
            eb.tail += Vector(d)
        bpy.ops.object.mode_set(mode="OBJECT")
    sc.collection.objects.unlink(arm)


def _distanza_segmento(co, a, b):
    a, b = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    ab = b - a
    t = np.clip(((co - a) @ ab) / max(ab @ ab, 1e-9), 0.0, 1.0)
    return np.linalg.norm(co - (a + t[:, None] * ab), axis=1)


def pesi(ob, giri=6):
    """Pesi delle ossa: vicinanza ai segmenti dello scheletro, con i limiti anatomici (le zampe non tirano il
    tronco ne' le mammelle, la coda e la testa restano loro), poi ammorbiditi sulla mesh."""
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
            w *= np.clip((50.0 - z) / 8.0, 0, 1) * np.clip((y - 23.0) / 4.0, 0, 1)
        if "Tail" in nome:
            w *= np.clip((y - 41.0) / 2.0, 0, 1)
        if "Head" in nome:
            w *= np.clip((-y - 34.5) / 3.0, 0, 1)
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


def lupa_in_scena(col, percorso_volpe, voxel=0.25):
    """Scultura (corpo e denti) + materiale + scheletro. Restituisce (armatura, mesh, azione della corsa)."""
    arm, corsa = importa_scheletro(percorso_volpe, col)
    me, me_denti = scultura(LUPA, voxel=voxel)
    bronzo = materiale_bronzo()
    me.materials.append(bronzo)
    ob = bpy.data.objects.new(LUPA, me)
    col.objects.link(ob)
    ob["rr_hq"] = "lupa"
    arm["rr_hq"] = "lupa"
    pesi(ob)
    ob.parent = arm
    mod = ob.modifiers.new("Scheletro", "ARMATURE")
    mod.object = arm
    me_denti.materials.append(bronzo)
    denti = bpy.data.objects.new(LUPA + " denti", me_denti)
    col.objects.link(denti)
    denti["rr_hq"] = "lupa"
    denti.vertex_groups.new(name="b_Head_05").add(list(range(len(me_denti.vertices))), 1.0, "REPLACE")
    denti.parent = arm
    mod = denti.modifiers.new("Scheletro", "ARMATURE")
    mod.object = arm
    arm.scale = (SCALA_LUPA,) * 3
    return arm, ob, corsa


# ---------------------------------------------------------------------------------------------
# Percorso: slalom, uscita verso la camera, balzo sul capitello


def _smooth(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def _smoother(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * x * (x * (6 * x - 15) + 10)


def _bezier(p0, p1, p2, p3, n):
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(p0 * (1 - t) ** 3 + p1 * (3 * t * (1 - t) ** 2) + p2 * (3 * t * t * (1 - t)) + p3 * t ** 3)
    return out


def geometria(k0):
    """Capitello, atterraggio e stacco nel mondo. La lupa finisce di profilo verso +u (la destra
    dell'inquadratura), il fianco destro verso la camera, come nella foto."""
    uc, vc = (k0 + CAPITELLO_UV[0]) * W, CAPITELLO_UV[1]
    pc, tg, nr = ELL.telaio(uc)
    G = ELL.mappa(uc, vc, 0.0)
    imbardata = math.atan2(tg.x, -tg.y)  # il muso della volpe e' verso -y
    R = Matrix.Rotation(imbardata, 3, "Z")
    S = SCALA_LUPA
    radice = G - (R @ Vector((0.0, BARICENTRO.y, 0.0))) * S  # piedi centrati sull'abaco
    radice.z = CIMA
    dir_salto = (tg * math.cos(math.radians(DIREZIONE_SALTO)) + nr * math.sin(math.radians(DIREZIONE_SALTO))).normalized()
    stacco = Vector((radice.x, radice.y, 0.0)) - dir_salto * SALTO
    return dict(G=G, tg=tg, nr=nr, uc=uc, imbardata=imbardata, radice=radice, dir_salto=dir_salto, stacco=stacco)


def percorso(k0, geo, ampiezza=3.3, v_medio=-1.3, passo=0.05):
    """Linea a terra della corsa: fuori davanti a un pilastro, dentro dall'arco k0+3, fuori dall'arco
    k0+4... (tre pilastri), fuori dall'arco k0+6 e poi diritta allo stacco. Punti nel mondo."""
    ua, ub = (k0 + 2.5) * W, (k0 + 6.0) * W
    n = int((ub - ua) / passo)
    pts = []
    for i in range(n + 1):
        u = ua + (ub - ua) * i / n
        pts.append(ELL.mappa(u, v_medio + ampiezza * math.cos(math.pi * (u - ua) / W), 0.0))
    # uscita: tangente continua all'arco k0+6 e direzione del balzo allo stacco
    t_b = (pts[-1] - pts[-2]).normalized()
    fine = geo["stacco"]
    k = (fine - pts[-1]).length / 3
    uscita = _bezier(pts[-1], pts[-1] + t_b * k, fine - geo["dir_salto"] * k, fine, max(int(3 * k / passo), 8))
    pts += uscita[1:]
    lung = np.concatenate([[0.0], np.cumsum([(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)])])
    return pts, lung


def _in_percorso(pts, lung, sd):
    i = int(np.clip(np.searchsorted(lung, sd), 1, len(lung) - 1))
    fr = (sd - lung[i - 1]) / max(lung[i] - lung[i - 1], 1e-9)
    return pts[i - 1].lerp(pts[i], fr), (pts[i] - pts[i - 1]).normalized()


def _imbardata(d):
    return math.atan2(d.x, -d.y)


def _vicino(a, rif):
    """Angolo a spostato di multipli di 2 pi vicino a rif (rotazione continua)."""
    while a - rif > math.pi:
        a -= 2 * math.pi
    while a - rif < -math.pi:
        a += 2 * math.pi
    return a


def moto_lupa(k0, geo, ampiezza=3.3, v_medio=-1.3):
    """Stato della lupa a ogni fotogramma: radice (posizione, euler XYZ) e baricentro nel mondo,
    piu' i tempi chiave. Rotazioni attorno all'appoggio giusto: le zampe posteriori quando si impenna,
    le anteriori quando atterra; in volo il baricentro fa una parabola."""
    S = SCALA_LUPA
    pts, lung = percorso(k0, geo, ampiezza, v_medio)
    L = lung[-1]

    def R_di(beccheggio, rollio, imb):
        return Euler((beccheggio, rollio, imb), "XYZ").to_matrix()

    # appoggio: con le zampe anteriori sull'abaco e il muso in basso
    imb_f = geo["imbardata"]
    R_td = R_di(BECCHEGGIO_APPOGGIO, 0.0, imb_f)
    zampa_f = geo["radice"] + Matrix.Rotation(imb_f, 3, "Z") @ (ZAMPA_ANTERIORE * S)
    com_td = zampa_f - R_td @ ((ZAMPA_ANTERIORE - BARICENTRO) * S)
    # stacco: impennato sulle zampe posteriori
    d_s = geo["dir_salto"]
    imb_s = _imbardata(d_s)
    R_s = R_di(BECCHEGGIO_STACCO, 0.0, imb_s)
    zampa_p = geo["stacco"] + Matrix.Rotation(imb_s, 3, "Z") @ (ZAMPA_POSTERIORE * S)
    com_s = zampa_p + R_s @ ((BARICENTRO - ZAMPA_POSTERIORE) * S)
    z_ap = max(com_s.z, com_td.z) + CULMINE
    vz0 = math.sqrt(2 * G_SALTO * (z_ap - com_s.z))
    t_volo = vz0 / G_SALTO + math.sqrt(2 * (z_ap - com_td.z) / G_SALTO)
    orizz = Vector((com_td.x - com_s.x, com_td.y - com_s.y, 0.0))
    v_stacco = orizz.length / t_volo
    # corsa: accelera, va a regime, frena negli ultimi metri fino alla velocita' del balzo
    dt = 1.0 / (FPS * 20)
    t, s, campioni = T_FERMA, 0.0, [(T_FERMA, 0.0, 0.0)]
    while s < L:
        resto = L - s
        v_reg = v_stacco + (VELOCITA - v_stacco) * _smooth(resto / FRENATA)
        v = v_reg * _smooth((t - T_FERMA) / ACCELERA) if t - T_FERMA < ACCELERA else v_reg
        v = max(v, 0.4)
        s += v * dt
        t += dt
        campioni.append((t, min(s, L), v))
    t_s = campioni[-1][0] - (campioni[-1][1] - L) / max(campioni[-1][2], 1e-6)
    tc = np.array([c[0] for c in campioni])
    sc_ = np.array([c[1] for c in campioni])
    vc = np.array([c[2] for c in campioni])
    t_td = t_s + t_volo
    t_posa = t_td + T_POSA
    t_fine = t_posa + T_TENUTA
    n_fot = int(math.ceil(t_fine * FPS)) + 1
    stati = {}
    imb_prec = None
    for f in range(1, n_fot + 1):
        t = (f - 1) / FPS
        if t <= T_FERMA:
            p, d = _in_percorso(pts, lung, 0.0)
            imb = _imbardata(d)
            R = R_di(0.0, 0.0, imb)
            radice, rot = p, (0.0, 0.0, imb)
        elif t < t_s:
            sd = float(np.interp(t, tc, sc_))
            vel = float(np.interp(t, tc, vc))
            p, d = _in_percorso(pts, lung, sd)
            _, d2 = _in_percorso(pts, lung, sd + 0.6)
            _, d0 = _in_percorso(pts, lung, max(sd - 0.6, 0.0))
            ang = math.atan2(d0.x * d2.y - d0.y * d2.x, d0.dot(d2))
            curv = ang / 1.2
            rollio = max(-0.35, min(0.35, 0.6 * math.atan(vel * vel * curv / 9.81)))
            imb = _imbardata(d)
            q = _smooth((t - (t_s - T_IMPENNA)) / T_IMPENNA)
            becc = BECCHEGGIO_STACCO * q
            rollio *= 1.0 - q
            R = R_di(becc, rollio, imb)
            if q > 0.0:  # si alza ruotando sulle zampe posteriori
                zp = p + Matrix.Rotation(imb, 3, "Z") @ (ZAMPA_POSTERIORE * S)
                radice = zp - R @ (ZAMPA_POSTERIORE * S)
            else:
                radice = p
            rot = (becc, rollio, imb)
        elif t < t_td:
            tau = t - t_s
            x = tau / t_volo
            com = com_s + orizz * x
            com.z = com_s.z + vz0 * tau - 0.5 * G_SALTO * tau * tau
            imb = imb_s + (_vicino(imb_f, imb_s) - imb_s) * _smoother((x - 0.22) / 0.72)
            becc = BECCHEGGIO_STACCO + (BECCHEGGIO_APPOGGIO - BECCHEGGIO_STACCO) * _smooth(x)
            R = R_di(becc, 0.0, imb)
            radice = com - R @ (BARICENTRO * S)
            rot = (becc, 0.0, imb)
        else:
            q = _smooth((t - t_td) / T_ASSESTA)
            becc = BECCHEGGIO_APPOGGIO * (1.0 - q)
            R = R_di(becc, 0.0, imb_f)
            radice = zampa_f - R @ (ZAMPA_ANTERIORE * S)  # le zampe anteriori restano ferme
            rot = (becc, 0.0, imb_f)
        if imb_prec is not None:
            rot = (rot[0], rot[1], _vicino(rot[2], imb_prec))
        imb_prec = rot[2]
        com = radice + R_di(*rot) @ (BARICENTRO * S)
        stati[f] = dict(t=t, radice=radice.copy(), rot=rot, com=com)
    tempi = dict(t_s=t_s, t_volo=t_volo, t_td=t_td, t_posa=t_posa, t_fine=t_fine, fotogrammi=n_fot,
                 v_stacco=v_stacco, lunghezza=L)
    return stati, tempi


def anima_radice(arm, stati):
    arm.rotation_mode = "XYZ"
    for f, st in sorted(stati.items()):
        arm.location = st["radice"]
        arm.rotation_euler = st["rot"]
        arm.keyframe_insert("location", frame=f)
        arm.keyframe_insert("rotation_euler", frame=f)
    for c in _curve(arm.animation_data.action):
        for k in c.keyframe_points:
            k.interpolation = "LINEAR"


def _curve(azione):
    try:
        return list(azione.fcurves)
    except AttributeError:
        return [c for strato in azione.layers for st in strato.strips for cb in st.channelbags for c in cb.fcurves]


# ---------------------------------------------------------------------------------------------
# Pose dello scheletro: corsa (NLA), poi il balzo e la posa della statua


def _assegna_slot(st, azione):
    try:
        if not st.action_slot and azione.slots:
            st.action_slot = azione.slots[0]
    except AttributeError:
        pass


# rotazioni nello spazio dell'armatura (gradi): +X porta indietro le zampe e solleva la coda,
# -X alza il muso, -Z gira la testa verso il fianco destro (la camera)
POSE = {
    "spinta": {"spalla": -20, "gomito": 45, "mano": 15, "anca": -12, "ginocchio": 18, "garretto": -10, "Neck": -6},
    "stacco": {"spalla": -62, "gomito": -12, "mano": 8, "anca": 42, "ginocchio": -8, "garretto": 32, "piede": 18,
               "Neck": -12, "Tail01": 22},
    "raccolta": {"spalla": -32, "gomito": 82, "mano": 28, "anca": -42, "ginocchio": 58, "garretto": -34,
                 "Neck": -4, "Tail01": 12, "Tail02": 6},
    "presa": {"spalla": -26, "gomito": -6, "mano": 2, "anca": -20, "ginocchio": 16, "garretto": -6, "Neck": 4},
    "appoggio": {},
    "posa": {"NeckZ": -14, "HeadZ": -30, "Head": -5, "Tail01": -58, "Tail02": -18, "Tail03": -8},
}


def _rotazioni_posa(nome_posa, arm):
    """Quaternioni locali delle ossa per una posa: q = M_riposo^-1 R M_riposo."""
    posa = POSE[nome_posa]
    out = {}
    for nome in SEGMENTI:
        b = arm.data.bones[nome]
        M = b.matrix_local.to_3x3()
        R = Matrix.Identity(3)
        if "Arm" in nome or "Hand" in nome or "Leg" in nome or "Foot" in nome:
            lato = "Left" if "Left" in nome else "Right"
            ruolo = next(k for k, v in ZAMPE[lato].items() if v == nome)
            R = Matrix.Rotation(math.radians(posa.get(ruolo, 0.0)), 3, "X")
        elif "Neck" in nome:
            R = Matrix.Rotation(math.radians(posa.get("NeckZ", 0.0)), 3, "Z") @ Matrix.Rotation(math.radians(posa.get("Neck", 0.0)), 3, "X")
        elif "Head" in nome:
            R = Matrix.Rotation(math.radians(posa.get("HeadZ", 0.0)), 3, "Z") @ Matrix.Rotation(math.radians(posa.get("Head", 0.0)), 3, "X")
        elif "Tail" in nome:
            chiave = "Tail0" + nome.split("Tail0")[1][0]
            R = Matrix.Rotation(math.radians(posa.get(chiave, 0.0)), 3, "X")
        out[nome] = (M.inverted() @ R @ M).to_quaternion()
    return out


def anima_balzo(arm, tempi):
    """Azione 'Balzo' sopra la corsa: spinta, stacco, raccolta in volo, presa, appoggio, posa."""
    t_s, t_td, t_posa = tempi["t_s"], tempi["t_td"], tempi["t_posa"]
    chiavi = [
        ((round(1 + (t_s - T_IMPENNA - 0.02) * FPS) - 1) / FPS, "spinta"),  # su un fotogramma intero: inizio della striscia
        (t_s + 0.04, "stacco"),
        (t_s + 0.45 * tempi["t_volo"], "raccolta"),
        (t_td - 0.1, "presa"),
        (t_td, "appoggio"),
        (t_td + 0.16, "appoggio"),
        (t_posa, "posa"),
    ]
    ad = arm.animation_data
    balzo = bpy.data.actions.new("Balzo")
    ad.action = balzo
    prec = {}
    for t, nome_posa in chiavi:
        f = 1 + t * FPS
        for nome, q in _rotazioni_posa(nome_posa, arm).items():
            if nome in prec and prec[nome].dot(q) < 0:
                q = -q
            prec[nome] = q
            pb = arm.pose.bones[nome]
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=f, group=nome)
            if nome == "b_Hip_01":
                pb.location = (0.0, 0.0, 0.0)
                pb.keyframe_insert("location", frame=f, group=nome)
    ad.action = None
    tr = ad.nla_tracks.new()
    tr.name = "Balzo"
    st = tr.strips.new("Balzo", int(round(1 + chiavi[0][0] * FPS)), balzo)
    _assegna_slot(st, balzo)
    st.blend_in = 4
    st.extrapolation = "HOLD_FORWARD"
    for pb in arm.pose.bones:  # riposo fuori dalle azioni
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    return balzo


def anima_corsa(arm, corsa, tempi):
    """Il galoppo della volpe (34,75 fotogrammi) stretto a una falcata, da T_FERMA allo stacco."""
    ad = arm.animation_data_create()
    tr = ad.nla_tracks.new()
    tr.name = "Corsa"
    st = tr.strips.new("Corsa", int(math.ceil(1 + T_FERMA * FPS)), corsa)
    _assegna_slot(st, corsa)
    durata = corsa.frame_range[1] - corsa.frame_range[0]
    st.scale = CICLO * FPS / durata
    fine = 1 + (tempi["t_s"] + 0.05) * FPS
    st.repeat = max((fine - st.frame_start) / (st.scale * durata), 0.1)
    st.blend_in = 6
    st.extrapolation = "NOTHING"
    return st


# ---------------------------------------------------------------------------------------------
# Camera


def _hermite(pa, va, pb, vb, ta, tb, t):
    h = tb - ta
    s = min(max((t - ta) / h, 0.0), 1.0)
    h00, h10, h01, h11 = 2 * s ** 3 - 3 * s * s + 1, s ** 3 - 2 * s * s + s, -2 * s ** 3 + 3 * s * s, s ** 3 - s * s
    return pa * h00 + va * (h10 * h) + pb * h01 + vb * (h11 * h)


def inquadratura_finale(geo, distanza=18.0, beta=9.0, quota=0.85, mira=0.95, avanti=0.3):
    """Camera della posa: di fronte al fianco destro della lupa, un po' verso il muso (beta), a meta' statua."""
    b = math.radians(beta)
    G = geo["G"]
    P = G + (geo["nr"] * math.cos(b) + geo["tg"] * math.sin(b)) * distanza
    P.z = CIMA + quota
    M = G + geo["tg"] * avanti
    M.z = CIMA + mira
    return P, M


def anima_camera(cam, pos, mira, stati, tempi, geo, p1_uv=(42.5, 31.0, 1.9), lenti=(18.0, 88.0, 62.0, 70.0),
                 shift=(0.2, 0.08, 0.0), anticipo=0.25, fstop=(2.8, 1.8), u_ovest=0.0):
    """Ferma fino a T_FERMA; poi avanza verso la facciata seguendo la lupa con una panoramica che parte
    piano e stringe lo zoom fino allo stacco; nel balzo sale e allarga (pan out) fino all'inquadratura
    della statua, poi una spinta lentissima in avanti."""
    t_s, t_td, t_fine = tempi["t_s"], tempi["t_td"], tempi["t_fine"]
    t_arrivo = t_td + 0.4
    P0 = ELL.mappa(*pos)
    M0 = ELL.mappa(mira[0], mira[1], pos[2])
    P1 = ELL.mappa(u_ovest + p1_uv[0], p1_uv[1], p1_uv[2])
    P2, M2 = inquadratura_finale(geo)
    V2 = (M2 - P2).normalized() * 0.18  # spinta lenta durante la posa
    V1 = ((P1 - P0) / (t_s - T_FERMA) + (P2 - P1) / (t_arrivo - t_s)) * 0.5
    V1.z = (P2.z - P0.z) / (t_arrivo - T_FERMA) * 0.6
    # bersaglio: baricentro della lupa lisciato nel tempo, con un anticipo nella direzione del moto
    fs = sorted(stati)
    com = np.array([tuple(stati[f]["com"]) for f in fs])
    sig = 0.16 * FPS
    k = np.arange(-int(3 * sig), int(3 * sig) + 1)
    ker = np.exp(-0.5 * (k / sig) ** 2)
    pad = np.concatenate([np.repeat(com[:1], len(k) // 2, 0), com, np.repeat(com[-1:], len(k) // 2, 0)])
    liscio = np.stack([np.convolve(pad[:, i], ker / ker.sum(), mode="valid") for i in range(3)], axis=1)
    vel = np.gradient(liscio, axis=0) * FPS
    cam.rotation_mode = "QUATERNION"
    dof = cam.data.dof
    dof.use_dof = True
    q_prec = None
    righe = []
    for i, f in enumerate(fs):
        t = stati[f]["t"]
        if t <= T_FERMA:
            P = P0.copy()
        elif t <= t_s:
            P = _hermite(P0, Vector(), P1, V1, T_FERMA, t_s, t)
        elif t <= t_arrivo:
            P = _hermite(P1, V1, P2, V2, t_s, t_arrivo, t)
        else:
            P = P2 + V2 * (t - t_arrivo)
        lead = Vector((vel[i][0], vel[i][1], 0.0)) * anticipo
        if lead.length > 2.5:
            lead *= 2.5 / lead.length
        segui = Vector(liscio[i]) + lead
        tau = max(t - T_FERMA, 0.0) / 1.3
        w_pan = 1.0 if tau >= 1.0 else tau ** 1.5 * (1.6 - 0.6 * tau)  # parte piano, poi aggancia la lupa
        bersaglio = M0.lerp(segui, min(w_pan, 1.0))
        bersaglio = bersaglio.lerp(M2, _smooth((t - (t_s + 0.15)) / (t_arrivo + 0.15 - (t_s + 0.15))))
        q = (bersaglio - P).to_track_quat("-Z", "Y")
        if q_prec is not None and q_prec.dot(q) < 0:
            q = -q
        q_prec = q
        # zoom: stringe fino allo stacco (fermo un attimo), allarga nel balzo, poi stringe pianissimo
        if t <= T_FERMA:
            lente, sy = lenti[0], shift[0]
        elif t <= t_s:
            w = _smoother((t - T_FERMA) / (t_s - T_FERMA))
            lente = math.exp(math.log(lenti[0]) + (math.log(lenti[1]) - math.log(lenti[0])) * w)
            sy = shift[0] + (shift[1] - shift[0]) * _smooth((t - T_FERMA) / (t_s - T_FERMA))
        elif t <= t_arrivo:
            w = _smooth((t - t_s) / (t_arrivo - t_s))
            lente = math.exp(math.log(lenti[1]) + (math.log(lenti[2]) - math.log(lenti[1])) * w)
            sy = shift[1] + (shift[2] - shift[1]) * w
        else:
            lente = lenti[2] + (lenti[3] - lenti[2]) * min((t - t_arrivo) / max(t_fine - t_arrivo, 0.1), 1.0)
            sy = shift[2]
        fuoco = max((Vector(stati[f]["com"]) - P).dot(q @ Vector((0, 0, -1))), 1.0)
        cam.location = P
        cam.rotation_quaternion = q
        cam.data.lens = lente
        cam.data.shift_y = sy
        dof.focus_distance = fuoco
        dof.aperture_fstop = fstop[0] + (fstop[1] - fstop[0]) * _smooth((t - t_s) / (t_arrivo - t_s))
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
        cam.data.keyframe_insert("lens", frame=f)
        cam.data.keyframe_insert("shift_y", frame=f)
        cam.data.keyframe_insert("dof.focus_distance", frame=f)
        cam.data.keyframe_insert("dof.aperture_fstop", frame=f)
        righe.append((f, round(lente, 1), round(fuoco, 1)))
    return righe


def schermo(sc, cam_ob, punto):
    """Coordinate normalizzate (x da sinistra, y dal basso) di un punto nell'inquadratura."""
    from bpy_extras.object_utils import world_to_camera_view

    return tuple(world_to_camera_view(sc, cam_ob, punto))[:2]


def luce_statua(col, geo, oggetti, potenza=700.0, colore=(1.0, 0.84, 0.68), distanza=9.0, giro=30.0, alzo=35.0, misura=6.0):
    """Luce morbida da museo sulla statua: davanti, in alto, un po' verso il muso (il sole basso la prende
    di spalle). Col light linking illumina solo il bronzo: capitello e Colosseo restano col sole."""
    centro = geo["G"] + geo["tg"] * 0.3
    centro.z = CIMA + 1.1
    g, a = math.radians(giro), math.radians(alzo)
    verso = geo["nr"] * math.cos(g) + geo["tg"] * math.sin(g)
    P = centro + verso * (distanza * math.cos(a)) + Vector((0.0, 0.0, distanza * math.sin(a)))
    li = bpy.data.lights.new("Luce statua", "AREA")
    li.shape = "DISK"
    li.size = misura
    li.energy = potenza
    li.color = colore
    ob = bpy.data.objects.new("Luce statua", li)
    ob.location = P
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (centro - P).to_track_quat("-Z", "Y")
    col.objects.link(ob)
    ricevono = bpy.data.collections.new("Bronzo (luce statua)")
    for o in oggetti:
        ricevono.objects.link(o)
    try:
        ob.light_linking.receiver_collection = ricevono
    except AttributeError:
        pass
    return ob


def impostazioni_animazione(sc, cartella_fotogrammi, n_fotogrammi):
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = n_fotogrammi
    sc.render.filepath = cartella_fotogrammi.rstrip("/") + "/f_"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.45
    ee = sc.eevee
    for k, v in {"motion_blur_steps": 2, "use_bokeh_jittered": True, "bokeh_max_size": 60.0}.items():
        try:
            setattr(ee, k, v)
        except (AttributeError, TypeError):
            pass
