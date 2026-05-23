'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Download, Share, Plus } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const SESSION_DISMISS_KEY = 'ibadahhub-install-dismissed'

type Mode = 'hidden' | 'native' | 'ios'

export function InstallPwaPrompt() {
  const [mode, setMode] = useState<Mode>('hidden')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosExpanded, setIosExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Sudah terpasang sebagai PWA — jangan tampilkan
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari menggunakan navigator.standalone
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Dismissed di session ini — tetap sembunyikan sampai tab di-refresh/dibuka lagi
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') return

    // iOS Safari: tidak ada beforeinstallprompt; tampilkan instruksi manual
    const ua = window.navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setMode('native')
    }

    const handleAppInstalled = () => {
      setMode('hidden')
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Untuk iOS, tidak ada event — set langsung kalau perangkatnya iOS Safari
    if (isIOS && isSafari) {
      setMode('ios')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem(SESSION_DISMISS_KEY, '1')
    setMode('hidden')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setMode('hidden')
      } else {
        // User menolak prompt browser — anggap dismissed untuk session ini
        dismiss()
      }
    } catch {
      /* abaikan */
    } finally {
      setDeferredPrompt(null)
    }
  }

  if (mode === 'hidden') return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6 flex justify-center sm:justify-end"
      role="region"
      aria-label="Install IbadahHub"
    >
      <div className="pointer-events-auto w-full sm:max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          <div className="shrink-0 rounded-xl overflow-hidden ring-1 ring-black/5">
            <Image
              src="/logo-mark.png"
              alt="IbadahHub"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              Pasang IbadahHub
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {mode === 'native'
                ? 'Akses lebih cepat dari layar utama, tanpa perlu buka browser.'
                : 'Tambahkan ke layar utama untuk akses cepat dari iPhone Anda.'}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Tutup"
            className="shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        {mode === 'native' ? (
          <div className="px-4 pb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 text-xs font-medium text-gray-600 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Nanti saja
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20"
            >
              <Download size={14} />
              Pasang
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4">
            {!iosExpanded ? (
              <button
                type="button"
                onClick={() => setIosExpanded(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Lihat cara pasang
              </button>
            ) : (
              <ol className="text-xs text-gray-600 space-y-2 bg-gray-50 rounded-lg p-3">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <span>
                    Ketuk tombol{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white rounded border border-gray-200 text-gray-700 font-medium">
                      <Share size={11} /> Bagikan
                    </span>{' '}
                    di bilah Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <span>
                    Pilih{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white rounded border border-gray-200 text-gray-700 font-medium">
                      <Plus size={11} /> Tambah ke Layar Utama
                    </span>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                    3
                  </span>
                  <span>Ketuk <span className="font-medium text-gray-800">Tambah</span> di pojok kanan atas.</span>
                </li>
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
