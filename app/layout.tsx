import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '간판을 좋아하세요...',
  description: '간판을 좋아하세요...',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
    </html>
  )
}
