import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import API from "../api/api"
import { getToken } from "../utils/auth"
import Sidebar from "../components/Sidebar"
import EventForm from "../components/EventForm"
import { toast } from "react-hot-toast"

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
    maxVolunteers: ""
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
          maxVolunteers: e.max_volunteers ?? ""
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

    try {
      await API.put(`/edit-event/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
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

      <div className="flex-1 p-10 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Edit Event</h1>
          <p className="text-gray-500 mt-1">Update the details of your event</p>
        </div>

        {fetching ? (
          <p className="text-gray-400">Loading event details...</p>
        ) : (
          <EventForm
            values={values}
            onChange={handleChange}
            onPosterChange={null}
            onSubmit={updateEvent}
            submitLabel="Update Event"
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}

export default EditEvent
