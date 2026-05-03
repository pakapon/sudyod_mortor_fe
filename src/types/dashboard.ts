// ─── Service Order Status ───
export type SoStatus =
  | 'draft'
  | 'pending_review'
  | 'pending_quote'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'pending_payment'
  | 'pending_pickup'
  | 'closed'

// ─── Dashboard Stats (GET /dashboard/stats) ───
export interface DashboardStatsResponse {
  service_orders: {
    total: number
    by_status: Record<SoStatus, number>
  }
  revenue: {
    today: number
    this_month: number
    this_year: number
  }
  inventory: {
    total_products: number
    low_stock_count: number
  }
  overdue: {
    invoices: number
    store_loans: number
  }
}

// ─── Dashboard Charts (GET /dashboard/charts?period=month|year) ───
export interface ChartDataPoint {
  label: string
  value: number
}

export interface DashboardChartsResponse {
  revenue_chart: ChartDataPoint[]
  service_orders_chart: ChartDataPoint[]
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

// ─── Dashboard Activities (GET /dashboard/activities) ───
export interface DashboardActivity {
  type: 'repair' | 'sale' | 'stock' | 'customer' | 'done'
  text: string
  ref_no: string
  created_at: string
}

// ─── SO Tracking (GET /dashboard/so-tracking) ───
export interface DashboardSoTrackingItem {
  id: number
  so_number: string
  customer: string
  vehicle: string
  status: SoStatus
  technician: string
  updated_at: string
}

// ─── Receipt Item (GET /dashboard/receipts) ───
export interface DashboardReceiptItem {
  no: string
  customer: string
  type: string
  total: number
  date: string
  status: string
}

// ─── At-risk Customer (GET /dashboard/at-risk-customers) ───
export interface DashboardAtRiskCustomer {
  id: number
  name: string
  phone: string
  overdue_count: number
  overdue_amount: number
  days_overdue: number
  type: string
}
