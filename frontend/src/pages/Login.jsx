import { useState } from "react"
import API from "../api/api"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"

function Login() {
  const navigate = useNavigate()

  const [role, setRole] = useState("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }

    const validateEmail = (email) => {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setLoading(true)
    try {
      const res = await API.post("/login", null, {
        params: { email, password }
      })

      const token = res.data.access_token
      const payload = JSON.parse(atob(token.split(".")[1]))

      if (payload.role !== role) {
        toast.error(`Selected role does not match your account role. Your role is: ${payload.role}`)
        setLoading(false)
        return
      }

      localStorage.setItem("token", token)

      if (payload.role === "host") navigate("/host")
      else navigate("/events")

      toast.success("Welcome back!")

    } catch {
      toast.error("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  const roles = ["student", "host"]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-96">

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-blue-100 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1">Welcome to COLLEGE_BUDDY</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Sign in to your account</p>

        <p className="text-sm font-medium mb-2 text-gray-700">Select your role</p>
        <div className="flex bg-gray-100 rounded-full p-1 mb-5">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-full text-sm capitalize transition-colors ${
                role === r ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <input
          placeholder="Email Address"
          type="email"
          className="border border-gray-300 p-2 w-full mb-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 p-2 w-full mb-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />

        <button
          onClick={login}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white w-full py-2 rounded-lg font-semibold transition-colors"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="text-sm text-center mt-4 text-gray-600">
          Don't have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer font-medium hover:underline"
            onClick={() => navigate("/")}
          >
            Register
          </span>
        </p>

      </div>
    </div>
  )
}

export default Login;
