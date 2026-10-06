import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "react-hot-toast"

import Register from "./pages/Register"
import Login from "./pages/Login"
import Events from "./pages/Events"
import EventDetail from "./pages/EventDetail"
import Scanner from "./pages/Scanner"
import ManageEvents from "./pages/ManageEvents"
import HostDashboard from "./pages/HostDashboard"
import CreateEvent from "./pages/CreateEvent"
import HostEvents from "./pages/HostEvents"
import Analytics from "./pages/Analytics"
import EditEvent from "./pages/EditEvent"
import MyTickets from "./pages/MyTickets"
import StudentVolunteer from "./pages/StudentVolunteer"
import ManageVolunteers from "./pages/ManageVolunteers"
import Profile from "./pages/Profile"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>

        {/* Auth - Public */}
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Student */}
        <Route path="/events" element={
          <ProtectedRoute role="student">
            <Events />
          </ProtectedRoute>
        } />
        <Route path="/events/:id" element={
          <ProtectedRoute role="student">
            <EventDetail />
          </ProtectedRoute>
        } />
        <Route path="/my-tickets" element={
          <ProtectedRoute role="student">
            <MyTickets />
          </ProtectedRoute>
        } />

        <Route path="/student/volunteer" element={
          <ProtectedRoute role="student">
            <StudentVolunteer />
          </ProtectedRoute>
        } />

        {/* Scanner */}
        <Route path="/scanner/:eventId" element={
          <ProtectedRoute>
            <Scanner />
          </ProtectedRoute>
        } />

        {/* Host */}
        <Route path="/host" element={
          <ProtectedRoute role="host">
            <HostDashboard />
          </ProtectedRoute>
        } />
        <Route path="/create-event" element={
          <ProtectedRoute role="host">
            <CreateEvent />
          </ProtectedRoute>
        } />
        <Route path="/host/events" element={
          <ProtectedRoute role="host">
            <HostEvents />
          </ProtectedRoute>
        } />
        <Route path="/host/analytics" element={
          <ProtectedRoute role="host">
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/manage-events" element={
          <ProtectedRoute role="host">
            <ManageEvents />
          </ProtectedRoute>
        } />
        <Route path="/manage-volunteers" element={
          <ProtectedRoute role="host">
            <ManageVolunteers />
          </ProtectedRoute>
        } />
        <Route path="/edit-event/:id" element={
          <ProtectedRoute role="host">
            <EditEvent />
          </ProtectedRoute>
        } />

        {/* Both roles */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  )
}

export default App
