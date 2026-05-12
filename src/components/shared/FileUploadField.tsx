'use client'

import { useState, useRef } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Upload, Loader2, X, FileText, ImageIcon } from 'lucide-react'

interface FileUploadFieldProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  kind?: 'avatar' | 'bukti' | 'lampiran' | 'misc'
  accept?: string
  label?: string
  disabled?: boolean
  /** Tampilkan preview gambar di samping (untuk avatar/bukti gambar) */
  showImagePreview?: boolean
}

export function FileUploadField({
  value,
  onChange,
  kind = 'misc',
  accept = 'image/*,application/pdf',
  label,
  disabled,
  showImagePreview = true,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', kind)
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
      toast.success('File berhasil diunggah')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal mengunggah')
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const isImage = value && /\.(jpe?g|png|webp|gif)$/i.test(value)
  const isPdf = value && /\.pdf$/i.test(value)

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}

      {value ? (
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
          {showImagePreview && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Preview" className="w-12 h-12 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
              {isPdf ? <FileText size={18} className="text-red-500" /> : <ImageIcon size={18} className="text-gray-400" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <a
              href={value}
              target="_blank"
              rel="noopener"
              className="text-sm text-primary hover:underline truncate block"
            >
              {value.split('/').pop()}
            </a>
            <p className="text-xs text-gray-400">Klik untuk membuka</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
              aria-label="Hapus file"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:bg-primary-light/30 hover:text-primary disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Mengunggah...
            </>
          ) : (
            <>
              <Upload size={14} /> Klik untuk pilih file
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
