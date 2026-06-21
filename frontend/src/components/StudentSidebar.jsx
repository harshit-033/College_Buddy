import { LayoutDashboard, Ticket, Home, LogOut, User, Shield } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { logout } from "../utils/auth"

function StudentSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const navItems = [
    { path: "/events", icon: <Home size={18} />, label: "Discover Events" },
    { path: "/my-tickets", icon: <Ticket size={18} />, label: "My Tickets" },
    { path: "/student/volunteer", icon: <Shield size={18} />, label: "Volunteer Dashboard" },
  ]

  return (
    <div className="w-60 bg-white shadow-md h-screen p-5 flex flex-col justify-between sticky top-0">

      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
            <img src="/logo.png" alt="CollegeBuddy Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">COLLEGE_BUDDY</h1>
        </div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 px-3">Student Portal</p>

        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex gap-3 items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? "bg-blue-50 text-blue-600 font-semibold shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="border-t border-gray-100 pt-3 mb-2"></div>
        <button 
          onClick={() => navigate("/profile")}
          className={`flex gap-3 items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
            location.pathname === "/profile" ? "bg-blue-50 text-blue-600 font-semibold shadow-sm" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <User size={18} /> My Account
        </button>
        <button
          onClick={handleLogout}
          className="flex gap-3 items-center px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

    </div>
  )
}

export default StudentSidebar
