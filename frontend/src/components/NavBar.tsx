import { useState, useRef, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Home, Compass, Bookmark, Search, LogOut, User, Settings, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { authService } from "@/services/AuthService"

export function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = Boolean(localStorage.getItem("token"))
  const username = localStorage.getItem("username") || "User"

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Search", path: "/search", icon: Search },
    { name: "Discover", path: "/recommendations", icon: Compass },
    { name: "Bookmarks", path: "/bookmarks", icon: Bookmark },
  ]

  const handleLogout = () => {
    authService.logout()
    navigate("/login")
  }


  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <span className="font-bold">C</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-zinc-900">Chav</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`group relative flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-all ${
                  isActive ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Right Section (Profile / Action) */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white pl-2 pr-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline-block max-w-[100px] truncate">{username}</span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-56 transform overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/90 p-2 shadow-xl backdrop-blur-xl"
                  >
                    <div className="mb-2 px-3 pb-2 pt-1 border-b border-zinc-100">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Signed in as</p>
                      <p className="truncate text-sm font-medium text-zinc-900">{username}</p>
                    </div>
                    <div className="space-y-1">
                      <Link
                        to="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100/80 hover:text-zinc-900"
                      >
                        <User className="h-4 w-4" />
                        Account Settings
                      </Link>
                      <Link
                        to="/preferences"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100/80 hover:text-zinc-900"
                      >
                        <Settings className="h-4 w-4" />
                        Update Preferences
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                to="/login"
                className="hidden sm:flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                Log in
              </Link>
              <Link 
                to="/register"
                className="flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
