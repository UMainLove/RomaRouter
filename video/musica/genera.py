"""Rigenera tutta la musica (cue A, B, C, effetti, anteprima) e stampa le misure. Da video/musica: python genera.py"""
import subprocess
import sys

for script in ("cue_a.py", "cue_b.py", "cue_c.py", "effetti.py", "anteprima.py"):
    subprocess.run([sys.executable, script], check=True)
subprocess.run([sys.executable, "verifica.py", "../public/musica/cue-a.wav", "../public/musica/cue-b.wav",
                "../public/musica/cue-c.wav"], check=True)
