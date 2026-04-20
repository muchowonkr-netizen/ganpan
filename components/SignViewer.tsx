'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'

export default function SignViewer({ signs, startIndex, onClose }: {
  signs: Sign[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [commentSign, setCommentSign] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const current = signs[index]

  async function handleAction(action: 'like' | 'dislike' | 'super_like') {
    if (!current) return
    if (action === 'like') await supabase.rpc('increment_like', { sign_id: current.id })
    else if (action === 'super_like') await supabase.rpc('increment_super_like', { sign_id: current.id })
    if (index + 1 >= signs.length) setDone(true)
    else setIndex(i => i + 1)
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🏁</div>
        <p className="font-bold text-lg">다 봤어요!</p>
        <button onClick={onClose} className="px-6 py-2 bg-yellow-400 text-black rounded-xl font-bold text-sm">닫기</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center px-4 py-3">
        <button onClick={onClose} className="text-zinc-400 text-xl px-1">✕</button>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 gap-4 overflow-hidden">
        {current && (
          <SwipeCard
            key={current.id}
            sign={current}
            onSwipeLeft={() => handleAction('dislike')}
            onSwipeRight={() => handleAction('like')}
          />
        )}

        <div className="flex items-center gap-6 py-2">
          <ActionButton emoji="✕" color="text-red-400 border-red-400" onClick={() => handleAction('dislike')} />
          <ActionButton emoji="⭐" color="text-blue-400 border-blue-400" big onClick={() => {
            if (!current) return
            setCommentSign(current.id)
            handleAction('super_like')
          }} />
          <ActionButton emoji="♥" color="text-green-400 border-green-400" onClick={() => handleAction('like')} />
        </div>
      </div>

      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
    </div>
  )
}

function SwipeCard({ sign, onSwipeLeft, onSwipeRight }: { sign: Sign; onSwipeLeft: () => void; onSwipeRight: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-20, 20])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const nopeOpacity = useTransform(x, [-120, -30], [1, 0])

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 100) animate(x, 500, { duration: 0.3 }).then(onSwipeRight)
    else if (info.offset.x < -100) animate(x, -500, { duration: 0.3 }).then(onSwipeLeft)
    else animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 })
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
    <button onClick={onClick}
      className={`${big ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-xl'} rounded-full border-2 ${color} flex items-center justify-center font-bold transition-transform active:scale-90`}>
      {emoji}
    </button>
  )
}
