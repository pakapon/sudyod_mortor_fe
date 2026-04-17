import { cn } from '@/lib/utils'

interface TimeSelect24hProps {
  value?: string | null
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

export function TimeSelect24h({ value, onChange, disabled, className }: TimeSelect24hProps) {
  const [hh, mm] = (value ?? '08:00').split(':')
  const hour = hh?.padStart(2, '0') ?? '08'
  const minute = mm?.padStart(2, '0') ?? '00'
  // Snap minute to nearest 5-min slot
  const snappedMinute = MINUTES.includes(minute) ? minute : MINUTES.reduce((prev, cur) =>
    Math.abs(parseInt(cur) - parseInt(minute)) < Math.abs(parseInt(prev) - parseInt(minute)) ? cur : prev
  )

  const handleHour = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(`${e.target.value}:${snappedMinute}`)
  }

  const handleMinute = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(`${hour}:${e.target.value}`)
  }

  const selectClass = cn(
    'rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900',
    'focus:border-red-500 focus:ring-red-500 cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <select value={hour} onChange={handleHour} disabled={disabled} className={selectClass}>
        {HOURS.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-gray-500 font-semibold text-base select-none">:</span>
      <select value={snappedMinute} onChange={handleMinute} disabled={disabled} className={selectClass}>
        {MINUTES.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <span className="text-xs text-gray-400 select-none">น.</span>
    </div>
  )
}
