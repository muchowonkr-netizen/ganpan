import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('필요한 환경 변수가 없습니다:')
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// JPEG SOF marker는 보통 첫 64KB 안에 있음. 더 큰 이미지를 만나면 자동 확장.
const INITIAL_RANGE = 64 * 1024
const MAX_RANGE = 1024 * 1024

function parseImageDimensions(buf: Uint8Array): { width: number; height: number } | null {
  // JPEG: starts with FF D8
  if (buf[0] === 0xff && buf[1] === 0xd8) return parseJpeg(buf)
  // PNG: 89 50 4E 47 0D 0A 1A 0A, IHDR at offset 16 (width@16, height@20, big-endian)
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    if (buf.length < 24) return null
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    return { width: dv.getUint32(16), height: dv.getUint32(20) }
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return parseWebp(buf)
  }
  return null
}

function parseJpeg(buf: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let i = 2
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) return null
    // Skip fill bytes
    while (buf[i] === 0xff && i < buf.length) i++
    const marker = buf[i]
    i++
    // Markers without payload
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue
    if (i + 1 >= buf.length) return null
    const len = dv.getUint16(i)
    // SOF markers: C0..CF except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (i + 7 >= buf.length) return null
      const height = dv.getUint16(i + 3)
      const width = dv.getUint16(i + 5)
      return { width, height }
    }
    i += len
  }
  return null
}

function parseWebp(buf: Uint8Array): { width: number; height: number } | null {
  // VP8 / VP8L / VP8X chunks
  const chunkType = String.fromCharCode(buf[12], buf[13], buf[14], buf[15])
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (chunkType === 'VP8 ') {
    if (buf.length < 30) return null
    const width = dv.getUint16(26, true) & 0x3fff
    const height = dv.getUint16(28, true) & 0x3fff
    return { width, height }
  }
  if (chunkType === 'VP8L') {
    if (buf.length < 25) return null
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24]
    const width = 1 + (((b1 & 0x3f) << 8) | b0)
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    return { width, height }
  }
  if (chunkType === 'VP8X') {
    if (buf.length < 30) return null
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16))
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
    return { width, height }
  }
  return null
}

async function fetchHeaderBytes(url: string, end: number): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { Range: `bytes=0-${end}` } })
    if (!res.ok && res.status !== 206) return null
    const ab = await res.arrayBuffer()
    return new Uint8Array(ab)
  } catch {
    return null
  }
}

async function getAspectRatio(url: string): Promise<number | null> {
  let buf = await fetchHeaderBytes(url, INITIAL_RANGE - 1)
  if (!buf) return null
  let dim = parseImageDimensions(buf)
  if (!dim && buf.length >= INITIAL_RANGE) {
    // SOF marker가 더 뒤에 있을 수 있음 — 한 번 더 확장
    buf = await fetchHeaderBytes(url, MAX_RANGE - 1)
    if (!buf) return null
    dim = parseImageDimensions(buf)
  }
  if (!dim || dim.width <= 0) return null
  return dim.height / dim.width
}

async function main() {
  const { data: signs, error } = await supabase
    .from('signs')
    .select('id, image_url')
    .is('aspect_ratio', null)
    .order('created_at', { ascending: false })

  if (error) { console.error('Supabase 오류:', error.message); process.exit(1) }
  if (!signs || signs.length === 0) { console.log('백필할 간판이 없습니다.'); return }

  console.log(`aspect_ratio 없는 간판 ${signs.length}개 처리 시작...\n`)

  let ok = 0, fail = 0

  for (let i = 0; i < signs.length; i++) {
    const sign = signs[i]
    process.stdout.write(`[${i + 1}/${signs.length}] ${sign.id} ... `)

    try {
      const ratio = await getAspectRatio(sign.image_url)
      if (ratio === null) { console.log('✗ 측정 실패'); fail++; continue }
      const { error: upErr } = await supabase
        .from('signs')
        .update({ aspect_ratio: ratio })
        .eq('id', sign.id)
      if (upErr) throw upErr
      console.log(`✓ ${ratio.toFixed(3)}`)
      ok++
    } catch (e) {
      console.log(`✗ 실패: ${e}`)
      fail++
    }
  }

  console.log(`\n완료: 저장 ${ok}개 / 실패 ${fail}개`)
}

main()
