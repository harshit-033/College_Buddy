import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import API, { API_BASE } from "../api/api"
import { getToken } from "../utils/auth"
import { BarChart2, Users, IndianRupee, Calendar, Ticket, Download, CreditCard } from "lucide-react"
import { toast } from "react-hot-toast"

function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const token = getToken()

  useEffect(() => {
    API.get("/host/analytics", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAnalytics(res.data))
      .catch(err => {
        console.log(err)
        toast.error("Error loading analytics data")
      })
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    {
      label: "Total Events",
      value: analytics?.total_events || 0,
      icon: <Calendar size={22} />,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Actual Collected Revenue",
      value: `₹${(analytics?.total_revenue || 0).toLocaleString()}`,
      icon: <IndianRupee size={22} />,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      label: "Total Registrations",
      value: analytics?.event_breakdown?.reduce((sum, e) => sum + e.total_registrations, 0) || 0,
      icon: <Users size={22} />,
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      label: "Volunteer Count",
      value: analytics?.event_breakdown?.reduce((sum, e) => sum + e.volunteer_registrations, 0) || 0,
      icon: <Ticket size={22} />,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ]

  const handleDownloadReceipt = (paymentId) => {
    // Open receipt in new tab or download directly
    window.open(`${API_BASE}/download-receipt/${paymentId}`, "_blank")
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 p-10 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Revenue Analytics</h1>
          <p className="text-gray-500 mt-1">Real-time breakdown of event sales, volunteer payments, and revenue metrics</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Loading analytics...
            </div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
              {statCards.map((stat) => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-6 shadow-sm border border-gray-100/50`}>
                  <div className={`${stat.color} mb-3`}>{stat.icon}</div>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Events Breakdown Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-10">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Event Revenue & Registrations Breakdown</h2>
              </div>

              {!analytics?.event_breakdown || analytics.event_breakdown.length === 0 ? (
                <p className="text-center py-10 text-gray-400">No events to analyze yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="text-left px-6 py-3">Event Title</th>
                      <th className="text-left px-6 py-3">Venue</th>
                      <th className="text-right px-6 py-3">Fees (Std / Vol)</th>
                      <th className="text-right px-6 py-3">Volunteers</th>
                      <th className="text-right px-6 py-3">Students</th>
                      <th className="text-right px-6 py-3">Total Attended</th>
                      <th className="text-right px-6 py-3">Revenue Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {analytics.event_breakdown.map(event => (
                      <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">{event.title}</td>
                        <td className="px-6 py-4 text-gray-500">{event.venue}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-gray-600 font-medium">₹{event.fee}</span>
                          <span className="text-gray-400"> / ₹{event.volunteer_fee}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-purple-600 font-medium">{event.volunteer_registrations}</td>
                        <td className="px-6 py-4 text-right text-indigo-600 font-medium">{event.student_registrations}</td>
                        <td className="px-6 py-4 text-right text-gray-700 font-medium">{event.total_registrations}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">
                          ₹{(event.actual_revenue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Recent Successful Payments</h2>
                <CreditCard size={18} className="text-gray-400" />
              </div>

              {!analytics?.recent_transactions || analytics.recent_transactions.length === 0 ? (
                <p className="text-center py-10 text-gray-400">No successful transactions yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="text-left px-6 py-3">Receipt / Payment ID</th>
                      <th className="text-left px-6 py-3">Student</th>
                      <th className="text-left px-6 py-3">Event</th>
                      <th className="text-right px-6 py-3">Amount</th>
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-center px-6 py-3">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {analytics.recent_transactions.map(tx => (
                      <tr key={tx.payment_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{tx.payment_id}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">{tx.student_name}</td>
                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{tx.event_title}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">₹{tx.amount}</td>
                        <td className="px-6 py-4 text-gray-400 text-xs">
                          {new Date(tx.date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDownloadReceipt(tx.payment_id)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold mx-auto"
                          >
                            <Download size={14} /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Analytics
