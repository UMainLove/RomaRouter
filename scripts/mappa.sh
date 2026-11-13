#!/usr/bin/env bash
# Costruisce la mappa dei quartieri (fork di urbe-hub/quartieri-roma-2026 con le modifiche
# di RomaRouter, vedi docs/MAPPA.md) dentro public/quartieri.
# Uso: scripts/mappa.sh <cartella del fork>
set -euo pipefail

FORK="${1:?Indica la cartella del fork di quartieri-roma-2026}"
QUI="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$QUI/public/quartieri"

if [ ! -f "$FORK/romarouter/incorporata.js" ]; then
  echo "Nel fork mancano le modifiche di RomaRouter: applica docs/mappa/quartieri-romarouter.patch (git am)." >&2
  exit 1
fi

# la cartella e' solo output del build: si rifa' da zero
rm -rf "$DEST"
( cd "$FORK" && MAPPA_DIST="$DEST" MAPPA_STATISTICHE_ID= MAPPA_MARCHIO=0 python3 build.py )
rm -f "$DEST/vercel.json"
cp "$FORK/LICENSE" "$DEST/LICENSE-quartieri-roma-2026.txt"
cp "$FORK/THIRD_PARTY.md" "$DEST/THIRD_PARTY.md"
echo "Mappa pronta in public/quartieri ($(du -sh "$DEST" | cut -f1))."
