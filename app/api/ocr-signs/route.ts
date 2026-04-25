import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: signs } = await supabase
    .from('signs')
    .select('id, image_url')
    .is('caption', null)
    .order('created_at', { ascending: false })

  const list = signs ?? []

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      for (let i = 0; i < list.length; i++) {
        const sign = list[i]
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
            await supabase.from('signs').update({ caption }).eq('id', sign.id)
          }

          send({ done: i + 1, total: list.length, id: sign.id, caption: caption || null })
        } catch {
          send({ done: i + 1, total: list.length, id: sign.id, caption: null, error: true })
        }
      }

      send({ complete: true, total: list.length })
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  })
}
