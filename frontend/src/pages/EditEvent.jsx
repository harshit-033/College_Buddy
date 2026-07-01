import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { getToken } from "../utils/auth"
import Sidebar from "../components/Sidebar"
import EventForm from "../components/EventForm"
import { toast } from "react-hot-toast"
import { Pencil, ArrowLeft } from "lucide-react"

function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [values, setValues] = useState({
    title: "",
    description: "",
    venue: "",
    date: "",
    endDate: "",
    fee: "",
    volunteerFee: "",
    limit: "",
    maxVolunteers: "",
    eventType: "",
    criteria: "",
    prizes: ""
  })

  const handleChange = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  // Pre-fill with existing event data
  useEffect(() => {
    const token = getToken()
    API.get(`/event/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const e = res.data
        setValues({
          title: e.title || "",
          description: e.description || "",
          venue: e.venue || "",
          date: e.event_date ? e.event_date.slice(0, 16) : "",
          endDate: e.event_end_date ? e.event_end_date.slice(0, 16) : "",
          fee: e.fee ?? "",
          volunteerFee: e.volunteer_fee ?? "",
          limit: e.participant_limit ?? "",
          maxVolunteers: e.max_volunteers ?? "",
          eventType: e.event_type || "",
          criteria: e.criteria || "",
          prizes: e.prizes || ""
        })
      })
      .catch(err => {
        console.log(err)
        toast.error("Could not load event details")
      })
      .finally(() => setFetching(false))
  }, [id])

  const updateEvent = async () => {
    const token = getToken()
    setLoading(true)

    const formData = new FormData()
    formData.append("title", values.title)
    formData.append("description", values.description)
    formData.append("venue", values.venue)
    formData.append("fee", Number(values.fee) || 0)
    formData.append("volunteer_fee", Number(values.volunteerFee) || 0)
    formData.append("participant_limit", Number(values.limit) || 0)
    if (values.date) formData.append("event_date", values.date)
    if (values.endDate) formData.append("event_end_date", values.endDate)
    if (values.maxVolunteers) formData.append("max_volunteers", Number(values.maxVolunteers))
    if (values.eventType) formData.append("event_type", values.eventType)
    if (values.criteria !== undefined) formData.append("criteria", values.criteria)
    if (values.prizes !== undefined) formData.append("prizes", values.prizes)

    try {
      await API.put(`/edit-event/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Event updated successfully!")
      navigate("/manage-events")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-10 py-8">
          <button
            onClick={() => navigate("/manage-events")}
            className="flex items-center gap-2 text-blue-100 hover:text-white mb-4 text-sm transition-colors"
          >
            <ArrowLeft size={15} /> Back to Manage Events
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Pencil size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Event</h1>
              <p className="text-blue-100 mt-0.5">Update your event details</p>
            </div>
          </div>
        </div>

        <div className="p-10">
          {fetching ? (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Loading event details...
            </div>
          ) : (
            <EventForm
              values={values}
              onChange={handleChange}
              onPosterChange={null}
              onSubmit={updateEvent}
              submitLabel="💾 Save Changes"
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default EditEvent
