'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign, Comment } from '@/types'
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
  const [previewComments, setPreviewComments] = useState<Comment[]>([])
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [activeTab, setActiveTab] = useState<'signs' | 'comments' | 'likes'>('signs')
  const [allComments, setAllComments] = useState<(Comment & { signs: { image_url: string; caption: string | null } | null })[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsCount, setCommentsCount] = useState<number | null>(null)
  const [likeActivity, setLikeActivity] = useState<{ sign_id: string; image_url: string; like_count: number; time: Date }[]>([])
  const [likeHistory, setLikeHistory] = useState<{ id: string; sign_id: string; user_id: string | null; created_at: string; signs: { image_url: string; caption: string | null } | null }[]>([])
  const [likesLoading, setLikesLoading] = useState(false)
  const bulkRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingTitle, setEditingTitle] = useState('')
  const filteredSigns = searchQuery.trim()
    ? signs.filter(s => s.caption?.toLowerCase().includes(searchQuery.toLowerCase()))
    : signs

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setLoggedIn(true); loadSigns() }
    })
  }, [])

  useEffect(() => {
    if (!loggedIn) return

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }

    const channel = supabase
      .channel('admin-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signs' }, payload => {
        const sign = payload.new as { caption?: string }
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('📸 새 간판 제보!', {
            body: sign.caption ?? '캡션 없음',
            icon: '/icon-192.png',
          })
        }
        void loadSigns()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signs' }, payload => {
        const sign = payload.new as Sign
        setLikeActivity(prev => [{ sign_id: sign.id, image_url: sign.image_url, like_count: sign.like_count, time: new Date() }, ...prev].slice(0, 100))
        setSigns(prev => prev.map(s => s.id === sign.id ? { ...s, like_count: sign.like_count } : s))
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('♥ 좋아요!', { body: `♥ ${sign.like_count}`, icon: '/icon-192.png' })
        }
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [loggedIn])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setAuthError(error.message); return }
      setLoggedIn(true)
      void loadSigns()
    } catch {
      setAuthError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function loadSigns() {
    setLoading(true)
    const [{ data: signsData }, { count }] = await Promise.all([
      supabase.from('signs').select('*').order('created_at', { ascending: false }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
    ])
    setSigns(signsData ?? [])
    if (count !== null) setCommentsCount(count)
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
    if (selected.size === filteredSigns.length) setSelected(new Set())
    else setSelected(new Set(filteredSigns.map(s => s.id)))
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

  async function openPreview(sign: Sign) {
    setPreviewSign(sign)
    setEditingTitle(sign.caption ?? '')
    setNewComment('')
    const { data } = await supabase.from('comments').select('*').eq('sign_id', sign.id).order('created_at', { ascending: true })
    setPreviewComments((data as Comment[]) ?? [])
  }

  async function handleDeleteComment(commentId: string) {
    setDeletingCommentId(commentId)
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) { alert('삭제 실패: ' + error.message); setDeletingCommentId(null); return }
    setPreviewComments(prev => prev.filter(c => c.id !== commentId))
    setAllComments(prev => prev.filter(c => c.id !== commentId))
    setDeletingCommentId(null)
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !previewSign) return
    setSubmittingComment(true)
    const { data, error } = await supabase.from('comments').insert({ sign_id: previewSign.id, content: newComment.trim() }).select().single()
    if (error) { alert('등록 실패: ' + error.message); setSubmittingComment(false); return }
    if (data) setPreviewComments(prev => [...prev, data as Comment])
    setNewComment('')
    setSubmittingComment(false)
  }

  async function loadAllComments() {
    setCommentsLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, signs(image_url, caption)')
      .order('created_at', { ascending: false })
    setAllComments((data ?? []) as (Comment & { signs: { image_url: string; caption: string | null } | null })[])
    setCommentsLoading(false)
  }

  async function loadLikeHistory() {
    setLikesLoading(true)
    const { data } = await supabase
      .from('like_history')
      .select('*, signs(image_url, caption)')
      .order('created_at', { ascending: false })
      .limit(200)
    setLikeHistory((data ?? []) as typeof likeHistory)
    setLikesLoading(false)
  }

  async function handleSaveTitle(sign: Sign, title: string) {
    const trimmed = title.trim() || null
    const { error } = await supabase.from('signs').update({ caption: trimmed }).eq('id', sign.id)
    if (error) { alert('저장 실패: ' + error.message); return }
    setSigns(prev => prev.map(s => s.id === sign.id ? { ...s, caption: trimmed } : s))
    setPreviewSign(prev => prev?.id === sign.id ? { ...prev, caption: trimmed } : prev)
  }

  async function handleAdjustLike(sign: Sign, delta: number) {
    const next = Math.max(0, sign.like_count + delta)
    const { error } = await supabase.from('signs').update({ like_count: next }).eq('id', sign.id)
    if (error) { alert('저장 실패: ' + error.message); return }
    setSigns(prev => prev.map(s => s.id === sign.id ? { ...s, like_count: next } : s))
    if (previewSign?.id === sign.id) setPreviewSign({ ...sign, like_count: next })
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
        <button onClick={handleLogout} className="text-xs text-zinc-500 px-3 py-1.5 rounded-lg bg-zinc-800">로그아웃</button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-zinc-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('signs')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'signs' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}
        >
          간판 {signs.length > 0 && `(${signs.length})`}
        </button>
        <button
          onClick={() => { setActiveTab('comments'); if (allComments.length === 0) void loadAllComments() }}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'comments' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}
        >
          한줄평 {(commentsCount ?? allComments.length) > 0 && `(${commentsCount ?? allComments.length})`}
        </button>
        <button
          onClick={() => { setActiveTab('likes'); if (likeHistory.length === 0) void loadLikeHistory() }}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'likes' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}
        >
          좋아요 {likeHistory.length > 0 && `(${likeHistory.length})`}
        </button>
      </div>

      {/* 한줄평 탭 */}
      {activeTab === 'comments' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400">최신순 · {allComments.length}개</span>
            <button onClick={() => void loadAllComments()} className="text-xs text-zinc-500 px-2 py-1 bg-zinc-800 rounded-lg">새로고침</button>
          </div>
          {commentsLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">불러오는 중…</div>
          ) : allComments.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">한줄평이 없어요</div>
          ) : (
            allComments.map(c => (
              <div key={c.id} className="flex gap-3 bg-zinc-800 rounded-xl p-3">
                {c.signs?.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.signs.image_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {c.signs?.caption && <p className="text-xs text-zinc-400 truncate mb-0.5">{c.signs.caption}</p>}
                  <p className="text-sm text-white">{c.content}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{new Date(c.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <button
                  onClick={() => void handleDeleteComment(c.id)}
                  disabled={deletingCommentId === c.id}
                  className="text-red-400 text-xs font-bold self-start flex-shrink-0 disabled:opacity-40"
                >
                  {deletingCommentId === c.id ? '...' : '삭제'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 좋아요 히스토리 탭 */}
      {activeTab === 'likes' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400">최신순 · {likeHistory.length}개</span>
            <button onClick={() => void loadLikeHistory()} className="text-xs text-zinc-500 px-2 py-1 bg-zinc-800 rounded-lg">새로고침</button>
          </div>
          {likesLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">불러오는 중…</div>
          ) : likeHistory.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">좋아요 기록이 없어요</div>
          ) : (
            likeHistory.map(lh => (
              <div key={lh.id} className="flex gap-3 bg-zinc-800 rounded-xl p-3 items-center">
                {lh.signs?.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lh.signs.image_url} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {lh.signs?.caption && <p className="text-xs text-zinc-400 truncate mb-0.5">{lh.signs.caption}</p>}
                  <p className="text-[10px] text-zinc-500 truncate">{lh.user_id ?? '익명'}</p>
                </div>
                <p className="text-[10px] text-zinc-500 flex-shrink-0">{new Date(lh.created_at).toLocaleString('ko-KR')}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* 업로드 */}
      {activeTab === 'signs' && <button onClick={() => bulkRef.current?.click()} disabled={bulkProgress !== null}
        className="w-full py-3 mb-2 rounded-xl bg-zinc-800 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
        {bulkProgress ? `업로드 중... ${bulkProgress.done} / ${bulkProgress.total}` : '📁 사진 여러 장 올리기'}
      </button>}
      <input ref={bulkRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkUpload} />
      {activeTab === 'signs' && bulkProgress && (
        <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
          <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
        </div>
      )}

      {/* 선택 삭제 툴바 */}
      {activeTab === 'signs' && <div className="flex gap-2 mb-4">
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
      </div>}

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
          <div className="flex-1 flex flex-col px-4 gap-4 overflow-y-auto py-4" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSign.image_url} alt={previewSign.caption ?? ''} className="w-full object-contain max-h-64" />
            <div className="text-center">
              <input
                value={editingTitle}
                onChange={e => setEditingTitle(e.target.value)}
                onBlur={() => { if (editingTitle !== (previewSign.caption ?? '')) void handleSaveTitle(previewSign, editingTitle) }}
                placeholder="제목 없음"
                className="text-white font-bold bg-transparent text-center w-full focus:outline-none border-b border-zinc-600 pb-1 placeholder-zinc-600"
              />
              <div className="flex items-center justify-center gap-3 mt-1">
                <button onClick={() => void handleAdjustLike(previewSign, -1)} className="w-7 h-7 rounded-full bg-zinc-700 text-white font-bold text-sm active:scale-90">−</button>
                <span className="text-zinc-400 text-sm">♥ {previewSign.like_count}</span>
                <button onClick={() => void handleAdjustLike(previewSign, +1)} className="w-7 h-7 rounded-full bg-zinc-700 text-white font-bold text-sm active:scale-90">+</button>
              </div>
              <p className="text-zinc-500 text-xs mt-1">{new Date(previewSign.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
            <div className="border-t border-zinc-700 pt-3">
              <p className="text-zinc-400 text-xs mb-2">한줄평 {previewComments.length}개</p>
              {previewComments.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-3">한줄평이 없어요</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {previewComments.map(c => (
                    <div key={c.id} className="flex items-start justify-between gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                      <p className="text-sm text-zinc-200 flex-1">{c.content}</p>
                      <button
                        onClick={() => { void handleDeleteComment(c.id) }}
                        disabled={deletingCommentId === c.id}
                        className="text-red-400 text-xs font-bold disabled:opacity-40 flex-shrink-0"
                      >
                        {deletingCommentId === c.id ? '...' : '삭제'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={e => { void handleSubmitComment(e) }} className="flex gap-2 mt-3">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="익명으로 한줄평 달기..."
                  className="flex-1 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none rounded-lg"
                />
                <button type="submit" disabled={submittingComment || !newComment.trim()}
                  className="px-3 py-2 bg-zinc-600 text-white text-sm font-bold rounded-lg disabled:opacity-40">
                  {submittingComment ? '...' : '등록'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'signs' && (
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="제목으로 검색..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg leading-none">✕</button>
          )}
        </div>
      )}
      {activeTab === 'signs' && searchQuery.trim() && (
        <p className="text-xs text-zinc-500 mb-2">검색 결과 {filteredSigns.length}개</p>
      )}
      {activeTab === 'signs' && loading ? (
        <div className="flex items-center justify-center py-20 text-3xl animate-pulse">🍀</div>
      ) : activeTab === 'signs' && (
        <div className="grid grid-cols-2 gap-2">
          {filteredSigns.map(sign => (
            <div key={sign.id}
              onClick={selectMode ? () => toggleSelect(sign.id) : () => { void openPreview(sign) }}
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

