'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'

type FeedCandidate = Sign & { recommendation_score?: number }

export default function SwipeFeed() {
  const [signs, setSigns] = useState<FeedCandidate[]>([])
  const [index, setIndex] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [showComment, setShowComment] = useState(false)
  const [superLikedId, setSuperLikedId] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const loadFeed = async (currentUserId: string | null) => {
    const seenIds: string[] = []
    const likedIds: string[] = []

    if (currentUserId) {
      const { data: seen } = await supabase
        .from('user_sign_actions')
        .select('sign_id')
        .eq('user_id', currentUserId)
      seenIds.push(...new Set(seen?.map(s => s.sign_id) ?? []))

      const { data: myLikes } = await supabase
        .from('user_sign_actions')
        .select('sign_id')
        .eq('user_id', currentUserId)
        .in('action', ['like', 'super_like'])
      likedIds.push(...new Set(myLikes?.map(row => row.sign_id) ?? []))
    }

    const recommendedPool = new Map<string, number>()

    if (currentUserId && likedIds.length > 0) {
      const { data: similarActions } = await supabase
        .from('user_sign_actions')
        .select('user_id, sign_id, action')
        .in('sign_id', likedIds)
        .in('action', ['like', 'super_like'])
        .neq('user_id', currentUserId)

      const affinityByUser = new Map<string, number>()
      similarActions?.forEach(row => {
        const weight = row.action === 'super_like' ? 2 : 1
        affinityByUser.set(row.user_id, (affinityByUser.get(row.user_id) ?? 0) + weight)
      })

      const similarUserIds = [...affinityByUser.keys()]
      if (similarUserIds.length > 0) {
        const { data: neighborActions } = await supabase
          .from('user_sign_actions')
          .select('user_id, sign_id, action')
          .in('user_id', similarUserIds)
          .in('action', ['like', 'super_like'])

        neighborActions?.forEach(row => {
          if (seenIds.includes(row.sign_id)) return
          if (likedIds.includes(row.sign_id)) return
          const affinity = affinityByUser.get(row.user_id) ?? 0
          const actionWeight = row.action === 'super_like' ? 2 : 1
          const score = affinity * actionWeight
          recommendedPool.set(row.sign_id, (recommendedPool.get(row.sign_id) ?? 0) + score)
        })
      }
    }

    const rankedIds = [...recommendedPool.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 40)

    const merged: FeedCandidate[] = []

    if (rankedIds.length > 0) {
      const { data: recSigns } = await supabase.from('signs').select('*').in('id', rankedIds)
      const signMap = new Map((recSigns ?? []).map(sign => [sign.id, sign]))
      rankedIds.forEach(id => {
        const sign = signMap.get(id)
        if (!sign) return
        merged.push({ ...sign, recommendation_score: recommendedPool.get(id) ?? 0 })
      })
    }

    let fallbackQuery = supabase
      .from('signs')
      .select('*')
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (seenIds.length > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${seenIds.join(',')})`)
    }

    const { data: fallback } = await fallbackQuery

    const mergedIds = new Set(merged.map(sign => sign.id))
    ;(fallback ?? []).forEach(sign => {
      if (!mergedIds.has(sign.id)) merged.push(sign)
    })

    setSigns(merged)
    setIndex(0)
    setDone(merged.length === 0)
  }

  useEffect(() => {
    async function bootstrap() {
      const { data } = await supabase.auth.getUser()
      const id = data.user?.id ?? null
      setUserId(id)
      await loadFeed(id)
    }

    void bootstrap()
  }, [])

  async function recordAction(action: 'like' | 'dislike' | 'super_like') {
    if (!current) return

    if (userId) {
      await supabase.from('user_sign_actions').upsert({
        user_id: userId,
        sign_id: current.id,
        action,
      })
    }

    if (index + 1 >= signs.length) setDone(true)
    else setIndex(i => i + 1)
  }

  const current = signs[index]

  if (done || signs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
        <div className="text-5xl">🏁</div>
        <p className="text-lg font-bold">오늘 간판은 다 봤어요!</p>
        <p className="text-sm text-zinc-400">새 간판이 올라오면 알려드릴게요</p>
      </div>
    )
  }

  if (!current) {
    return <div className="flex items-center justify-center min-h-dvh text-3xl animate-pulse">🪧</div>
  }

  return (
    <div className="flex flex-col items-center min-h-dvh pt-4 px-4 gap-4">
      <header className="w-full flex items-center justify-between py-2">
        <h1 className="text-xl font-black text-yellow-400">🪧 간판왕</h1>
        <span className="text-xs text-zinc-500">{index + 1} / {signs.length}</span>
      </header>

      <SwipeCard
        sign={current}
        onSwipeLeft={() => recordAction('dislike')}
        onSwipeRight={() => recordAction('like')}
      />

      <div className="flex items-center gap-6 py-2">
        <ActionButton emoji="✕" color="text-red-400 border-red-400" onClick={() => recordAction('dislike')} />
        <ActionButton
          emoji="⭐"
          color="text-blue-400 border-blue-400"
          onClick={async () => {
            if (!userId) {
              router.push('/login')
              return
            }
            setSuperLikedId(current.id)
            await recordAction('super_like')
            setShowComment(true)
          }}
          big
        />
        <ActionButton emoji="♥" color="text-green-400 border-green-400" onClick={() => recordAction('like')} />
      </div>

      <p className="text-xs text-zinc-500">← 패스 &nbsp;|&nbsp; ⭐ 슈퍼라이크(댓글) &nbsp;|&nbsp; → 좋아요</p>
      {!userId && (
        <button
          onClick={() => router.push('/login')}
          className="text-xs text-yellow-300 underline underline-offset-4"
        >
          로그인하면 좋아요 저장/슈퍼라이크 댓글 기능을 사용할 수 있어요
        </button>
      )}

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
