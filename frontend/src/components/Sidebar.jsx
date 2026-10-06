import { useState } from "react"
import { LayoutDashboard, Calendar, BarChart, User, LogOut, Users, Menu, X } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { logout } from "../utils/auth"

function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const navItems = [
    { path: "/host", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { path: "/manage-events", icon: <Calendar size={18} />, label: "Manage Events" },
    { path: "/manage-volunteers", icon: <Users size={18} />, label: "Manage Volunteers" },
    { path: "/host/analytics", icon: <BarChart size={18} />, label: "Analytics" },
  ]

  const handleNav = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-5">
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
              <img src="/logo.png" alt="CollegeBuddy Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">COLLEGE_BUDDY</h1>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 px-3">Host Panel</p>

        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`flex gap-3 items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-left w-full ${
                location.pathname === item.path
                  ? "bg-blue-50 text-blue-600 font-semibold shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
              }`}
            >
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="border-t border-gray-100 pt-3 mb-2"></div>
        <button
          onClick={() => handleNav("/profile")}
          className={`flex gap-3 items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-left w-full ${
            location.pathname === "/profile" ? "bg-blue-50 text-blue-600 font-semibold shadow-sm" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <User size={18} /> <span>My Account</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex gap-3 items-center px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-200 text-left w-full"
        >
          <LogOut size={18} /> <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Top Navbar (shown on mobile & tablet) */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 shadow-xs">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            COLLEGE_BUDDY
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop & Tablet Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-white shadow-md h-screen sticky top-0 shrink-0 z-20 flex-col">
        {sidebarContent}
      </aside>
    </>
  )
}

export default Sidebar
