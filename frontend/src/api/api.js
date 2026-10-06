import axios from "axios"

const envUrl = import.meta.env.VITE_API_URL

// If running in browser and envUrl is localhost/empty, dynamically use the current machine's hostname/IP so devices on the same Wi-Fi can connect
export const API_BASE = (
  envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")
    ? envUrl
    : typeof window !== "undefined"
      ? `http://${window.location.hostname}:8000`
      : "http://localhost:8000"
).trim()

const API = axios.create({
  baseURL: API_BASE
})

export default API
