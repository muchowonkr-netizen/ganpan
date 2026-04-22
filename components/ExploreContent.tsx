'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'
import SignViewer from './SignViewer'
import Link from 'next/link'

const BATCH_SIZE = 20

const HALF_ASPECTS = ['aspect-[4/3]', 'aspect-square', 'aspect-[3/4]', 'aspect-[2/3]'] as const
type HalfAspect = typeof HALF_ASPECTS[number]

type LayoutRow =
  | { type: 'full'; sign: Sign }
  | { type: 'half'; left: Sign; right: Sign; aspect: HalfAspect }

function buildLayout(signs: Sign[]): LayoutRow[] {
  const rows: LayoutRow[] = []
  let i = 0
  while (i < signs.length) {
    const remaining = signs.length - i
    if (remaining === 1 || Math.random() < 0.3) {
      rows.push({ type: 'full', sign: signs[i] })
      i++
    } else {
      const aspect = HALF_ASPECTS[Math.floor(Math.random() * HALF_ASPECTS.length)]
      rows.push({ type: 'half', left: signs[i], right: signs[i + 1], aspect })
      i += 2
    }
  }
  return rows
}

export default function ExploreContent() {
  const [allSigns, setAllSigns] = useState<Sign[]>([])
  const [layout, setLayout] = useState<LayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [allLoaded, setAllLoaded] = useState(false)
  const [commentSign, setCommentSign] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const renderedCountRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const allSignsRef = useRef<Sign[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)

  async function loadFeed() {
    setLoading(true)
    const { data } = await supabase
      .from('signs').select('*')
      .order('like_count', { ascending: false })
    const fetched = data ?? []
    const now = Date.now()
    const scored = fetched
      .map(s => {
        const daysSince = (now - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)
        const recencyBonus = Math.max(0, 7 - daysSince) * 3
        return { s, score: s.like_count + s.comment_count * 2 + recencyBonus + Math.random() * 10 }
      })
      .sort((a, b) => b.score - a.score)
      .map(({ s }) => s)
    allSignsRef.current = scored
    setAllSigns(scored)
    renderedCountRef.current = 0

    const firstBatch = scored.slice(0, BATCH_SIZE)
    renderedCountRef.current = firstBatch.length
    setLayout(buildLayout(firstBatch))
    setAllLoaded(firstBatch.length >= scored.length)
    setLoading(false)
  }

  async function loadMore() {
    if (loadingMoreRef.current) return
    const all = allSignsRef.current
    const count = renderedCountRef.current
    if (count >= all.length) return
    loadingMoreRef.current = true
    const batch = all.slice(count, count + BATCH_SIZE)
    const newCount = count + batch.length
    renderedCountRef.current = newCount
    setLayout(prev => [...prev, ...buildLayout(batch)])
    setAllLoaded(newCount >= all.length)
    loadingMoreRef.current = false
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadFeed() }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) void loadMore() },
      { rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading])

  function openSign(sign: Sign) {
    setViewerIndex(allSigns.findIndex(s => s.id === sign.id))
  }

  return (
    <div className="pt-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-xl font-light text-gray-900">간판을 좋아하세요...</h1>
        <Link
          href="/explore"
          className="w-12 h-12 bg-white text-black text-xl flex items-center justify-center font-bold border border-black active:scale-95 transition-transform"
          aria-label="간판여행"
        >
          🍀
        </Link>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-zinc-500">잠시만 기다려 주세요…</div>
        ) : layout.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-600">
            <span className="text-4xl">🪧</span>
            <p className="text-sm">간판이 없어요</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-0.5 animate-fade-in-up">
              {layout.map((row) =>
                row.type === 'full' ? (
                  <SignTile key={row.sign.id} sign={row.sign} onOpen={() => openSign(row.sign)} />
                ) : (
                  <div key={`${row.left.id}-${row.right.id}`} className="flex gap-0.5">
                    <div className="flex-1 min-w-0">
                      <SignTile sign={row.left} onOpen={() => openSign(row.left)} aspect={row.aspect} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SignTile sign={row.right} onOpen={() => openSign(row.right)} aspect={row.aspect} />
                    </div>
                  </div>
                )
              )}
            </div>
            <div ref={sentinelRef} className="h-4" />
            {allLoaded && (
              <p className="text-center text-xs text-zinc-400 py-6">마지막 간판까지 확인했어요…</p>
            )}
          </>
        )}
      </div>

      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
      {viewerIndex !== null && (
        <SignViewer signs={allSigns} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  )
}

function SignTile({ sign, onOpen, aspect }: { sign: Sign; onOpen: () => void; aspect?: string }) {
  return (
    <div
      className={`relative overflow-hidden cursor-pointer border border-black bg-gray-100 ${aspect ?? ''}`}
      onClick={onOpen}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sign.image_url}
        alt={sign.caption ?? ''}
        className={aspect ? 'absolute inset-0 w-full h-full object-contain' : 'w-full h-auto block'}
      />
      {sign.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-xs text-white font-bold truncate">{sign.caption}</p>
        </div>
      )}
    </div>
  )
}
