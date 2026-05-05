/* ─── Shared Billing Document Canvas Renderer ─── */

function _toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function _thaiAmountText(n: number): string {
  const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']
  const cv = (num: number): string => {
    if (num <= 0) return ''
    const s = String(num); let r = ''
    for (let i = 0; i < s.length; i++) {
      const d = parseInt(s[i]); const place = s.length - 1 - i
      if (!d) continue
      if (place === 1 && d === 1) r += 'สิบ'
      else if (place === 1 && d === 2) r += 'ยี่สิบ'
      else r += ones[d] + (places[place] ?? '')
    }
    return r
  }
  const abs = Math.abs(Math.round(n))
  const mil = Math.floor(abs / 1_000_000); const rem = abs % 1_000_000
  let out = ''
  if (mil) out += cv(mil) + 'ล้าน'
  out += cv(rem) || (mil ? '' : 'ศูนย์')
  return out + 'บาทถ้วน'
}

export interface BillingDocDrawOpts {
  docTitle: string; docSubTitle?: string; docNo: string; docDate: string; docRef?: string
  branch: { name: string; address: string; phone: string; tax_id: string }
  customerName?: string; customerAddress?: string; customerPhone?: string; customerTaxId?: string
  items: Array<{ name: string; qty: number; unit_price: number; discount: number; subtotal: number }>
  subtotal: number; vatPercent: number; vatAmount: number; grandTotal: number
  note?: string; sigLeftLabel: string; sigRightLabel: string
  payment?: { method: string; amount: number; reference?: string } | null
}

export function drawBillingDocCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, opts: BillingDocDrawOpts) {
  const pad = 72; const right = w - pad; let y = 64
  const fmtN = (num: number) => _toNumber(num).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const tx = (text: string, x: number, yy: number, size: number, color = '#111827', weight = 400, align: CanvasTextAlign = 'left') => {
    ctx.font = `${weight} ${size}px sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, yy); ctx.textAlign = 'left'
  }
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  // Company (left)
  tx(opts.branch.name || 'บริษัท', pad, y + 28, 26, '#111827', 700)
  tx(opts.branch.address || '', pad, y + 54, 15, '#4b5563')
  tx(`เลขประจำตัวผู้เสียภาษี ${opts.branch.tax_id || '-'}`, pad, y + 74, 15, '#4b5563')
  tx(`โทร: ${opts.branch.phone || '-'}`, pad, y + 94, 15, '#4b5563')
  // Document title (right)
  tx(opts.docTitle, right, y + 32, 38, '#111827', 700, 'right')
  let mY = opts.docSubTitle ? y + 58 : y + 50
  if (opts.docSubTitle) { tx(opts.docSubTitle, right, mY, 15, '#6b7280', 400, 'right'); mY += 28 }
  tx(`เลขที่   ${opts.docNo}`, right, mY, 18, '#374151', 500, 'right'); mY += 24
  tx(`วันที่   ${opts.docDate}`, right, mY, 18, '#374151', 500, 'right'); mY += 24
  if (opts.docRef) tx(`อ้างอิง   ${opts.docRef}`, right, mY, 18, '#374151', 500, 'right')
  y += 140
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(right, y); ctx.stroke(); y += 28
  // Customer (optional — skip section if no customerName)
  if (opts.customerName) {
    tx('ลูกค้า', pad, y, 14, '#9ca3af', 600); y += 22
    tx(opts.customerName, pad, y, 22, '#111827', 700); y += 28
    if (opts.customerAddress) { tx(opts.customerAddress, pad, y, 15, '#4b5563'); y += 22 }
    if (opts.customerTaxId) { tx(`เลขประจำตัวผู้เสียภาษี ${opts.customerTaxId}`, pad, y, 15, '#4b5563'); y += 22 }
    if (opts.customerPhone) { tx(`โทร ${opts.customerPhone}`, pad, y, 15, '#4b5563'); y += 22 }
    y += 24
  } else {
    y += 20
  }
  // Items table
  const colW = [50, 490, 100, 150, 110, 196]
  const colX = colW.reduce((acc, _w, i) => { acc.push(i === 0 ? pad : acc[i - 1] + colW[i - 1]); return acc }, [] as number[])
  const tblW = colW.reduce((a, b) => a + b, 0); const rowH = 44
  const hdrLabels = ['#', 'รายละเอียด', 'จำนวน', 'ราคาต่อหน่วย', 'ส่วนลด', 'มูลค่า']
  const hdrAligns: CanvasTextAlign[] = ['center', 'left', 'center', 'right', 'right', 'right']
  ctx.fillStyle = '#1f2937'; ctx.fillRect(pad, y, tblW, rowH)
  hdrLabels.forEach((lbl, i) => {
    const cx = hdrAligns[i] === 'center' ? colX[i] + colW[i] / 2 : hdrAligns[i] === 'right' ? colX[i] + colW[i] - 10 : colX[i] + 10
    tx(lbl, cx, y + 28, 16, '#fff', 600, hdrAligns[i])
  }); y += rowH
  opts.items.slice(0, 22).forEach((item, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#fff' : '#f9fafb'; ctx.fillRect(pad, y, tblW, rowH)
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 0.5; ctx.strokeRect(pad, y, tblW, rowH)
    const by = y + 28
    tx(String(idx + 1), colX[0] + colW[0] / 2, by, 16, '#374151', 400, 'center')
    tx(item.name || '-', colX[1] + 10, by, 16, '#111827')
    tx(String(_toNumber(item.qty)), colX[2] + colW[2] / 2, by, 16, '#374151', 400, 'center')
    tx(fmtN(_toNumber(item.unit_price)), colX[3] + colW[3] - 10, by, 16, '#374151', 400, 'right')
    tx(fmtN(_toNumber(item.discount || 0)), colX[4] + colW[4] - 10, by, 16, '#374151', 400, 'right')
    tx(fmtN(_toNumber(item.subtotal)), colX[5] + colW[5] - 10, by, 16, '#111827', 500, 'right'); y += rowH
  })
  if (opts.items.length > 22) { tx(`... และอีก ${opts.items.length - 22} รายการ`, pad + 10, y + 28, 14, '#9ca3af'); y += rowH }
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + tblW, y); ctx.stroke(); y += 24
  // Totals (right-aligned)
  const totX = right - 380; const totRowH = 32
  tx('รวมเป็นเงิน', totX, y + 22, 17, '#4b5563'); tx(`${fmtN(_toNumber(opts.subtotal))} บาท`, right, y + 22, 17, '#374151', 500, 'right'); y += totRowH
  tx(`ภาษีมูลค่าเพิ่ม ${_toNumber(opts.vatPercent, 7)}%`, totX, y + 22, 17, '#4b5563'); tx(`${fmtN(_toNumber(opts.vatAmount))} บาท`, right, y + 22, 17, '#374151', 500, 'right'); y += totRowH
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(totX, y + 4); ctx.lineTo(right, y + 4); ctx.stroke(); y += 10
  tx('จำนวนเงินรวมทั้งสิ้น', totX, y + 28, 19, '#111827', 700); tx(`${fmtN(_toNumber(opts.grandTotal))} บาท`, right, y + 28, 22, '#111827', 700, 'right'); y += 46
  // Thai text amount
  tx(`(${_thaiAmountText(_toNumber(opts.grandTotal))})`, pad, y, 17, '#374151'); y += 44
  // Payment info section (for receipts)
  if (opts.payment) {
    const methodLabels: Record<string, string> = { cash: 'เงินสด', transfer: 'โอนเงิน', credit_card: 'บัตรเครดิต', cheque: 'เช็ค' }
    const methodLabel = methodLabels[opts.payment.method] ?? opts.payment.method
    const payX = totX
    ctx.strokeStyle = '#d1fae5'; ctx.lineWidth = 1
    ctx.fillStyle = '#f0fdf4'; ctx.fillRect(pad, y - 6, tblW, opts.payment.reference ? 82 : 62)
    ctx.strokeRect(pad, y - 6, tblW, opts.payment.reference ? 82 : 62)
    tx('ข้อมูลการชำระเงิน', pad + 12, y + 14, 14, '#16a34a', 600); y += 28
    tx('วิธีชำระเงิน', payX, y + 6, 16, '#4b5563'); tx(methodLabel, right, y + 6, 16, '#111827', 600, 'right'); y += 26
    if (opts.payment.reference) {
      const displayRef = opts.payment.reference.replace(/\s*\|\s*discount:[0-9.]+/g, '').trim()
      if (displayRef) { tx('เลขอ้างอิง', payX, y + 6, 16, '#4b5563'); tx(displayRef, right, y + 6, 16, '#111827', 500, 'right'); y += 26 }
    }
    y += 6
  }
  // Note
  if (opts.note) { tx('หมายเหตุ', pad, y, 14, '#9ca3af', 600); y += 22; tx(opts.note, pad, y, 15, '#4b5563') }
  // Signature — always at bottom of page
  const sigY = h - 210
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1; ctx.beginPath()
  ctx.moveTo(pad + 20, sigY); ctx.lineTo(pad + 310, sigY)
  ctx.moveTo(right - 310, sigY); ctx.lineTo(right - 20, sigY); ctx.stroke()
  tx(opts.sigLeftLabel, pad + 165, sigY + 28, 15, '#6b7280', 400, 'center')
  tx('วันที่ ____________________', pad + 165, sigY + 52, 14, '#9ca3af', 400, 'center')
  tx(`ในนาม ${opts.customerName || 'ลูกค้า'}`, pad + 165, sigY + 78, 13, '#374151', 400, 'center')
  tx(opts.sigRightLabel, right - 165, sigY + 28, 15, '#6b7280', 400, 'center')
  tx('วันที่ ____________________', right - 165, sigY + 52, 14, '#9ca3af', 400, 'center')
  tx(`ในนาม ${opts.branch.name}`, right - 165, sigY + 78, 13, '#374151', 400, 'center')
  tx('Sudyod Motor', w / 2, h - 30, 13, '#d1d5db', 400, 'center')
}
