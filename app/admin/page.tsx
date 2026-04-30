export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AdminContent from '@/components/AdminContent'

export const metadata: Metadata = {
  title: '관리자',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminContent />
}
