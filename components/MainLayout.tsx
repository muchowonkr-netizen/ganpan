'use client'

import BottomNav from './BottomNav'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
      else setReady(true)
    })
  }, [router])

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <span className="text-3xl animate-spin inline-block">🪧</span>
      </div>
    )
  }

  return (
    <div className="pb-16 min-h-dvh">
      {children}
      <BottomNav />
    </div>
  )
}
