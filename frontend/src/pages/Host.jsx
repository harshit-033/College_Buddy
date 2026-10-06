import { useState } from "react"
import API from "../api/api"
import { toast } from "react-hot-toast"

function Host() {

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [venue, setVenue] = useState("")
  const [fee, setFee] = useState("")
  const [limit, setLimit] = useState("")

  const createEvent = async () => {

    try {

      const token = localStorage.getItem("token")

        await API.post("/create-event", null, {
          params: {
            title,
            description,
            venue,
            fee,
            participant_limit: limit
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
})

      toast.success("Event Created!")

    } catch {
      toast.error("Error creating event")
    }

  }

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Host Dashboard
      </h1>

      <div className="bg-white shadow-lg p-6 rounded-xl w-96">

        <input
          placeholder="Event Title"
          className="border p-2 w-full mb-3"
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Description"
          className="border p-2 w-full mb-3"
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          placeholder="Venue"
          className="border p-2 w-full mb-3"
          onChange={(e) => setVenue(e.target.value)}
        />

        <input
          placeholder="Entry Fee"
          className="border p-2 w-full mb-3"
          onChange={(e) => setFee(e.target.value)}
        />

        <input
          placeholder="Participant Limit"
          className="border p-2 w-full mb-4"
          onChange={(e) => setLimit(e.target.value)}
        />

        <button
          onClick={createEvent}
          className="bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          Create Event
        </button>

      </div>

    </div>

  )

}

export default Host