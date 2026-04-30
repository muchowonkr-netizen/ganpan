import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Sign } from '@/types'
import ExploreContent from '@/components/ExploreContent'
import MainLayout from '@/components/MainLayout'

export const revalidate = 60

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
}

async function fetchInitialSigns(): Promise<Sign[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase
      .from('signs')
      .select('*')
      .order('like_count', { ascending: false })
      .limit(200)
    if (error || !data) return []
    const now = Date.now()
    return data
      .map(s => {
        const daysSince = (now - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)
        const recencyBonus = daysSince < 1 ? 0 : Math.max(0, 7 - daysSince) * 1.05
        return {
          s,
          score: s.like_count * 2 + s.comment_count * 2 + recencyBonus + Math.random() * 10,
        }
      })
      .sort((a, b) => b.score - a.score)
      .map(({ s }) => s)
  } catch {
    return []
  }
}

export default async function HomePage() {
  const initialSigns = await fetchInitialSigns()
  return (
    <MainLayout>
      <ExploreContent initialSigns={initialSigns} />
    </MainLayout>
  )
}
