import { useState } from "react"
import API from "../api/api"
import { getToken } from "../utils/auth"
import Sidebar from "../components/Sidebar"
import EventForm from "../components/EventForm"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"

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
    maxVolunteers: ""
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
    if (poster) formData.append("poster", poster)

    setLoading(true)
    try {
      await API.post("/create-event", formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      toast.success("Event created successfully!")
      navigate("/manage-events")
    } catch (err) {
      console.log(err.response)
      toast.error(err.response?.data?.detail || "Error creating event")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-10 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Event</h1>
          <p className="text-gray-500 mt-1">Fill in the details to publish a new event</p>
        </div>

        <EventForm
          values={values}
          onChange={handleChange}
          onPosterChange={setPoster}
          onSubmit={createEvent}
          submitLabel="Create Event"
          loading={loading}
        />
      </div>
    </div>
  )
}

export default CreateEvent
