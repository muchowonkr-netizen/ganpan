import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '간판을 좋아하세요...',
    short_name: '간판',
    description: '거리에서 만난 간판 사진을 모으고 함께 감상하는 곳.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'ko',
    categories: ['photo', 'lifestyle', 'social'],
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  }
}
