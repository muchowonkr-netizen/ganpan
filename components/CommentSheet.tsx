'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Comment } from '@/types'

export default function CommentSheet({ signId, onClose, readOnly }: { signId: string; onClose: () => void; readOnly?: boolean }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadComments() }, [signId])

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('sign_id', signId)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) ?? [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    await supabase.from('comments').insert({ sign_id: signId, content: text.trim() })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-t-3xl max-h-[75dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-bold">한줄평</h2>
          <button onClick={onClose} className="text-zinc-400 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
          {comments.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-6">첫 한줄평을 남겨보세요…</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm flex-shrink-0">
                👤
              </div>
              <div>
                <p className="text-xs text-zinc-400">익명</p>
                <p className="text-sm mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <form onSubmit={submit} className="px-4 py-3 border-t border-zinc-800 flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="익명으로 한줄평 달기..."
              className="flex-1 bg-zinc-800  px-4 py-2 text-sm focus:outline-none"
            />
            <button type="submit" disabled={loading || !text.trim()} className="px-4 py-2 bg-yellow-400 text-black  text-sm font-bold disabled:opacity-40">
              전송
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
