import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '간판왕 — 웃긴 간판 아카이브',
  description: '길에서 마주친 재밌는 간판을 모아보는 곳',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
    </html>
  )
}
