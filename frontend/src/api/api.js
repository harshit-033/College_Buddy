import axios from "axios"

export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim()

const API = axios.create({
  baseURL: API_BASE
})

export default API
