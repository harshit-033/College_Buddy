import { useEffect, useState, useCallback } from "react"
import API from "../api/api"
import { getUserId, getToken } from "../utils/auth"
import { resolveApiUrl, resolveUploadUrl } from "../utils/url"
import StudentSidebar from "../components/StudentSidebar"
import { MapPin, IndianRupee, Users, Calendar, Ticket, Search, X, SlidersHorizontal } from "lucide-react"
import { toast } from "react-hot-toast"

function Events() {
  const [events, setEvents] = useState([])
  const [ticketQR, setTicketQR] = useState(null)
  const [bookedEventTitle, setBookedEventTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [bookingId, setBookingId] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchTimeout, setSearchTimeout] = useState(null)

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

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleSearch = (value) => {
    setSearchQuery(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      fetchEvents(value)
    }, 300)
    setSearchTimeout(timeout)
  }

  const clearSearch = () => {
    setSearchQuery("")
    fetchEvents("")
  }

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const bookTicket = async (eventId, eventTitle) => {
    const userId = getUserId()
    const token = getToken()

    if (!userId) {
      toast.error("Session expired. Please login again.")
      return
    }

    setBookingId(eventId)
    try {
      const res = await API.post("/register-event", null, {
        params: {
          event_id: eventId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (res.data.requires_payment) {
        const payData = res.data;
        const scriptLoaded = await loadRazorpay();
        if (!scriptLoaded) {
          toast.error("Failed to load Razorpay SDK. Please check your internet connection.");
          return;
        }

        const options = {
          key: payData.key_id,
          amount: payData.amount * 100, // in paisa
          currency: "INR",
          name: "CampusIQ",
          description: `Ticket Registration for ${eventTitle}`,
          order_id: payData.order_id,
          handler: async (response) => {
            setBookingId(eventId);
            try {
              const verifyRes = await API.post("/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });

              setTicketQR(verifyRes.data.qr_image);
              setBookedEventTitle(eventTitle);
              toast.success("Payment Verified & Ticket Booked Successfully!");
              fetchEvents(searchQuery);
            } catch (err) {
              toast.error(err.response?.data?.detail || "Payment verification failed");
            } finally {
              setBookingId(null);
            }
          },
          prefill: {
            name: payData.user_name,
            email: payData.user_email,
            contact: payData.user_phone
          },
          theme: {
            color: "#4F46E5"
          },
          modal: {
            ondismiss: () => {
              toast.error("Payment cancelled by user");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setTicketQR(res.data.qr_image)
        setBookedEventTitle(eventTitle)
        toast.success("Ticket Booked Successfully!")
        fetchEvents(searchQuery);
      }

    } catch (err) {
      toast.error(err.response?.data?.detail || "Error booking ticket")
    } finally {
      setBookingId(null)
    }
  }

  const applyVolunteer = async (eventId, eventTitle) => {
    const token = getToken()
    if (!token) {
      toast.error("Session expired. Please login again.")
      return
    }

    setApplyingId(eventId)
    try {
      await API.post("/student/apply-volunteer", { event_id: eventId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(`Volunteer application submitted for ${eventTitle}!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error applying for volunteer")
    } finally {
      setApplyingId(null)
    }
  }

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
              onChange={(e) => handleSearch(e.target.value)}
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

        <div className="p-10">
          {searchQuery && (
            <p className="text-gray-500 mb-4 text-sm">
              Showing results for <span className="font-medium text-gray-700">"{searchQuery}"</span>
              {!loading && <span> — {events.length} event{events.length !== 1 ? "s" : ""} found</span>}
            </p>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                Loading events...
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium">
                {searchQuery ? "No events match your search" : "No events yet"}
              </p>
              <p className="text-sm mt-1">
                {searchQuery ? "Try different keywords or clear the search" : "Check back later for upcoming events"}
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="mt-4 text-blue-600 font-medium hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <div
                  key={event.id}
                  className="bg-white shadow-sm rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100 group"
                >
                  {event.poster ? (
                    <img
                      src={resolveUploadUrl(event.poster)}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={event.title}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                      <Calendar size={48} className="text-white/70" />
                    </div>
                  )}

                  <div className="p-5">
                    <h2 className="text-xl font-semibold mb-3 text-gray-800">{event.title}</h2>

                    <p className="text-gray-500 text-sm mb-1 flex items-center gap-2">
                      <MapPin size={14} className="text-blue-500" /> {event.venue}
                    </p>

                    {event.event_date && (
                      <p className="text-gray-500 text-sm mb-1 flex items-center gap-2">
                        <Calendar size={14} className="text-purple-500" />
                        {new Date(event.event_date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </p>
                    )}

                    <p className="text-gray-700 text-sm mb-1 flex items-center gap-2">
                      <IndianRupee size={14} className="text-yellow-500" />
                      {event.applicable_fee === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span>
                          {event.volunteer_status === "approved" && event.volunteer_fee < event.fee ? (
                            <span>
                              <span className="line-through text-gray-400 mr-1.5">₹{event.fee}</span>
                              <span className="text-emerald-600 font-semibold">₹{event.volunteer_fee} (Volunteer)</span>
                            </span>
                          ) : (
                            <span>₹{event.fee}</span>
                          )}
                        </span>
                      )}
                    </p>

                    {event.participant_limit > 0 && (
                      <p className="text-gray-500 text-sm mb-4 flex items-center gap-2">
                        <Users size={14} className="text-indigo-500" /> {event.participant_limit} spots
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => applyVolunteer(event.id, event.title)}
                        disabled={applyingId === event.id || bookingId === event.id || event.has_ticket || event.volunteer_status}
                        className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 text-emerald-600 border border-emerald-200 px-3 py-2.5 rounded-lg w-1/2 font-medium transition-all duration-200"
                      >
                        {event.volunteer_status
                          ? `Volunteer: ${event.volunteer_status}`
                          : applyingId === event.id ? "Applying..." : "Volunteer"}
                      </button>
                      <button
                        onClick={() => bookTicket(event.id, event.title)}
                        disabled={bookingId === event.id || applyingId === event.id || event.has_ticket}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-3 py-2.5 rounded-lg w-1/2 font-medium transition-all duration-200 hover:shadow-md"
                      >
                        {event.has_ticket
                          ? "Booked"
                          : bookingId === event.id
                            ? "Processing..."
                            : event.applicable_fee > 0
                              ? "Pay & Register"
                              : "Book Ticket"}
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* QR Ticket Display */}
          {ticketQR && (
            <div className="mt-16 text-center">
              <div className="inline-block bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
                <Ticket size={32} className="mx-auto mb-3 text-blue-600" />
                <h2 className="text-2xl font-bold mb-1">Your Ticket</h2>
                <p className="text-gray-500 mb-5">{bookedEventTitle}</p>
                <img
                  src={resolveApiUrl(ticketQR)}
                  className="mx-auto w-56 h-56 object-contain"
                  alt="QR Code"
                />
                <p className="text-sm text-gray-400 mt-4">Show this QR code at the event entrance</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default Events
