'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'
import Link from 'next/link'

export default function SwipeFeed() {
  const [signs, setSigns] = useState<Sign[]>([])
  const [index, setIndex] = useState(0)
  const [showComment, setShowComment] = useState(false)
  const [superLikedId, setSuperLikedId] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadFeed() {
    setLoading(true)
    try {
      const [{ data: popular }, { data: newest }] = await Promise.all([
        supabase.from('signs').select('*').order('like_count', { ascending: false }).limit(30),
        supabase.from('signs').select('*').order('created_at', { ascending: false }).limit(30),
      ])
      const seen = new Set<string>()
      const merged: Sign[] = []
      for (const s of [...(popular ?? []), ...(newest ?? [])]) {
        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
      }
      setSigns(merged.sort(() => Math.random() - 0.5))
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadFeed() }, [])

  const current = signs[index]

  function advance() {
    if (index + 1 >= signs.length) setDone(true)
    else setIndex(i => i + 1)
  }

  async function recordAction(action: 'like' | 'dislike') {
    if (!current) return
    if (action === 'like') await supabase.rpc('increment_like', { sign_id: current.id })
    advance()
  }

  async function handleSuperLike() {
    if (!current) return
    await supabase.rpc('increment_super_like', { sign_id: current.id })
    setSuperLikedId(current.id)
    setShowComment(true)
  }

  function closeCommentSheet() {
    setShowComment(false)
    setSuperLikedId(null)
    advance()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-dvh text-3xl animate-pulse">🪧</div>
  }

  if (done || signs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
        <p className="text-lg font-bold">간판여행을 모두 마쳤습니다…</p>
        <button onClick={() => { setIndex(0); setDone(false); void loadFeed() }} className="px-6 py-2 bg-[#6A7BA2] text-white font-bold text-sm">
          처음부터 다시 볼게요…
        </button>
      </div>
    )
  }

  if (!current) {
    return <div className="flex items-center justify-center min-h-dvh text-3xl animate-pulse">🪧</div>
  }

  return (
    <div className="flex flex-col h-dvh">
      <header className="w-full flex items-center justify-between px-4 py-3 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900">간판을 좋아하세요...</h1>
        <Link
          href="/"
          className="w-9 h-9 bg-gray-100 text-gray-700 text-base flex items-center justify-center font-bold active:scale-95 transition-transform"
          aria-label="인기간판"
        >
          🔍
        </Link>
      </header>

      <div className="relative flex-1 min-h-0">
        <SwipeCard
          key={current.id}
          sign={current}
          onSwipeLeft={() => { void recordAction('dislike') }}
          onSwipeRight={() => { void recordAction('like') }}
        />

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5">
          <ActionButton emoji="✕" color="text-[#E8A0A0] border-[#E8A0A0] bg-black/45 backdrop-blur-sm" onClick={() => { void recordAction('dislike') }} />
          <ActionButton
            emoji="⭐"
            color="text-[#A0B4E8] border-[#A0B4E8] bg-black/45 backdrop-blur-sm"
            onClick={handleSuperLike}
          />
          <ActionButton emoji="♥" color="text-[#A0D4A8] border-[#A0D4A8] bg-black/45 backdrop-blur-sm" onClick={() => { void recordAction('like') }} />
        </div>
      </div>


      {showComment && superLikedId && (
        <CommentSheet signId={superLikedId} onClose={closeCommentSheet} />
      )}
    </div>
  )
}

function SwipeCard({ sign, onSwipeLeft, onSwipeRight }: { sign: Sign; onSwipeLeft: () => void; onSwipeRight: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-20, 20])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const nopeOpacity = useTransform(x, [-120, -30], [1, 0])

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 100) {
      animate(x, 500, { duration: 0.3 }).then(onSwipeRight)
    } else if (info.offset.x < -100) {
      animate(x, -500, { duration: 0.3 }).then(onSwipeLeft)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 })
    }
  }

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} aria-hidden alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-80" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? '간판'} className="absolute inset-0 w-full h-full object-contain" draggable={false} />

      <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 rotate-[-20deg] border-4 border-green-400 text-green-400 font-black text-2xl px-3 py-1 ">
        LIKE
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 rotate-[20deg] border-4 border-red-400 text-red-400 font-black text-2xl px-3 py-1 ">
        NOPE
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5 pb-24">
        {sign.caption && <p className="font-bold text-lg leading-snug">{sign.caption}</p>}
        {sign.location_name && <p className="text-sm text-zinc-300 mt-1">📍 {sign.location_name}</p>}
      </div>
    </motion.div>
  )
}

function ActionButton({ emoji, color, onClick }: { emoji: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-14 h-14 text-2xl border-2 ${color} flex items-center justify-center font-bold transition-transform active:scale-90`}
    >
      {emoji}
    </button>
  )
}
