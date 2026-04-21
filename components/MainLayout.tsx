'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import UploadModal from './UploadModal'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [showUpload, setShowUpload] = useState(false)
  const [toast, setToast] = useState(false)
  const pathname = usePathname()
  const isSwipePage = pathname === '/explore'

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="pb-4 min-h-dvh">
      {children}
      {!isSwipePage && (
        <>
          <button
            onClick={() => setShowUpload(true)}
            className="fixed bottom-6 right-4 w-12 h-12 bg-white text-black text-2xl font-bold border-2 border-black shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
            aria-label="업로드"
          >
            +
          </button>
          {showUpload && (
            <UploadModal
              onClose={() => setShowUpload(false)}
              onSuccess={() => setToast(true)}
            />
          )}
        </>
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#6A7BA2] text-white text-sm font-medium px-5 py-3 shadow-lg whitespace-nowrap animate-fade-in">
          ✨ 제보 감사합니다…
        </div>
      )}
    </div>
  )
}
