import { useState, useRef } from "react"
import PosterUpload from "./PosterUpload"
import {
  FileText, MapPin, Calendar, IndianRupee, Users,
  Tag, Trophy, Shield, ImagePlus, ChevronDown, ChevronUp,
  Info, Zap, Clock
} from "lucide-react"

const EVENT_TYPES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar", "Other"]

const SectionHeader = ({ icon, title, subtitle, color = "blue", open, onToggle, step }) => {
  const colorMap = {
    blue:   "from-blue-500 to-blue-600 shadow-blue-200",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200",
    purple: "from-purple-500 to-purple-600 shadow-purple-200",
    emerald:"from-emerald-500 to-emerald-600 shadow-emerald-200",
    amber:  "from-amber-500 to-amber-600 shadow-amber-200",
    rose:   "from-rose-500 to-rose-600 shadow-rose-200",
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-md flex items-center justify-center text-white flex-shrink-0`}>
          {icon}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Step {step}</span>
          </div>
          <h3 className="font-bold text-gray-800 leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${open ? "bg-gray-100 rotate-0" : "bg-gray-50"}`}>
        {open ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
      </div>
    </button>
  )
}

const FieldLabel = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
)

const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
const textareaClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-gray-50 hover:bg-white"

function EventForm({ values, onChange, onPosterChange, onSubmit, submitLabel = "Submit", loading = false }) {
  const [openSections, setOpenSections] = useState({ basic: true, schedule: true, tickets: true, details: true, poster: true })

  const toggle = (section) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))

  const sections = [
    { key: "basic",    step: 1, icon: <FileText size={16} />,       color: "blue",    title: "Basic Info",           subtitle: "Title, description & venue" },
    { key: "schedule", step: 2, icon: <Calendar size={16} />,       color: "indigo",  title: "Schedule",             subtitle: "Start and end date/time" },
    { key: "tickets",  step: 3, icon: <IndianRupee size={16} />,    color: "emerald", title: "Tickets & Capacity",   subtitle: "Fees, limits & volunteers" },
    { key: "details",  step: 4, icon: <Tag size={16} />,            color: "purple",  title: "Event Details",        subtitle: "Type, criteria & prizes" },
    { key: "poster",   step: 5, icon: <ImagePlus size={16} />,      color: "rose",    title: "Event Poster",         subtitle: "Upload banner image" },
  ]

  return (
    <div className="w-full max-w-2xl space-y-4">

      {/* Section cards */}
      {sections.map(({ key, step, icon, color, title, subtitle }) => (
        <div
          key={key}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200"
        >
          <div className="p-5 pb-4">
            <SectionHeader
              icon={icon} title={title} subtitle={subtitle}
              color={color} step={step}
              open={openSections[key]}
              onToggle={() => toggle(key)}
            />
          </div>

          {openSections[key] && (
            <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4 animate-slide-down">

              {/* ── BASIC INFO ── */}
              {key === "basic" && (
                <>
                  <div>
                    <FieldLabel required>Event Title</FieldLabel>
                    <input
                      id="event-title"
                      placeholder="e.g. Annual Tech Fest 2025"
                      value={values.title}
                      className={inputClass}
                      onChange={e => onChange("title", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Description</FieldLabel>
                    <textarea
                      id="event-description"
                      placeholder="Describe your event in detail — what's it about, what can attendees expect..."
                      value={values.description}
                      rows={4}
                      className={textareaClass}
                      onChange={e => onChange("description", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Venue</FieldLabel>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="event-venue"
                        placeholder="e.g. Auditorium Block A"
                        value={values.venue}
                        className={`${inputClass} pl-10`}
                        onChange={e => onChange("venue", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── SCHEDULE ── */}
              {key === "schedule" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Start Date & Time</FieldLabel>
                    <div className="relative">
                      <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="event-start-date"
                        type="datetime-local"
                        value={values.date}
                        className={`${inputClass} pl-10`}
                        onChange={e => onChange("date", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>End Date & Time</FieldLabel>
                    <div className="relative">
                      <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="event-end-date"
                        type="datetime-local"
                        value={values.endDate || ""}
                        className={`${inputClass} pl-10`}
                        onChange={e => onChange("endDate", e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Info size={11} /> Volunteer access expires 10 hrs after end time
                    </p>
                  </div>
                </div>
              )}

              {/* ── TICKETS & CAPACITY ── */}
              {key === "tickets" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Entry Fee (₹)</FieldLabel>
                      <div className="relative">
                        <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="event-fee"
                          type="number"
                          min="0"
                          placeholder="0 for free"
                          value={values.fee}
                          className={`${inputClass} pl-10`}
                          onChange={e => onChange("fee", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Volunteer Fee (₹)</FieldLabel>
                      <div className="relative">
                        <Zap size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="event-volunteer-fee"
                          type="number"
                          min="0"
                          placeholder="0 for free"
                          value={values.volunteerFee || ""}
                          className={`${inputClass} pl-10`}
                          onChange={e => onChange("volunteerFee", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Participant Limit</FieldLabel>
                      <div className="relative">
                        <Users size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="event-limit"
                          type="number"
                          min="1"
                          placeholder="e.g. 100"
                          value={values.limit}
                          className={`${inputClass} pl-10`}
                          onChange={e => onChange("limit", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Max Volunteers</FieldLabel>
                      <div className="relative">
                        <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          id="event-max-volunteers"
                          type="number"
                          min="0"
                          placeholder="Unlimited"
                          value={values.maxVolunteers}
                          className={`${inputClass} pl-10`}
                          onChange={e => onChange("maxVolunteers", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fee preview */}
                  {(values.fee > 0 || values.volunteerFee > 0) && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700">
                      <Zap size={14} className="text-emerald-500 flex-shrink-0" />
                      {values.fee > 0 && <span>Regular: <b>₹{values.fee}</b></span>}
                      {values.fee > 0 && values.volunteerFee > 0 && <span className="text-emerald-400">·</span>}
                      {values.volunteerFee > 0 && <span>Volunteer: <b>₹{values.volunteerFee}</b></span>}
                    </div>
                  )}
                </>
              )}

              {/* ── EVENT DETAILS ── */}
              {key === "details" && (
                <>
                  <div>
                    <FieldLabel>Event Type</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {EVENT_TYPES.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onChange("eventType", values.eventType === type ? "" : type)}
                          className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 ${
                            values.eventType === type
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Eligibility / Criteria</FieldLabel>
                    <textarea
                      id="event-criteria"
                      placeholder={"Enter one criterion per line:\n• Must be a currently enrolled student\n• Teams of 2-4 members\n• Any branch can participate"}
                      value={values.criteria || ""}
                      rows={4}
                      className={textareaClass}
                      onChange={e => onChange("criteria", e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Info size={11} /> One criterion per line for best display
                    </p>
                  </div>

                  <div>
                    <FieldLabel>Prizes & Goodies</FieldLabel>
                    <textarea
                      id="event-prizes"
                      placeholder={"Enter one prize/goodie per line:\n🥇 1st Place: ₹5000 cash prize\n🥈 2nd Place: ₹3000 cash prize\n🎁 All participants: Certificate + goodies bag"}
                      value={values.prizes || ""}
                      rows={4}
                      className={textareaClass}
                      onChange={e => onChange("prizes", e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Trophy size={11} /> One prize or goodie per line
                    </p>
                  </div>
                </>
              )}

              {/* ── POSTER ── */}
              {key === "poster" && onPosterChange && (
                <PosterUpload setPoster={onPosterChange} />
              )}
              {key === "poster" && !onPosterChange && (
                <p className="text-sm text-gray-400 text-center py-3">Poster upload not available for editing. Use event settings to change the poster.</p>
              )}

            </div>
          )}
        </div>
      ))}

      {/* Submit button */}
      <button
        id="event-form-submit"
        onClick={onSubmit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:via-gray-300 disabled:to-gray-300 text-white py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Please wait...
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  )
}

export default EventForm
