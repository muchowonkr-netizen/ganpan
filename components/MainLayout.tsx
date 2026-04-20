'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import UploadModal from './UploadModal'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [showUpload, setShowUpload] = useState(false)
  const pathname = usePathname()
  const isSwipePage = pathname === '/'

  return (
    <div className="pb-4 min-h-dvh">
      {children}
      {!isSwipePage && (
        <>
          <button
            onClick={() => setShowUpload(true)}
            className="fixed bottom-6 right-4 w-12 h-12 bg-yellow-400 text-black rounded-full text-2xl font-bold shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
            aria-label="업로드"
          >
            +
          </button>
          {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
        </>
      )}
    </div>
  )
}
