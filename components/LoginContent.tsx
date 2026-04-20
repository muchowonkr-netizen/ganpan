'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginContent() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/')
    setLoading(false)
  }

  return (
    <div className="flex flex-col justify-center min-h-dvh px-6 gap-8">
      <div className="text-center">
        <div className="text-5xl mb-2">🪧</div>
        <h1 className="text-2xl font-black">관리자 로그인</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400" />
        <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-bold disabled:opacity-50">
          {loading ? '...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
