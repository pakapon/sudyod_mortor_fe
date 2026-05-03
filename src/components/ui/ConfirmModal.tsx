import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  isOpen: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title = 'ยืนยันการดำเนินการ',
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const iconConfig = {
    danger: {
      bg: 'bg-red-100',
      icon: 'text-red-600',
      btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    },
    warning: {
      bg: 'bg-yellow-100',
      icon: 'text-yellow-600',
      btn: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400',
      path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    },
    info: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      path: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    },
  }

  const cfg = iconConfig[variant]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md transform rounded-2xl bg-white shadow-xl transition-all">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', cfg.bg)}>
              <svg
                className={cn('h-6 w-6', cfg.icon)}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={cfg.path} />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <h3
                id="confirm-modal-title"
                className="text-base font-semibold leading-6 text-gray-900"
              >
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-row-reverse gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                cfg.btn,
              )}
            >
              {isLoading && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {isLoading ? 'กำลังดำเนินการ...' : confirmLabel}
            </button>
            <button
              ref={cancelRef}
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
