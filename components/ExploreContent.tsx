'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'
import SignViewer from './SignViewer'
import Link from 'next/link'

export default function ExploreContent() {
  const [signs, setSigns] = useState<Sign[]>([])
  const [loading, setLoading] = useState(true)
  const [commentSign, setCommentSign] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  async function loadFeed() {
    setLoading(true)
    const [{ data: popular }, { data: newest }] = await Promise.all([
      supabase.from('signs').select('*').order('like_count', { ascending: false }).limit(50),
      supabase.from('signs').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    const seen = new Set<string>()
    const merged: Sign[] = []
    for (const s of [...(popular ?? []), ...(newest ?? [])]) {
      if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
    }
    setSigns(merged.sort(() => Math.random() - 0.5))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadFeed() }, [])

  return (
    <div className="pt-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-xl font-black text-white">간판을 좋아하세요...</h1>
        <Link
          href="/explore"
          className="w-9 h-9 bg-zinc-800 text-zinc-200 text-base flex items-center justify-center font-bold active:scale-95 transition-transform"
          aria-label="간판여행"
        >
          🍀
        </Link>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-zinc-500">잠시만 기다려 주세요…</div>
        ) : signs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-600">
            <span className="text-4xl">🪧</span>
            <p className="text-sm">간판이 없어요</p>
          </div>
        ) : (
          <>
            <div className="flex gap-0.5">
              <div className="flex-1 flex flex-col gap-0.5">
                {signs.filter((_, i) => i % 2 === 0).map((sign) => (
                  <SignTile key={sign.id} sign={sign} onOpen={() => setViewerIndex(signs.indexOf(sign))} />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                {signs.filter((_, i) => i % 2 === 1).map((sign) => (
                  <SignTile key={sign.id} sign={sign} onOpen={() => setViewerIndex(signs.indexOf(sign))} />
                ))}
              </div>
            </div>
            <div className="h-12" />
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
    <div className="relative overflow-hidden cursor-pointer" onClick={onOpen}>
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
