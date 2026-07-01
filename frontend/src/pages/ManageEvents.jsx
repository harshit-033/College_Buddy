import { useEffect, useState } from "react"
import API from "../api/api"
import { getToken } from "../utils/auth"
import { resolveUploadUrl } from "../utils/url"
import Sidebar from "../components/Sidebar"
import { useNavigate } from "react-router-dom"
import { Calendar, MapPin, IndianRupee, Users, Pencil, Trash2, Plus, Trophy } from "lucide-react"
import { toast } from "react-hot-toast"

const EVENT_TYPE_STYLES = {
  Technical:  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  Cultural:   { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500"   },
  Sports:     { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  Workshop:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  Seminar:    { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  Other:      { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
}

function EventManageCard({ event, onEdit, onDelete, isDeleting }) {
  const [imgError, setImgError] = useState(false)
  const typeStyle = EVENT_TYPE_STYLES[event.event_type]

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative">
        {event.poster && !imgError ? (
          <img
            src={resolveUploadUrl(event.poster)}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
            alt={event.title}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
            <Calendar size={36} className="text-indigo-300" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {event.event_type && typeStyle && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${typeStyle.bg} ${typeStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`} />
              {event.event_type}
            </span>
          )}
          {event.prizes && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 backdrop-blur-sm">
              <Trophy size={10} /> Prizes
            </span>
          )}
        </div>

        {event.fee === 0 && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-500 text-white shadow">FREE</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-base font-bold text-gray-800 mb-2 line-clamp-1">{event.title}</h2>
        <div className="space-y-1 mb-4">
          <p className="text-gray-500 text-xs flex items-center gap-1.5">
            <MapPin size={12} className="text-blue-400" /> {event.venue}
          </p>
          <p className="text-gray-500 text-xs flex items-center gap-1.5">
            <IndianRupee size={12} className="text-yellow-500" />
            {event.fee === 0 ? <span className="text-green-600 font-medium">Free</span> : `₹${event.fee}`}
          </p>
          {event.participant_limit > 0 && (
            <p className="text-gray-500 text-xs flex items-center gap-1.5">
              <Users size={12} className="text-indigo-400" /> {event.participant_limit} spots
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(event.id)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white px-3 py-2 rounded-xl text-xs flex-1 justify-center font-semibold transition-all hover:shadow-md"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={() => onDelete(event.id)}
            disabled={isDeleting}
            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 px-3 py-2 rounded-xl text-xs flex-1 justify-center font-semibold transition-all disabled:opacity-50"
          >
            <Trash2 size={12} />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ManageEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()
  const token = getToken()

  const fetchEvents = () => {
    setLoading(true)
    API.get("/host/events", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setEvents(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [])

  const deleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return
    setDeletingId(id)
    try {
      await API.delete(`/delete-event/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      setEvents(events.filter(ev => ev.id !== id))
      toast.success("Event deleted")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-10 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Manage Events</h1>
              <p className="text-blue-100 mt-1">
                {events.length} event{events.length !== 1 ? "s" : ""} total
              </p>
            </div>
            <button
              onClick={() => navigate("/create-event")}
              className="flex items-center gap-2 bg-white text-indigo-700 px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus size={16} /> Create New Event
            </button>
          </div>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex items-center gap-3 text-gray-400 py-10">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-blue-400" />
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-1">No events yet</p>
              <p className="text-gray-400 text-sm mb-5">Create your first event to get started</p>
              <button
                onClick={() => navigate("/create-event")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                + Create your first event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map(event => (
                <EventManageCard
                  key={event.id}
                  event={event}
                  onEdit={(id) => navigate(`/edit-event/${id}`)}
                  onDelete={deleteEvent}
                  isDeleting={deletingId === event.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ManageEvents
