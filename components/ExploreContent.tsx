'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sign } from '@/types'
import CommentSheet from './CommentSheet'
import SignViewer from './SignViewer'
import Link from 'next/link'

const BATCH_SIZE = 20

function getAspectRatio(url: string): Promise<number> {
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => resolve(img.naturalHeight / img.naturalWidth)
    img.onerror = () => resolve(1)
    img.src = url
  })
}

async function distributeToColumns(
  signs: Sign[],
  leftH: number,
  rightH: number
): Promise<{ left: Sign[]; right: Sign[]; leftH: number; rightH: number }> {
  const ratios = await Promise.all(signs.map(s => getAspectRatio(s.image_url)))
  const left: Sign[] = []
  const right: Sign[] = []
  signs.forEach((sign, i) => {
    if (leftH <= rightH) { left.push(sign); leftH += ratios[i] }
    else { right.push(sign); rightH += ratios[i] }
  })
  return { left, right, leftH, rightH }
}

export default function ExploreContent() {
  const [allSigns, setAllSigns] = useState<Sign[]>([])
  const [leftCol, setLeftCol] = useState<Sign[]>([])
  const [rightCol, setRightCol] = useState<Sign[]>([])
  const [loading, setLoading] = useState(true)
  const [commentSign, setCommentSign] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const leftHRef = useRef(0)
  const rightHRef = useRef(0)
  const renderedCountRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const allSignsRef = useRef<Sign[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)

  async function loadFeed() {
    setLoading(true)
    const [{ data: popular }, { data: newest }] = await Promise.all([
      supabase.from('signs').select('*').order('like_count', { ascending: false }).limit(50),
      supabase.from('signs').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    const seen = new Set<string>()
    const merged: Sign[] = []
    for (const s of [...(popular ?? []), ...(newest ?? [])]) {
      if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
    }
    const shuffled = merged.sort(() => Math.random() - 0.5)
    allSignsRef.current = shuffled
    setAllSigns(shuffled)

    leftHRef.current = 0
    rightHRef.current = 0
    renderedCountRef.current = 0

    const firstBatch = shuffled.slice(0, BATCH_SIZE)
    const { left, right, leftH, rightH } = await distributeToColumns(firstBatch, 0, 0)
    leftHRef.current = leftH
    rightHRef.current = rightH
    renderedCountRef.current = firstBatch.length
    setLeftCol(left)
    setRightCol(right)
    setLoading(false)
  }

  async function loadMore() {
    if (loadingMoreRef.current) return
    const all = allSignsRef.current
    const count = renderedCountRef.current
    if (count >= all.length) return
    loadingMoreRef.current = true
    const batch = all.slice(count, count + BATCH_SIZE)
    const { left, right, leftH, rightH } = await distributeToColumns(
      batch, leftHRef.current, rightHRef.current
    )
    leftHRef.current = leftH
    rightHRef.current = rightH
    renderedCountRef.current = count + batch.length
    setLeftCol(prev => [...prev, ...left])
    setRightCol(prev => [...prev, ...right])
    loadingMoreRef.current = false
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadFeed() }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) void loadMore() },
      { rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading])

  return (
    <div className="pt-4">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h1 className="text-xl font-light text-gray-900">간판을 좋아하세요...</h1>
        <Link
          href="/explore"
          className="w-12 h-12 bg-white text-black text-xl flex items-center justify-center font-bold border border-black active:scale-95 transition-transform"
          aria-label="간판여행"
        >
          🍀
        </Link>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-zinc-500">잠시만 기다려 주세요…</div>
        ) : leftCol.length === 0 && rightCol.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-600">
            <span className="text-4xl">🪧</span>
            <p className="text-sm">간판이 없어요</p>
          </div>
        ) : (
          <>
            <div className="flex gap-0.5 animate-fade-in-up">
              <div className="flex-1 flex flex-col gap-0.5">
                {leftCol.map(sign => (
                  <SignTile key={sign.id} sign={sign}
                    onOpen={() => setViewerIndex(allSigns.findIndex(s => s.id === sign.id))} />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                {rightCol.map(sign => (
                  <SignTile key={sign.id} sign={sign}
                    onOpen={() => setViewerIndex(allSigns.findIndex(s => s.id === sign.id))} />
                ))}
              </div>
            </div>
            <div ref={sentinelRef} className="h-12" />
          </>
        )}
      </div>

      {commentSign && <CommentSheet signId={commentSign} onClose={() => setCommentSign(null)} />}
      {viewerIndex !== null && (
        <SignViewer signs={allSigns} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  )
}

function SignTile({ sign, onOpen }: { sign: Sign; onOpen: () => void }) {
  return (
    <div className="relative overflow-hidden cursor-pointer border border-black bg-gray-100" onClick={onOpen}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sign.image_url} alt={sign.caption ?? ''} className="w-full h-auto block" />
      {sign.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-xs text-white font-bold truncate">{sign.caption}</p>
        </div>
      )}
    </div>
  )
}
