'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'
import SignViewer from './SignViewer'
import Link from 'next/link'

const BATCH_SIZE = 20

type Block =
  | { type: 'full'; sign: Sign }
  | { type: 'masonry'; left: Sign[]; right: Sign[] }

function buildBlocks(signs: Sign[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < signs.length) {
    const remaining = signs.length - i
    if (remaining === 1 || Math.random() < 0.3) {
      blocks.push({ type: 'full', sign: signs[i++] })
    } else {
      const maxPairs = 1 + Math.floor(Math.random() * 3)
      const left: Sign[] = []
      const right: Sign[] = []
      let pairs = 0
      while (pairs < maxPairs && i < signs.length) {
        left.push(signs[i++])
        if (i < signs.length) right.push(signs[i++])
        pairs++
      }
      blocks.push({ type: 'masonry', left, right })
    }
  }
  return blocks
}

export default function ExploreContent() {
  const [allSigns, setAllSigns] = useState<Sign[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
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
    setBlocks(buildBlocks(firstBatch))
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
    setBlocks(prev => [...prev, ...buildBlocks(batch)])
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
        ) : blocks.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-600">
            <span className="text-4xl">🪧</span>
            <p className="text-sm">간판이 없어요</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-0.5 animate-fade-in-up">
              {blocks.map((block, idx) =>
                block.type === 'full' ? (
                  <SignTile key={block.sign.id} sign={block.sign} onOpen={() => openSign(block.sign)} />
                ) : (
                  <div key={idx} className="flex gap-0.5">
                    <div className="flex-1 flex flex-col gap-0.5">
                      {block.left.map(s => <SignTile key={s.id} sign={s} onOpen={() => openSign(s)} />)}
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5">
                      {block.right.map(s => <SignTile key={s.id} sign={s} onOpen={() => openSign(s)} />)}
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

function SignTile({ sign, onOpen }: { sign: Sign; onOpen: () => void }) {
  return (
    <div className="relative overflow-hidden cursor-pointer border border-black bg-gray-100" onClick={onOpen}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? ''} className="w-full h-auto block" />
      {sign.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-xs text-white font-bold truncate">{sign.caption}</p>
        </div>
      )}
    </div>
  )
}
