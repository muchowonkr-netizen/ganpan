'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'

export default function ExploreContent() {
  const [signs, setSigns] = useState<Sign[]>([])
  const [loading, setLoading] = useState(true)
  const [commentSign, setCommentSign] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('signs').select('*').order('like_count', { ascending: false }).limit(40)
    setSigns(data ?? [])
    setLoading(false)
  }

  return (
    <div className="pt-4">
      <div className="px-4 mb-3">
        <h1 className="text-xl font-black text-yellow-400">🔥 인기 간판</h1>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-3xl animate-pulse">🔥</div>
        ) : signs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-600">
            <span className="text-4xl">🪧</span>
            <p className="text-sm">이 지역 간판이 아직 없어요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {signs.map((sign, i) => (
              <SignTile key={sign.id} sign={sign} rank={region === '전체' ? i + 1 : undefined} onComment={setCommentSign} />
            ))}
          </div>
        )}
      </div>

      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
    </div>
  )
}

function SignTile({ sign, rank, onComment }: { sign: Sign; rank?: number; onComment: (id: string) => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden aspect-square bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? ''} className="w-full h-full object-cover" />
      {rank && rank <= 3 && (
        <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full">
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        {sign.caption && <p className="text-xs text-white font-bold truncate mb-1">{sign.caption}</p>}
        <div className="flex items-center gap-2 text-xs text-white">
          {sign.location_name && <span className="text-zinc-300 truncate max-w-[55%]">📍 {sign.location_name}</span>}
          <span className="ml-auto">♥ {sign.like_count}</span>
          <button onClick={() => onComment(sign.id)}>💬 {sign.comment_count}</button>
        </div>
      </div>
    </div>
  )
}
