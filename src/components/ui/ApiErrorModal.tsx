import { useEffect } from 'react'
import { useErrorStore } from '@/stores/errorStore'

export function ApiErrorModal() {
  const { message, clearError } = useErrorStore()

  useEffect(() => {
    if (!message) return
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearError()
    }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [message, clearError])

  if (!message) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={clearError}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col items-center gap-5 p-8 text-center">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-9 w-9 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900">เกิดข้อผิดพลาด</h2>

          {/* Message — actual API message displayed clearly */}
          <p className="text-base leading-relaxed text-gray-700">{message}</p>

          {/* Close button */}
          <button
            onClick={clearError}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="mt-2 w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  )
}
