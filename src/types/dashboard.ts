// ─── Dashboard Summary ───
export interface StatCard {
  label: string
  value: string | number
  change?: number       // e.g. +12.4 (%)
  changeLabel?: string  // e.g. "ยอดเดือนนี้ 1,235,000 ฿"
  icon: 'sales' | 'repair-new' | 'repair-done' | 'customer' | 'stock-critical'
}

export interface DashboardSummary {
  stat_cards: StatCard[]
}

// ─── Dashboard Stats (Charts) ───
export interface ChartDataPoint {
  label: string
  value: number
  value2?: number  // for stacked/grouped charts
}

export interface ServiceBreakdown {
  label: string
  value: number
  percentage: number
}

export interface AlertItem {
  id: number
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  created_at: string
}

export interface QuickReportRow {
  id: number
  document_no: string
  customer_name: string
  total: number
  date: string
}

export interface GradeStats {
  label: string
  count: number
  action_label: string
}

export interface DashboardStats {
  daily_sales_chart: ChartDataPoint[]
  repair_trend_chart: ChartDataPoint[]
  service_breakdown: ServiceBreakdown[]
  alerts: AlertItem[]
  quick_report: QuickReportRow[]
  grades?: GradeStats[]
}

// ─── Notifications ───
export interface Notification {
  id: number
  title: string
  body: string
  type: 'info' | 'warning' | 'error' | 'success'
  is_read: boolean
  created_at: string
}
