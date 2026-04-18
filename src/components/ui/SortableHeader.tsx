import { cn } from '@/lib/utils'

interface SortableHeaderProps {
  label: string
  sortKey: string
  activeSortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  className?: string
}

export function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = sortKey === activeSortKey

  return (
    <th
      className={cn(
        'px-6 py-4 font-semibold cursor-pointer select-none whitespace-nowrap group',
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="inline-flex items-center gap-1.5">
        <span>{label}</span>
        <span className="flex flex-col gap-px leading-none">
          {/* Up arrow (asc) */}
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="currentColor"
            className={cn(
              'transition-colors',
              isActive && sortDir === 'asc'
                ? 'text-red-600'
                : 'text-gray-300 group-hover:text-gray-400',
            )}
          >
            <path d="M4 0L7.46 5H.54L4 0Z" />
          </svg>
          {/* Down arrow (desc) */}
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="currentColor"
            className={cn(
              'transition-colors',
              isActive && sortDir === 'desc'
                ? 'text-red-600'
                : 'text-gray-300 group-hover:text-gray-400',
            )}
          >
            <path d="M4 5L.54 0H7.46L4 5Z" />
          </svg>
        </span>
      </div>
    </th>
  )
}
