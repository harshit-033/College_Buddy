import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import API from "../api/api"
import { getToken, getUserRole } from "../utils/auth"
import {
  CheckCircle, XCircle, ScanLine, Zap, Users, ShieldCheck,
  Clock, ArrowLeft, Search, RefreshCw, UserCheck, UserX,
  Camera, ListFilter, AlertCircle, Sparkles, Check
} from "lucide-react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"

function Scanner() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  
  const [activeTab, setActiveTab] = useState("camera") // camera | attendees
  const [scanResult, setScanResult] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [scanHistory, setScanHistory] = useState([])
  
  // Attendee list & stats
  const [registrations, setRegistrations] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all") // all | present | absent
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 })
  const [loadingRegs, setLoadingRegs] = useState(true)
  const [checkingInId, setCheckingInId] = useState(null)
  const [cameraOn, setCameraOn] = useState(true)

  // Fetch registrations & calculate stats
  const fetchRegistrations = useCallback(async (silent = false) => {
    const token = getToken()
    if (!silent) setLoadingRegs(true)
    try {
      const res = await API.get(`/event/${eventId}/registrations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRegistrations(res.data)
      
      const total = res.data.length
      const present = res.data.filter(r => r.checked_in).length
      const absent = total - present
      
      setStats({ total, present, absent })
    } catch (err) {
      console.error(err)
      toast.error("Failed to load registration list")
    } finally {
      setLoadingRegs(false)
    }
  }, [eventId])

  // Initial load and auto refresh
  useEffect(() => {
    fetchRegistrations()
    
    // Auto-refresh every 12 seconds
    const interval = setInterval(() => {
      fetchRegistrations(true)
    }, 12000)
    
    return () => clearInterval(interval)
  }, [fetchRegistrations])

  // Initialize camera scanner
  useEffect(() => {
    if (activeTab !== "camera" || !cameraOn) {
      return
    }

    const token = getToken()
    let html5QrCode = null

    // Ensure the container is empty before starting
    const container = document.getElementById("reader")
    if (container) container.innerHTML = ""

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("reader")
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: 240,
          },
          async (decodedText) => {
            try {
              await html5QrCode.pause()
            } catch (e) {
              console.debug("Error pausing scanner: ", e)
            }
            setScanning(false)

            const qrToken = decodedText.replace("TICKET:", "").trim()

            try {
              const res = await API.post("/scan-ticket", null, {
                params: { qr_token: qrToken },
                headers: { Authorization: `Bearer ${token}` }
              })
              const result = {
                success: true,
                message: res.data.message || "Ticket verified successfully!",
                attendee: res.data.attendee_name,
                time: new Date().toLocaleTimeString()
              }
              setScanResult(result)
              setScanHistory(prev => [result, ...prev].slice(0, 15))
              
              // Refresh registration list and counts
              fetchRegistrations(true)
              toast.success(`Checked in: ${res.data.attendee_name}`)
            } catch (err) {
              const result = {
                success: false,
                message: err.response?.data?.detail || "Invalid or duplicate ticket",
                time: new Date().toLocaleTimeString()
              }
              setScanResult(result)
              setScanHistory(prev => [result, ...prev].slice(0, 15))
              toast.error(result.message)
            }
          },
          (error) => {
            // Silent scan noise
          }
        )
      } catch (e) {
        console.error("Scanner setup failed: ", e)
      }
    }

    startScanner()

    return () => {
      const stopScanner = async () => {
        if (html5QrCode) {
          try {
            await html5QrCode.stop()
          } catch (e) {
            console.debug("Scanner was not running or failed to stop: ", e)
          }
        }
        // Clean DOM container on unmount to prevent duplicate frames
        const containerEl = document.getElementById("reader")
        if (containerEl) {
          containerEl.innerHTML = ""
        }
      }
      stopScanner()
      scannerRef.current = null
    }
  }, [fetchRegistrations, activeTab, cameraOn])

  const resetScanner = () => {
    setScanResult(null)
    setScanning(true)
    if (scannerRef.current) {
      scannerRef.current.resume()
    }
  }

  // Manual Check-In handler
  const handleManualCheckIn = async (regId, name) => {
    if (!window.confirm(`Manually check in ${name}?`)) return
    const token = getToken()
    setCheckingInId(regId)
    try {
      const res = await API.post(`/manually-checkin-ticket/${regId}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(res.data.message || `Checked in ${name}`)
      
      // Update local state instantly to avoid waiting for fetch
      setRegistrations(prev =>
        prev.map(r => r.id === regId ? { ...r, checked_in: true, checked_in_time: new Date().toISOString() } : r)
      )
      setStats(prev => ({
        ...prev,
        present: prev.present + 1,
        absent: prev.absent - 1
      }))
      
      const logEntry = {
        success: true,
        message: `Manual check-in completed`,
        attendee: name,
        time: new Date().toLocaleTimeString()
      }
      setScanHistory(prev => [logEntry, ...prev].slice(0, 15))
    } catch (err) {
      toast.error(err.response?.data?.detail || "Manual check-in failed")
    } finally {
      setCheckingInId(null)
    }
  }

  const handleBack = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (e) {
        console.debug("Error stopping scanner on back: ", e)
      }
    }
    const role = getUserRole()
    if (role === "host") navigate("/manage-events")
    else navigate("/student/volunteer")
  }

  // Filter and search logic
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch =
      reg.attendee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reg.attendee_roll && reg.attendee_roll.toLowerCase().includes(searchQuery.toLowerCase())) ||
      reg.attendee_email.toLowerCase().includes(searchQuery.toLowerCase())

    if (filterStatus === "present") return matchesSearch && reg.checked_in
    if (filterStatus === "absent") return matchesSearch && !reg.checked_in
    return matchesSearch
  })

  // Attendance rate
  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0

  return (
    <div className="bg-gray-50 min-h-screen">
      
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between text-white shadow-lg">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button 
            onClick={handleBack}
            className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-bold truncate">CampusIQ Ticket Control</h1>
            <p className="text-[11px] sm:text-xs text-blue-150">Event ID: {eventId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchRegistrations(false)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white flex items-center gap-1.5 text-xs font-semibold"
            disabled={loadingRegs}
          >
            <RefreshCw size={14} className={loadingRegs ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Stats Dashboard ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Registrations</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">Checked In</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.present}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <UserCheck size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Not Arrived</p>
              <h3 className="text-2xl font-black text-red-500 mt-1">{stats.absent}</h3>
            </div>
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
              <UserX size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Attendance Rate</p>
              <span className="text-xs font-bold text-indigo-600">{attendanceRate}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="flex bg-gray-200/60 p-1.5 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "camera"
                ? "bg-white text-gray-800 shadow"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Camera size={16} /> Live Scanner
          </button>
          <button
            onClick={() => setActiveTab("attendees")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "attendees"
                ? "bg-white text-gray-800 shadow"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Users size={16} /> Attendee List
          </button>
        </div>

        {/* ── Main Tab Content ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Tab: Live Scanner */}
          {activeTab === "camera" && (
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
                
                {/* Viewfinder Controls Header */}
                <div className="flex items-center justify-between w-full max-w-md mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${scanning && cameraOn ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}></div>
                    <span className="text-sm font-semibold text-gray-700">
                      {!cameraOn ? "Camera Off" : scanning ? "Scanning..." : "Paused"}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setCameraOn(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      cameraOn 
                        ? "bg-red-50 text-red-650 hover:bg-red-100 border border-red-200" 
                        : "bg-emerald-50 text-emerald-750 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    {cameraOn ? "Stop Scanning" : "Start Scanning"}
                  </button>
                </div>

                {/* Scanner Frame */}
                <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-black border-4 border-gray-800 shadow-inner">
                  {/* Camera view finder styling */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl z-10" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr z-10" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl z-10" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br z-10" />
                  
                  {scanning && cameraOn && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-[pulse_1.5s_infinite] z-10" />
                  )}

                  {cameraOn ? (
                    <div id="reader" className="w-full" />
                  ) : (
                    <div className="w-full h-64 bg-slate-900 flex flex-col items-center justify-center text-gray-500 gap-2">
                      <Camera size={32} className="opacity-30" />
                      <p className="text-xs">Camera access is stopped</p>
                    </div>
                  )}
                </div>

                {/* Scan Results Cards */}
                <div className="w-full max-w-md mt-6">
                  {scanResult ? (
                    <div className={`p-5 rounded-2xl border flex flex-col items-center text-center animate-slide-down ${
                      scanResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}>
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                        scanResult.success ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"
                      }`}>
                        {scanResult.success ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                      </div>

                      <h3 className="text-lg font-bold">
                        {scanResult.success ? "Valid Ticket Verified" : "Invalid Ticket Error"}
                      </h3>

                      {scanResult.attendee && (
                        <p className="text-base font-semibold mt-1 text-gray-700">
                          {scanResult.attendee}
                        </p>
                      )}

                      <p className="text-xs mt-2 opacity-80 max-w-xs">{scanResult.message}</p>

                      <button
                        onClick={resetScanner}
                        className="mt-5 w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                      >
                        <ScanLine size={16} /> Scan Next Ticket
                      </button>
                    </div>
                  ) : (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-3">
                      <Sparkles className="text-indigo-500 flex-shrink-0" size={24} />
                      <div className="text-left">
                        <h4 className="font-bold text-gray-800 text-sm">Ready to check-in</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Align the QR code ticket inside the scanner frame to verify instantly.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Attendee List */}
          {activeTab === "attendees" && (
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
                
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      placeholder="Search by name, roll no, email..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-all"
                    />
                  </div>
                  
                  <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                    {[
                      { id: "all", label: "All" },
                      { id: "present", label: "Present" },
                      { id: "absent", label: "Absent" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          filterStatus === tab.id
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Directory Table/List */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  {loadingRegs ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Loading directory list...
                    </div>
                  ) : filteredRegistrations.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-gray-50/50">
                      <UserX size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm">No attendees found</p>
                      <p className="text-xs mt-1">Try modifying your search or filters</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto pr-1">
                      {filteredRegistrations.map(reg => (
                        <div key={reg.id} className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-800 truncate text-sm">{reg.attendee_name}</h4>
                              {reg.attendee_roll && (
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                                  {reg.attendee_roll}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{reg.attendee_email}</p>
                            
                            {reg.checked_in && reg.checked_in_time && (
                              <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                                <Clock size={10} /> Checked-in at {new Date(reg.checked_in_time).toLocaleTimeString()}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              reg.checked_in
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-50 text-red-600"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                reg.checked_in ? "bg-emerald-500" : "bg-red-400"
                              }`} />
                              {reg.checked_in ? "Entered" : "Not Entered"}
                            </span>

                            {!reg.checked_in && (
                              <button
                                onClick={() => handleManualCheckIn(reg.id, reg.attendee_name)}
                                disabled={checkingInId === reg.id}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm hover:shadow"
                              >
                                {checkingInId === reg.id ? "Checking..." : "Check In"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Scan History & Logs */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                Live Log History
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{scanHistory.length}</span>
              </h2>

              {scanHistory.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                  <ScanLine size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-xs">No scan events yet</p>
                  <p className="text-[10px] mt-0.5">Scanned tickets will appear here live</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {scanHistory.map((scan, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 p-3.5 rounded-xl border transition-all animate-slide-down ${
                        scan.success
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                          : "bg-rose-50/50 border-rose-100 text-rose-900"
                      }`}
                    >
                      <div className={`mt-0.5 rounded-full p-0.5 ${scan.success ? "text-emerald-500" : "text-rose-500"}`}>
                        {scan.success ? <Check size={14} /> : <XCircle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold truncate leading-tight">
                            {scan.attendee || "Ticket Checked"}
                          </p>
                          <span className="text-[10px] text-gray-400 font-semibold flex-shrink-0">{scan.time}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-normal truncate">{scan.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        #reader__dashboard_section_csr button {
          background-color: #f3f4f6 !important;
          border: 1px solid #d1d5db !important;
          padding: 6px 12px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          color: #374151 !important;
          font-weight: 600 !important;
          cursor: pointer;
        }
        #reader__dashboard_section_csr button:hover {
          background-color: #e5e7eb !important;
        }
        #reader__scan_region img {
          display: none !important;
        }
        @keyframes slide-down {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default Scanner
