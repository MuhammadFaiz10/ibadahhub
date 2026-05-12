'use client'

import { useState } from 'react'
import { Copy, Check, KeyRound, AlertTriangle } from 'lucide-react'

interface PasswordModalProps {
  open: boolean
  onClose: () => void
  password: string | null
  title?: string
  description?: string
  userName?: string
}

export function PasswordModal({
  open,
  onClose,
  password,
  title = 'Password Sementara',
  description = 'Salin password ini sekarang dan bagikan ke pengurus yang bersangkutan. Setelah modal ditutup, password tidak dapat dilihat kembali.',
  userName,
}: PasswordModalProps) {
  const [copied, setCopied] = useState(false)

  if (!open || !password) return null

  async function handleCopy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  function handleClose() {
    setCopied(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <KeyRound size={18} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {userName && (
              <p className="text-sm text-gray-500">untuk {userName}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">{description}</p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={password}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 px-3 py-2.5 font-mono text-sm border border-gray-300 rounded-lg bg-gray-50 select-all"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2.5 text-sm rounded-lg transition-colors flex items-center gap-2 font-medium ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2 items-start">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Pengurus disarankan mengganti password ini setelah login pertama.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
