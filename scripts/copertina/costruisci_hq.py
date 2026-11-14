"""
Costruisce la scena della copertina HQ e la salva in un .blend da aprire in Blender 5.3 con
interfaccia per il render EEVEE (vedi docs/COPERTINA.md).

    pip install bpy==5.3.0
    RR_CARTELLA=/percorso/con/hdri python3 scripts/copertina/costruisci_hq.py -- '{"out": "/tmp/copertina_hq.blend"}'

Nel JSON dopo "--" si possono cambiare i parametri (camera, cielo, sole, foschia, lupa, zoom...);
i valori predefiniti sono quelli del video pubblicato. Stampa i tempi del video (INFO_BUILD) da
riportare in src/components/copertina/costanti.ts.
"""

import json
import math
import os
import sys
import time

import bpy
from mathutils import Euler, Matrix, Vector

QUI = os.path.dirname(os.path.abspath(__file__))
args = json.loads(sys.argv[sys.argv.index("--") + 1]) if "--" in sys.argv else {}
ns = {}
for f in ("copertina_hq.py", "ambiente_hq.py", "lupa_hq.py", "capitello_hq.py", "gemelli_hq.py", "animazione_hq.py"):
    with open(os.path.join(QUI, f)) as fh:
        exec(fh.read(), ns)
t = time.time()
hdri = args.get("hdri", "the_sky_is_on_fire_4k.hdr")
info = ns["costruisci_hq"](hdri=hdri, rotazione_cielo=0.0)
scena = bpy.data.scenes[ns["SCENA"]]
col = bpy.data.collections[ns["COLLEZIONE"]]
U = ns["U_OVEST"]
cp, cm = args.get("cam_pos", [34.0, 70.0, 1.0]), args.get("cam_mira", [38.0, 0.0])
pos, mira = (U + cp[0], cp[1], cp[2]), (U + cm[0], cm[1], 0.0)
C, F, R = ns["telaio_strada"](pos, mira)
info["strada"] = ns["strada"](col, C, F, R, mira[0])
info["t_strada"] = round(time.time() - t, 1)
if args.get("alberi", True):
    info["alberi"] = ns["pianta_alberi"](col, C, F, R)
if args.get("orizzonte", True):
    info["orizzonte"] = ns["alberi_orizzonte"](col, C, F, R)
azF = ns["azimut"](F)
info["azimut_camera"] = round(azF, 1)
# sole dell'HDRI the_sky_is_on_fire: azimut -55,4 gradi, altezza 3 (centro pesato dei pixel piu' luminosi);
# un punto dell'HDRI ad azimut a si vede ad azimut a - rotazione
glow_az = azF + args.get("cielo_rel", 38.0)
ns["mondo"](scena, hdri, rotazione_gradi=args.get("rot_cielo", args.get("az_sole_hdri", -55.4) - glow_az),
            forza=args.get("forza_cielo", 1.0), forza_luce=args.get("forza_luce", 0.32), calore=args.get("calore", 0.25),
            bagliore=(glow_az, 3.0), saturazione=args.get("saturazione", 0.6))
ns["sole"](col, azF + args.get("sole_rel", 115.0), args.get("sole_alt", 6.0), forza=args.get("forza_sole", 8.5),
           colore=tuple(args.get("colore_sole", [1.0, 0.56, 0.28])))
cam = ns["camera_strada"](col, pos, mira, focale=args.get("focale", 18.0), shift_y=args.get("shift", 0.2))
scena.camera = cam
ns["impostazioni_eevee"](scena, campioni=args.get("campioni", 64), percentuale=args.get("percentuale", 100))
if args.get("foschia", 0.0003):
    ns["foschia"](col, args.get("foschia", 0.0003), scena=scena)
scena.view_settings.exposure = args.get("esposizione", 0.0)
if args.get("lupa", True):
    t1 = time.time()
    k0 = round(U / ns["W"])
    geo = ns["geometria"](k0)
    ns["capitello_in_scena"](col, geo["G"], math.atan2(geo["tg"].y, geo["tg"].x))
    arm, lupa, corsa = ns["lupa_in_scena"](col, os.path.join(QUI, "copertina.blend"), voxel=args.get("voxel", 0.25))
    stati, tempi = ns["moto_lupa"](k0, geo)
    ns["anima_corsa"](arm, corsa, tempi)
    ns["anima_balzo"](arm, tempi)
    ns["anima_radice"](arm, stati)
    S = ns["SCALA_LUPA"]
    gemelli = ns["gemelli_in_scena"](col, Matrix.LocRotScale(geo["radice"], Euler((0.0, 0.0, geo["imbardata"])), (S, S, S)))
    if args.get("luce_statua", 700.0):
        bronzo = [lupa, gemelli] + [o for o in col.objects if o.name.startswith(ns["LUPA"] + " denti")]
        ns["luce_statua"](col, geo, bronzo, potenza=args.get("luce_statua", 700.0))
    ns["anima_camera"](cam, pos, mira, stati, tempi, geo, u_ovest=U, lenti=tuple(args.get("lenti", [18.0, 88.0, 62.0, 70.0])))
    ns["impostazioni_animazione"](scena, args.get("fotogrammi", os.path.join(ns["CARTELLA"], "fotogrammi")), tempi["fotogrammi"])
    # tempi per il sito: la corsa parte a T_FERMA, la home si apre T_GUARDA dopo la posa
    tempi["T_DISSOLVENZA"] = tempi["t_posa"] + ns["T_GUARDA"]
    scena.frame_set(tempi["fotogrammi"])
    x_finale = ns["schermo"](scena, cam, geo["G"] + geo["tg"] * 0.3 + Vector((0.0, 0.0, ns["CIMA"] + 0.95)))[0]
    scena.frame_set(1)
    x_iniziale = ns["schermo"](scena, cam, arm.matrix_world.translation)[0]
    info["lupa"] = {"vertici": len(lupa.data.vertices), "gruppi": len(lupa.vertex_groups), "s": round(time.time() - t1, 1),
                    "tempi": {k: round(v, 3) for k, v in tempi.items()}, "fetta": [round(x_iniziale, 3), round(x_finale, 3)]}
out = args.get("out", "/tmp/copertina_hq.blend")
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True, relative_remap=False)
info["s"] = round(time.time() - t, 1)
print("INFO_BUILD", json.dumps(info))
