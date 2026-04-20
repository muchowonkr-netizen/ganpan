'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

    const ext = file.name.split('.').pop()
    const path = `signs/anon/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage.from('signs').upload(path, file)
    if (upErr) {
      alert('업로드 실패: ' + upErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('signs').getPublicUrl(path)
    await supabase.from('signs').insert({
      image_url: publicUrl,
      caption: caption.trim() || null,
      location_name: location.trim() || null,
    })

    setDone(true)
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-t-3xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-bold">📤 간판 업로드</h2>
          <button onClick={onClose} className="text-zinc-400 text-xl">✕</button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="text-5xl">🎉</div>
            <p className="font-bold text-lg">업로드 완료!</p>
            <button onClick={onClose} className="px-6 py-2 bg-yellow-400 text-black rounded-xl font-bold text-sm">
              닫기
            </button>
          </div>
        ) : (
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
              placeholder="간판 내용 (선택)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 text-sm"
            />

            <input
              type="text"
              placeholder="위치 (선택, 예: 서울 홍대)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 text-sm"
            />

            <button type="submit" disabled={!file || uploading}
              className="w-full py-3 rounded-xl bg-yellow-400 text-black font-bold disabled:opacity-40">
              {uploading ? '업로드 중...' : '업로드'}
            </button>

            <p className="text-xs text-zinc-600 text-center">누구나 업로드할 수 있어요. 부적절한 사진은 삭제될 수 있어요.</p>
          </form>
        )}
      </div>
    </div>
  )
}
