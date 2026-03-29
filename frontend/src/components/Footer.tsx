import { ChefHat } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-zinc-100 bg-white/80 py-12 backdrop-blur-md">
      <div className="mx-auto max-w-[1500px] px-6 md:px-8 lg:px-10">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-zinc-900">
              BaconFinder
            </span>
          </div>

          <div className="flex flex-col items-center gap-6 md:flex-row md:gap-10">
            <nav className="flex gap-8">
              <a href="/" className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">Home</a>
              <a href="/discover" className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">Discover</a>
              <a href="/bookmarks" className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">Bookmarks</a>
            </nav>
            
            <div className="h-4 w-px bg-zinc-200 hidden md:block" />
            
            <p className="text-sm font-medium text-zinc-400">
              © {currentYear} BaconFinder. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
