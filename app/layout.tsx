import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://ganpanlover.vercel.app'),
  title: '간판을 좋아하세요...',
  description: '간판... 보러 가실래요?',
  openGraph: {
    title: '간판을 좋아하세요...',
    description: '간판... 보러 가실래요?',
    images: ['https://kfuwqtwiyqubjuvxsdek.supabase.co/storage/v1/object/public/signs/signs/og-image.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '간판을 좋아하세요...',
    description: '간판... 보러 가실래요?',
    images: ['https://kfuwqtwiyqubjuvxsdek.supabase.co/storage/v1/object/public/signs/signs/og-image.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-gray-900">{children}</body>
    </html>
  )
}
