#!/bin/sh
# Records every Lanternreach Radio station to a looping, loudness-matched, tagged MP3.
# Usage: tools/record-radio/record.sh [output dir]   (default: ~/Music/Lanternreach Radio)
# MINUTES=1 for a quick test run. See README.md.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$HOME/Music/Lanternreach Radio}"
WORK="${WORK:-${TMPDIR:-/tmp}/lanternreach-render}"
mkdir -p "$WORK"

[ -d "$HERE/node_modules/playwright-core" ] || (cd "$HERE" && npm install --silent)
if [ ! -x "$HERE/.venv/bin/python" ]; then
  python3 -m venv "$HERE/.venv" && "$HERE/.venv/bin/pip" install -q -r "$HERE/requirements.txt"
fi
# Chromium: $CHROME if set, otherwise the newest one Playwright has downloaded
if [ -z "${CHROME:-}" ]; then
  CHROME="$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -n1 || true)"
  [ -n "$CHROME" ] || { echo "No Chromium found. Run: npx playwright install chromium (or set CHROME)" >&2; exit 1; }
fi
export CHROME

# render every station in parallel, each in its own browser
N=$(grep -c "^  {id:'" "$HERE/../../lanternreach-radio.html")
echo "Rendering $N stations into $WORK (logs: $WORK/render-*.log)"
pids=""; i=0
while [ "$i" -lt "$N" ]; do
  node "$HERE/render.mjs" "$i" "$WORK" > "$WORK/render-$i.log" 2>&1 &
  pids="$pids $!"; i=$((i + 1))
done
fail=0; for p in $pids; do wait "$p" || fail=1; done
[ "$fail" -eq 0 ] || { echo "A render failed; see $WORK/render-*.log" >&2; exit 1; }

"$HERE/.venv/bin/python" "$HERE/encode.py" "$WORK" "$OUT"
rm -f "$WORK"/*.f32 "$WORK"/harness-*.html
