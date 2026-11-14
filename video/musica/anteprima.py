"""Le tre cue montate sulla linea del tempo del film (A a 0, B a 99, C a 139) in un mp3 da ascoltare."""
from __future__ import annotations

import os
import subprocess

import numpy as np

from sintesi import leggi_wav, ns, scrivi_wav

FFMPEG = os.path.join(os.path.dirname(__file__), "..", "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
POSTI = (("cue-a.wav", 0.0), ("cue-b.wav", 99.0), ("cue-c.wav", 139.0))

tutto = np.zeros((2, ns(188.0)))
for nome, t0 in POSTI:
    x = leggi_wav(os.path.join("..", "public", "musica", nome))
    tutto[:, ns(t0):ns(t0) + x.shape[1]] += x
tmp = os.path.join("..", "public", "musica", "_anteprima.wav")
scrivi_wav(tmp, tutto)
subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "224k",
                os.path.join("..", "public", "musica", "anteprima.mp3")], check=True)
os.remove(tmp)
