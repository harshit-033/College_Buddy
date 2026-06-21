import { useState } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { GraduationCap, Megaphone, User, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("student")
  const [loading, setLoading] = useState(false)

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const register = async () => {
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields")
      return
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!")
      return
    }

    if (password.length < 6) {
      toast.error("Password should be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      await API.post("/register", {
        name,
        email,
        password,
        role
      })
      toast.success("Account created successfully!")
      navigate("/login")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { value: "student", label: "Student", icon: <GraduationCap size={18} /> },
    { value: "host", label: "Host", icon: <Megaphone size={18} /> },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-96">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-blue-100 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center">Create your COLLEGE_BUDDY account</h1>
        <p className="text-gray-500 mb-6 text-sm">Sign up to discover, book, and host campus events.</p>

        <input
          placeholder="Full Name"
          className="border border-gray-300 p-2 w-full mb-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email Address"
          type="email"
          className="border border-gray-300 p-2 w-full mb-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 p-2 w-full mb-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="border border-gray-300 p-2 w-full mb-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <p className="text-sm font-medium mb-2 text-gray-700">I want to join as:</p>

        <div className="flex bg-gray-100 rounded-full p-1 mb-4">
          {roles.map((r) => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-full text-sm transition-colors ${
                role === r.value ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {r.icon} {r.label}
            </button>
          ))}
        </div>



        <button
          onClick={register}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white w-full py-2 rounded-lg font-semibold transition-colors"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm mt-4 text-gray-600">
          Already registered?{" "}
          <span
            className="text-blue-600 cursor-pointer font-medium hover:underline"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
  )
}

export default Register
