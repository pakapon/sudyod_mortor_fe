import { useState, useEffect, useRef } from 'react'
import { customerService } from '@/api/customerService'
import type { Customer } from '@/types/customer'
import { cn } from '@/lib/utils'

export function getCustomerDisplayName(c: Customer): string {
  if (c.type === 'corporate') return c.company_name || `ลูกค้า #${c.id}`
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || `ลูกค้า #${c.id}`
}

interface CustomerSearchSelectProps {
  selectedCustomer: { id: number; label: string } | null
  onSelect: (customer: Customer | null) => void
  disabled?: boolean
  error?: boolean
  placeholder?: string
}

export function CustomerSearchSelect({
  selectedCustomer,
  onSelect,
  disabled = false,
  error = false,
  placeholder = 'พิมพ์ชื่อหรือเบอร์โทรเพื่อค้นหาลูกค้า...',
}: CustomerSearchSelectProps) {
  const [inputValue, setInputValue] = useState(selectedCustomer?.label ?? '')
  const [results, setResults] = useState<Customer[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSelectedRef = useRef(selectedCustomer !== null)

  useEffect(() => {
    isSelectedRef.current = selectedCustomer !== null
    if (selectedCustomer) setInputValue(selectedCustomer.label)
    else setInputValue('')
  }, [selectedCustomer])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInputChange = (q: string) => {
    setInputValue(q)
    if (isSelectedRef.current) {
      isSelectedRef.current = false
      onSelect(null)
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await customerService.getCustomers({ search: q.trim(), limit: 8 })
        setResults(res.data.data)
        setIsOpen(true)
      } catch {
        //
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleSelect = (c: Customer) => {
    isSelectedRef.current = true
    setInputValue(getCustomerDisplayName(c))
    setResults([])
    setIsOpen(false)
    onSelect(c)
  }

  const handleClear = () => {
    isSelectedRef.current = false
    setInputValue('')
    setResults([])
    setIsOpen(false)
    onSelect(null)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:outline-none',
            error ? 'border-red-400' : selectedCustomer ? 'border-green-400 bg-green-50' : 'border-gray-200',
            disabled && 'bg-gray-50 cursor-not-allowed',
          )}
        />
        {selectedCustomer !== null && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {isSearching && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>

      {selectedCustomer !== null && (
        <p className="mt-0.5 text-xs text-green-600">รหัสลูกค้า: {selectedCustomer.id}</p>
      )}

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleSelect(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500">
                  {c.customer_code ?? `#${c.id}`}
                </span>
                <span className="flex-1 truncate font-medium text-gray-800">
                  {getCustomerDisplayName(c)}
                </span>
                {c.primary_phone && (
                  <span className="shrink-0 text-xs text-gray-400">{c.primary_phone}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !isSearching && results.length === 0 && inputValue.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
          ไม่พบลูกค้า
        </div>
      )}
    </div>
  )
}
