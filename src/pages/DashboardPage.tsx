import { useState } from 'react'
import { cn } from '@/lib/utils'

/* ─── Mock data matching Figma dashboard ─── */
const statCards = [
  {
    label: 'ยอดขาย',
    value: '฿163.4k',
    change: 8.2,
    sublabel: 'ยอดเดือนนี้ 1,235,000 ฿',
    color: 'emerald',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: 'งานซ่อมใหม่',
    value: '9 คัน',
    change: -2.3,
    sublabel: 'รอรับรถเข้า',
    color: 'blue',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4" />
      </svg>
    ),
  },
  {
    label: 'งานซ่อมเสร็จ',
    value: '12 คัน',
    change: 15.0,
    sublabel: 'รอส่งมอบ',
    color: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: 'ลูกค้า',
    value: '68',
    change: 5.1,
    sublabel: 'ลูกค้าเดือนนี้',
    color: 'violet',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'สินค้า SKU',
    value: '5 SKU',
    change: 0,
    sublabel: 'สต็อกต่ำ',
    color: 'rose',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
]

const colorMap: Record<string, { bg: string; text: string; iconBg: string; changeBg: string; changeText: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', changeBg: 'bg-emerald-50', changeText: 'text-emerald-600' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    iconBg: 'bg-blue-100',    changeBg: 'bg-blue-50',    changeText: 'text-blue-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   iconBg: 'bg-amber-100',   changeBg: 'bg-amber-50',   changeText: 'text-amber-600' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  iconBg: 'bg-violet-100',  changeBg: 'bg-violet-50',  changeText: 'text-violet-600' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    iconBg: 'bg-rose-100',    changeBg: 'bg-rose-50',    changeText: 'text-rose-600' },
}

/* ─── Mock chart data ─── */
const salesData = [
  { label: 'จ.', value: 45 },
  { label: 'อ.', value: 72 },
  { label: 'พ.', value: 58 },
  { label: 'พฤ.', value: 85 },
  { label: 'ศ.', value: 65 },
  { label: 'ส.', value: 40 },
  { label: 'อา.', value: 30 },
]

const serviceBreakdown = [
  { label: 'ล้างรถ', value: 45, color: '#3B82F6' },
  { label: 'เปลี่ยนถ่าย', value: 30, color: '#F59E0B' },
  { label: 'ซ่อมเครื่อง', value: 15, color: '#EF4444' },
  { label: 'อื่นๆ', value: 10, color: '#8B5CF6' },
]

const recentActivities = [
  { id: 1, type: 'sale',    text: 'ขายสินค้า #INV-2025-0142 — ฿12,500', time: '10 นาทีที่แล้ว' },
  { id: 2, type: 'repair',  text: 'รับงานซ่อม #SRV-2025-0089 — Honda Wave', time: '25 นาทีที่แล้ว' },
  { id: 3, type: 'stock',   text: 'รับสินค้าเข้า #GR-2025-0031 — 24 รายการ', time: '1 ชั่วโมงที่แล้ว' },
  { id: 4, type: 'customer', text: 'ลูกค้าใหม่ — คุณสมชาย ใจดี', time: '2 ชั่วโมงที่แล้ว' },
  { id: 5, type: 'done',    text: 'งานซ่อมเสร็จ #SRV-2025-0085 — Yamaha Fino', time: '3 ชั่วโมงที่แล้ว' },
]

const tabs = ['พอร์ตการเงิน', 'ติดตามสถานะ', 'รายงานใบเสร็จเงิน', 'ลูกค้าที่มีความเสี่ยง']

/* ─── Component ─── */
export function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="space-y-6">
      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => {
          const c = colorMap[stat.color]
          return (
            <div
              key={stat.label}
              className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={cn('rounded-xl p-2.5', c.iconBg, c.text)}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {stat.change !== 0 && (
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    stat.change > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
                  )}>
                    {stat.change > 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
                  </span>
                )}
                <span className="text-xs text-gray-400">{stat.sublabel}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 sidebar-scrollbar">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={cn(
              'flex-1 shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === i
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart — Weekly Sales */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">รายรับรายเดือน / สัปดาห์</h3>
            <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              สัปดาห์นี้
            </button>
          </div>
          <div className="flex items-end gap-3" style={{ height: 200 }}>
            {salesData.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-blue-500 transition-all duration-500 hover:bg-blue-600"
                  style={{ height: `${(d.value / 100) * 180}px` }}
                />
                <span className="text-xs text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart — Service Breakdown */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">สัดส่วนงานบริการ</h3>
          <div className="flex items-center gap-8">
            {/* Simple donut via CSS */}
            <div className="relative h-40 w-40 shrink-0">
              <svg viewBox="0 0 36 36" className="h-40 w-40 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="4"
                  strokeDasharray="39.6 88" strokeDashoffset="0" className="transition-all duration-700" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4"
                  strokeDasharray="26.4 88" strokeDashoffset="-39.6" className="transition-all duration-700" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4"
                  strokeDasharray="13.2 88" strokeDashoffset="-66" className="transition-all duration-700" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#8B5CF6" strokeWidth="4"
                  strokeDasharray="8.8 88" strokeDashoffset="-79.2" className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">100</span>
                <span className="text-xs text-gray-400">งานทั้งหมด</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-3">
              {serviceBreakdown.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Activity + Quick Table ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-gray-900">อัปเดตล่าสุด</h3>
          <div className="flex flex-col gap-4">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className={cn(
                  'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                  a.type === 'sale' ? 'bg-emerald-500' :
                  a.type === 'repair' ? 'bg-blue-500' :
                  a.type === 'stock' ? 'bg-amber-500' :
                  a.type === 'done' ? 'bg-green-500' : 'bg-violet-500',
                )} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                  <p className="text-xs text-gray-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Report Table */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">รายงานใบเสร็จ</h3>
            <button className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
              ดูทั้งหมด →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left font-medium text-gray-500">เลขที่</th>
                  <th className="pb-3 text-left font-medium text-gray-500">ลูกค้า</th>
                  <th className="pb-3 text-right font-medium text-gray-500">ยอดรวม</th>
                  <th className="pb-3 text-right font-medium text-gray-500">วันที่</th>
                  <th className="pb-3 text-center font-medium text-gray-500">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { no: 'RC-2025-0142', customer: 'คุณสมชาย ใจดี', total: 12500, date: '14/04/2026', status: 'ชำระแล้ว' },
                  { no: 'RC-2025-0141', customer: 'บ.เอบีซี จำกัด', total: 45800, date: '13/04/2026', status: 'ชำระแล้ว' },
                  { no: 'RC-2025-0140', customer: 'คุณวิไล ทองคำ', total: 8900, date: '13/04/2026', status: 'รอชำระ' },
                  { no: 'RC-2025-0139', customer: 'คุณมานะ บุญมี', total: 23400, date: '12/04/2026', status: 'ชำระแล้ว' },
                  { no: 'RC-2025-0138', customer: 'คุณนภา สุขใจ', total: 6700, date: '12/04/2026', status: 'ชำระแล้ว' },
                ].map((row) => (
                  <tr key={row.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-gray-900">{row.no}</td>
                    <td className="py-3 text-gray-600">{row.customer}</td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      {row.total.toLocaleString('th-TH')} ฿
                    </td>
                    <td className="py-3 text-right text-gray-500">{row.date}</td>
                    <td className="py-3 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                        row.status === 'ชำระแล้ว'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600',
                      )}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center text-xs text-gray-400">
            Showing 1-5 of 1,000
          </div>
        </div>
      </div>
    </div>
  )
}
