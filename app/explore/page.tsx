'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from '@/components/CommentSheet'
import MainLayout from '@/components/MainLayout'

export default function ExplorePage() {
  return (
    <MainLayout>
      <ExploreContent />
    </MainLayout>
  )
}

function ExploreContent() {
  const [trending, setTrending] = useState<Sign[]>([])
  const [recommended, setRecommended] = useState<Sign[]>([])
  const [loading, setLoading] = useState(true)
  const [commentSign, setCommentSign] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: hot } = await supabase
      .from('signs').select('*')
      .gte('created_at', sevenDaysAgo)
      .order('like_count', { ascending: false }).limit(20)
    setTrending(hot ?? [])

    if (user) {
      const { data: myLikes } = await supabase
        .from('user_sign_actions').select('sign_id')
        .eq('user_id', user.id).in('action', ['like', 'super_like'])

      const myLikedIds = myLikes?.map((l: { sign_id: string }) => l.sign_id) ?? []

      if (myLikedIds.length > 0) {
        const { data: similarUsers } = await supabase
          .from('user_sign_actions').select('user_id')
          .in('sign_id', myLikedIds).in('action', ['like', 'super_like'])
          .neq('user_id', user.id)

        const similarUserIds = [...new Set(similarUsers?.map((u: { user_id: string }) => u.user_id) ?? [])]

        if (similarUserIds.length > 0) {
          const { data: recSigns } = await supabase
            .from('user_sign_actions').select('sign_id')
            .in('user_id', similarUserIds).in('action', ['like', 'super_like'])
            .not('sign_id', 'in', `(${myLikedIds.join(',')})`)

          const recIds = [...new Set(recSigns?.map((s: { sign_id: string }) => s.sign_id) ?? [])].slice(0, 20)
          if (recIds.length > 0) {
            const { data: recData } = await supabase.from('signs').select('*').in('id', recIds)
            setRecommended(recData ?? [])
          }
        }
      }
    }
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60dvh] text-3xl animate-pulse">🔥</div>

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-black text-yellow-400 mb-4">🔥 탐색</h1>
      <Section title="인기 급상승" signs={trending} onComment={setCommentSign} />
      {recommended.length > 0 && <Section title="나를 위한 추천" signs={recommended} onComment={setCommentSign} />}
      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
    </div>
  )
}

function Section({ title, signs, onComment }: { title: string; signs: Sign[]; onComment: (id: string) => void }) {
  return (
    <section className="mb-6">
      <h2 className="font-bold text-sm text-zinc-400 mb-3">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {signs.map(sign => <SignTile key={sign.id} sign={sign} onComment={onComment} />)}
      </div>
    </section>
  )
}

function SignTile({ sign, onComment }: { sign: Sign; onComment: (id: string) => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden aspect-square bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? ''} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex gap-2 text-xs text-white">
          <span>♥ {sign.like_count}</span>
          <button onClick={() => onComment(sign.id)} className="ml-auto">💬 {sign.comment_count}</button>
        </div>
      </div>
    </div>
  )
}
