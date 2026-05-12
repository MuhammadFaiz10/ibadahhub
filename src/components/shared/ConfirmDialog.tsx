'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (alasan: string) => Promise<void>
  title?: string
  description?: string
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Konfirmasi Hapus',
  description = 'Data yang dihapus tidak akan muncul di daftar aktif, namun tetap tersimpan di arsip.',
  isLoading = false,
}: ConfirmDialogProps) {
  const [alasan, setAlasan] = useState('')

  if (!open) return null

  async function handleConfirm() {
    if (!alasan.trim()) return
    await onConfirm(alasan)
    setAlasan('')
  }

  function handleClose() {
    if (isLoading) return
    setAlasan('')
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">{description}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alasan penghapusan <span className="text-red-500">*</span>
          </label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Tuliskan alasan penghapusan data ini..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!alasan.trim() || isLoading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            Hapus Data
          </button>
        </div>
      </div>
    </div>
  )
}
