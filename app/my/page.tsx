export const dynamic = 'force-dynamic'

import MyContent from '@/components/MyContent'
import MainLayout from '@/components/MainLayout'

export default function MyPage() {
  return (
    <MainLayout>
      <MyContent />
    </MainLayout>
  )
}
