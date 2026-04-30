import type { MetadataRoute } from 'next'

const SITE_URL = 'https://ganpanlover.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]
}
