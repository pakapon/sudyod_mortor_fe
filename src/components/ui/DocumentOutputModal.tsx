import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface DocumentOutputAction {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'blue' | 'green' | 'amber' | 'gray'
}

interface DocumentOutputModalProps {
  isOpen: boolean
  title: string
  subtitle?: string
  previewUrl?: string | null
  previewAlt?: string
  actions: DocumentOutputAction[]
  footerText?: string
  footerHint?: string
  footerLinks?: Array<{ label: string; url: string }>
  onClose: () => void
}

const toneClass: Record<NonNullable<DocumentOutputAction['tone']>, string> = {
  blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900',
  green: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900',
  amber: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900',
  gray: 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-900',
}

export function DocumentOutputModal({
  isOpen,
  title,
  subtitle,
  previewUrl,
  previewAlt = 'document-preview',
  actions,
  footerText,
  footerHint,
  footerLinks,
  onClose,
}: DocumentOutputModalProps) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h4 className="text-lg font-bold text-gray-900">{title}</h4>
            {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <div className="aspect-[210/297] w-full">
                {previewUrl ? (
                  <img src={previewUrl} alt={previewAlt} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">ยังไม่มีตัวอย่างเอกสาร</div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="flex h-full flex-col justify-start gap-2">
              {actions.map((action) => (
                <button
                  key={action.key}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    toneClass[action.tone ?? 'gray'],
                  )}
                >
                  <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/10 text-current">
                    {action.icon}
                  </div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="mt-1 text-xs opacity-80">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {(footerText || footerHint || (footerLinks && footerLinks.length > 0)) ? (
          <div className="border-t border-gray-100 px-4 py-3">
            {footerText ? <p className="text-xs text-gray-500">{footerText}</p> : null}
            {footerLinks && footerLinks.length > 0 ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {footerLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-gray-700">{item.url}</p>
                  </a>
                ))}
              </div>
            ) : null}
            {footerHint ? <p className="mt-1 truncate text-xs text-gray-400">{footerHint}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}