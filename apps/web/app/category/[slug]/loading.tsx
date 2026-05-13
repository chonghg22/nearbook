export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 animate-pulse">
      <div className="mb-8 rounded-[2rem] bg-gray-200 h-40" />
      <div className="mb-8 rounded-2xl bg-gray-100 h-20" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-gray-100 bg-white p-3">
            <div className="aspect-[2/3] rounded-2xl bg-gray-200" />
            <div className="mt-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
