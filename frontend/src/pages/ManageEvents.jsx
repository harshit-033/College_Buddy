import { useEffect, useState } from "react"
import API from "../api/api"
import { getToken } from "../utils/auth"
import { resolveUploadUrl } from "../utils/url"
import Sidebar from "../components/Sidebar"
import { useNavigate } from "react-router-dom"
import { Calendar, MapPin, IndianRupee, Users, Pencil, Trash2 } from "lucide-react"
import { toast } from "react-hot-toast"

function ManageEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = getToken()

  const fetchEvents = () => {
    setLoading(true)
    API.get("/host/events", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setEvents(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents()
  }, [])

  const deleteEvent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return

    try {
      await API.delete(`/delete-event/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEvents(events.filter(e => e.id !== id))
      toast.success("Event deleted")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed")
    }
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-10 bg-gray-50 min-h-screen">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manage Events</h1>
            <p className="text-gray-500 mt-1">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
          </div>
          <button
            onClick={() => navigate("/create-event")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            + Create New Event
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center border border-dashed border-gray-300">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium text-lg">No events yet</p>
            <button
              onClick={() => navigate("/create-event")}
              className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">

                {event.poster ? (
                  <img
                    src={resolveUploadUrl(event.poster)}
                    className="w-full h-36 object-cover"
                    alt={event.title}
                  />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
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
                    <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                      <Users size={13} /> {event.participant_limit} spots
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/edit-event/${event.id}`)}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm flex-1 justify-center transition-colors"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm flex-1 justify-center transition-colors"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default ManageEvents
