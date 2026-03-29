import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { NavBar } from "@/components/NavBar"
import { authService } from "@/services/AuthService"
import Home from "./pages/Home"
import Discover from "./pages/Discover"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Preferences from "./pages/Preferences"
import Settings from "./pages/Settings"
import SearchPage from "./pages/Search"
import Bookmarks from "./pages/Bookmarks"

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  if (!authService.isAuthenticated()) {
    const nextPath = `${location.pathname}${location.search}`
    return <Navigate to={authService.buildLoginPath(nextPath)} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recommendations" element={<Discover />} />
        <Route path="/search" element={<SearchPage />} />
        <Route
          path="/bookmarks"
          element={
            <RequireAuth>
              <Bookmarks />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/preferences"
          element={
            <RequireAuth>
              <Preferences />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
