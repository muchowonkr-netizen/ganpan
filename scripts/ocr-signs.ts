import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_API_KEY) {
  console.error('필요한 환경 변수가 없습니다:')
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  if (!ANTHROPIC_API_KEY) console.error('  - ANTHROPIC_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

async function main() {
  const { data: signs, error } = await supabase
    .from('signs')
    .select('id, image_url')
    .is('caption', null)
    .order('created_at', { ascending: false })

  if (error) { console.error('Supabase 오류:', error.message); process.exit(1) }
  if (!signs || signs.length === 0) { console.log('처리할 간판이 없습니다.'); return }

  console.log(`caption 없는 간판 ${signs.length}개 처리 시작...\n`)

  let ok = 0, skip = 0, fail = 0

  for (let i = 0; i < signs.length; i++) {
    const sign = signs[i]
    process.stdout.write(`[${i + 1}/${signs.length}] ${sign.id} ... `)

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: sign.image_url } },
            {
              type: 'text',
              text: '이 간판 이미지에서 상호명이나 주요 텍스트를 읽어주세요. 간판에 적힌 텍스트(가게 이름, 상호명 등)만 간결하게 추출하세요. 텍스트가 없으면 빈 문자열로만 응답하세요.',
            }
          ]
        }]
      })

      const caption = response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : ''

      if (caption) {
        const { error: upErr } = await supabase.from('signs').update({ caption }).eq('id', sign.id)
        if (upErr) throw upErr
        console.log(`✓ "${caption}"`)
        ok++
      } else {
        console.log('(텍스트 없음)')
        skip++
      }
    } catch (e) {
      console.log(`✗ 실패: ${e}`)
      fail++
    }

    // Rate limit 방지
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n완료: 저장 ${ok}개 / 스킵 ${skip}개 / 실패 ${fail}개`)
}

main()
