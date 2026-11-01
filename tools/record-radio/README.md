# Record Lanternreach Radio

Records every station in `lanternreach-radio.html` to an hour-long MP3 that loops cleanly,
for hosting somewhere a speaker or Chromecast can fetch it (see
`docs/radio-on-google-devices.md`, option 2).

```sh
tools/record-radio/record.sh                    # writes to ~/Music/Lanternreach Radio
tools/record-radio/record.sh ~/somewhere/else   # or a folder of your choice
MINUTES=1 tools/record-radio/record.sh /tmp/t   # quick one-minute test run
```

The first run sets up its own dependencies in this folder (`npm install` for playwright-core,
and a Python venv with lameenc and numpy). It needs Node, Python 3 and a Chromium that
Playwright has downloaded (`npx playwright install chromium`), or set `CHROME` to a Chrome or
Chromium binary.

A full run takes about 15 minutes on a multi-core machine and needs roughly 1.3 GB of scratch
space per station while rendering (in `$WORK`, default `/tmp/lanternreach-render`). That space
is freed when it finishes.

## What it does

1. **Render** (`render.mjs`, `harness.js`). The music theory, instruments and `STATIONS` are
   copied straight out of `lanternreach-radio.html`, so the recordings use the same code as the
   radio page and pick up any changes to it. Each station renders in headless Chromium with an
   `OfflineAudioContext`, faster than real time, in 128-second chunks.
   - Randomness is seeded per bar, so each chunk starts 64 s early and regenerates exactly the
     notes still sounding from earlier bars. Chunks join with no audible seam.
   - Chunk starts are multiples of 32 s, which puts every chunk on a 128-frame render-quantum
     boundary. Without that, Chromium renders swept-pitch automation (Deep Orbit's thump)
     slightly differently in each chunk and the joins click.
2. **Encode** (`encode.py`). Each station is cut to exactly `MINUTES` long, the 16 s it renders
   past the end is crossfaded over the opening so the file loops seamlessly, loudness is matched
   across stations (−20 dBFS RMS, peaks held under −1 dBFS), and it is encoded to 128 kbps
   stereo MP3 with ID3 tags (title, album, track number, genre, and the station's key and
   description as a comment).

An hour at 128 kbps is about 57.6 MB, so all six stations come to about 345 MB.
