'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'
import SignViewer from './SignViewer'
import Link from 'next/link'

const PAGE_SIZE = 20

export default function ExploreContent() {
  const [signs, setSigns] = useState<Sign[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [commentSign, setCommentSign] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef(0)

  const loadMore = useCallback(async (reset = false) => {
    if (!reset && (loading || loadingMore || !hasMore)) return
    if (reset) {
      setLoading(true)
      setHasMore(true)
      pageRef.current = 0
    } else {
      setLoadingMore(true)
    }

    const pageToLoad = reset ? 0 : pageRef.current
    const from = pageToLoad * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data } = await supabase
      .from('signs').select('*')
      .order('like_count', { ascending: false })
      .range(from, to)

    const fetched = data ?? []
    setSigns(prev => {
      if (reset) return fetched
      const seen = new Set(prev.map(sign => sign.id))
      const merged = [...prev]
      for (const sign of fetched) {
        if (!seen.has(sign.id)) merged.push(sign)
      }
      return merged
    })

    if (fetched.length < PAGE_SIZE) setHasMore(false)
    pageRef.current = pageToLoad + 1
    setLoading(false)
    setLoadingMore(false)
  }, [hasMore, loading, loadingMore])

  // eslint-disable-next-line react-hooks/set-state-in-effect,react-hooks/exhaustive-deps
  useEffect(() => { void loadMore(true) }, [])

  useEffect(() => {
    if (!sentinelRef.current || loading) return

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry.isIntersecting) {
        void loadMore()
      }
    }, { rootMargin: '200px 0px' })

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore, loading])

  return (
    <div className="pt-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-xl font-black text-white">간판을 좋아하세요...</h1>
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-200 text-base flex items-center justify-center font-bold active:scale-95 transition-transform"
          aria-label="간판여행"
        >
          🌏
        </Link>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-3xl animate-pulse">🔥</div>
        ) : signs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-600">
            <span className="text-4xl">🪧</span>
            <p className="text-sm">간판이 없어요</p>
          </div>
        ) : (
          <>
            <div className="columns-2 gap-2">
              {signs.map((sign, i) => (
                <SignTile key={sign.id} sign={sign} onOpen={() => setViewerIndex(i)} />
              ))}
            </div>
            <div ref={sentinelRef} className="h-12 flex items-center justify-center">
              {loadingMore && <span className="text-sm text-zinc-400">더 불러오는 중...</span>}
              {!hasMore && <span className="text-xs text-zinc-600">마지막 간판까지 모두 확인했어요...</span>}
            </div>
          </>
        )}
      </div>

      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
      {viewerIndex !== null && (
        <SignViewer signs={signs} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  )
}

function SignTile({ sign, onOpen }: { sign: Sign; onOpen: () => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden cursor-pointer break-inside-avoid mb-2" onClick={onOpen}>
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
