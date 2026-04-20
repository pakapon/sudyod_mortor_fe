import { cn } from "@/lib/utils"

function PaperClipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export function RichTextToolbar() {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-1.5 flex-wrap">
      {['B', 'I', 'U'].map((t) => (
        <button key={t} type="button" className="w-6 h-6 rounded text-xs font-bold text-gray-600 hover:bg-gray-200 flex items-center justify-center font-serif">
          {t}
        </button>
      ))}
      <div className="mx-1 h-4 w-px bg-gray-200" />
      <button type="button" className="w-6 h-6 rounded text-gray-600 hover:bg-gray-200 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
      </button>
      <button type="button" className="w-6 h-6 rounded text-gray-600 hover:bg-gray-200 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>
      </button>
      <button type="button" className="w-6 h-6 rounded text-gray-600 hover:bg-gray-200 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
         <button type="button" className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors">
            <PaperClipIcon />
            แนบไฟล์
         </button>
         <button type="button" className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors">
            <ImageIcon />
            แทรกรูป
         </button>
      </div>
    </div>
  )
}
