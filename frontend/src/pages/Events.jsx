import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import API from "../api/api"
import { getUserId, getToken } from "../utils/auth"
import { resolveUploadUrl } from "../utils/url"
import StudentSidebar from "../components/StudentSidebar"
import { MapPin, IndianRupee, Users, Calendar, Search, X, ChevronRight, Tag, Trophy, Clock } from "lucide-react"
import { toast } from "react-hot-toast"

const EVENT_TYPE_STYLES = {
  Technical:  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  Cultural:   { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500"   },
  Sports:     { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  Workshop:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  Seminar:    { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  Other:      { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
}

const FILTER_TYPES = ["All", "Technical", "Cultural", "Sports", "Workshop", "Seminar", "Other"]

function EventCard({ event, onNavigate }) {
  const typeStyle = EVENT_TYPE_STYLES[event.event_type] || null
  const isFree = !event.applicable_fee || event.applicable_fee === 0
  const isVolunteerDiscount = event.volunteer_status === "approved" && event.volunteer_fee < event.fee
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={() => onNavigate(event.id)}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-indigo-100 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Poster */}
      <div className="relative overflow-hidden">
        {event.poster && !imgError ? (
          <img
            src={resolveUploadUrl(event.poster)}
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
            alt={event.title}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-44 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center">
            <Calendar size={40} className="text-white/30" />
          </div>
        )}

        {/* overlay badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Event type badge */}
        {event.event_type && typeStyle && (
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${typeStyle.bg} ${typeStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`} />
              {event.event_type}
            </span>
          </div>
        )}

        {/* Prize indicator */}
        {event.prizes && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 backdrop-blur-sm">
              <Trophy size={10} /> Prizes
            </span>
          </div>
        )}

        {/* Free badge */}
        {isFree && (
          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-500 text-white shadow">
              FREE
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="text-base font-bold text-gray-800 mb-2 leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {event.title}
        </h2>

        <div className="space-y-1 mb-3">
          <p className="text-gray-500 text-xs flex items-center gap-1.5">
            <MapPin size={12} className="text-blue-400 flex-shrink-0" />
            <span className="truncate">{event.venue}</span>
          </p>

          {event.event_date && (
            <p className="text-gray-500 text-xs flex items-center gap-1.5">
              <Clock size={12} className="text-purple-400 flex-shrink-0" />
              {new Date(event.event_date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </p>
          )}

          <p className="text-xs flex items-center gap-1.5">
            <IndianRupee size={12} className="text-yellow-500 flex-shrink-0" />
            {isFree ? (
              <span className="text-green-600 font-semibold">Free</span>
            ) : isVolunteerDiscount ? (
              <span>
                <span className="line-through text-gray-400 mr-1">₹{event.fee}</span>
                <span className="text-emerald-600 font-semibold">₹{event.volunteer_fee}</span>
              </span>
            ) : (
              <span className="text-gray-700 font-medium">₹{event.fee}</span>
            )}
          </p>

          {event.participant_limit > 0 && (
            <p className="text-gray-500 text-xs flex items-center gap-1.5">
              <Users size={12} className="text-indigo-400 flex-shrink-0" />
              {event.participant_limit} spots
            </p>
          )}
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className={`text-xs font-semibold ${event.has_ticket ? "text-green-600" : "text-blue-600"}`}>
            {event.has_ticket ? "✓ Registered" : "Tap to view →"}
          </span>
          <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-all duration-200">
            <ChevronRight size={14} className="text-blue-400 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Events() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [activeFilter, setActiveFilter] = useState("All")

  const fetchEvents = useCallback((search = "") => {
    const token = getToken()
    setLoading(true)
    const params = search ? { search } : {}
    API.get("/events", {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setEvents(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchEvents() }, [])

  const handleSearch = (value) => {
    setSearchQuery(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => fetchEvents(value), 300)
    setSearchTimeout(timeout)
  }

  const clearSearch = () => {
    setSearchQuery("")
    fetchEvents("")
  }

  const filteredEvents = activeFilter === "All"
    ? events
    : events.filter(e => e.event_type === activeFilter)

  return (
    <div className="flex">
      <StudentSidebar />

      <div className="flex-1 min-h-screen bg-gray-50">

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-10 py-8">
          <h1 className="text-3xl font-bold text-white mb-1">Discover Events</h1>
          <p className="text-blue-100 mb-6">Find and register for events on your campus</p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="event-search-bar"
              type="text"
              placeholder="Search events, venues, organizations..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-xl border-0 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-gray-800 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="p-8">
          {/* Filter pills */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Tag size={14} className="text-gray-400" />
            {FILTER_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeFilter === type
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {type}
              </button>
            ))}
            {activeFilter !== "All" && (
              <span className="text-xs text-gray-400 ml-1">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {searchQuery && (
            <p className="text-gray-500 mb-4 text-sm">
              Results for <span className="font-medium text-gray-700">"{searchQuery}"</span>
              {!loading && <span> — {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found</span>}
            </p>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Loading events...
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium">
                {searchQuery ? "No events match your search" : activeFilter !== "All" ? `No ${activeFilter} events` : "No events yet"}
              </p>
              <p className="text-sm mt-1">
                {searchQuery ? "Try different keywords or clear the search" : "Check back later for upcoming events"}
              </p>
              {(searchQuery || activeFilter !== "All") && (
                <button
                  onClick={() => { clearSearch(); setActiveFilter("All") }}
                  className="mt-4 text-blue-600 font-medium hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onNavigate={(id) => navigate(`/events/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Events
