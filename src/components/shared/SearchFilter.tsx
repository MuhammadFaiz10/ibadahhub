'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  children?: React.ReactNode
}

export function SearchFilter({
  value,
  onChange,
  placeholder = 'Cari...',
  children,
}: SearchFilterProps) {
  const [inputValue, setInputValue] = useState(value)
  const debounced = useDebounce(inputValue, 300)

  useEffect(() => {
    onChange(debounced)
  }, [debounced, onChange])

  useEffect(() => {
    setInputValue(value)
  }, [value])

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 items-center mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => setInputValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
