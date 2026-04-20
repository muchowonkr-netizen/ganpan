'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'

export default function SwipeFeed() {
  const [signs, setSigns] = useState<Sign[]>([])
  const [index, setIndex] = useState(0)
  const [showComment, setShowComment] = useState(false)
  const [superLikedId, setSuperLikedId] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFeed() }, [])

  async function loadFeed() {
    const { data } = await supabase
      .from('signs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setSigns(data ?? [])
    setLoading(false)
  }

  const current = signs[index]

  async function recordAction(action: 'like' | 'dislike' | 'super_like') {
    if (!current) return

    if (action === 'like') {
      await supabase.rpc('increment_like', { sign_id: current.id })
    } else if (action === 'super_like') {
      await supabase.rpc('increment_super_like', { sign_id: current.id })
    }

    if (index + 1 >= signs.length) setDone(true)
    else setIndex(i => i + 1)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-dvh text-3xl animate-pulse">🪧</div>
  }

  if (done || signs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
        <div className="text-5xl">🏁</div>
        <p className="text-lg font-bold">오늘 간판은 다 봤어요!</p>
        <button onClick={() => { setIndex(0); setDone(false) }} className="px-6 py-2 bg-yellow-400 text-black rounded-xl font-bold text-sm">
          처음부터 다시
        </button>
      </div>
    )
  }

  if (!current) {
    return <div className="flex items-center justify-center min-h-dvh text-3xl animate-pulse">🪧</div>
  }

  return (
    <div className="flex flex-col items-center min-h-dvh pt-4 px-4 gap-4">
      <header className="w-full flex items-center justify-between py-2">
        <h1 className="text-xl font-black text-yellow-400">🪧 간판을 좋아하세요...</h1>
      </header>

      <SwipeCard
        key={current.id}
        sign={current}
        onSwipeLeft={() => recordAction('dislike')}
        onSwipeRight={() => recordAction('like')}
      />

      <div className="flex items-center gap-6 py-2">
        <ActionButton emoji="✕" color="text-red-400 border-red-400" onClick={() => recordAction('dislike')} />
        <ActionButton
          emoji="⭐"
          color="text-blue-400 border-blue-400"
          onClick={() => {
            setSuperLikedId(current.id)
            recordAction('super_like')
            setShowComment(true)
          }}
          big
        />
        <ActionButton emoji="♥" color="text-green-400 border-green-400" onClick={() => recordAction('like')} />
      </div>


      {showComment && superLikedId && (
        <CommentSheet signId={superLikedId} onClose={() => { setShowComment(false); setSuperLikedId(null) }} />
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
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? '간판'} className="w-full h-full object-cover" draggable={false} />

      <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 rotate-[-20deg] border-4 border-green-400 text-green-400 font-black text-2xl px-3 py-1 rounded-xl">
        LIKE
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 rotate-[20deg] border-4 border-red-400 text-red-400 font-black text-2xl px-3 py-1 rounded-xl">
        NOPE
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
        {sign.caption && <p className="font-bold text-lg leading-snug">{sign.caption}</p>}
        {sign.location_name && <p className="text-sm text-zinc-300 mt-1">📍 {sign.location_name}</p>}
        <div className="flex gap-3 mt-2 text-xs text-zinc-400">
          <span>♥ {sign.like_count}</span>
          <span>⭐ {sign.super_like_count}</span>
          <span>💬 {sign.comment_count}</span>
        </div>
      </div>
    </motion.div>
  )
}

function ActionButton({ emoji, color, onClick, big }: { emoji: string; color: string; onClick: () => void; big?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${big ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-xl'} rounded-full border-2 ${color} flex items-center justify-center font-bold transition-transform active:scale-90`}
    >
      {emoji}
    </button>
  )
}
