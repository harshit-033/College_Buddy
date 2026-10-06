import axios from "axios"

const isProd = import.meta.env.PROD
const rawEnvUrl = import.meta.env.VITE_API_URL

function getBaseUrl() {
  if (isProd) {
    if (!rawEnvUrl || !rawEnvUrl.trim()) {
      const errorMsg = "Configuration Error: VITE_API_URL is mandatory in production mode but is not set."
      console.error(errorMsg)
      if (typeof window !== "undefined") {
        throw new Error(errorMsg)
      }
      return ""
    }
    return rawEnvUrl.trim().replace(/\/+$/, "")
  }

  // Local development fallback
  if (rawEnvUrl && rawEnvUrl.trim()) {
    return rawEnvUrl.trim().replace(/\/+$/, "")
  }

  // If running in browser and envUrl is not configured, dynamically use current machine hostname
  return (
    typeof window !== "undefined"
      ? `http://${window.location.hostname}:8000`
      : "http://localhost:8000"
  ).replace(/\/+$/, "")
}

export const API_BASE = getBaseUrl()

const API = axios.create({
  baseURL: API_BASE
})

export default API
