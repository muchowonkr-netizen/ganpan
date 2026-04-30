import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const SITE_URL = 'https://ganpanlover.com'
const OG_IMAGE =
  'https://kfuwqtwiyqubjuvxsdek.supabase.co/storage/v1/object/public/signs/signs/og-image.jpg'
const SITE_NAME = '간판을 좋아하세요...'
const DESCRIPTION =
  '거리에서 만난 간판 사진을 모으고 함께 감상하는 곳. 좋아하는 간판에 ♥를 누르고, 새로운 간판을 제보해 주세요.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    '간판',
    '간판 사진',
    '거리 사진',
    '레트로 간판',
    '옛날 간판',
    '한국 간판',
    '사인보드',
    '간판여행',
    'signage',
    'Korean signs',
  ],
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'ko_KR',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: { icon: '/favicon.ico' },
  category: 'photography',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: 'ganpanlover',
  url: SITE_URL,
  inLanguage: 'ko-KR',
  description: DESCRIPTION,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
