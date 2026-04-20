'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/compressImage'

export default function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)

    const compressed = await compressImage(file)
    const path = `signs/anon/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`

    const { error: upErr } = await supabase.storage.from('signs').upload(path, compressed)
    if (upErr) {
      alert('업로드 실패: ' + upErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('signs').getPublicUrl(path)
    await supabase.from('signs').insert({
      image_url: publicUrl,
      caption: caption.trim() || null,
    })

    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-t-3xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-bold">간판을 제보해 보세요…</h2>
          <button onClick={onClose} className="text-zinc-400 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="미리보기" className="w-full aspect-square object-cover rounded-2xl" />
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <span className="text-4xl">🪧</span>
              <span className="text-sm">사진 선택</span>
            </button>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

          {preview && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs text-zinc-500 text-center">
              다른 사진 선택
            </button>
          )}

          <input
            type="text"
            placeholder="한줄평을 남겨보세요…"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 text-sm"
          />

          <button type="submit" disabled={!file || uploading}
            className="w-full py-3 rounded-xl bg-yellow-400 text-black font-bold disabled:opacity-40">
            {uploading ? '업로드 중...' : '제보하기'}
          </button>


        </form>
      </div>
    </div>
  )
}
