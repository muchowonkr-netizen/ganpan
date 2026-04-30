export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import ExploreContent from '@/components/ExploreContent'
import MainLayout from '@/components/MainLayout'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
}

export default function HomePage() {
  return (
    <MainLayout>
      <ExploreContent />
    </MainLayout>
  )
}
