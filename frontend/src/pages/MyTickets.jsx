import { useEffect, useState } from "react"
import API, { API_BASE } from "../api/api"
import { getToken } from "../utils/auth"
import { resolveApiUrl, resolveUploadUrl } from "../utils/url"
import StudentSidebar from "../components/StudentSidebar"
import { Ticket, Calendar, MapPin, CheckCircle, Clock, Download, QrCode } from "lucide-react"

function MyTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const token = getToken()

  useEffect(() => {
    API.get("/my-tickets", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setTickets(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = tickets.filter(t => !t.event_date || new Date(t.event_date) >= new Date())
  const past = tickets.filter(t => t.event_date && new Date(t.event_date) < new Date())

  return (
    <div className="flex">
      <StudentSidebar />

      <div className="flex-1 p-10 bg-gray-50 min-h-screen">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Tickets</h1>
          <p className="text-gray-500 mt-1">All your event registrations and QR tickets</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              Loading tickets...
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
            <Ticket size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium text-lg">No tickets yet</p>
            <p className="text-gray-400 text-sm mt-1">Book an event to see your tickets here</p>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-blue-500" />
                  Upcoming Events
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">{upcoming.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcoming.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    >
                      {ticket.event_poster ? (
                        <img
                          src={resolveUploadUrl(ticket.event_poster)}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={ticket.event_title}
                        />
                      ) : (
                        <div className="w-full h-32 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                          <Calendar size={32} className="text-white/80" />
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-800">{ticket.event_title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            ticket.checked_in
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {ticket.checked_in ? "Checked In" : "Valid"}
                          </span>
                        </div>

                        <p className="text-gray-500 text-sm flex items-center gap-1 mb-1">
                          <MapPin size={12} /> {ticket.event_venue}
                        </p>
                        {ticket.event_date && (
                          <p className="text-gray-500 text-sm flex items-center gap-1">
                            <Calendar size={12} /> {new Date(ticket.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}

                        {/* QR Code (expandable) */}
                        {selectedTicket?.id === ticket.id && (
                          <div className="mt-4 pt-4 border-t border-gray-100 text-center animate-fade-in flex flex-col items-center">
                            <p className="text-xs text-gray-400 mb-2">Show this QR at entry</p>
                            <img
                              src={resolveApiUrl(ticket.qr_image)}
                              className="mx-auto w-40 h-40 object-contain rounded-lg border border-gray-200 p-2 mb-3"
                              alt="QR Code"
                            />
                            {ticket.payment_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`${API_BASE}/download-receipt/${ticket.payment_id}`, "_blank");
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                              >
                                <Download size={14} /> Download Receipt
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle size={18} className="text-gray-400" />
                  Past Events
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{past.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {past.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-75 hover:opacity-100 transition-all duration-300 cursor-pointer"
                    >
                      <div className="w-full h-24 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <Calendar size={24} className="text-gray-400" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-600 mb-1">{ticket.event_title}</h3>
                        <p className="text-gray-400 text-sm flex items-center gap-1">
                          <MapPin size={12} /> {ticket.event_venue}
                        </p>
                        <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          {ticket.checked_in ? "✓ Attended" : "Missed"}
                        </span>

                        {selectedTicket?.id === ticket.id && (
                          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                            <img
                              src={resolveApiUrl(ticket.qr_image)}
                              className="mx-auto w-32 h-32 object-contain rounded-lg border border-gray-200 p-2 grayscale"
                              alt="QR Code"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default MyTickets
