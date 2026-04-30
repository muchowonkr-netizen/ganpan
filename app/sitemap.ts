import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://ganpanlover.com'

export const revalidate = 3600

async function fetchSignIds(): Promise<{ id: string; created_at: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase
      .from('signs')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(45000)
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const base: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  const signs = await fetchSignIds()
  const signEntries: MetadataRoute.Sitemap = signs.map(s => ({
    url: `${SITE_URL}/sign/${s.id}`,
    lastModified: new Date(s.created_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...base, ...signEntries]
}
