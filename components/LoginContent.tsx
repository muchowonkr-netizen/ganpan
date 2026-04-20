'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginContent() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4">
        <div className="text-4xl">📬</div>
        <p className="text-lg font-bold">이메일을 확인하세요!</p>
        <p className="text-sm text-zinc-400 text-center">인증 링크를 클릭하면 바로 시작할 수 있어요</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center min-h-dvh px-6 gap-8">
      <div className="text-center">
        <div className="text-5xl mb-2">🪧</div>
        <h1 className="text-2xl font-black">간판을 좋아하세요...</h1>
        <p className="text-sm text-zinc-400 mt-1">웃긴 간판 아카이브</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400" />
        <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-bold text-base disabled:opacity-50">
          {loading ? '...' : isSignUp ? '회원가입' : '로그인'}
        </button>
      </form>

      <button onClick={() => { setIsSignUp(!isSignUp); setError('') }} className="text-sm text-zinc-400 text-center">
        {isSignUp ? '이미 계정이 있어요 → 로그인' : '계정이 없어요 → 회원가입'}
      </button>
    </div>
  )
}
