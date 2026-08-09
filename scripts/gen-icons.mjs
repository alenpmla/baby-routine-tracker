import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function renderIcon(size) {
  const bg = [107, 92, 230, 255] // #6b5ce6
  const moon = [255, 255, 255, 255]
  const buf = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const cut = size * 0.14
  const corner = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const cdx = Math.min(x, size - 1 - x)
      const cdy = Math.min(y, size - 1 - y)
      let alpha = 255
      if (cdx < corner && cdy < corner) {
        const d = Math.hypot(corner - cdx, corner - cdy)
        alpha = d > corner ? 0 : 255
      }
      if (alpha === 0) {
        buf[i + 3] = 0
        continue
      }
      const inMoon = Math.hypot(x - cx, y - cy) <= r
      const inCut = Math.hypot(x - cx + cut, y - cy) <= r * 0.92
      const col = inMoon && !inCut ? moon : bg
      buf[i] = col[0]
      buf[i + 1] = col[1]
      buf[i + 2] = col[2]
      buf[i + 3] = alpha
    }
  }
  return buf
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(root, { recursive: true })
for (const size of [192, 512]) {
  const out = join(root, `icon-${size}.png`)
  writeFileSync(out, encodePng(size, size, renderIcon(size)))
  console.log('wrote', out)
}
