export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-zinc-900">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Your Feed</h1>
          <p className="mt-2 text-zinc-500">Delicious recipes curated just for you.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Placeholder for Recipe Cards */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="group cursor-pointer overflow-hidden rounded-[2rem] border border-zinc-200/60 bg-white p-2 shadow-sm transition-all hover:shadow-md">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
                {/* Image Placeholder */}
                <div className="h-full w-full bg-zinc-200 transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    Dinner
                  </span>
                  <span className="text-xs font-medium text-zinc-500">30 mins</span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-zinc-900 line-clamp-1">
                  Recipe Name Placeholder
                </h3>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}