export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import SwipeFeed from '@/components/SwipeFeed'
import MainLayout from '@/components/MainLayout'

const TITLE = '간판여행'
const DESCRIPTION =
  '카드를 한 장씩 넘기며 새로운 간판을 만나 보세요. 마음에 드는 간판은 ♥, 한눈에 반한 간판은 ⭐로 남길 수 있어요.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/explore' },
  openGraph: {
    title: `${TITLE} · 간판을 좋아하세요...`,
    description: DESCRIPTION,
    url: '/explore',
  },
  twitter: {
    title: `${TITLE} · 간판을 좋아하세요...`,
    description: DESCRIPTION,
  },
}

export default function ExplorePage() {
  return (
    <MainLayout>
      <SwipeFeed />
    </MainLayout>
  )
}
