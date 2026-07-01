import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { getToken, getUserId } from "../utils/auth"
import { resolveUploadUrl, resolveApiUrl } from "../utils/url"
import StudentSidebar from "../components/StudentSidebar"
import {
  MapPin, IndianRupee, Users, Calendar, Ticket, ArrowLeft,
  Trophy, Star, ClipboardList, Tag, Clock, ChevronRight,
  Gift, Shield, CheckCircle, Zap, AlertCircle, X
} from "lucide-react"
import { toast } from "react-hot-toast"

const EVENT_TYPE_STYLES = {
  Technical:  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-500"   },
  Cultural:   { bg: "bg-pink-100",   text: "text-pink-700",   border: "border-pink-200",   dot: "bg-pink-500"   },
  Sports:     { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500"  },
  Workshop:   { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  Seminar:    { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
  Other:      { bg: "bg-gray-100",   text: "text-gray-700",   border: "border-gray-200",   dot: "bg-gray-500"   },
}

function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingId, setBookingId] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [ticketQR, setTicketQR] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const token = getToken()
    API.get(`/event/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setEvent(res.data))
      .catch(() => toast.error("Could not load event details"))
      .finally(() => setLoading(false))
  }, [id])

  const loadRazorpay = () =>
    new Promise(resolve => {
      if (window.Razorpay) { resolve(true); return }
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })

  const bookTicket = async () => {
    const userId = getUserId()
    const token = getToken()
    if (!userId) { toast.error("Session expired. Please login again."); return }

    setBookingId(id)
    try {
      const res = await API.post("/register-event", null, {
        params: { event_id: id },
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.requires_payment) {
        const payData = res.data
        const scriptLoaded = await loadRazorpay()
        if (!scriptLoaded) { toast.error("Failed to load Razorpay SDK."); return }

        const options = {
          key: payData.key_id,
          amount: payData.amount * 100,
          currency: "INR",
          name: "CollegeBuddy",
          description: `Ticket for ${event.title}`,
          order_id: payData.order_id,
          handler: async (response) => {
            setBookingId(id)
            try {
              const verifyRes = await API.post("/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }, { headers: { Authorization: `Bearer ${token}` } })
              setTicketQR(verifyRes.data.qr_image)
              setShowQR(true)
              toast.success("Payment Verified & Ticket Booked!")
              setEvent(prev => ({ ...prev, has_ticket: true }))
            } catch (err) {
              toast.error(err.response?.data?.detail || "Payment verification failed")
            } finally { setBookingId(null) }
          },
          prefill: { name: payData.user_name, email: payData.user_email, contact: payData.user_phone },
          theme: { color: "#4F46E5" },
          modal: { ondismiss: () => toast.error("Payment cancelled") }
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
      } else {
        setTicketQR(res.data.qr_image)
        setShowQR(true)
        setEvent(prev => ({ ...prev, has_ticket: true }))
        toast.success("Ticket Booked Successfully!")
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error booking ticket")
    } finally {
      setBookingId(null)
    }
  }

  const applyVolunteer = async () => {
    const token = getToken()
    if (!token) { toast.error("Session expired."); return }
    setApplyingId(id)
    try {
      await API.post("/student/apply-volunteer", { event_id: Number(id) }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Volunteer application submitted!")
      setEvent(prev => ({ ...prev, volunteer_status: "pending" }))
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error applying for volunteer")
    } finally {
      setApplyingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading event details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex">
        <StudentSidebar />
        <div className="flex-1 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
            <p className="text-gray-600 text-lg font-medium">Event not found</p>
            <button onClick={() => navigate("/events")} className="mt-4 text-blue-600 hover:underline">
              ← Back to Events
            </button>
          </div>
        </div>
      </div>
    )
  }

  const typeStyle = EVENT_TYPE_STYLES[event.event_type] || EVENT_TYPE_STYLES.Other
  const hasPoster = event.poster && !imgError
  const eventDate = event.event_date ? new Date(event.event_date) : null
  const endDate = event.event_end_date ? new Date(event.event_end_date) : null
  const isFree = !event.fee || event.fee === 0
  const isVolunteerDiscount = event.volunteer_status === "approved" && event.volunteer_fee < event.fee
  const applicableFee = isVolunteerDiscount ? event.volunteer_fee : event.fee

  return (
    <div className="flex">
      <StudentSidebar />

      <div className="flex-1 min-h-screen bg-gray-50">

        {/* ── Hero Banner ── */}
        <div className="relative w-full h-72 md:h-96 overflow-hidden">
          {hasPoster ? (
            <img
              src={resolveUploadUrl(event.poster)}
              alt={event.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center">
              <Calendar size={80} className="text-white/20" />
            </div>
          )}

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => navigate("/events")}
            className="absolute top-5 left-5 flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-all border border-white/20"
          >
            <ArrowLeft size={16} /> Back to Events
          </button>

          {/* Event type badge */}
          {event.event_type && (
            <div className="absolute top-5 right-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`} />
                {event.event_type}
              </span>
            </div>
          )}

          {/* Banner bottom info strip */}
          <div className="absolute bottom-0 left-0 right-0 px-8 py-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/85 text-sm">
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {event.venue}
                </span>
              )}
              {eventDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {eventDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              )}
              {eventDate && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {eventDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column — main info */}
          <div className="lg:col-span-2 space-y-5">

            {/* About */}
            {event.description && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ClipboardList size={16} className="text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">About this Event</h2>
                </div>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Eligibility / Criteria */}
            {event.criteria && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Shield size={16} className="text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Eligibility & Criteria</h2>
                </div>
                <div className="space-y-2">
                  {event.criteria.split("\n").map((line, i) =>
                    line.trim() ? (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle size={15} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm leading-relaxed">{line}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Prizes & Goodies */}
            {event.prizes && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Trophy size={16} className="text-amber-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Prizes & Goodies</h2>
                </div>
                <div className="space-y-2">
                  {event.prizes.split("\n").map((line, i) =>
                    line.trim() ? (
                      <div key={i} className="flex items-start gap-2.5">
                        <Gift size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm leading-relaxed">{line}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Schedule */}
            {(eventDate || endDate) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Calendar size={16} className="text-purple-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Schedule</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {eventDate && (
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-xs text-purple-500 font-semibold uppercase tracking-wider mb-1">Starts</p>
                      <p className="text-gray-800 font-semibold text-sm">
                        {eventDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {eventDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  )}
                  {endDate && (
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Ends</p>
                      <p className="text-gray-800 font-semibold text-sm">
                        {endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {endDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column — ticket info + CTA */}
          <div className="space-y-5">

            {/* Ticket Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="font-semibold text-gray-800 mb-4">Registration</h3>

              {/* Price */}
              <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Entry Fee</p>
                {isFree ? (
                  <p className="text-2xl font-bold text-green-600">Free</p>
                ) : isVolunteerDiscount ? (
                  <div>
                    <p className="text-sm text-gray-400 line-through">₹{event.fee}</p>
                    <p className="text-2xl font-bold text-emerald-600">₹{event.volunteer_fee}</p>
                    <span className="inline-block mt-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                      Volunteer Price
                    </span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-800">₹{event.fee}</p>
                )}
              </div>

              {/* Volunteer Fee info */}
              {event.volunteer_fee > 0 && !isVolunteerDiscount && (
                <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2.5 rounded-lg">
                  <Zap size={14} className="text-emerald-500" />
                  Volunteer rate: ₹{event.volunteer_fee}
                </div>
              )}

              {/* Capacity */}
              {event.participant_limit > 0 && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  <Users size={15} className="text-indigo-400" />
                  {event.participant_limit} spots available
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button
                  id={`book-ticket-btn-${id}`}
                  onClick={bookTicket}
                  disabled={bookingId === id || applyingId === id || event.has_ticket}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {event.has_ticket ? (
                    <><CheckCircle size={16} /> Booked</>
                  ) : bookingId === id ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : applicableFee > 0 ? (
                    <><IndianRupee size={16} /> Pay & Register</>
                  ) : (
                    <><Ticket size={16} /> Book Free Ticket</>
                  )}
                </button>

                <button
                  id={`volunteer-btn-${id}`}
                  onClick={applyVolunteer}
                  disabled={applyingId === id || bookingId === id || event.has_ticket || !!event.volunteer_status}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 text-emerald-700 border border-emerald-200 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Shield size={16} />
                  {event.volunteer_status
                    ? `Volunteer: ${event.volunteer_status}`
                    : applyingId === id ? "Applying..." : "Apply as Volunteer"}
                </button>
              </div>

              {event.has_ticket && (
                <button
                  onClick={() => navigate("/my-tickets")}
                  className="mt-3 w-full text-blue-600 text-sm font-medium hover:underline flex items-center justify-center gap-1"
                >
                  View My Tickets <ChevronRight size={14} />
                </button>
              )}
            </div>

            {/* Event Type Info */}
            {event.event_type && (
              <div className={`rounded-2xl border p-4 ${typeStyle.bg} ${typeStyle.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Tag size={14} className={typeStyle.text} />
                  <p className={`text-xs font-semibold uppercase tracking-wider ${typeStyle.text}`}>Event Type</p>
                </div>
                <p className={`text-lg font-bold ${typeStyle.text}`}>{event.event_type}</p>
              </div>
            )}

            {/* Venue card */}
            {event.venue && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-blue-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Venue</p>
                </div>
                <p className="text-gray-800 font-semibold">{event.venue}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── QR Ticket Modal ── */}
      {showQR && ticketQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative animate-fade-in">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Ticket size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">🎉 You're In!</h2>
            <p className="text-gray-500 mb-5 text-sm">{event.title}</p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <img
                src={resolveApiUrl(ticketQR)}
                className="mx-auto w-48 h-48 object-contain"
                alt="QR Code"
              />
            </div>
            <p className="text-xs text-gray-400">Show this QR code at the event entrance</p>
            <button
              onClick={() => navigate("/my-tickets")}
              className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
            >
              View All My Tickets
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventDetail
