'use client'

// 검색어 없을 때 보여줄 인기 검색어 (정적 or API)
const DEFAULTS = ['한강', '채식주의자', '아몬드', '82년생 김지영', '불편한 편의점']

export function PopularQueries({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="mt-12 text-center">
      <p className="text-sm font-medium text-gray-700 mb-4">인기 검색어</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {DEFAULTS.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-sm bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
