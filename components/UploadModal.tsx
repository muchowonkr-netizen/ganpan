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

    const { file: compressed, aspectRatio } = await compressImage(file)
    const path = `signs/anon/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`

    const { error: upErr } = await supabase.storage.from('signs').upload(path, compressed)
    if (upErr) {
      alert('업로드 실패: ' + upErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('signs').getPublicUrl(path)
    const { data: sign, error: insertErr } = await supabase.from('signs').insert({
      image_url: publicUrl,
      aspect_ratio: aspectRatio,
    }).select('id').single()
    if (insertErr || !sign) {
      alert('등록 실패: ' + insertErr?.message)
      setUploading(false)
      return
    }

    if (caption.trim()) {
      await supabase.from('comments').insert({ sign_id: sign.id, content: caption.trim() })
    }

    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-light text-gray-900">간판을 제보해 보세요…</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="미리보기" className="w-full aspect-square object-cover" />
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full aspect-square border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
              <span className="text-2xl">사진 선택</span>
            </button>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

          {preview && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs text-gray-400 text-center">
              다른 사진 선택
            </button>
          )}

          <input
            type="text"
            placeholder="한줄평을 남겨보세요… (선택)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#6A7BA2] text-sm"
          />

          <button type="submit" disabled={!file || uploading}
            className="w-full py-3 bg-white text-black font-bold border-2 border-black disabled:opacity-40">
            {uploading ? '업로드 중...' : '제보하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
