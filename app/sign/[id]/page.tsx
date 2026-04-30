import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Sign } from '@/types'

export const revalidate = 300

const SITE_NAME = '간판을 좋아하세요...'

const getSign = cache(async (id: string): Promise<Sign | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase
      .from('signs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return null
    return data as Sign
  } catch {
    return null
  }
})

function buildTitle(sign: Sign): string {
  const parts = [sign.caption?.trim(), sign.location_name?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '간판 사진'
}

function buildDescription(sign: Sign): string {
  const lead = sign.caption?.trim() || sign.location_name?.trim() || '거리에서 만난 간판 사진'
  return `${lead} — ${SITE_NAME}에서 함께 감상해 보세요. ♥ ${sign.like_count.toLocaleString()} · 💬 ${sign.comment_count.toLocaleString()}`
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const sign = await getSign(id)
  if (!sign) {
    return { title: '간판을 찾을 수 없어요', robots: { index: false, follow: false } }
  }
  const title = buildTitle(sign)
  const description = buildDescription(sign)
  const path = `/sign/${sign.id}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title,
      description,
      url: path,
      images: [{ url: sign.image_url, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [sign.image_url],
    },
  }
}

export default async function SignPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sign = await getSign(id)
  if (!sign) notFound()

  const title = buildTitle(sign)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: sign.image_url,
    url: `/sign/${sign.id}`,
    name: title,
    caption: sign.caption ?? undefined,
    contentLocation: sign.location_name ?? undefined,
    uploadDate: sign.created_at,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: sign.like_count,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: sign.comment_count,
      },
    ],
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: '/' },
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="px-4 py-3 border-b border-black/10">
        <Link href="/" className="text-sm text-gray-700 active:opacity-60">← 모든 간판</Link>
      </header>

      <article className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        <h1 className="text-xl font-light">{title}</h1>

        <figure className="border border-black bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sign.image_url}
            alt={title}
            className="w-full h-auto block"
            loading="eager"
            decoding="async"
          />
        </figure>
      </article>
    </main>
  )
}
