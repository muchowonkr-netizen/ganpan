export const dynamic = 'force-dynamic'

import SwipeFeed from '@/components/SwipeFeed'
import MainLayout from '@/components/MainLayout'

export default function HomePage() {
  return (
    <MainLayout>
      <SwipeFeed />
    </MainLayout>
  )
}
