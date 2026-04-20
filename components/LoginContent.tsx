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
  const [socialLoading, setSocialLoading] = useState<'kakao' | 'naver' | null>(null)
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

  async function handleSocial(provider: 'kakao' | 'naver') {
    setSocialLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) {
      setError(error.message)
      setSocialLoading(null)
    }
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
    <div className="flex flex-col justify-center min-h-dvh px-6 gap-6">
      <div className="text-center">
        <div className="text-5xl mb-2">🪧</div>
        <h1 className="text-2xl font-black">간판을 좋아하세요...</h1>
        <p className="text-sm text-zinc-400 mt-1">웃긴 간판 아카이브</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => handleSocial('kakao')}
          disabled={socialLoading !== null}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: '#FEE500', color: '#191919' }}
        >
          {socialLoading === 'kakao' ? '...' : (
            <>
              <KakaoIcon />
              카카오로 계속하기
            </>
          )}
        </button>

        <button
          onClick={() => handleSocial('naver')}
          disabled={socialLoading !== null}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: '#03C75A', color: '#ffffff' }}
        >
          {socialLoading === 'naver' ? '...' : (
            <>
              <NaverIcon />
              네이버로 계속하기
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600">또는 이메일로</span>
        <div className="flex-1 h-px bg-zinc-800" />
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

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.6 5.08 4.02 6.53L5.1 21l4.38-2.87A11.7 11.7 0 0012 18.6c5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z" />
    </svg>
  )
}

function NaverIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
    </svg>
  )
}
