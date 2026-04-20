'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Comment } from '@/types'

export default function CommentSheet({ signId, onClose }: { signId: string; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    loadComments()
  }, [signId])

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, users(nickname, avatar_url)')
      .eq('sign_id', signId)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) ?? [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !userId) return
    setLoading(true)
    await supabase.from('comments').insert({ user_id: userId, sign_id: signId, content: text.trim() })
    setText('')
    await loadComments()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-t-3xl max-h-[75dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-bold">⭐ 슈퍼라이크 댓글</h2>
          <button onClick={onClose} className="text-zinc-400 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-6">첫 댓글을 남겨보세요!</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm flex-shrink-0">
                {c.users?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.users.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : '👤'}
              </div>
              <div>
                <p className="text-xs text-zinc-400">{c.users?.nickname ?? '익명'}</p>
                <p className="text-sm mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="px-4 py-3 border-t border-zinc-800 flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="댓글 입력..."
            className="flex-1 bg-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none"
          />
          <button type="submit" disabled={loading || !text.trim()} className="px-4 py-2 bg-yellow-400 text-black rounded-xl text-sm font-bold disabled:opacity-40">
            전송
          </button>
        </form>
      </div>
    </div>
  )
}
