'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import { compressImage } from '@/lib/compressImage'

export default function AdminContent() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [signs, setSigns] = useState<Sign[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [previewSign, setPreviewSign] = useState<Sign | null>(null)
  const bulkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setLoggedIn(true); loadSigns() }
    })
  }, [])

  useEffect(() => {
    if (!loggedIn) return

    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }

    const channel = supabase
      .channel('new-signs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signs' }, payload => {
        const sign = payload.new as { caption?: string }
        if (Notification.permission === 'granted') {
          new Notification('📸 새 간판 제보!', {
            body: sign.caption ?? '캡션 없음',
            icon: '/icon-192.png',
          })
        }
        void loadSigns()
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [loggedIn])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setAuthError(error.message); setAuthLoading(false); return }
    setLoggedIn(true)
    loadSigns()
    setAuthLoading(false)
  }

  async function loadSigns() {
    setLoading(true)
    const { data } = await supabase.from('signs').select('*').order('created_at', { ascending: false })
    setSigns(data ?? [])
    setLoading(false)
  }

  async function handleDelete(sign: Sign) {
    if (!confirm('삭제할까요?')) return
    setDeletingId(sign.id)
    await supabase.from('signs').delete().eq('id', sign.id)
    setSigns(prev => prev.filter(s => s.id !== sign.id))
    setDeletingId(null)
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`${selected.size}개를 삭제할까요?`)) return
    setBulkDeleting(true)
    const ids = Array.from(selected)
    await supabase.from('signs').delete().in('id', ids)
    setSigns(prev => prev.filter(s => !selected.has(s.id)))
    setSelected(new Set())
    setSelectMode(false)
    setBulkDeleting(false)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === signs.length) setSelected(new Set())
    else setSelected(new Set(signs.map(s => s.id)))
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBulkProgress({ done: 0, total: files.length })
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const compressed = await compressImage(file)
      const path = `signs/admin/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      const { error: upErr } = await supabase.storage.from('signs').upload(path, compressed)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('signs').getPublicUrl(path)
        await supabase.from('signs').insert({ image_url: publicUrl })
      }
      setBulkProgress({ done: i + 1, total: files.length })
    }
    if (bulkRef.current) bulkRef.current.value = ''
    setBulkProgress(null)
    await loadSigns()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setLoggedIn(false)
    setSigns([])
  }

  if (!loggedIn) {
    return (
      <div className="flex flex-col justify-center min-h-dvh px-6 gap-8">
        <div className="text-center">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-xl font-black">관리자 로그인</h1>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400" />
          <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400" />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <button type="submit" disabled={authLoading}
            className="w-full py-3 rounded-xl bg-yellow-400 text-black font-bold disabled:opacity-50">
            {authLoading ? '...' : '로그인'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-yellow-400">🛠 관리자</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">총 {signs.length}개</span>
          <button onClick={handleLogout} className="text-xs text-zinc-500 px-3 py-1.5 rounded-lg bg-zinc-800">로그아웃</button>
        </div>
      </div>

      {/* 업로드 */}
      <button onClick={() => bulkRef.current?.click()} disabled={bulkProgress !== null}
        className="w-full py-3 mb-2 rounded-xl bg-zinc-800 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        {bulkProgress ? `업로드 중... ${bulkProgress.done} / ${bulkProgress.total}` : '📁 사진 여러 장 올리기'}
      </button>
      <input ref={bulkRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkUpload} />
      {bulkProgress && (
        <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
          <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
        </div>
      )}

      {/* 선택 삭제 툴바 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${selectMode ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
          {selectMode ? '선택 취소' : '☑ 선택 삭제'}
        </button>
        {selectMode && (
          <>
            <button onClick={toggleSelectAll}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-bold">
              {selected.size === signs.length ? '전체 해제' : '전체 선택'}
            </button>
            <button onClick={handleBulkDelete} disabled={selected.size === 0 || bulkDeleting}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-40">
              {bulkDeleting ? '...' : `삭제 ${selected.size > 0 ? `(${selected.size})` : ''}`}
            </button>
          </>
        )}
      </div>

      {previewSign && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={() => setPreviewSign(null)}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button className="text-white text-2xl w-10 h-10 flex items-center justify-center">✕</button>
            <button
              onClick={e => { e.stopPropagation(); void handleDelete(previewSign); setPreviewSign(null) }}
              disabled={deletingId === previewSign.id}
              className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg disabled:opacity-40"
            >
              {deletingId === previewSign.id ? '삭제 중...' : '삭제'}
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSign.image_url} alt={previewSign.caption ?? ''} className="max-w-full max-h-full object-contain" />
            <div className="text-center">
              {previewSign.caption && <p className="text-white font-bold">{previewSign.caption}</p>}
              <p className="text-zinc-400 text-sm mt-1">♥ {previewSign.like_count} · {new Date(previewSign.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-3xl animate-pulse">🪧</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {signs.map(sign => (
            <div key={sign.id}
              onClick={selectMode ? () => toggleSelect(sign.id) : () => setPreviewSign(sign)}
              className={`relative rounded-2xl overflow-hidden aspect-square bg-zinc-900 cursor-pointer`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sign.image_url} alt={sign.caption ?? ''} className="w-full h-full object-cover" />

              {selectMode && (
                <div className={`absolute inset-0 transition-colors ${selected.has(sign.id) ? 'bg-yellow-400/30' : 'bg-transparent'}`} />
              )}
              {selectMode && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black transition-colors ${selected.has(sign.id) ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-white bg-black/40'}`}>
                  {selected.has(sign.id) ? '✓' : ''}
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                {sign.caption && <p className="text-xs text-white truncate mb-1">{sign.caption}</p>}
                <p className="text-[10px] text-zinc-400 mb-1">{new Date(sign.created_at).toLocaleDateString('ko-KR')}</p>
                {!selectMode && (
                  <div className="flex items-center gap-1 text-xs text-white">
                    <span>♥ {sign.like_count}</span>
                    <button onClick={e => { e.stopPropagation(); void handleDelete(sign) }} disabled={deletingId === sign.id}
                      className="ml-auto px-2 py-0.5 bg-red-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 active:scale-95">
                      {deletingId === sign.id ? '...' : '삭제'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
