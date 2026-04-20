'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'

type Tab = 'liked' | 'uploads'

export default function MyContent() {
  const [tab, setTab] = useState<Tab>('liked')
  const [liked, setLiked] = useState<Sign[]>([])
  const [uploads, setUploads] = useState<Sign[]>([])
  const [loading, setLoading] = useState(true)
  const [commentSign, setCommentSign] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: actions }, { data: myUploads }] = await Promise.all([
      supabase.from('user_sign_actions')
        .select('sign_id, signs(*)')
        .eq('user_id', user.id)
        .in('action', ['like', 'super_like']),
      supabase.from('signs').select('*').eq('uploader_id', user.id).order('created_at', { ascending: false }),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLiked(actions?.map((a: any) => a.signs as Sign).filter(Boolean) ?? [])
    setUploads(myUploads ?? [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `signs/${userId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('signs').upload(path, file)
    if (upErr) { alert('업로드 실패: ' + upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('signs').getPublicUrl(path)
    await supabase.from('signs').insert({ uploader_id: userId, image_url: publicUrl })
    await load()
    setTab('uploads')
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60dvh] text-3xl animate-pulse">👤</div>

  const signs = tab === 'liked' ? liked : uploads

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-yellow-400">👤 마이</h1>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 text-black rounded-xl text-sm font-bold disabled:opacity-50">
          {uploading ? '⏳' : '+'} 업로드
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      <div className="flex gap-2 mb-4">
        {(['liked', 'uploads'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            {t === 'liked' ? `♥ 좋아요 ${liked.length}` : `📤 내 업로드 ${uploads.length}`}
          </button>
        ))}
      </div>

      {signs.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-zinc-500">
          <span className="text-4xl">{tab === 'liked' ? '♥' : '📤'}</span>
          <p className="text-sm">{tab === 'liked' ? '좋아요한 간판이 없어요' : '아직 업로드한 간판이 없어요'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {signs.map(sign => <SignCard key={sign.id} sign={sign} onComment={setCommentSign} />)}
        </div>
      )}

      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
    </div>
  )
}

function SignCard({ sign, onComment }: { sign: Sign; onComment: (id: string) => void }) {
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
