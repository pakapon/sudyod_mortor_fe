import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: { method: string; amount: number; ref?: string }) => void
  total: number
  title?: string
}

export function PaymentModal({ open, onClose, onConfirm, total, title = 'ชำระเงิน' }: PaymentModalProps) {
  const [method, setMethod] = useState<'cash' | 'transfer' | 'credit_card'>('cash')
  const [received, setReceived] = useState('')
  const [ref, setRef] = useState('')

  if (!open) return null

  const change = method === 'cash' && received ? Number(received) - total : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">ยอดที่ต้องชำระ <span className="font-bold text-blue-600">฿{total.toLocaleString()}</span></p>

        {/* Payment methods */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([['cash', '💵', 'เงินสด'], ['transfer', '🏦', 'โอน'], ['credit_card', '💳', 'บัตร']] as const).map(([v, ico, lbl]) => (
            <button key={v} onClick={() => setMethod(v)}
              className={cn('flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-medium transition-all',
                method === v ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}>
              <span className="text-xl">{ico}</span>{lbl}
            </button>
          ))}
        </div>

        {method === 'cash' && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500">รับเงินมา</label>
            <input type="number" value={received} onChange={(e) => setReceived(e.target.value)}
              placeholder={String(total)} autoFocus
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-right text-xl font-bold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {Number(received) >= total && (
              <p className="mt-1 text-right text-sm font-semibold text-green-600">ทอน: ฿{change.toLocaleString()}</p>
            )}
          </div>
        )}

        {method === 'transfer' && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500">เลขอ้างอิง / Slip</label>
            <input type="text" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="หมายเลขรายการ..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">ยกเลิก</button>
          <button onClick={() => onConfirm({ method, amount: total, ref })}
            className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm">
            ✅ ยืนยันชำระ
          </button>
        </div>
      </div>
    </div>
  )
}
