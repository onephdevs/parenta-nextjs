export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-white lg:flex-row">
      <aside className="flex h-[42vh] w-full flex-col border-b border-gray-200 bg-white lg:h-full lg:w-[340px] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div className="h-6 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="px-4 pb-3">
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="mt-3 flex justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-hidden px-4 pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col bg-[#E2E5F7]">
        <div className="flex-1 space-y-6 overflow-hidden px-6 py-5">
          <div className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          <div className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          <div className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white" />
        </div>
      </section>
    </div>
  );
}
