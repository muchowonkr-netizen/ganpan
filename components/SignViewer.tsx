'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign, Comment } from '@/types'
import CommentSheet from './CommentSheet'

export default function SignViewer({ signs, startIndex, onClose }: {
  signs: Sign[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [showComments, setShowComments] = useState(false)
  const [previewComment, setPreviewComment] = useState<Comment | null>(null)

  const current = signs[index]
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    window.history.pushState({ signViewer: true }, '')
    function handlePop() { onCloseRef.current() }
    window.addEventListener('popstate', handlePop)
    return () => {
      window.removeEventListener('popstate', handlePop)
      if (window.history.state?.signViewer) window.history.back()
    }
  }, [])

  useEffect(() => {
    if (!current) return
    setPreviewComment(null)
    void supabase
      .from('comments')
      .select('*')
      .eq('sign_id', current.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setPreviewComment((data as Comment[])?.[0] ?? null))
  }, [current?.id])

  function goNext() {
    if (index + 1 < signs.length) setIndex(i => i + 1)
  }

  function goPrev() {
    if (index > 0) setIndex(i => i - 1)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div className="flex items-center px-4 py-3">
        <button onClick={onClose} className="text-zinc-300 text-2xl w-10 h-10 flex items-center justify-center">✕</button>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 gap-4 overflow-hidden">
        {current && (
          <ViewCard sign={current} onClick={e => e.stopPropagation()} />
        )}

        {previewComment && (
          <button
            onClick={e => { e.stopPropagation(); setShowComments(true) }}
            className="w-full text-left px-3 py-2.5 bg-white/90 active:bg-white transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-gray-400 text-xs mt-0.5">💬</span>
              <p className="text-sm text-gray-700 flex-1 line-clamp-2">{previewComment.content}</p>
            </div>
          </button>
        )}
      </div>

      {showComments && current && (
        <CommentSheet signId={current.id} onClose={() => setShowComments(false)} readOnly />
      )}
    </div>
  )
}

function ViewCard({ sign, onClick }: { sign: Sign; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onClick}
      className="relative w-full aspect-[3/4] overflow-hidden shadow-2xl select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} aria-hidden alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-80" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? '간판'} className="absolute inset-0 w-full h-full object-contain" draggable={false} />

      {sign.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
          <p className="font-bold text-lg leading-snug">{sign.caption}</p>
          {sign.location_name && <p className="text-sm text-zinc-300 mt-1">📍 {sign.location_name}</p>}
        </div>
      )}
    </div>
  )
}
