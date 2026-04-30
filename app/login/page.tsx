export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import LoginContent from '@/components/LoginContent'

export const metadata: Metadata = {
  title: '관리자 로그인',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginContent />
}
