import { useEffect, useState } from "react"
import API from "../api/api"
import { getToken } from "../utils/auth"
import { resolveUploadUrl } from "../utils/url"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import { Calendar, MapPin, IndianRupee, Users } from "lucide-react"

function HostEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = getToken()

  useEffect(() => {
    API.get("/host/events", {
      headers: { Authorization: `Bearer ${token}` }   // ✅ Fixed: added auth header
    })
      .then(res => setEvents(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-10 bg-gray-50 min-h-screen">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Events</h1>
          <button
            onClick={() => navigate("/create-event")}   // ✅ Fixed: correct route
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            + Create New Event
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-400 text-center py-20">No events found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">

                {event.poster ? (
                  <img
                    src={resolveUploadUrl(event.poster)}
                    className="w-full h-40 object-cover"
                    alt={event.title}
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    <Calendar size={36} className="text-blue-300" />
                  </div>
                )}

                <div className="p-5">
                  <h2 className="text-lg font-semibold mb-2">{event.title}</h2>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mb-1">
                    <MapPin size={13} /> {event.venue}
                  </p>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mb-1">
                    <IndianRupee size={13} /> ₹{event.fee}
                  </p>
                  {event.participant_limit > 0 && (
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Users size={13} /> {event.participant_limit} spots
                    </p>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default HostEvents
