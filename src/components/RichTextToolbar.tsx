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
    </div>
  )
}
