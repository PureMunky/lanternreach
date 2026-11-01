"""Turn rendered stations (rec/<id>.f32) into loopable, loudness-matched, tagged MP3s.

Each .f32 holds MINUTES + 16 s of interleaved stereo float32 at 44.1 kHz. The extra 16 s is
crossfaded over the opening so the file loops without a seam.

Usage: python encode.py <work dir> <output dir>
"""
import math, os, re, struct, sys
import numpy as np
import lameenc

SR, XF = 44100, 16
MIN = float(os.environ.get('MINUTES', 60))
RMS_DB, PEAK_DB = -20.0, -1.0
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../lanternreach-radio.html')


def stations():
    src = open(SRC).read()
    ids = re.findall(r"\{id:'([^']+)',freq:'([^']+)',band:'[^']+',name:'([^']+)',color:'[^']+',meta:'([^']+)',\s*desc:'([^']+)'", src)
    return [dict(id=i, freq=f, name=n, meta=m, desc=d) for i, f, n, m, d in ids]


def id3(tags):
    """Minimal ID3v2.4 tag with UTF-8 text frames."""
    def syncsafe(n):
        return bytes([(n >> 21) & 0x7F, (n >> 14) & 0x7F, (n >> 7) & 0x7F, n & 0x7F])
    body = b''
    for fid, text in tags:
        data = b'\x03' + (b'eng\x00' if fid == 'COMM' else b'') + text.encode('utf-8')
        body += fid.encode() + syncsafe(len(data)) + b'\x00\x00' + data
    return b'ID3\x04\x00\x00' + syncsafe(len(body)) + body


def encode(st, n, total, work, out_dir):
    raw = np.fromfile(os.path.join(work, f"{st['id']}.f32"), dtype='<f4').reshape(-1, 2).astype(np.float64)
    N, X = int(MIN * 60 * SR), XF * SR
    assert len(raw) >= N + X, f"{st['id']}: only {len(raw) / SR:.1f}s rendered"
    out = raw[:N].copy()
    t = np.linspace(0, 1, X)[:, None]
    out[:X] = raw[:X] * np.sin(t * math.pi / 2) + raw[N:N + X] * np.cos(t * math.pi / 2)
    rms, peak = math.sqrt(np.mean(out ** 2)), np.max(np.abs(out))
    gain = min(10 ** (RMS_DB / 20) / rms, 10 ** (PEAK_DB / 20) / peak)
    dither = (np.random.random(out.shape) - np.random.random(out.shape)) / 32768
    pcm = np.clip(np.round((out * gain + dither) * 32767), -32768, 32767).astype('<i2')

    enc = lameenc.Encoder()
    enc.set_bit_rate(128); enc.set_in_sample_rate(SR); enc.set_channels(2); enc.set_quality(2)
    path = os.path.join(out_dir, f"{n:02d} {st['name']}.mp3")
    with open(path, 'wb') as f:
        f.write(id3([('TIT2', st['name']), ('TPE1', 'Lanternreach Radio'), ('TALB', 'Lanternreach Radio'),
                     ('TRCK', f'{n}/{total}'), ('TCON', 'Ambient'), ('TDRC', '2026'),
                     ('COMM', f"{st['freq']} · {st['meta']}. {st['desc']}")]))
        block = SR * 30
        for i in range(0, len(pcm), block):
            f.write(enc.encode(pcm[i:i + block].tobytes()))
        f.write(enc.flush())
    final_rms = 20 * math.log10(rms * gain)
    print(f"{path}: gain {20 * math.log10(gain):+.1f} dB, rms {final_rms:.1f} dBFS, "
          f"peak {20 * math.log10(peak * gain):.1f} dBFS, {os.path.getsize(path) / 1e6:.1f} MB")


if __name__ == '__main__':
    work, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    sts = stations()
    assert sts, 'no stations found in lanternreach-radio.html'
    for n, st in enumerate(sts, 1):
        encode(st, n, len(sts), work, out_dir)
