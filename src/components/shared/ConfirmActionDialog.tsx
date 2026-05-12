'use client'

import { useState } from 'react'
import { Loader2, AlertTriangle, KeyRound, Trash2, Check, X } from 'lucide-react'

type Variant = 'danger' | 'warning' | 'primary' | 'success'

const variantStyle: Record<
  Variant,
  { iconBg: string; iconColor: string; button: string; defaultIcon: React.ReactNode }
> = {
  danger: {
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700',
    defaultIcon: <Trash2 size={18} />,
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    defaultIcon: <AlertTriangle size={18} />,
  },
  primary: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    button: 'bg-primary hover:bg-primary-dark',
    defaultIcon: <KeyRound size={18} />,
  },
  success: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    defaultIcon: <Check size={18} />,
  },
}

interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason?: string) => Promise<void> | void
  title: string
  description?: string
  variant?: Variant
  icon?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Tampilkan textarea alasan, dan kirim ke onConfirm. Kalau true, "required" oleh default */
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  isLoading?: boolean
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  variant = 'primary',
  icon,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  requireReason = false,
  reasonLabel = 'Alasan',
  reasonPlaceholder = 'Tuliskan alasan...',
  isLoading = false,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = useState('')
  const v = variantStyle[variant]

  if (!open) return null

  function handleClose() {
    if (isLoading) return
    setReason('')
    onOpenChange(false)
  }

  async function handleConfirm() {
    if (requireReason && !reason.trim()) return
    await onConfirm(requireReason ? reason : undefined)
    setReason('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full ${v.iconBg} ${v.iconColor} flex items-center justify-center flex-shrink-0`}>
              {icon ?? v.defaultIcon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {description && (
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{description}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              aria-label="Tutup"
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {requireReason && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {reasonLabel} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || (requireReason && !reason.trim())}
              className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${v.button}`}
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
