import PosterUpload from "./PosterUpload"

function EventForm({ values, onChange, onPosterChange, onSubmit, submitLabel = "Submit", loading = false }) {
  return (
    <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-lg">

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
        <input
          placeholder="e.g. Annual Tech Fest 2025"
          value={values.title}
          className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => onChange("title", e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea
          placeholder="Describe your event..."
          value={values.description}
          rows={3}
          className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => onChange("description", e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
        <input
          placeholder="e.g. Auditorium Block A"
          value={values.venue}
          className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => onChange("venue", e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Start Date *</label>
        <input
          type="datetime-local"
          value={values.date}
          className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => onChange("date", e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Event End Date *</label>
        <input
          type="datetime-local"
          value={values.endDate || ""}
          className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => onChange("endDate", e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">Volunteer access expires 10 hours after this time</p>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Entry Fee (₹)</label>
          <input
            type="number"
            placeholder="0 for free"
            value={values.fee}
            className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => onChange("fee", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Volunteer Fee (₹)</label>
          <input
            type="number"
            placeholder="0 for free"
            value={values.volunteerFee || ""}
            className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => onChange("volunteerFee", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Participant Limit</label>
          <input
            type="number"
            placeholder="e.g. 100"
            value={values.limit}
            className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => onChange("limit", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Volunteers</label>
          <input
            type="number"
            placeholder="Leave blank for unlimited"
            value={values.maxVolunteers}
            className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => onChange("maxVolunteers", e.target.value)}
          />
        </div>
      </div>

      {onPosterChange && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Poster</label>
          <PosterUpload setPoster={onPosterChange} />
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white w-full py-2 mt-2 rounded-lg font-semibold transition-colors"
      >
        {loading ? "Please wait..." : submitLabel}
      </button>

    </div>
  )
}

export default EventForm
