'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', icon: '🪧', label: '메인' },
  { href: '/explore', icon: '🔥', label: '탐색' },
  { href: '/my', icon: '👤', label: '마이' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-zinc-950 border-t border-zinc-800 flex z-50">
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${active ? 'text-yellow-400' : 'text-zinc-500'}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
