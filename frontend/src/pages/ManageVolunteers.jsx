import { useEffect, useState } from "react"
import API from "../api/api"
import { getToken } from "../utils/auth"
import Sidebar from "../components/Sidebar"
import { Users, Mail, Trash2, Plus, UserCheck, UserX, Shield, ChevronDown, Check, X } from "lucide-react"
import { toast } from "react-hot-toast"

function ManageVolunteers() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [volunteers, setVolunteers] = useState([])
  const [email, setEmail] = useState("")
  const [bulkEmails, setBulkEmails] = useState("")
  const [loading, setLoading] = useState(true)
  const [addingMode, setAddingMode] = useState("single") // single or bulk
  const [submitting, setSubmitting] = useState(false)
  const token = getToken()

  useEffect(() => {
    API.get("/host/events", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setEvents(res.data)
        if (res.data.length > 0) {
          setSelectedEvent(res.data[0].id)
        }
      })
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedEvent) fetchVolunteers()
  }, [selectedEvent])

  const fetchVolunteers = () => {
    API.get(`/host/whitelisted-volunteers/${selectedEvent}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setVolunteers(res.data))
      .catch(err => console.log(err))
  }

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/host/volunteer-request/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchVolunteers()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error updating volunteer")
    }
  }

  const addVolunteer = async () => {
    if (!email.trim()) return
    setSubmitting(true)
    try {
      await API.post("/host/whitelist-volunteer", {
        email: email.trim(),
        event_id: selectedEvent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEmail("")
      fetchVolunteers()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error adding volunteer")
    } finally {
      setSubmitting(false)
    }
  }

  const addBulkVolunteers = async () => {
    const emails = bulkEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e)
    if (emails.length === 0) return
    setSubmitting(true)
    try {
      const res = await API.post("/host/bulk-whitelist-volunteers", {
        emails,
        event_id: selectedEvent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBulkEmails("")
      fetchVolunteers()
      toast.success(`${res.data.added.length} added, ${res.data.skipped.length} skipped`)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error adding volunteers")
    } finally {
      setSubmitting(false)
    }
  }

  const removeVolunteer = async (id) => {
    if (!window.confirm("Remove this volunteer?")) return
    try {
      await API.delete(`/host/remove-volunteer/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setVolunteers(volunteers.filter(v => v.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error removing volunteer")
    }
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-10 bg-gray-50 min-h-screen">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Manage Volunteers</h1>
          <p className="text-gray-500 mt-1">Authorize volunteer emails for your events. Each volunteer can be assigned to only one event.</p>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
            <Shield size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium text-lg">Create an event first</p>
            <p className="text-gray-400 text-sm mt-1">You need at least one event to manage volunteers</p>
          </div>
        ) : (
          <>
            {/* Event Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Event</label>
              <div className="relative">
                <select
                  value={selectedEvent || ""}
                  onChange={(e) => setSelectedEvent(Number(e.target.value))}
                  className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Add Volunteer */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAddingMode("single")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    addingMode === "single"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Single Add
                </button>
                <button
                  onClick={() => setAddingMode("bulk")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    addingMode === "bulk"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Bulk Add
                </button>
              </div>

              {addingMode === "single" ? (
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      placeholder="volunteer@email.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addVolunteer()}
                      className="border border-gray-300 pl-10 pr-4 py-2.5 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={addVolunteer}
                    disabled={submitting || !email.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    placeholder="Enter emails separated by commas or new lines:&#10;volunteer1@email.com&#10;volunteer2@email.com&#10;volunteer3@email.com"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    rows={4}
                    className="border border-gray-300 px-4 py-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  />
                  <button
                    onClick={addBulkVolunteers}
                    disabled={submitting || !bulkEmails.trim()}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Users size={16} /> Add All Volunteers
                  </button>
                </div>
              )}
            </div>

            {/* Pending Requests */}
            {volunteers.filter(v => v.status === "pending").length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-amber-100 flex justify-between items-center bg-amber-50">
                  <h2 className="text-lg font-semibold text-amber-800">
                    Pending Requests
                    <span className="text-sm font-normal text-amber-600 ml-2">({volunteers.filter(v => v.status === "pending").length})</span>
                  </h2>
                </div>
                <div className="divide-y divide-amber-50">
                  {volunteers.filter(v => v.status === "pending").map(vol => (
                    <div key={vol.id} className="px-6 py-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100">
                          <UserX size={18} className="text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{vol.volunteer_name || vol.email}</p>
                          <p className="text-sm text-gray-400">{vol.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateStatus(vol.id, "approved")}
                          className="flex items-center gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Check size={16} /> Allow
                        </button>
                        <button
                          onClick={() => updateStatus(vol.id, "rejected")}
                          className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          <X size={16} /> Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volunteer List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  Approved Volunteers
                  <span className="text-sm font-normal text-gray-400 ml-2">({volunteers.filter(v => v.status === "approved").length})</span>
                </h2>
              </div>

              {volunteers.filter(v => v.status === "approved").length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users size={36} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No volunteers added yet</p>
                  <p className="text-sm mt-1">Add volunteer emails above or approve pending requests</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {volunteers.filter(v => v.status === "approved").map(vol => (
                    <div key={vol.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          vol.registered ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          {vol.registered
                            ? <UserCheck size={18} className="text-green-600" />
                            : <UserX size={18} className="text-gray-400" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {vol.volunteer_name || vol.email}
                          </p>
                          {vol.volunteer_name && (
                            <p className="text-sm text-gray-400">{vol.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          vol.registered
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {vol.registered ? "Registered" : "Pending account"}
                        </span>
                        <button
                          onClick={() => removeVolunteer(vol.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}

export default ManageVolunteers
