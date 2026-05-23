import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { Toaster } from 'sonner'
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister'
import { InstallPwaPrompt } from '@/components/shared/InstallPwaPrompt'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | IbadahHub',
    default: 'IbadahHub',
  },
  description: 'Platform digital pengelolaan kegiatan ibadah lintas agama',
  applicationName: 'IbadahHub',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IbadahHub',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/icons/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0F6E56' },
    { media: '(prefers-color-scheme: dark)', color: '#0F6E56' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className="overscroll-y-none">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
        <InstallPwaPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
