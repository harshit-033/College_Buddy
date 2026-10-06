import { Navigate } from "react-router-dom"
import { getUserRole } from "../utils/auth"

function ProtectedRoute({ children, role }) {
  const userRole = getUserRole()

  if (!userRole) {
    return <Navigate to="/login" />
  }

  if (role && userRole !== role) {
    // Redirect to appropriate page based on their actual role
    if (userRole === "host") return <Navigate to="/host" />
    return <Navigate to="/events" />
  }

  return children
}

export default ProtectedRoute
