'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'
import SignViewer from './SignViewer'
import Link from 'next/link'

function weightedShuffle(signs: Sign[]): Sign[] {
  // 인기순 가중치: 상위권일수록 앞에 나올 확률이 높지만 완전 고정은 아님
  return [...signs].sort(() => Math.random() - 0.45)
}

export default function ExploreContent() {
  const [pool, setPool] = useState<Sign[]>([])
  const [displayed, setDisplayed] = useState<Sign[]>([])
  const [loading, setLoading] = useState(true)
  const [commentSign, setCommentSign] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('signs').select('*')
      .order('like_count', { ascending: false })
      .limit(120)
    const fetched = data ?? []
    setPool(fetched)
    setDisplayed(weightedShuffle(fetched))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [])

  const shuffle = useCallback(() => {
    setDisplayed(weightedShuffle(pool))
  }, [pool])

  return (
    <div className="pt-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-xl font-black text-yellow-400">🔥 인기간판</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={shuffle}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-sm font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            🔀 섞기
          </button>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 text-sm font-bold active:scale-95 transition-transform"
          >
            간판여행
          </Link>
        </div>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-3xl animate-pulse">🔥</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-600">
            <span className="text-4xl">🪧</span>
            <p className="text-sm">간판이 없어요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {displayed.map((sign, i) => (
              <SignTile key={sign.id} sign={sign} onComment={setCommentSign} onOpen={() => setViewerIndex(i)} />
            ))}
          </div>
        )}
      </div>

      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
      {viewerIndex !== null && (
        <SignViewer signs={displayed} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  )
}

function SignTile({ sign, onComment, onOpen }: { sign: Sign; onComment: (id: string) => void; onOpen: () => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden aspect-square bg-zinc-900 cursor-pointer" onClick={onOpen}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? ''} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        {sign.caption && <p className="text-xs text-white font-bold truncate mb-1">{sign.caption}</p>}
        <div className="flex items-center gap-2 text-xs text-white">
          <span className="ml-auto">♥ {sign.like_count}</span>
          <button onClick={e => { e.stopPropagation(); onComment(sign.id) }}>💬 {sign.comment_count}</button>
        </div>
      </div>
    </div>
  )
}
