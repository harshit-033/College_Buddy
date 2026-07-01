import { useState } from "react"
import API from "../api/api"
import { getToken } from "../utils/auth"
import Sidebar from "../components/Sidebar"
import EventForm from "../components/EventForm"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { Plus, ArrowLeft } from "lucide-react"

function CreateEvent() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [poster, setPoster] = useState(null)

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

  const createEvent = async () => {
    if (!values.title || !values.venue) {
      toast.error("Title and venue are required")
      return
    }
    if (!values.limit || Number(values.limit) <= 0) {
      toast.error("Participant limit must be greater than 0")
      return
    }

    const token = getToken()
    const formData = new FormData()

    formData.append("title", values.title)
    formData.append("description", values.description)
    formData.append("venue", values.venue)
    formData.append("fee", Number(values.fee) || 0)
    formData.append("volunteer_fee", Number(values.volunteerFee) || 0)
    formData.append("participant_limit", Number(values.limit))
    if (values.date) formData.append("event_date", values.date)
    if (values.endDate) formData.append("event_end_date", values.endDate)
    if (values.maxVolunteers) formData.append("max_volunteers", Number(values.maxVolunteers))
    if (values.eventType) formData.append("event_type", values.eventType)
    if (values.criteria) formData.append("criteria", values.criteria)
    if (values.prizes) formData.append("prizes", values.prizes)
    if (poster) formData.append("poster", poster)

    setLoading(true)
    try {
      await API.post("/create-event", formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Event created successfully!")
      navigate("/manage-events")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error creating event")
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
              <Plus size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Create New Event</h1>
              <p className="text-blue-100 mt-0.5">Fill in the details to publish your event</p>
            </div>
          </div>
        </div>

        <div className="p-10">
          <EventForm
            values={values}
            onChange={handleChange}
            onPosterChange={setPoster}
            onSubmit={createEvent}
            submitLabel="🚀 Publish Event"
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default CreateEvent
