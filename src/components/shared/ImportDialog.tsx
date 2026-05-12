'use client'

import { useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Upload, Loader2, X, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: { row: number; nama?: string; reason: string }[]
}

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  endpoint: string
  /** Field tambahan yang akan dikirim bersama file (mis. religionId untuk superadmin) */
  extraFields?: Record<string, string | number | undefined>
  /** Deskripsi yang ditampilkan di dialog */
  description?: string
  /** Daftar kolom yang diharapkan (untuk panduan user) */
  columns?: string[]
  title?: string
}

export function ImportDialog({
  open,
  onClose,
  onSuccess,
  endpoint,
  extraFields = {},
  description,
  columns,
  title = 'Import Data',
}: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  if (!open) return null

  function reset() {
    setFile(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    if (uploading) return
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      Object.entries(extraFields).forEach(([k, v]) => {
        if (v !== undefined) formData.append(k, String(v))
      })
      const res = await axios.post<ImportResult>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      if (res.data.imported > 0) {
        toast.success(`${res.data.imported} data berhasil diimport`)
        onSuccess?.()
      } else if (res.data.errors.length > 0) {
        toast.error('Tidak ada data yang berhasil diimport')
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal mengimport file')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Total Baris</p>
                  <p className="text-xl font-bold text-gray-900">{result.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-emerald-700">Berhasil</p>
                  <p className="text-xl font-bold text-emerald-700">{result.imported}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-700">Dilewati</p>
                  <p className="text-xl font-bold text-amber-700">{result.skipped}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" />
                    Detail baris yang dilewati
                  </h3>
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">Baris</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">Nama</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">Alasan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.errors.slice(0, 50).map((e, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-gray-500">#{e.row}</td>
                            <td className="px-3 py-1.5 text-gray-700">{e.nama ?? '—'}</td>
                            <td className="px-3 py-1.5 text-amber-700">{e.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.errors.length > 50 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Menampilkan 50 dari {result.errors.length} kesalahan
                    </p>
                  )}
                </div>
              )}

              {result.imported > 0 && result.errors.length === 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    Semua {result.imported} data berhasil diimport tanpa kesalahan.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}

              {columns && columns.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Kolom yang dibutuhkan:</p>
                  <p className="text-xs text-blue-700 font-mono">{columns.join(', ')}</p>
                </div>
              )}

              {file ? (
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="w-10 h-10 rounded bg-white border border-gray-200 flex items-center justify-center">
                    <FileSpreadsheet size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    disabled={uploading}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:bg-primary-light/30 hover:text-primary transition-colors flex flex-col items-center gap-2"
                >
                  <Upload size={20} />
                  <span>Klik untuk pilih file (.xlsx, .xls, .csv)</span>
                  <span className="text-xs text-gray-400">Maks 5 MB</span>
                </button>
              )}

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setFile(f)
                }}
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {result ? (
            <>
              <button
                onClick={reset}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white"
              >
                Import Lagi
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Selesai
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={uploading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || uploading}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading && <Loader2 size={14} className="animate-spin" />}
                Import
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
