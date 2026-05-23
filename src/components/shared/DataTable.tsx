'use client'

import { EmptyState } from './EmptyState'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T extends { id?: number | string }>({
  data,
  columns,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / limit)
  const start = Math.min((page - 1) * limit + 1, total)
  const end = Math.min(page * limit, total)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin -webkit-overflow-scrolling-touch">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 sm:px-4 py-3 text-left text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 sm:px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={(row as { id?: number | string }).id ?? idx} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 sm:px-4 py-3 text-gray-700 ${col.className ?? ''}`}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      {!isLoading && total > 0 && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-[11px] sm:text-xs text-gray-500">
              {start}–{end} <span className="text-gray-400">dari {total}</span>
            </span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Jumlah baris per halaman"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n}/hal</option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-2.5 sm:px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Halaman sebelumnya"
              >
                ←
              </button>

              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[34px] px-2 py-1.5 text-xs border rounded ${
                      pageNum === page
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-2.5 sm:px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Halaman berikutnya"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
