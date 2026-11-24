#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/yiqisuan-assets/approved-app-icon.jpg"
out="$root/public/icons"
mkdir -p "$out"
ffmpeg -hide_banner -loglevel error -y -i "$src" -vf "scale=512:512:flags=lanczos" -frames:v 1 -pix_fmt rgb24 "$out/icon-512.png"
ffmpeg -hide_banner -loglevel error -y -i "$src" -vf "scale=192:192:flags=lanczos" -frames:v 1 -pix_fmt rgb24 "$out/icon-192.png"
ffmpeg -hide_banner -loglevel error -y -i "$src" -vf "scale=180:180:flags=lanczos" -frames:v 1 -pix_fmt rgb24 "$out/apple-touch-icon.png"
ffmpeg -hide_banner -loglevel error -y -i "$src" -vf "scale=32:32:flags=lanczos" -frames:v 1 -pix_fmt rgb24 "$out/favicon-32.png"
python3 - "$out" << 'PY'
from pathlib import Path
import struct, sys, zlib

def recompress(path: Path):
    data = path.read_bytes()
    pos = 8
    chunks = []
    idat = b''
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos+4])[0]
        ctype = data[pos+4:pos+8]
        cdata = data[pos+8:pos+8+length]
        pos += 12 + length
        if ctype == b'IDAT':
            idat += cdata
        else:
            chunks.append((ctype, cdata))
    packed = zlib.compress(zlib.decompress(idat), 9)
    out = bytearray(b'\x89PNG\r\n\x1a\n')
    def add(ctype, cdata):
        out.extend(struct.pack('>I', len(cdata)))
        out.extend(ctype)
        out.extend(cdata)
        out.extend(struct.pack('>I', zlib.crc32(ctype + cdata) & 0xffffffff))
    for ctype, cdata in chunks:
        if ctype == b'IEND':
            add(b'IDAT', packed)
        add(ctype, cdata)
    path.write_bytes(bytes(out))

for png in Path(sys.argv[1]).glob('*.png'):
    recompress(png)
PY
