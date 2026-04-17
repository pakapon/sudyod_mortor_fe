import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type ActionVariant = 'edit' | 'delete' | 'view' | 'config'

const VARIANT_STYLES: Record<ActionVariant, string> = {
  edit:   'border-gray-200 text-gray-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200',
  delete: 'border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600',
  view:   'border-blue-200 text-blue-400 hover:bg-blue-50 hover:text-blue-600',
  config: 'border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700',
}

const VARIANT_ICON_PATHS: Record<ActionVariant, string> = {
  edit:   'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  view:   'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  config: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
}

const VARIANT_DEFAULT_TITLES: Record<ActionVariant, string> = {
  edit:   'แก้ไข',
  delete: 'ลบ',
  view:   'ดูรายละเอียด',
  config: 'กำหนดสิทธิ์',
}

const BASE_CLASS =
  'inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors'

interface ActionIconButtonProps {
  variant: ActionVariant
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  title?: string
  disabled?: boolean
  className?: string
}

interface ActionIconLinkProps {
  variant: ActionVariant
  to: string
  title?: string
  className?: string
}

function ActionIcon({ variant }: { variant: ActionVariant }) {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d={VARIANT_ICON_PATHS[variant]}
      />
    </svg>
  )
}

export function ActionIconButton({
  variant,
  onClick,
  title,
  disabled,
  className,
}: ActionIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? VARIANT_DEFAULT_TITLES[variant]}
      disabled={disabled}
      className={cn(
        BASE_CLASS,
        VARIANT_STYLES[variant],
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      <ActionIcon variant={variant} />
    </button>
  )
}

export function ActionIconLink({ variant, to, title, className }: ActionIconLinkProps) {
  return (
    <Link
      to={to}
      title={title ?? VARIANT_DEFAULT_TITLES[variant]}
      className={cn(BASE_CLASS, VARIANT_STYLES[variant], className)}
    >
      <ActionIcon variant={variant} />
    </Link>
  )
}
