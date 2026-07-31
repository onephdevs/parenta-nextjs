export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-white lg:flex-row">
      <aside className="flex h-[42vh] w-full flex-col border-b border-gray-200 bg-white lg:h-full lg:w-[340px] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-4 pb-3 pt-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="mt-3 flex justify-between">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-36 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="flex-1 space-y-0 overflow-hidden px-4 pb-4">
          <div className="overflow-hidden rounded-xl border border-gray-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse border-b border-gray-50 bg-gray-50" />
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col bg-[#E2E5F7]">
        <div className="flex-1 space-y-6 overflow-hidden px-6 py-5">
          <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white" />
        </div>
      </section>
    </div>
  );
}
