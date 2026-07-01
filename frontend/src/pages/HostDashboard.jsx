import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import API from "../api/api"
import { getToken } from "../utils/auth"
import { Calendar, Users, IndianRupee, TrendingUp, Plus, Settings, ChevronRight, MapPin, Trophy, BarChart2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { resolveUploadUrl } from "../utils/url"

const EVENT_TYPE_STYLES = {
  Technical:  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  Cultural:   { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500"   },
  Sports:     { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  Workshop:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  Seminar:    { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  Other:      { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
}

function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

function StatCard({ label, displayValue, icon, gradient, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all duration-500 ${gradient} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-wider font-semibold mb-1">{label}</p>
          <p className="text-3xl font-bold">{displayValue}</p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">{icon}</div>
      </div>
    </div>
  )
}

function DashboardEventCard({ event, onEdit }) {
  const [imgError, setImgError] = useState(false)
  const typeStyle = EVENT_TYPE_STYLES[event.event_type]

  return (
    <div
      onClick={() => onEdit(event.id)}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all duration-300"
    >
      <div className="relative">
        {event.poster && !imgError ? (
          <img
            src={resolveUploadUrl(event.poster)}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
            alt={event.title}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
            <Calendar size={28} className="text-indigo-300" />
          </div>
        )}
        {event.event_type && typeStyle && (
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`} />
              {event.event_type}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
        <div className="space-y-1 mb-3">
          <p className="text-gray-500 text-xs flex items-center gap-1.5"><MapPin size={11} className="text-blue-400" /> {event.venue}</p>
          <p className="text-gray-500 text-xs flex items-center gap-1.5">
            <IndianRupee size={11} className="text-yellow-500" />
            {event.fee === 0 ? <span className="text-green-600 font-medium">Free</span> : `₹${event.fee}`}
          </p>
          {event.prizes && (
            <p className="text-amber-600 text-xs flex items-center gap-1.5"><Trophy size={11} /> Has prizes/goodies</p>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">{event.participant_limit} spots</span>
          <span className="text-xs text-blue-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            Edit <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </div>
  )
}

function HostDashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = getToken()

  useEffect(() => {
    API.get("/host/events", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setEvents(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [])

  const totalEvents = events.length
  const totalCapacity = events.reduce((sum, e) => sum + (e.participant_limit || 0), 0)
  const avgFee = totalEvents ? Math.round(events.reduce((s, e) => s + (e.fee || 0), 0) / totalEvents) : 0

  const countEvents   = useCountUp(totalEvents)
  const countCapacity = useCountUp(totalCapacity)
  const countAvgFee   = useCountUp(avgFee)

  const stats = [
    { label: "Total Events",    displayValue: countEvents,         icon: <Calendar size={18} className="text-white" />, gradient: "bg-gradient-to-br from-blue-500 to-blue-700",    delay: 0   },
    { label: "Total Capacity",  displayValue: countCapacity,       icon: <Users size={18} className="text-white" />,    gradient: "bg-gradient-to-br from-indigo-500 to-indigo-700", delay: 100 },
    { label: "Avg Entry Fee",   displayValue: `₹${countAvgFee}`,  icon: <IndianRupee size={18} className="text-white" />, gradient: "bg-gradient-to-br from-purple-500 to-purple-700", delay: 200 },
    { label: "Active Events",   displayValue: countEvents,         icon: <TrendingUp size={18} className="text-white" />, gradient: "bg-gradient-to-br from-violet-500 to-violet-700", delay: 300 },
  ]

  const quickActions = [
    { label: "Create Event",   icon: <Plus size={18} />,      path: "/create-event",         colorClass: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" },
    { label: "Manage Events",  icon: <Settings size={18} />,  path: "/manage-events",        colorClass: "bg-white border border-gray-200 text-gray-700 hover:border-indigo-300" },
    { label: "Analytics",      icon: <BarChart2 size={18} />, path: "/host/analytics",       colorClass: "bg-white border border-gray-200 text-gray-700 hover:border-indigo-300" },
    { label: "Volunteers",     icon: <Users size={18} />,     path: "/manage-volunteers",    colorClass: "bg-white border border-gray-200 text-gray-700 hover:border-indigo-300" },
  ]

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 min-h-screen bg-gray-50">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-10 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Host Dashboard</h1>
              <p className="text-blue-100 mt-1">Welcome back! Here's your event overview.</p>
            </div>
            <button
              onClick={() => navigate("/create-event")}
              className="flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus size={16} /> Create Event
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Animated Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${action.colorClass}`}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Your Events</h2>
              {events.length > 6 && (
                <button onClick={() => navigate("/manage-events")} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  View all <ChevronRight size={14} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center gap-3 text-gray-400 py-8">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar size={28} className="text-blue-400" />
                </div>
                <p className="text-gray-700 font-semibold text-lg mb-1">No events created yet</p>
                <p className="text-gray-400 text-sm mb-5">Create your first event to get started</p>
                <button
                  onClick={() => navigate("/create-event")}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  + Create Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.slice(0, 6).map(event => (
                  <DashboardEventCard
                    key={event.id}
                    event={event}
                    onEdit={(id) => navigate(`/edit-event/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HostDashboard
